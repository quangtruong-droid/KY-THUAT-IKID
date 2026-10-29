/* ============================================================
   VÉ PHIÊN — MÁY CHỦ BIẾT AI ĐANG HỎI
   (22/09/2026, Trường chốt sau khi soát rủi ro mục ①)

   VẤN ĐỀ GỐC: "chọn tên mình" chỉ là thao tác TRONG MÁY — nó ghi vào
   localStorage, máy chủ hoàn toàn không biết. Nên mọi đường /api/... trước
   nay trả lời bất kỳ ai gọi tới: tải được cả kho phiếu một lượt, ghi được
   phiếu giả, bắn được thông báo tới 13 cơ sở, nhét được file vào kho ảnh.

   CÁCH CHỮA: chọn tên xong, máy xin máy chủ một cái VÉ có ký tên. Vé nói
   rõ ai / vai gì / cơ sở nào. Máy nhớ vé, mọi lời gọi sau đều đính kèm.
   Máy chủ đọc vé là biết ai hỏi, và chỉ trả phần của người đó.

   VẪN GIỮ LUẬT "MỘT LINK, KHÔNG MẬT KHẨU" (Trường đặt từ đầu): người dùng
   không gõ gì, không nhớ gì, không nhìn thấy gì. Vé xin ngầm trong nửa giây.

   VÉ KHÔNG PHẢI KHOÁ CỬA, NÓ LÀ THU HẸP CỬA — nói thẳng để sau này đọc lại
   không tưởng nhầm: người lạ cầm link vẫn mở web bằng tay và chọn đại một
   cái tên thì vẫn được cấp vé. Không có mật khẩu thì không tài nào phân
   biệt người thật với người giả. Cái vé chặn được là công cụ tự động hút
   cả kho, và chặn một cơ sở đọc sổ của 12 cơ sở khác.
   ============================================================ */

const HAN_NGAY = 30;          /* vé sống 30 ngày; web tự xin lại khi gần hết */
let KHOA_NHO = null;          /* nhớ trong một lần chạy worker, khỏi hỏi kho lại */

const chu = s => new TextEncoder().encode(s);
const b64u = {
  ma(u8) {
    let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  giai(s) {
    const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
};

/* ============================================================
   KHOÁ KÝ — tự sinh, cất trong kt_khoa.
   Bảng kt_khoa NẰM NGOÀI allowlist của /api/db nên web không đọc được, và
   không đường nào in khoá ra ngoài. Làm y như khoá đẩy VAPID (xem worker.js):
   'on conflict do nothing' rồi đọc lại — hai máy Cloudflare cùng khởi tạo một
   lúc cũng không thể ra hai khoá khác nhau.
   ============================================================ */
async function khoaVe(env) {
  if (KHOA_NHO) return KHOA_NHO;
  if (!env.DB) return null;
  try {
    await env.DB.prepare('create table if not exists kt_khoa (k text primary key, v text not null)').run();
    const doc = async () => {
      const r = await env.DB.prepare("select v from kt_khoa where k='vekhoa'").first();
      return r && r.v ? String(r.v) : null;
    };
    let k = await doc();
    if (!k) {
      const moi = b64u.ma(crypto.getRandomValues(new Uint8Array(32)));
      await env.DB.prepare("insert into kt_khoa (k,v) values ('vekhoa',?1) on conflict(k) do nothing")
        .bind(moi).run();
      k = await doc();
    }
    if (!k) return null;
    KHOA_NHO = await crypto.subtle.importKey('raw', b64u.giai(k),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    return KHOA_NHO;
  } catch (e) { return null; }
}

/* ---------- cấp vé ---------- */
export async function capVe(env, nguoiId) {
  if (!env.DB) return { loi: 'Chưa nối kho' };
  const id = String(nguoiId || '');
  if (!id) return { loi: 'Thiếu mã người' };

  /* NGƯỜI PHẢI CÓ THẬT VÀ ĐANG HIỆN — không thì ai gõ id bừa cũng có vé */
  const n = await env.DB.prepare('select id,vai,co_so_id,hien from kt_nguoi where id=?1')
    .bind(id).first().catch(() => null);
  if (!n) return { loi: 'Không có người này' };
  if (Number(n.hien) === 0) return { loi: 'Người này đã nghỉ' };

  const k = await khoaVe(env);
  if (!k) return { loi: 'Chưa dựng được khoá vé' };

  const than = { ai: String(n.id), vai: String(n.vai || ''), cs: String(n.co_so_id || ''), luc: Date.now() };
  const p = b64u.ma(chu(JSON.stringify(than)));
  const sig = b64u.ma(new Uint8Array(await crypto.subtle.sign('HMAC', k, chu(p))));
  return { ve: p + '.' + sig, han: HAN_NGAY };
}

/* ============================================================
   ĐỌC VÉ — trả về người trong vé, hoặc null nếu không có / hỏng / hết hạn.
   KHÔNG BAO GIỜ ném lỗi: hàm này nằm trên đường đi của MỌI lời gọi, nó mà
   nổ là chết cả web. Có nghi ngờ gì thì trả null, để nơi gọi quyết định.
   ============================================================ */
export async function docVe(env, request) {
  try {
    const raw = request.headers.get('x-kt-ve') || '';
    if (!raw || raw.indexOf('.') < 0) return null;
    const [p, sig] = raw.split('.');
    if (!p || !sig) return null;

    const k = await khoaVe(env);
    if (!k) return null;
    const dung = await crypto.subtle.verify('HMAC', k, b64u.giai(sig), chu(p));
    if (!dung) return null;                       /* sửa một chữ trong vé là rơi vào đây */

    const than = JSON.parse(new TextDecoder().decode(b64u.giai(p)));
    if (!than || !than.ai) return null;
    if (Date.now() - Number(than.luc || 0) > HAN_NGAY * 86400000) return null;
    return { ai: than.ai, vai: than.vai || '', cs: than.cs || '', luc: than.luc };
  } catch (e) { return null; }
}

/* ============================================================
   SỔ ĐẾM LỜI GỌI CHƯA CÓ VÉ — dùng cho ĐỢT 1 (chưa chặn ai).
   Máy người dùng còn giữ bản web cũ thì chưa biết xin vé; chặn ngay là họ
   tắc việc giữa giờ làm. Nên đợt này chỉ ghi sổ, đợi số về 0 rồi mới khoá.
   Ghi rất nhẹ: mỗi ngày một dòng, cộng dồn theo từng đường.
   Ghi hỏng thì bỏ qua — sổ đếm không đáng để làm chết một lời gọi thật.
   ============================================================ */
export async function ghiSo(env, duong) {
  try {
    if (!env.DB) return;
    const ngay = new Date().toISOString().slice(0, 10);
    const k = 'so-' + ngay;
    const r = await env.DB.prepare('select v from kt_khoa where k=?1').bind(k).first();
    let d = {};
    try { d = r && r.v ? JSON.parse(r.v) : {}; } catch (e) { d = {}; }
    d[duong] = (Number(d[duong]) || 0) + 1;
    await env.DB.prepare('insert into kt_khoa (k,v) values (?1,?2) on conflict(k) do update set v=excluded.v')
      .bind(k, JSON.stringify(d)).run();
  } catch (e) { }
}

/* đọc sổ 7 ngày gần nhất — để biết khi nào an toàn bật khoá ở đợt 2 */
export async function docSo(env) {
  try {
    if (!env.DB) return [];
    const r = await env.DB.prepare("select k,v from kt_khoa where k like 'so-%' order by k desc limit 7").all();
    return (r.results || []).map(x => {
      let d = {}; try { d = JSON.parse(x.v); } catch (e) { }
      const tong = Object.keys(d).reduce((s, c) => s + (Number(d[c]) || 0), 0);
      return { ngay: String(x.k).slice(3), tong: tong, theoDuong: d };
    });
  } catch (e) { return []; }
}
