/* ============================================================
   LỚP DỮ LIỆU D1 — chạy trong Worker
   Điện thoại KHÔNG nói trực tiếp với cơ sở dữ liệu nữa. Nó gọi
   mấy đường dưới đây, Worker mới nói với D1.
   Lợi thêm: khoá cơ sở dữ liệu không còn nằm lộ trong mã trang web.

   D1 là SQLite nên:
    · mảng (ảnh, người sửa) lưu TEXT chứa JSON → đọc ra phải parse
    · ngày giờ lưu TEXT ISO → so sánh chuỗi vẫn đúng thứ tự
    · boolean lưu 0/1
   ============================================================ */

const CUA_SO_NGAY = 180;                 // chỉ lấy phiếu 180 ngày gần nhất

/* cột phiếu — đúng thứ tự, dùng chung cho đọc và ghi */
const COT_PHIEU = ['id', 'co_so_id', 'gian_hang_id', 'thiet_bi', 'mo_ta', 'loai', 'loai_loi',
  'muc_do', 'trang_thai', 'dang_vuong', 'vuong_ghi', 'nguoi_tao', 'ngay_tao', 'mong_muon',
  'nguoi_nhan_kt', 'nhan_luc', 'du_kien', 'done_at', 'nguoi_sua', 'chi_phi', 'xu_ly_ghi',
  'cht_ket_qua', 'cht_nguoi', 'cht_luc', 'cht_ghi', 'anh_truoc', 'anh_sau', 'nguon_kt', 'deleted',
  /* ly_do_tre (19/09): báo xong MUỘN hơn ngày đã tự hẹn thì phải ghi vì sao —
     họp mới biết là do thợ chậm hay do chờ hàng, chờ nhà thầu */
  'ly_do_tre',
  /* nguoi_giao (11/09): admin giao một việc cho NHIỀU người — mảng tên. Một
     người thì vẫn dùng nguoi_nhan_kt như cũ. Ai bấm nhận thì thành nguoi_nhan_kt. */
  'nguoi_giao',
  /* ============================================================
     XIN DỜI HẠN — PHẢI QUA ADMIN DUYỆT (28/09, Trường chốt).
     Trước nay kỹ thuật bấm dời là ngày đổi luôn, admin không hề biết. Giờ lời
     xin nằm chờ ở 4 cột này, du_kien KHÔNG đổi cho tới khi admin duyệt.
       · doi_xin_ngay  ngày mới kỹ thuật muốn (rỗng = không có lời xin nào)
       · doi_xin_ly    vì sao dời — bắt buộc, admin đọc đúng dòng này mà quyết
       · doi_xin_nguoi ai xin
       · doi_xin_luc   xin lúc nào, để biết admin có ngâm lâu không
     Duyệt → chép doi_xin_ngay sang du_kien rồi dọn sạch 4 cột.
     Từ chối / rút lời xin → chỉ dọn 4 cột, du_kien giữ nguyên.
     Không thêm trạng thái mới: phiếu vẫn là 'tiepnhan', kỹ thuật vẫn báo xong
     được bình thường trong lúc chờ (Trường chốt) — thêm trạng thái là phải sửa
     lại toàn bộ chỗ lọc, đếm, thống kê đang chạy ổn.
     ============================================================ */
  'doi_xin_ngay', 'doi_xin_ly', 'doi_xin_nguoi', 'doi_xin_luc'];

/* bảng nào cho ghi, và cột nào được ghi — chặn ngay ở đây, đừng tin
   dữ liệu điện thoại gửi lên. Không có bảng trong danh sách là từ chối. */
const CHO_GHI = {
  phieu_loi: COT_PHIEU,
  dien_bien: ['phieu_id', 'nguoi_ten', 'loai', 'noi_dung', 'anh', 'created_at'],
  kt_nhat_ky: ['phieu_id', 'nguoi_id', 'nguoi_ten', 'hanh_dong', 'chi_tiet', 'may', 'created_at'],
  kt_day: ['nguoi_id', 'nguoi_ten', 'vai', 'endpoint', 'p256dh', 'auth', 'may', 'bat', 'created_at', 'rung'],
  co_so: ['id', 'ten', 'trang_thai', 'kt_phu_trach'],
  gian_hang: ['id', 'co_so_id', 'ten'],
  /* anh_dd = ảnh đại diện (04/09) — cố tình KHÔNG đặt tên 'anh' vì cột 'anh'
     bị coi là JSON (mảng ảnh của diễn biến) */
  kt_nguoi: ['id', 'ten', 'vai', 'co_so_id', 'mau', 'thu_tu', 'hien', 'anh_dd'],
  /* LỊCH BẬN CỦA KỸ THUẬT (11/09 — Trường: "ae kỹ thuật thi thoảng phải đi
     setup, nghỉ làm, có việc cá nhân"). Kỹ thuật tự báo, quản lý sửa/xoá được.
     Gợi ý giao việc đọc bảng này để né người đang bận. */
  kt_lich: ['id', 'nguoi_ten', 'tu_ngay', 'den_ngay', 'ly_do', 'ghi_chu', 'nguoi_ghi', 'created_at']
};
/* ============================================================
   XOÁ — CHỈ 3 BẢNG DANH MỤC (Trường chốt 08/09: "t muốn xóa được và hỏi xác
   nhận trước khi xóa"). Phiếu và diễn biến KHÔNG bao giờ xoá được qua đường
   này: mất phiếu là mất cả lịch sử sửa chữa, báo cáo tháng cũ vỡ theo.
   ============================================================ */
const CHO_XOA = ['co_so', 'gian_hang', 'kt_nguoi', 'kt_lich'];

/* cột nào là mảng/đối tượng → lưu thành JSON */
const COT_JSON = ['anh', 'anh_truoc', 'anh_sau', 'nguoi_sua', 'chi_tiet', 'nguoi_giao'];
/* cột nào là 0/1 */
const COT_BOOL = ['deleted', 'hien', 'bat'];

const laJSON = c => COT_JSON.includes(c);
const laBool = c => COT_BOOL.includes(c);

function raGiaTri(cot, v) {
  if (laJSON(cot)) return JSON.stringify(Array.isArray(v) || (v && typeof v === 'object') ? v : (v == null ? [] : v));
  if (laBool(cot)) return (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}
function vaoGiaTri(cot, v) {
  if (laJSON(cot)) { try { return JSON.parse(v || '[]'); } catch (e) { return []; } }
  if (laBool(cot)) return v === 1;
  return v;
}
function doiDong(r) {
  const ra = {};
  for (const k in r) ra[k] = vaoGiaTri(k, r[k]);
  return ra;
}

/* ============================================================
   ĐỌC — một lần gọi lấy đủ 4 bảng cho lần mở web
   ============================================================ */
async function taiHet(env, ngay, ve, khoa) {
  const moc = new Date(Date.now() - (Number(ngay) || CUA_SO_NGAY) * 86400000).toISOString();
  let cs, gh, ai, pl, ch, lc;
  const doc = () => env.DB.batch([
    env.DB.prepare('select id,ten,trang_thai,kt_phu_trach from co_so'),
    env.DB.prepare('select id,co_so_id,ten from gian_hang'),
    env.DB.prepare('select id,ten,vai,co_so_id,mau,thu_tu,anh_dd,hien from kt_nguoi order by thu_tu'),
    /* dùng đúng chỉ mục pl_chinh(loai, deleted, ngay_tao desc) */
    env.DB.prepare('select ' + COT_PHIEU.join(',') + ' from phieu_loi' +
      " where loai='kythuat' and deleted=0 and ngay_tao >= ?1 order by ngay_tao desc").bind(moc),
    /* SỐ TIN NHẮN THEO PHIẾU (Trường xin 30/08) — để danh sách hiện nhãn 💬,
       khỏi mở từng phiếu mới biết cái nào đang trao đổi. Chỉ đếm loai='chat',
       giới hạn theo cùng cửa sổ ngày để không quét cả kho cũ. */
    /* 14/09: kèm luôn NGƯỜI và NỘI DUNG của tin cuối. Màn 🔎 Radar cần nói được
       "ai nhắn gì" cho phiếu người dùng CHƯA MỞ BAO GIỜ — mà diễn biến chỉ được
       nạp về máy khi mở phiếu, nên trước đây mọi dòng đều hiện trơ "Có tin mới".
       Lấy tin cuối bằng một lượt quét: gom theo phiếu, chọn dòng có created_at
       lớn nhất. Nội dung cắt 90 ký tự ngay ở máy chủ cho nhẹ đường truyền. */
    env.DB.prepare(
      "select c.phieu_id, c.so, c.cuoi, substr(d.noi_dung,1,90) as tin, d.nguoi_ten as ai, " +
      "  (select count(*) from json_each(coalesce(d.anh,'[]'))) as so_anh " +
      "from (select phieu_id, count(*) as so, max(created_at) as cuoi " +
      "      from dien_bien where loai='chat' and created_at >= ?1 group by phieu_id) c " +
      "left join dien_bien d on d.phieu_id = c.phieu_id and d.created_at = c.cuoi and d.loai='chat'"
    ).bind(moc),
    /* lịch bận: chỉ lấy khoảng CÒN HIỆU LỰC (chưa kết thúc) — lịch cũ để lại
       trong kho nhưng không cần kéo về máy mỗi lần mở web */
    env.DB.prepare("select id,nguoi_ten,tu_ngay,den_ngay,ly_do,ghi_chu from kt_lich " +
      "where den_ngay >= ?1 order by tu_ngay").bind(new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10))
  ]);
  /* ============================================================
     BẢNG CŨ THIẾU CỘT THÌ TỰ THÊM RỒI ĐỌC LẠI — không bắt ai chạy lệnh tay,
     và web không gãy ở lần deploy đầu tiên sau khi thêm cột.
       · anh_dd        (04/09) ảnh đại diện
       · kt_phu_trach  (11/09) kỹ thuật lo chính cơ sở đó
     ============================================================ */
  const VA_COT = [
    [/anh_dd/, 'alter table kt_nguoi add column anh_dd text'],
    [/kt_phu_trach/, 'alter table co_so add column kt_phu_trach text'],
    /* bảng lịch bận chưa có thì dựng luôn (11/09) */
    [/kt_lich/, 'create table if not exists kt_lich (id text primary key, nguoi_ten text, ' +
      'tu_ngay text, den_ngay text, ly_do text, ghi_chu text, nguoi_ghi text, created_at text)'],
    [/nguoi_giao/, 'alter table phieu_loi add column nguoi_giao text'],
    [/ly_do_tre/, 'alter table phieu_loi add column ly_do_tre text'],
    [/rung/, 'alter table kt_day add column rung integer default 1'],
    /* xin dời hạn chờ duyệt (28/09) — bốn cột, kho cũ chưa có thì tự thêm.
       Mỗi cột một dòng riêng: câu lệnh nào chạy được thì chạy, cột đã có sẵn
       thì lệnh đó nổ và bị bỏ qua, không kéo theo ba cột kia. */
    [/doi_xin_ngay/, 'alter table phieu_loi add column doi_xin_ngay text'],
    [/doi_xin_ly/, 'alter table phieu_loi add column doi_xin_ly text'],
    [/doi_xin_nguoi/, 'alter table phieu_loi add column doi_xin_nguoi text'],
    [/doi_xin_luc/, 'alter table phieu_loi add column doi_xin_luc text'],
    /* AI ĐANG MỞ PHIẾU NÀY (21/10) — bảng rất nhẹ, mỗi máy một dòng, cũ hơn
       45 giây là coi như đã rời đi. Khoá chính là mã máy chứ không phải mã
       người: một người mở phiếu trên cả điện thoại lẫn máy tính thì vẫn là
       một người, không nên hiện tên hai lần. */
    [/kt_dang_xem/, 'create table if not exists kt_dang_xem (may text primary key, ' +
      'phieu_id text, nguoi_id text, nguoi_ten text, luc integer)']
  ];
  /* ============================================================
     VÁ THÀNH VÒNG LẶP (28/09). Kho chỉ báo MỘT cột thiếu mỗi lần lỗi, mà bản
     cũ chỉ vá một lượt rồi đọc lại — thiếu hai cột trở lên là lần đọc thứ hai
     lại nổ và web trắng màn. Đợt này thêm một lúc bốn cột nên phải lặp.
     Chặn ở 8 vòng để không bao giờ quay vô tận khi gặp lỗi lạ.
     ============================================================ */
  for (let vong = 0; ; vong++) {
    try { [cs, gh, ai, pl, ch, lc] = await doc(); break; }
    catch (e) {
      const m = String(e.message || e);
      const va = VA_COT.filter(x => x[0].test(m));
      if (!va.length || vong >= 8) throw e;
      for (const [, lenh] of va) {
        try { await env.DB.prepare(lenh).run(); } catch (x) { /* đã có cột thì thôi */ }
      }
    }
  }
  /* ============================================================
     CƠ SỞ CHỈ LẤY ĐƯỢC PHIẾU CỦA MÌNH (22/09 — Trường chốt, luật ⑤).
     Trước nay máy chủ trả phiếu của CẢ 13 CƠ SỞ rồi màn hình mới lọc đi.
     Tức là một CHT nghỉ việc còn giữ link vẫn đọc được sổ sách toàn công ty.
     Giờ chặn ngay ở máy chủ: dữ liệu của cơ sở khác KHÔNG RỜI KHO.
     Kỹ thuật và quản lý vẫn thấy hết — họ đi khắp nơi, đó là việc của họ.
     Danh mục (cơ sở, gian hàng, người) vẫn trả đủ: màn chọn tên cần nó, mà
     trong đó không có gì kín — chỉ là tên cơ sở và tên người.
     Lọc bằng JS chứ không sửa câu lệnh kho: cả đội mới 33 phiếu nên không
     nặng, mà đổi câu lệnh thì rủi ro trả thiếu cho cả kỹ thuật lẫn admin.
     ============================================================ */
  let dsPhieu = (pl.results || []).map(doiDong);
  let dsChat = ch.results || [];
  /* ============================================================
     CỬA VÀO KHÔNG BAO GIỜ KHOÁ, NHƯNG CHƯA CÓ VÉ THÌ CHƯA ĐƯỢC XEM PHIẾU.
     Màn "Bạn là ai?" cần danh sách người và cơ sở khi máy chưa có vé — nên
     đường này luôn trả lời. Nhưng ở ĐỢT 2 (khoa=true) nó chỉ trả danh mục:
     chọn tên xong, có vé, web tự gọi lại là có phiếu ngay.
     Danh mục không có gì kín — chỉ tên cơ sở và tên người trong danh sách
     chọn, thứ ai mở web cũng nhìn thấy.
     ĐỢT 1 (khoa=false) thì vẫn trả đủ: máy còn chạy bản web cũ chưa biết
     xin vé, cắt phiếu của họ là cắt việc giữa giờ làm.
     ============================================================ */
  if (khoa && !ve) { dsPhieu = []; dsChat = []; }
  else if (ve && ve.vai === 'coso' && ve.cs) {
    dsPhieu = dsPhieu.filter(p => String(p.co_so_id || '') === String(ve.cs));
    const cho = new Set(dsPhieu.map(p => String(p.id)));
    dsChat = dsChat.filter(c => cho.has(String(c.phieu_id)));
  }

  return {
    co_so: cs.results || [],
    gian_hang: gh.results || [],
    kt_nguoi: ai.results || [],
    phieu_loi: dsPhieu,
    chat: dsChat,
    kt_lich: (lc && lc.results) || [],
    doc: (cs.meta?.rows_read || 0) + (gh.meta?.rows_read || 0) +
      (ai.meta?.rows_read || 0) + (pl.meta?.rows_read || 0) + (ch.meta?.rows_read || 0)
  };
}

/* diễn biến của MỘT phiếu — mở phiếu nào tải phiếu đó.
   Trả kèm "ai đã xem tới lúc nào" (31/08) để vẽ avatar đã-xem dưới tin. */
async function dienBien(env, phieuId) {
  const r = await env.DB
    .prepare('select id,phieu_id,nguoi_ten,loai,noi_dung,anh,created_at from dien_bien where phieu_id=?1 order by id')
    .bind(String(phieuId)).all();
  let xem = [];
  try {
    const x = await env.DB.prepare('select nguoi_ten,luc,go from kt_da_xem where phieu_id=?1')
      .bind(String(phieuId)).all();
    xem = x.results || [];
  } catch (e) {
    /* bảng chưa có hoặc bảng cũ chưa có cột go — thử lại kiểu cũ */
    try {
      const x = await env.DB.prepare('select nguoi_ten,luc from kt_da_xem where phieu_id=?1')
        .bind(String(phieuId)).all();
      xem = x.results || [];
    } catch (e2) { /* chưa ai xem */ }
  }
  return { dien_bien: (r.results || []).map(doiDong), xem: xem, doc: r.meta?.rows_read || 0 };
}

/* ============================================================
   ĐÃ XEM TRAO ĐỔI (Trường chốt 31/08): mỗi người mở khung chat phiếu nào thì
   ghi "xem tới lúc nào" — một dòng mỗi (phiếu, người), chỉ cập nhật giờ.
   Bảng TỰ TẠO lần ghi đầu, khỏi phải chạy lệnh migration tay khi deploy.
   ============================================================ */
async function ghiXem(env, v) {
  const pid = String((v || {}).phieu_id || ''), ten = String((v || {}).nguoi_ten || '');
  if (!pid || !ten) throw new Error('Thiếu mã phiếu hoặc tên người xem');
  const luc = new Date().toISOString();
  /* go=1 nghĩa là ĐANG GÕ (31/08) — ghi mốc gõ vào cột go, gõ cũng tính là xem */
  const q = v && v.go
    ? 'insert into kt_da_xem (phieu_id,nguoi_ten,luc,go) values (?1,?2,?3,?3) ' +
      'on conflict(phieu_id,nguoi_ten) do update set luc=excluded.luc, go=excluded.go'
    : 'insert into kt_da_xem (phieu_id,nguoi_ten,luc) values (?1,?2,?3) ' +
      'on conflict(phieu_id,nguoi_ten) do update set luc=excluded.luc';
  const chay = () => env.DB.prepare(q).bind(pid, ten, luc).run();
  try { await chay(); }
  catch (e) {
    const loi = String(e && e.message || e);
    if (/no such table/i.test(loi)) {
      await env.DB.prepare('create table if not exists kt_da_xem (' +
        'phieu_id text not null, nguoi_ten text not null, luc text not null, go text, ' +
        'primary key (phieu_id, nguoi_ten))').run();
      await chay();
    } else if (/no column named go|has no column named go/i.test(loi)) {
      /* bảng tạo từ bản v69 chưa có cột go — tự vá, khỏi migration tay */
      await env.DB.prepare('alter table kt_da_xem add column go text').run();
      await chay();
    } else throw e;
  }
  return { ok: true, luc: luc };
}

/* máy đã bật thông báo đẩy — cho phần gửi thông báo */
async function mayDay(env, dsAi) {
  if (!dsAi || !dsAi.length) return [];
  /* Kho chỉ nhận tối đa 100 tham số một câu lệnh. Từ 21/09 bản tin 9h hỏi
     CẢ ĐỘI một lượt, nên đội đông lên là chạm trần — chia lô sẵn cho khỏi
     vỡ sau này. */
  if (dsAi.length > 90) {
    const ra = [];
    for (let i = 0; i < dsAi.length; i += 90) ra.push(...await mayDay(env, dsAi.slice(i, i + 90)));
    return ra;
  }
  const oh = dsAi.map((_, i) => '?' + (i + 1)).join(',');
  const lay = async cot => {
    const r = await env.DB
      .prepare('select ' + cot + ' from kt_day where bat=1 and nguoi_id in (' + oh + ')')
      .bind(...dsAi.map(String)).all();
    return r.results || [];
  };
  /* ============================================================
     CỘT rung NẰM TRÊN ĐƯỜNG GỬI THÔNG BÁO nên phải chịu lỗi tuyệt đối (21/09):
     kho cũ chưa có cột này mà câu lệnh đòi đọc là CẢ ĐƯỜNG ĐẨY CHẾT — im lặng
     toàn hệ thống, đúng kiểu hỏng vừa xảy ra. Thiếu cột thì tự thêm; thêm
     không được thì đọc kiểu cũ và coi như mọi máy đều bật rung.
     ============================================================ */
  try { return await lay('nguoi_id,endpoint,p256dh,auth,rung'); }
  catch (e) {
    try { await env.DB.prepare('alter table kt_day add column rung integer default 1').run(); } catch (x) { }
    try { return await lay('nguoi_id,endpoint,p256dh,auth,rung'); }
    catch (x) { return await lay('nguoi_id,endpoint,p256dh,auth'); }
  }
}
async function tatMay(env, dsEnd) {
  for (const e of dsEnd) {
    await env.DB.prepare('update kt_day set bat=0 where endpoint=?1').bind(String(e)).run().catch(() => { });
  }
}

/* ============================================================
   GHI — chèn / cập nhật, chỉ những bảng và cột đã cho phép
   ============================================================ */
async function ghi(env, v) {
  const bang = String(v.bang || '');
  const cho = CHO_GHI[bang];
  if (!cho) throw new Error('Không cho ghi bảng: ' + bang);

  const du = v.du || {};
  const cot = Object.keys(du).filter(c => cho.includes(c));
  if (!cot.length && v.kieu !== 'xoa') throw new Error('Không có cột nào hợp lệ để ghi vào ' + bang);
  const gt = cot.map(c => raGiaTri(c, du[c]));

  if (v.kieu === 'insert') {
    /* kt_day: một máy bật lại thì cập nhật chứa không thêm dòng mới */
    const dung = (bang === 'kt_day' && cot.includes('endpoint')) ? ' on conflict(endpoint) do update set ' +
      cot.filter(c => c !== 'endpoint').map((c, i) => c + '=excluded.' + c).join(',') : '';
    const q = 'insert into ' + bang + ' (' + cot.join(',') + ') values (' +
      cot.map((_, i) => '?' + (i + 1)).join(',') + ')' + dung;

    /* ============================================================
       HAI NGƯỜI BẤM GỬI CÙNG LÚC — CHỐNG TRÙNG MÃ PHIẾU (22/08/2026)
       Mã phiếu sinh kiểu "số lớn nhất + 1" ở bước riêng trước khi ghi. Hai CHS
       ở hai cơ sở bấm Gửi cách nhau nửa giây là cùng đọc ra một số → cùng xin
       KT-0100. Kho là chỗ DUY NHẤT biết chắc mã nào đã có, nên chặn ở đây:
       thấy mã bị chiếm thì tự lấy mã kế tiếp rồi ghi lại, và TRẢ VỀ mã thật để
       máy người gửi biết phiếu của mình mang số nào.
       Không dựa vào việc cột id có được đặt khoá chính hay không — bảng D1 dựng
       bằng tay, không có file schema trong repo để chắc chắn.
       ============================================================ */
    if (bang === 'phieu_loi' && du.id && /^KT-\d+$/.test(String(du.id))) {
      const iId = cot.indexOf('id');
      let ma = String(du.id);
      /* ============================================================
         VÁ 28/09 — DÒ TỪNG BƯỚC LÀ SAI CÁCH.
         Bản cũ thấy mã bị chiếm thì cộng 1 rồi thử lại, tối đa 25 lượt. Chạy
         êm suốt vì máy người gửi thường đoán sát đỉnh nên chỉ lệch 1-2 mã.
         Nhưng từ 22/09 cơ sở chỉ còn tải phiếu của CHÍNH MÌNH, nên máy đoán
         theo mã lớn nhất mà nó THẤY — cơ sở mới chưa có phiếu nào thì đoán ra
         KT-0001, cách đỉnh hơn 50 mã. Dò 25 lượt không tới nơi, ghi đại bằng
         mã đang bị chiếm → kho trả "UNIQUE constraint failed: phieu_loi.id"
         và cơ sở đó KHÔNG BÁO ĐƯỢC LỖI (Đan Phượng, MM Đà Nẵng, 3 cơ sở sắp
         khai trương đều dính).
         Giờ hỏi thẳng kho mã lớn nhất rồi +1: một câu lệnh, luôn ra mã trống,
         không còn trần nào để vượt. Vẫn giữ việc đoán mã ở máy để gửi nhanh —
         câu lệnh này chỉ chạy khi đoán trúng mã đã có.
         ============================================================ */
      const da = await env.DB.prepare('select id from phieu_loi where id = ?1').bind(ma).first();
      if (da) {
        const dinh = await env.DB.prepare(
          "select id from phieu_loi where id like 'KT-%' order by id desc limit 1").first();
        const n = dinh && /^KT-(\d+)$/.test(String(dinh.id)) ? Number(RegExp.$1) : 0;
        ma = 'KT-' + String(n + 1).padStart(4, '0');
        /* cực hiếm: hai người bấm gửi cùng giây, cả hai cùng nhận đỉnh+1.
           Nhích thêm vài bước cho người tới sau — lúc này chỉ lệch 1-2 mã. */
        for (let lan = 0; lan < 25; lan++) {
          const co = await env.DB.prepare('select id from phieu_loi where id = ?1').bind(ma).first();
          if (!co) break;
          ma = 'KT-' + String(Number(ma.slice(3)) + 1).padStart(4, '0');
        }
      }
      if (ma !== String(du.id)) {
        gt[iId] = ma;
        const r2 = await env.DB.prepare(q).bind(...gt).run();
        return { ok: true, id: r2.meta?.last_row_id, ma: ma, maCu: String(du.id), doiMa: true,
          ghi: r2.meta?.rows_written || 0 };
      }
    }

    const r = await env.DB.prepare(q).bind(...gt).run();
    return { ok: true, id: r.meta?.last_row_id, ghi: r.meta?.rows_written || 0 };
  }

  if (v.kieu === 'update') {
    if (!v.khoa && !v.theo) throw new Error('Cập nhật phải có khoá');
    /* theo = { cot: 'endpoint', gt: '...' } cho bảng không dùng id */
    const cotKhoa = v.theo ? String(v.theo.cot) : 'id';
    if (!cho.includes(cotKhoa) && cotKhoa !== 'id') throw new Error('Khoá không hợp lệ');
    const gtKhoa = v.theo ? v.theo.gt : v.khoa;
    const q = 'update ' + bang + ' set ' + cot.map((c, i) => c + '=?' + (i + 1)).join(',') +
      ' where ' + cotKhoa + '=?' + (cot.length + 1);
    const r = await env.DB.prepare(q).bind(...gt, gtKhoa).run();
    if (!r.meta || r.meta.changes === 0) throw new Error('Không tìm thấy dòng để cập nhật trong ' + bang);
    return { ok: true, ghi: r.meta?.rows_written || 0 };
  }

  if (v.kieu === 'xoa') {
    if (!CHO_XOA.includes(bang)) throw new Error('Không cho xoá bảng: ' + bang);
    const id = String(v.khoa || '');
    if (!id) throw new Error('Xoá phải có id');
    const r = await env.DB.prepare('delete from ' + bang + ' where id = ?1').bind(id).run();
    if (!r.meta || r.meta.changes === 0) throw new Error('Không tìm thấy dòng để xoá trong ' + bang);
    return { ok: true, xoa: r.meta?.changes || 0 };
  }

  throw new Error('Kiểu ghi lạ: ' + v.kieu);
}

/* mã phiếu mới — tính trong máy chủ để hai người bấm cùng lúc không trùng mã */
async function maMoi(env) {
  const r = await env.DB.prepare(
    "select id from phieu_loi where id like 'KT-%' order by id desc limit 1").first();
  const n = r && /^KT-(\d+)$/.test(r.id) ? Number(RegExp.$1) : 0;
  return 'KT-' + String(n + 1).padStart(4, '0');
}

/* AI ĐÃ BẬT THÔNG BÁO — cho bảng theo dõi của Admin (Trường xin 26/08).
   CHỈ trả về số máy và lần bật gần nhất. TUYỆT ĐỐI không trả endpoint/p256dh/auth
   ra ngoài: đó là chìa khoá gửi thông báo tới máy người ta. */
async function aiDaBat(env) {
  const r = await env.DB.prepare(
    'select nguoi_id, count(*) as so_may, max(created_at) as lan_cuoi ' +
    'from kt_day where bat=1 group by nguoi_id').all();
  return (r.results || []).map(x => ({
    nguoi_id: x.nguoi_id, so_may: Number(x.so_may) || 0, lan_cuoi: x.lan_cuoi
  }));
}

/* ============================================================
   ĐƯỜNG DẪN — worker.js gọi vào đây
   ============================================================ */
export async function tuyenD1(url, request, env, ve, khoa) {
  if (!url.pathname.startsWith('/api/db/')) return null;
  if (!env.DB) return new Response(JSON.stringify({ loi: 'Chưa gắn kho D1 (thiếu binding DB)' }),
    { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });

  const viec = url.pathname.slice(8);
  const ra = d => new Response(JSON.stringify(d), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

  try {
    if (viec === 'tai-het') return ra(await taiHet(env, url.searchParams.get('ngay'), ve, khoa));

    if (viec === 'dien-bien') {
      const id = url.searchParams.get('phieu');
      if (!id) return ra({ loi: 'Thiếu mã phiếu' });
      /* cùng luật ⑤: biết mã phiếu của cơ sở khác cũng không đọc được
         trao đổi trong đó (22/09) */
      if (ve && ve.vai === 'coso' && ve.cs) {
        const p = await env.DB.prepare('select co_so_id from phieu_loi where id=?1')
          .bind(String(id)).first().catch(() => null);
        if (!p || String(p.co_so_id || '') !== String(ve.cs)) return ra({ loi: 'Phiếu không thuộc cơ sở này' });
      }
      return ra(await dienBien(env, id));
    }

    if (viec === 'ma-moi') return ra({ ma: await maMoi(env) });
    if (viec === 'ghi-xem' && request.method === 'POST') return ra(await ghiXem(env, await request.json()));
    if (viec === 'ai-da-bat') return ra({ ds: await aiDaBat(env) });

    if (viec === 'ghi' && request.method === 'POST') {
      const v = await request.json();
      /* nhiều việc một lần: [{bang,kieu,du,khoa}, ...] */
      if (Array.isArray(v)) {
        const kq = [];
        for (const x of v) kq.push(await ghi(env, x));
        return ra({ ok: true, kq });
      }
      return ra(await ghi(env, v));
    }

    return ra({ loi: 'Không có đường này: ' + viec });
  } catch (e) {
    return new Response(JSON.stringify({ loi: String(e && e.message || e) }), {
      status: 400, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
}

export { mayDay, tatMay };
