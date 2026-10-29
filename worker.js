/* ============================================================
   Kỹ thuật IKID — Worker
   Việc duy nhất của file này: nhận ảnh/video rồi cất vào kho R2,
   và trả ảnh/video ra khi cần. Còn lại giao cho trang web tĩnh.

   Kho R2 để RIÊNG TƯ (không mở công khai) — file chỉ đi qua
   địa chỉ của web, không ai dò được kho.
   ============================================================ */

import { guiMot, guiNhieu, taoKhoa } from './push.js';
import { MAU_TIN, banTinSang } from './push-mau.js';
import { capVe, docVe, ghiSo, docSo } from './ve.js';
import { tuyenD1, mayDay, tatMay } from './d1.js';

const CHO_PHEP = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/webm', 'audio/mp4', 'audio/mpeg'   // để dành cho tin thoại
];
/* ============================================================
   DANH SÁCH NHÓM LỖI CHO AI (20/09). Giữ đúng 11 mã đang dùng trong web —
   đổi danh mục là hỏng mọi phiếu cũ và mọi biểu đồ. Phần mô tả viết theo
   THIẾT BỊ KHU VUI CHƠI vì đó là thứ đội thật sự báo hỏng, bộ dò từ khoá cũ
   thiếu hẳn phần này.
   ============================================================ */
const MA_NHOM = ['khoa_cua', 'camera', 'dien_den', 'san_tham', 'may_game',
  'do_choi', 'nuoc_ve_sinh', 'dieu_hoa', 'am_thanh', 'bien_bang', 'khac'];
const NHAC_AI = [
  'Bạn phân loại phiếu báo hỏng của khu vui chơi trẻ em.',
  'Đọc mô tả rồi trả về ĐÚNG MỘT mã trong danh sách, không giải thích, không thêm chữ nào.',
  '',
  'may_game — máy trò chơi: pinball, máy gắp thú, máy nhảy, máy đấm bốc, tàu điện Tutu Train,',
  '  toa tàu, đường ray, xe điện đụng, máy bán thẻ, lỗi nhả bi/nhả thẻ, máy chiếu trò chơi.',
  'do_choi — đồ chơi và khu chơi: nhà bóng, lưới, cầu trượt, zipline, móc dây, khu hạt ngô,',
  '  xe thú nhún, mascot, áo bọc xe, đồ chơi lẻ, dụng cụ DIY, xe cẩu khu hạt.',
  'dien_den — điện và chiếu sáng: bóng đèn, đèn LED, dây đèn, ổ điện, aptomat, chập cháy,',
  '  bình điện, ắc quy, sạc pin, mất điện.',
  'khoa_cua — khoá, cửa, tủ, kho: bản lề, chốt, tay nắm, cánh tủ lệch, cửa kẹt, ngăn kéo.',
  'san_tham — sàn và bề mặt: thảm bong, sàn nhựa, decal, gương, kính, vách.',
  'am_thanh — âm thanh và màn hình: loa, micro, tivi, màn hình, máy chiếu phim.',
  'camera — camera, wifi, mạng, máy in, máy tính tiền, đầu đọc thẻ.',
  'nuoc_ve_sinh — nước và vệ sinh: vòi nước, bồn rửa, thoát sàn, nhà vệ sinh.',
  'dieu_hoa — điều hoà, quạt, thông gió, quạt hút.',
  'bien_bang — biển hiệu, bảng giá, đồ trang trí, backdrop.',
  'khac — không thuộc nhóm nào ở trên.',
  '',
  'Quy tắc: phân loại theo THIẾT BỊ BỊ HỎNG, không theo bộ phận phụ trong câu.',
  'Ví dụ "lỗi đèn máy pinball" là may_game (máy pinball hỏng), không phải dien_den.',
  '"Áo xe thú điện bong da" là do_choi (lớp bọc xe rách), không phải dien_den.'
].join('\n');

const TOI_DA_ANH = 28 * 1024 * 1024;        // 28MB / ảnh (ảnh gốc điện thoại xịn ~10-15MB)
const TOI_DA_VIDEO = 95 * 1024 * 1024;      // 95MB / video gửi MỘT PHÁT (Cloudflare chặn request 100MB)
const TOI_DA_VIDEO_TO = 200 * 1024 * 1024;  // 200MB / video đi đường CẮT MẢNH (Trường chốt 01/09)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* ============================================================
       0a) ĐỌC VÉ (22/09) — máy chủ biết lời gọi này của ai.
       ĐỢT 1: CHƯA CHẶN AI. Máy nào còn giữ bản web cũ thì chưa biết xin vé;
       khoá ngay là họ tắc việc giữa giờ làm. Đợt này chỉ ghi sổ đếm, đợi số
       về 0 (mọi máy đã lên bản mới) rồi mới khoá thật ở đợt 2 — chỗ khoá đã
       dựng sẵn bên dưới, chỉ cần đổi KHOA_VE thành true.

       Bỏ qua mấy đường vốn phải mở: xin vé (chưa có vé mới đi xin), đọc sổ,
       lấy khoá đẩy công khai, nhập PIN, đo đường truyền.
       ============================================================ */
    const KHOA_VE = false;                 /* ĐỢT 2: đổi thành true để khoá */
    const MO_SAN = ['/api/ve', '/api/ve-so', '/api/day-khoa', '/api/day-tao-khoa',
      '/api/pin', '/api/do-duong'];
    /* chan-doan CỐ TÌNH không nằm trong MO_SAN: phải để nó đi qua đường đọc vé
       thì mới trả lời được câu "máy chủ có đọc ra vé không" */
    const canVe = url.pathname.startsWith('/api/') && !MO_SAN.includes(url.pathname);
    const veNay = canVe ? await docVe(env, request) : null;
    /* ============================================================
       PHÂN BIỆT "CHƯA CHỌN TÊN" VỚI "MÁY BẢN CŨ" (24/09).
       Người vừa mở web thì chưa biết mình là ai để xin vé, nhưng vẫn phải
       hỏi danh sách người — đó là lượt gọi LÀNH, không được tính vào sổ và
       đợt 2 cũng không được khoá, khoá là không ai vào nổi web.
       Bản web từ 182 trở đi tự khai số bản qua x-kt-ban. Không có số bản =
       máy còn chạy bản cũ thật = thứ cần đếm.
       Tai-het KHÔNG khoá bao giờ: nó là cửa vào. Ở đợt 2 nó vẫn trả lời máy
       chưa có vé, nhưng chỉ trả danh mục (tên cơ sở, tên người) chứ không
       trả phiếu — xem taiHet trong d1.js.
       ============================================================ */
    const banWeb = request.headers.get('x-kt-ban') || '';
    const CUA_VAO = ['/api/db/tai-het'];
    if (canVe && !veNay) {
      if (!banWeb) ctx.waitUntil(ghiSo(env, url.pathname));
      if (KHOA_VE && !CUA_VAO.includes(url.pathname)) {
        return json({ loi: 'Phiên đã cũ — mở lại app là xong' }, 401);
      }
    }

    /* ============================================================
       ĐƯỜNG CHẨN ĐOÁN (28/09). Sau khi deploy, giao diện lên v193 và kho đã có
       cột mới, nhưng đường xoá phiếu vẫn cho lọt lời gọi KHÔNG CÓ VÉ — tức là
       phần kiểm vé trong file này không chạy. Ba khả năng: file chưa lên, vé
       đọc không ra, hoặc tao hiểu sai luồng. Đường này trả lời thẳng câu đó.
       KHÔNG TRẢ RA GÌ KÍN: chỉ nói có đọc được vé hay không và vai gì — không
       có nội dung vé, không có khoá, không có dữ liệu phiếu.
       ============================================================ */
    if (url.pathname === '/api/chan-doan') {
      return json({
        banWorker: '2026-09-28-a',
        coDongKiemVe: true,               /* dòng này chỉ có ở bản mới */
        coVeKhong: !!veNay,
        vaiTrongVe: veNay ? veNay.vai : null,
        coSoTrongVe: veNay ? veNay.cs : null,
        canVe: canVe,
        khoaVe: KHOA_VE
      });
    }

    /* ---------- 0) Cơ sở dữ liệu D1 ----------
       Điện thoại gọi /api/db/..., Worker nói với D1.
       Khoá cơ sở dữ liệu không còn nằm trong mã trang web. */
    const d1 = await tuyenD1(url, request, env, veNay, KHOA_VE);
    if (d1) return d1;

    /* ---------- 1) Tải file lên ---------- */
    if (url.pathname === '/api/tai-len' && request.method === 'POST') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2 (thiếu binding ANH)' }, 500);

      const kieu = (request.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (!CHO_PHEP.includes(kieu)) return json({ loi: 'Không nhận loại file này: ' + kieu }, 415);

      const dai = Number(request.headers.get('content-length') || 0);
      const tran = kieu.startsWith('video') ? TOI_DA_VIDEO : TOI_DA_ANH;
      if (dai > tran) return json({ loi: 'File quá nặng (' + Math.round(dai / 1048576) + 'MB, tối đa ' + Math.round(tran / 1048576) + 'MB)' }, 413);

      const phieu = sach(url.searchParams.get('phieu') || '') || 'chung';
      const duoi = ({
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
        'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
        'audio/webm': 'weba', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3'
      })[kieu] || 'bin';

      /* tên do máy người dùng đặt (để gửi kèm bản nhỏ cùng tên), có làm sạch */
      const dat = sach(url.searchParams.get('ten') || '');
      const khoa = 'kt/' + phieu + '/' + (dat || (Date.now() + '-' + Math.random().toString(36).slice(2, 8))) + '.' + duoi;
      await env.ANH.put(khoa, request.body, {
        httpMetadata: { contentType: kieu, cacheControl: 'public, max-age=31536000, immutable' },
        customMetadata: {
          phieu: phieu,
          nguoi: (url.searchParams.get('nguoi') || '').slice(0, 60),
          luc: new Date().toISOString()
        }
      });
      return json({ url: '/anh/' + khoa, khoa: khoa, kieu: kieu });
    }

    /* ---------- 1b) VIDEO TO: cắt mảnh 80MB gửi nhiều phát rồi ghép trên kho ----------
       Cloudflare chặn mỗi request 100MB nên video 95-200MB phải đi đường này.
       3 bước: tao (mở phiên ghép) → manh (gửi từng khúc) → xong (ghép lại).      */
    if (url.pathname === '/api/tai-len-to' && request.method === 'POST') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2 (thiếu binding ANH)' }, 500);
      const buoc = url.searchParams.get('buoc');

      if (buoc === 'tao') {
        const kieu = (url.searchParams.get('kieu') || '').toLowerCase();
        if (!CHO_PHEP.includes(kieu) || !kieu.startsWith('video')) return json({ loi: 'Đường này chỉ nhận video: ' + kieu }, 415);
        const tong = Number(url.searchParams.get('tong') || 0);
        if (tong > TOI_DA_VIDEO_TO) return json({ loi: 'Video quá nặng (' + Math.round(tong / 1048576) + 'MB, tối đa 200MB)' }, 413);
        const phieu = sach(url.searchParams.get('phieu') || '') || 'chung';
        const duoi = ({ 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' })[kieu] || 'mp4';
        const khoa = 'kt/' + phieu + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + duoi;
        const mp = await env.ANH.createMultipartUpload(khoa, {
          httpMetadata: { contentType: kieu, cacheControl: 'public, max-age=31536000, immutable' },
          customMetadata: {
            phieu: phieu, nguoi: (url.searchParams.get('nguoi') || '').slice(0, 60),
            luc: new Date().toISOString()
          }
        });
        return json({ khoa: khoa, up: mp.uploadId });
      }

      if (buoc === 'manh') {
        const khoa = String(url.searchParams.get('khoa') || ''), up = String(url.searchParams.get('up') || '');
        const n = Number(url.searchParams.get('n') || 0);
        if (!khoa.startsWith('kt/') || !up || !n) return json({ loi: 'Thiếu khoá / phiên / số khúc' }, 400);
        const mp = env.ANH.resumeMultipartUpload(khoa, up);
        const phan = await mp.uploadPart(n, request.body);
        return json({ n: phan.partNumber, etag: phan.etag });
      }

      if (buoc === 'xong') {
        const b = await request.json().catch(() => ({}));
        const khoa = String(b.khoa || ''), up = String(b.up || '');
        if (!khoa.startsWith('kt/') || !up || !Array.isArray(b.manh) || !b.manh.length) return json({ loi: 'Thiếu dữ liệu ghép' }, 400);
        const mp = env.ANH.resumeMultipartUpload(khoa, up);
        await mp.complete(b.manh.map(x => ({ partNumber: Number(x.n), etag: String(x.etag) })));
        return json({ url: '/anh/' + khoa, khoa: khoa });
      }

      if (buoc === 'huy') {
        const b = await request.json().catch(() => ({}));
        if (String(b.khoa || '').startsWith('kt/') && b.up) {
          try { await env.ANH.resumeMultipartUpload(String(b.khoa), String(b.up)).abort(); } catch (e) { }
        }
        return json({ ok: true });
      }
      return json({ loi: 'Bước lạ: ' + buoc }, 400);
    }

    /* ---------- 2) Trả file ra ---------- */
    if (url.pathname.startsWith('/anh/')) {
      if (!env.ANH) return new Response('Chưa bật kho R2', { status: 500 });
      const khoa = decodeURIComponent(url.pathname.slice(5));

      /* VIDEO PHẢI TRẢ TỪNG KHÚC (Range/206): iPhone luôn xin "bytes=0-1" trước khi
         phát video; không trả 206 là Safari phát ì ạch, TUA không được, có khi phải
         tải cả file 60MB mới chạy. Range thì KHÔNG đi qua cache (cache không phân
         biệt được khúc nào với khúc nào). */
      const doiKhuc = request.headers.get('range');
      if (doiKhuc) {
        const m = /bytes=(\d*)-(\d*)/.exec(doiKhuc);
        const dau = m && m[1] ? parseInt(m[1], 10) : 0;
        const xinCuoi = m && m[2] ? parseInt(m[2], 10) : NaN;
        const o = await env.ANH.get(khoa, {
          range: isNaN(xinCuoi) ? { offset: dau } : { offset: dau, length: xinCuoi - dau + 1 }
        });
        if (!o) return new Response('Không có file này', { status: 404 });
        const tong = o.size;
        const dai = (o.range && o.range.length) ? o.range.length : tong - dau;
        const h = new Headers();
        o.writeHttpMetadata(h);
        h.set('etag', o.httpEtag);
        h.set('accept-ranges', 'bytes');
        h.set('content-range', 'bytes ' + dau + '-' + (dau + dai - 1) + '/' + tong);
        h.set('content-length', String(dai));
        h.set('cache-control', 'public, max-age=31536000, immutable');
        return new Response(o.body, { status: 206, headers: h });
      }

      const cache = caches.default;
      const daCo = await cache.match(request);
      if (daCo) return daCo;

      const o = await env.ANH.get(khoa);
      if (!o) return new Response('Không có file này', { status: 404 });

      const h = new Headers();
      o.writeHttpMetadata(h);
      h.set('etag', o.httpEtag);
      h.set('accept-ranges', 'bytes');
      h.set('cache-control', 'public, max-age=31536000, immutable');
      const res = new Response(o.body, { headers: h });
      ctx.waitUntil(cache.put(request, res.clone()));
      return res;
    }

    /* ---------- 3) Xoá file (chỉ khi bỏ ảnh vừa chọn) ---------- */
    /* ---------- ĐO ĐƯỜNG TRUYỀN (09/09 — Trường: "5G mà đẩy ảnh siêu chậm,
       không hiểu tại sao tối qua nhanh") ----------
       Nhận byte rồi BỎ, không lưu vào R2 — đo được đường lên mà không chất rác.
       GET thì trả gói byte để đo đường xuống. Nhờ vậy tách được ba nguyên nhân:
       máy chủ chậm · đường LÊN chậm · đường XUỐNG chậm. */
    if (url.pathname === '/api/do-duong') {
      if (request.method === 'POST') {
        let co = 0;
        const doc = request.body && request.body.getReader ? request.body.getReader() : null;
        if (doc) { for (;;) { const { done, value } = await doc.read(); if (done) break; co += (value && value.length) || 0; } }
        return json({ co: co, luc: Date.now() });
      }
      const n = Math.min(4 * 1024 * 1024, Math.max(1024, Number(url.searchParams.get('co') || 262144)));
      return new Response(new Uint8Array(n), {
        headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
      });
    }

    if (url.pathname === '/api/bo-file' && request.method === 'POST') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2' }, 500);
      const { khoa } = await request.json().catch(() => ({}));
      if (!khoa || !String(khoa).startsWith('kt/')) return json({ loi: 'Khoá không hợp lệ' }, 400);
      await env.ANH.delete(String(khoa));
      return json({ ok: true });
    }

    /* ---------- 4) Xem kho còn bao nhiêu ---------- */
    if (url.pathname === '/api/kho') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2' }, 500);
      let so = 0, byte = 0, con = undefined;
      do {
        const r = await env.ANH.list({ prefix: 'kt/', limit: 1000, cursor: con });
        r.objects.forEach(o => { so++; byte += o.size; });
        con = r.truncated ? r.cursor : undefined;
      } while (con);
      return json({ soFile: so, dungLuong: byte, mb: Math.round(byte / 1048576) });
    }

    /* ============================================================
       AI ĐANG MỞ PHIẾU NÀY (21/10 — Trường chốt sau khi xem bộ hiệu ứng của
       web Camera Audit).

       MỘT LƯỢT GỌI LÀM HAI VIỆC: web báo "máy này đang mở phiếu X", máy chủ
       ghi xuống rồi trả ngay danh sách NGƯỜI KHÁC đang mở cùng phiếu đó. Gọi
       20 giây một lần trong lúc ngăn chi tiết còn mở.
       Tách làm hai đường (một để báo, một để hỏi) thì tốn gấp đôi lượt gọi mà
       chẳng được gì thêm.

       KHOÁ CHÍNH LÀ MÃ MÁY, KHÔNG PHẢI MÃ NGƯỜI. Bốn năm admin dùng chung mã
       'ql' — khoá theo người thì người này mở phiếu là đá văng người kia ra.
       Còn một người mở hai máy thì gộp lại khi hiện tên, xem phần lọc dưới.

       CŨ HƠN 45 GIÂY = ĐÃ RỜI ĐI. Không cần đường "tôi đóng phiếu rồi": đóng
       web, mất sóng, hết pin — mọi kiểu rời đi đều tự hết hạn như nhau.
       ============================================================ */
    if (url.pathname === '/api/dang-xem' && request.method === 'POST') {
      if (!env.DB) return json({ ds: [] });
      const b = await request.json().catch(() => ({}));
      const phieu = String(b.phieu || '').slice(0, 40);
      const may = String(b.may || '').slice(0, 120);
      const ai = String(b.ai || '').slice(0, 60);
      const ten = String(b.ten || '').slice(0, 60);
      if (!phieu || !may) return json({ ds: [] });
      const gio = Date.now();

      try {
        await env.DB.prepare(
          'insert into kt_dang_xem (may, phieu_id, nguoi_id, nguoi_ten, luc) values (?1,?2,?3,?4,?5) ' +
          'on conflict(may) do update set phieu_id=?2, nguoi_id=?3, nguoi_ten=?4, luc=?5'
        ).bind(may, phieu, ai, ten, gio).run();
      } catch (e) { return json({ ds: [] }); }

      /* dọn dòng chết — làm ngay ở đây cho khỏi phải thêm một việc cho cron.
         Bảng này nhiều nhất cũng chỉ vài chục dòng nên quét cả bảng không sao. */
      try { await env.DB.prepare('delete from kt_dang_xem where luc < ?1').bind(gio - 120000).run(); } catch (e) { }

      const r = await env.DB.prepare(
        'select nguoi_id, nguoi_ten from kt_dang_xem where phieu_id=?1 and may<>?2 and luc > ?3'
      ).bind(phieu, may, gio - 45000).all().catch(() => ({ results: [] }));

      /* gộp theo NGƯỜI: ai mở hai máy vẫn chỉ hiện một tên */
      const thay = new Set(); const ds = [];
      (r.results || []).forEach(x => {
        const k = String(x.nguoi_id || x.nguoi_ten || '');
        if (!k || thay.has(k)) return;
        thay.add(k); ds.push(x.nguoi_ten || '');
      });
      return json({ ds: ds });
    }

    /* ============================================================
       SAO LƯU — BA ĐƯỜNG (20/10)
         GET  /api/sao-luu          → liệt kê các bản đang có
         POST /api/sao-luu          → chạy sao lưu ngay, không đợi 2 giờ sáng
         GET  /api/sao-luu-tai?t=…  → tải một bản về máy

       Đường tải KHÔNG nằm trong MO_SAN nên vẫn phải có vé phiên, và nó trả về
       toàn bộ phiếu lẫn tin nhắn — đúng thứ không được để lộ ra ngoài.
       ============================================================ */
    if (url.pathname === '/api/sao-luu') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2' }, 500);
      if (request.method === 'POST') {
        const kq = await chaySaoLuu(env);
        return json(kq, kq.loi ? 500 : 200);
      }
      const ds = [];
      let con;
      do {
        const r = await env.ANH.list({ prefix: 'sao-luu/', limit: 1000, cursor: con, include: ['customMetadata'] });
        r.objects.forEach(o => ds.push({
          ten: o.key.replace('sao-luu/', '').replace('.json', ''),
          kb: Math.round(o.size / 1024),
          luc: o.uploaded,
          soPhieu: Number((o.customMetadata || {}).soPhieu || 0),
          soTin: Number((o.customMetadata || {}).soTin || 0)
        }));
        con = r.truncated ? r.cursor : undefined;
      } while (con);
      ds.sort((a, b) => a.ten < b.ten ? 1 : -1);          /* mới nhất lên đầu */
      return json({ ds: ds, giu: SAO_LUU_GIU });
    }

    /* ============================================================
       DỌN FILE MỒ CÔI (20/10) — file nằm trong kho mà KHÔNG phiếu nào, KHÔNG
       tin nhắn nào trỏ tới. Đo ngày 20/10: 734 file / 545 MB, hơn nửa kho.

       Phần lớn sinh ra từ lỗi ngăn 'moi' ở trên: ảnh của phiếu đã xoá thì nằm
       lại vì lệnh xoá cũ tìm không ra. Số còn lại là ảnh gửi lên rồi người
       dùng bỏ không tạo phiếu, hoặc gỡ khỏi phiếu sau khi gửi.

       AN TOÀN: dựng tập địa chỉ ĐANG DÙNG từ cả ba nguồn (anh_truoc, anh_sau,
       anh của diễn biến) rồi chỉ xoá thứ KHÔNG nằm trong tập đó. Thêm điều
       kiện cũ hơn N ngày để ảnh vừa gửi mà phiếu chưa lưu kịp không bị cuốn.
       Mặc định 7 ngày.

       Bỏ qua hẳn ngăn sao-luu/ — đó là bản sao, không phải rác.
       ============================================================ */
    if (url.pathname === '/api/rac') {
      if (!env.DB || !env.ANH) return json({ loi: 'Chưa nối D1 hoặc R2' }, 500);
      const ngay = Math.max(1, Math.min(365, Number(url.searchParams.get('ngay') || 7)));
      const moc = Date.now() - ngay * 86400000;

      const [pa, da] = await env.DB.batch([
        env.DB.prepare('select anh_truoc, anh_sau from phieu_loi'),
        env.DB.prepare('select anh from dien_bien')
      ]);
      const dung = new Set();
      const nap = (cot) => {
        let arr = cot;
        if (typeof cot === 'string') { try { arr = JSON.parse(cot || '[]'); } catch (x) { arr = []; } }
        if (!Array.isArray(arr)) return;
        for (const u of arr) {
          const m = /^\/anh\/(.+)$/.exec(String(u || '').split('?')[0]);
          /* GIỮ cả bản nhỏ — không có dòng này là dọn rác xoá sạch ảnh thu nhỏ
             của mọi phiếu đang dùng (xem ghi chú khoaVaBanNho) */
          if (m && m[1]) khoaVaBanNho(decodeURIComponent(m[1])).forEach(k => dung.add(k));
        }
      };
      (pa.results || []).forEach(p => { nap(p.anh_truoc); nap(p.anh_sau); });
      (da.results || []).forEach(d => nap(d.anh));

      let soRac = 0, byteRac = 0, soDung = 0, byteDung = 0;
      const khoaRac = [];
      /* XEM TRƯỚC (20/10 — Trường: "file rác đó là những file thật à hay file
         nào"). Đếm thì dễ tin, nhưng xoá 491 file mà không biết chúng là gì
         thì liều. Gom mẫu để người bấm nhìn tận mắt trước khi quyết:
           · 12 khoá đầu kèm ngày tải lên và cỡ
           · chia theo NGĂN (kt/moi, kt/KT-0012…) để thấy rác nằm ở đâu
           · chia theo THÁNG tải lên để thấy rác cũ hay mới */
      const mau = [], theoNgan = {}, theoThang = {};
      let con;
      do {
        const r = await env.ANH.list({ prefix: 'kt/', limit: 1000, cursor: con });
        for (const o of r.objects) {
          if (dung.has(o.key)) { soDung++; byteDung += o.size; continue; }
          if (new Date(o.uploaded).getTime() > moc) continue;   /* mới quá, để yên */
          soRac++; byteRac += o.size; khoaRac.push(o.key);
          const ng = (/^kt\/([^/]+)\//.exec(o.key) || [])[1] || '(gốc)';
          theoNgan[ng] = (theoNgan[ng] || 0) + 1;
          const th = String(o.uploaded).slice(0, 7);
          theoThang[th] = (theoThang[th] || 0) + 1;
          if (mau.length < 12) mau.push({
            khoa: o.key, kb: Math.round(o.size / 1024),
            luc: String(o.uploaded).slice(0, 10),
            laNho: /-nho\.\w+$/i.test(o.key)
          });
        }
        con = r.truncated ? r.cursor : undefined;
      } while (con);

      let xoaThat = false;
      if (request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        xoaThat = b && b.xacNhan === 'XOA';
      }
      if (!xoaThat) {
        const xep = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([k, v]) => ({ ten: k, so: v }));
        return json({
          thu: true, ngay: ngay,
          soRac: soRac, mbRac: Math.round(byteRac / 1048576 * 10) / 10,
          soDung: soDung, mbDung: Math.round(byteDung / 1048576 * 10) / 10,
          mau: mau, theoNgan: xep(theoNgan), theoThang: xep(theoThang)
        });
      }
      /* xoá thật — đòi vé PIN quản lý y như đường xoá theo khoảng ngày */
      const ve2 = request.headers.get('x-ve') || '';
      const co2 = ve2 && await env.DB.prepare('select v from kt_khoa where k=?1').bind('ve-' + ve2).first().catch(() => null);
      const pin2 = await env.DB.prepare("select v from kt_khoa where k='pin'").first().catch(() => null);
      if (pin2 && !co2) return json({ loi: 'Cần mã PIN quản lý — vào lại bằng vai quản lý và nhập PIN' }, 403);

      let da2 = 0;
      for (let i = 0; i < khoaRac.length; i += 900) {
        await env.ANH.delete(khoaRac.slice(i, i + 900));
        da2 += Math.min(900, khoaRac.length - i);
      }
      return json({ daXoaFile: da2, mb: Math.round(byteRac / 1048576 * 10) / 10 });
    }

    /* ============================================================
       DỌN MÁY ĐĂNG KÝ DƯỚI MÃ NGƯỜI KHÔNG CÒN TỒN TẠI (20/10).

       Đo ngày 20/10: sổ thông báo có 15 dòng, trong đó 3 dòng mang mã
       'tho_tuan' (2 máy) và 'cs_CS02' (1 máy) — hai mã này không còn trong
       bảng kt_nguoi nữa. Người đổi mã (Hoàng Văn Tuân giờ mang mã
       ktu_<uuid>), máy cũ vẫn nằm trong sổ nhưng web gửi theo mã mới nên ba
       điện thoại đó không bao giờ kêu. Tệ hơn cả không bật: người ta tưởng
       mình đã bật rồi.

       KHÔNG nhận mã từ bên ngoài. Tự đối chiếu sổ với bảng người: mã nào
       không còn ai mang thì mới dọn. Như vậy không thể gõ nhầm mà xoá nhầm
       máy của người đang dùng.
       ============================================================ */
    if (url.pathname === '/api/day-don-ma-cu') {
      if (!env.DB) return json({ loi: 'Chưa nối D1' }, 500);
      const [so, ng] = await env.DB.batch([
        env.DB.prepare('select nguoi_id, nguoi_ten, vai, count(*) as so from kt_day where bat=1 group by nguoi_id'),
        env.DB.prepare('select id from kt_nguoi')
      ]);
      const con = new Set((ng.results || []).map(x => String(x.id)));
      const moCoi = (so.results || []).filter(x => !con.has(String(x.nguoi_id)));

      let xoaThat = false;
      if (request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        xoaThat = b && b.xacNhan === 'XOA';
      }
      if (!xoaThat) {
        return json({
          thu: true,
          moCoi: moCoi.map(x => ({ ma: x.nguoi_id, ten: x.nguoi_ten || '', vai: x.vai || '', soMay: x.so })),
          tongMay: moCoi.reduce((s, x) => s + x.so, 0)
        });
      }
      /* xoá thật — đòi vé PIN quản lý như mọi đường phá huỷ khác */
      const ve3 = request.headers.get('x-ve') || '';
      const co3 = ve3 && await env.DB.prepare('select v from kt_khoa where k=?1').bind('ve-' + ve3).first().catch(() => null);
      const pin3 = await env.DB.prepare("select v from kt_khoa where k='pin'").first().catch(() => null);
      if (pin3 && !co3) return json({ loi: 'Cần mã PIN quản lý — vào lại bằng vai quản lý và nhập PIN' }, 403);

      let daXoa = 0;
      for (const x of moCoi) {
        const r = await env.DB.prepare('delete from kt_day where nguoi_id=?1')
          .bind(String(x.nguoi_id)).run().catch(() => null);
        daXoa += (r && r.meta && r.meta.changes) || 0;
      }
      return json({ daXoa: daXoa, soMa: moCoi.length });
    }

    if (url.pathname === '/api/sao-luu-tai') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2' }, 500);
      const t = String(url.searchParams.get('t') || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return json({ loi: 'Cần ngày dạng 2026-10-20' }, 400);
      const o = await env.ANH.get('sao-luu/' + t + '.json');
      if (!o) return json({ loi: 'Không có bản sao ngày ' + t }, 404);
      return new Response(o.body, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': 'attachment; filename="ikid-sao-luu-' + t + '.json"',
          'cache-control': 'no-store'
        }
      });
    }

    /* ============================================================
       AI ĐỌC NỘI DUNG, ĐOÁN NHÓM LỖI (20/09/2026)
       Trường: "nên cài tính năng AI quét phần báo lỗi của cơ sở để nó nhận
       diện nhóm lỗi luôn".

       Vì sao cần: nhóm lỗi trước nay do một bộ DÒ TỪ KHOÁ đoán, và bộ đó viết
       cho lỗi nhà xưởng (khoá, cửa, kho, điện, nước) — không có chữ nào của
       khu vui chơi. Đo trên 23 phiếu thật ngày 14/09: SAI 43%. "Pinball kẹt
       bi" ra Khoá–cửa, "Sửa máy pinball" ra Nước–vệ sinh, "Áo xe thú điện
       bong da" ra Điện–đèn. Ba màn ăn dữ liệu đó đều lệch theo: biểu đồ lỗi
       hay lặp, vòng tròn nhóm lỗi tháng, cột "giỏi nhóm lỗi" của thợ.

       Chạy trên Workers AI — cùng nhà với web, không cần khoá API, dữ liệu
       không rời Cloudflare. Model nhỏ nhất đủ việc; trả về ĐÚNG MỘT mã nhóm.
       Nhiệt độ 0 cho cùng một câu luôn ra cùng một đáp án.
       ============================================================ */
    if (url.pathname === '/api/ai-nhom' && request.method === 'POST') {
      if (!env.AI) return json({ loi: 'Chưa bật AI trong wrangler.toml' }, 500);
      let b = {};
      try { b = await request.json(); } catch (e) { }
      const ds = Array.isArray(b.ds) ? b.ds.slice(0, 40) : [{ id: b.id || '', chu: b.chu || '' }];
      const ra = [];
      for (const x of ds) {
        const chu = String(x.chu || '').slice(0, 400).trim();
        if (!chu) { ra.push({ id: x.id, nhom: '' }); continue; }
        try {
          const kq = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
            messages: [
              { role: 'system', content: NHAC_AI },
              { role: 'user', content: chu }
            ],
            temperature: 0, max_tokens: 12
          });
          const tra = String((kq && (kq.response || kq.result)) || '').toLowerCase();
          /* model hay trả kèm chữ thừa — bắt đúng mã nhóm nằm trong câu */
          const ma = MA_NHOM.find(m => tra.includes(m));
          ra.push({ id: x.id, nhom: ma || '' });
        } catch (e) { ra.push({ id: x.id, nhom: '', loi: String(e.message || e).slice(0, 80) }); }
      }
      return json({ ds: ra });
    }

    /* ---------- 5) Dọn kho theo chu kỳ ----------
       Mặc định chỉ ĐẾM (thử), không xoá. Muốn xoá thật phải gửi
       POST kèm { xacNhan: 'XOA' } — để không ai bấm nhầm.        */
    if (url.pathname === '/api/don-kho') {
      if (!env.ANH) return json({ loi: 'Chưa bật kho R2' }, 500);
      const thang = Math.max(1, Math.min(60, Number(url.searchParams.get('thang') || 6)));
      const moc = Date.now() - thang * 30 * 86400000;

      let xoaThat = false;
      if (request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        xoaThat = b && b.xacNhan === 'XOA';
      }
      /* XOÁ THẬT phải có VÉ quản lý (01/09) — link admin lộ cũng không dọn kho được */
      if (xoaThat && env.DB) {
        const ve = request.headers.get('x-ve') || '';
        const co = ve && await env.DB.prepare('select v from kt_khoa where k=?1').bind('ve-' + ve).first().catch(() => null);
        const daDatPin = await env.DB.prepare("select v from kt_khoa where k='pin'").first().catch(() => null);
        if (daDatPin && !co) return json({ loi: 'Cần mã PIN quản lý — vào lại bằng vai quản lý và nhập PIN' }, 403);
      }

      let cu = [], soTat = 0, byteTat = 0, con = undefined;
      do {
        const r = await env.ANH.list({ prefix: 'kt/', limit: 1000, cursor: con, include: ['customMetadata'] });
        for (const o of r.objects) {
          soTat++; byteTat += o.size;
          const luc = new Date(o.uploaded).getTime();
          if (luc < moc) cu.push({ khoa: o.key, size: o.size, luc: o.uploaded });
        }
        con = r.truncated ? r.cursor : undefined;
      } while (con);

      const byteCu = cu.reduce((a, b) => a + b.size, 0);
      if (!xoaThat) {
        return json({
          thu: true, thang: thang,
          seXoa: cu.length, seXoaMb: Math.round(byteCu / 1048576),
          conLai: soTat - cu.length, conLaiMb: Math.round((byteTat - byteCu) / 1048576),
          cuNhat: cu.length ? cu.map(x => x.luc).sort()[0] : null
        });
      }
      for (let i = 0; i < cu.length; i += 900) {
        await env.ANH.delete(cu.slice(i, i + 900).map(x => x.khoa));
      }
      return json({ daXoa: cu.length, daXoaMb: Math.round(byteCu / 1048576), conLai: soTat - cu.length });
    }

    /* ============================================================
       5a-bis) XOÁ SẠCH MỘT KHOẢNG THỜI GIAN (Trường chốt 09/09).
       Trường: "khi dọn thì sẽ xoá toàn bộ dữ liệu bao gồm phiếu và ảnh và
       video của quãng thời gian đó, khi nào tao thích xoá thì tao xoá, xoá
       trong khoảng thời gian nào là việc của tao."
       Nên đường này xoá HẲN, không phải ẩn: phiếu + diễn biến + nhật ký +
       dấu đã xem + toàn bộ ảnh/video của những phiếu đó trên kho.
       Cửa chặn: phải có vé PIN quản lý, phải gõ đúng chữ XOA.
       GET = xem trước (đếm, không xoá gì). POST = xoá thật.
       ============================================================ */
    if (url.pathname === '/api/xoa-khoang') {
      if (!env.DB) return json({ loi: 'Chưa nối D1' }, 500);
      const tu = String(url.searchParams.get('tu') || '').slice(0, 10);
      const den = String(url.searchParams.get('den') || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tu) || !/^\d{4}-\d{2}-\d{2}$/.test(den))
        return json({ loi: 'Cần khoảng ngày dạng 2026-01-31' }, 400);
      const tu0 = tu + 'T00:00:00.000Z', den0 = den + 'T23:59:59.999Z';

      const ds = await env.DB.prepare(
        'select id, ngay_tao, anh_truoc, anh_sau from phieu_loi where ngay_tao >= ?1 and ngay_tao <= ?2'
      ).bind(tu0, den0).all().catch(() => ({ results: [] }));
      const phieus = ds.results || [];
      const ids = phieus.map(x => x.id);

      /* đếm tin trao đổi — đếm theo KHOẢNG NGÀY của phiếu, một câu lệnh duy
         nhất, khỏi chia lô hàng chục lượt như bản trước */
      let soTin = 0;
      let tinAnh = { results: [] };
      if (ids.length) {
        const r = await env.DB.prepare(
          'select count(*) as n from dien_bien where phieu_id in (select id from phieu_loi where ngay_tao >= ?1 and ngay_tao <= ?2)'
        ).bind(tu0, den0).first().catch(() => null);
        soTin = (r && r.n) || 0;
        /* lấy luôn cột ảnh của mấy tin đó — ảnh gửi trong lúc trao đổi cũng
           phải xoá theo phiếu */
        tinAnh = await env.DB.prepare(
          'select anh from dien_bien where phieu_id in (select id from phieu_loi where ngay_tao >= ?1 and ngay_tao <= ?2)'
        ).bind(tu0, den0).all().catch(() => ({ results: [] }));
      }

      /* ============================================================
         TÌM ẢNH THEO ĐỊA CHỈ GHI TRONG PHIẾU — KHÔNG ĐOÁN THEO TÊN NGĂN.

         LỖI CŨ (phát hiện 20/10, Trường hỏi "xoá xong có hồi lại chỗ không"):
         bản trước lọc file theo công thức "ngăn mang tên mã phiếu", tức
         kt/KT-0093/... Nhưng lúc cơ sở chọn ảnh thì phiếu CHƯA có mã — mã chỉ
         cấp khi bấm Gửi — nên ảnh được cất tạm vào ngăn 'moi' và nằm lì ở đó
         mãi mãi. Đo trên kho thật: 998 file / 1012 MB, mà xoá sạch MỌI phiếu
         từ 2020 đến 2035 cũng chỉ gỡ được 264 file / 467 MB. 545 MB nằm lại
         vĩnh viễn, không đường nào chạm tới.

         GIỜ: đọc thẳng cột anh_truoc, anh_sau của phiếu và cột anh của diễn
         biến, lấy đúng khoá từ địa chỉ /anh/<khoá>. Ảnh nằm ngăn nào không
         quan trọng nữa. Cách này còn nhẹ hơn: không phải quét cả kho.

         VẪN QUÉT KHO THÊM MỘT VÒNG cho mấy file đúng ngăn mã phiếu mà không
         phiếu nào trỏ tới (ảnh gửi lên rồi người dùng xoá khỏi phiếu) — gộp
         hai tập lại, trùng thì bỏ.
         ============================================================ */
      const tapKhoa = new Set();
      const layKhoa = (cot) => {
        let arr = cot;
        if (typeof cot === 'string') { try { arr = JSON.parse(cot || '[]'); } catch (x) { arr = []; } }
        if (!Array.isArray(arr)) return;
        for (const u of arr) {
          const m = /^\/anh\/(.+)$/.exec(String(u || '').split('?')[0]);
          /* thêm cả bản nhỏ: phiếu chỉ ghi bản gốc, không xoá kèm thì bản nhỏ
             nằm lại thành rác (xem ghi chú khoaVaBanNho) */
          if (m && m[1]) khoaVaBanNho(decodeURIComponent(m[1])).forEach(k => tapKhoa.add(k));
        }
      };
      phieus.forEach(p => { layKhoa(p.anh_truoc); layKhoa(p.anh_sau); });
      (tinAnh.results || []).forEach(t => layKhoa(t.anh));

      let soFile = 0, byteFile = 0;
      const khoaXoa = [];
      if (env.ANH && ids.length) {
        const tap = new Set(ids);
        let con;
        do {
          const r = await env.ANH.list({ prefix: 'kt/', limit: 1000, cursor: con });
          for (const o of r.objects) {
            const m = /^kt\/([^/]+)\//.exec(o.key);
            const theoNgan = m && tap.has(m[1]);           /* cách cũ: đúng ngăn mã phiếu */
            const theoDiaChi = tapKhoa.has(o.key);         /* cách mới: phiếu có trỏ tới */
            if (theoNgan || theoDiaChi) {
              soFile++; byteFile += o.size; khoaXoa.push(o.key);
              tapKhoa.delete(o.key);
            }
          }
          con = r.truncated ? r.cursor : undefined;
        } while (con);
      }

      let xoaThat = false;
      if (request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        xoaThat = b && b.xacNhan === 'XOA';
      }
      if (!xoaThat) {
        return json({
          thu: true, tu: tu, den: den,
          soPhieu: phieus.length, soTin: soTin, soFile: soFile,
          mb: Math.round(byteFile / 1048576 * 10) / 10,
          cuNhat: phieus.length ? phieus.map(x => x.ngay_tao).sort()[0] : null,
          moiNhat: phieus.length ? phieus.map(x => x.ngay_tao).sort().slice(-1)[0] : null
        });
      }
      /* XOÁ THẬT — đòi vé PIN quản lý */
      const ve = request.headers.get('x-ve') || '';
      const co = ve && await env.DB.prepare('select v from kt_khoa where k=?1').bind('ve-' + ve).first().catch(() => null);
      const daDatPin = await env.DB.prepare("select v from kt_khoa where k='pin'").first().catch(() => null);
      if (daDatPin && !co) return json({ loi: 'Cần mã PIN quản lý — vào lại bằng vai quản lý và nhập PIN' }, 403);
      if (!ids.length) return json({ daXoa: 0, daXoaTin: 0, daXoaFile: 0, mb: 0 });

      /* ① file trên kho trước (xoá phiếu rồi thì không tra được khoá nữa) */
      let daFile = 0;
      if (env.ANH) {
        for (let i = 0; i < khoaXoa.length; i += 900) {
          await env.ANH.delete(khoaXoa.slice(i, i + 900));
          daFile += Math.min(900, khoaXoa.length - i);
        }
      }
      /* ② dữ liệu trong D1 — bốn câu lệnh CỐ ĐỊNH, dùng câu con theo khoảng
         ngày. Bản trước chia lô 50 mã nên 300 phiếu là 24 lượt gọi, cộng với
         phần quét kho là vượt trần rồi chết giữa lúc xoá (vá 10/09). */
      const con2 = '(select id from phieu_loi where ngay_tao >= ?1 and ngay_tao <= ?2)';
      const r1 = await env.DB.prepare('delete from dien_bien where phieu_id in ' + con2).bind(tu0, den0).run().catch(() => null);
      const daTin = (r1 && r1.meta && r1.meta.changes) || 0;
      await env.DB.prepare('delete from kt_nhat_ky where phieu_id in ' + con2).bind(tu0, den0).run().catch(() => null);
      await env.DB.prepare('delete from kt_da_xem where phieu_id in ' + con2).bind(tu0, den0).run().catch(() => null);
      const r2 = await env.DB.prepare('delete from phieu_loi where ngay_tao >= ?1 and ngay_tao <= ?2').bind(tu0, den0).run().catch(() => null);
      const daPhieu = (r2 && r2.meta && r2.meta.changes) || 0;
      return json({
        daXoa: daPhieu, daXoaTin: daTin, daXoaFile: daFile,
        mb: Math.round(byteFile / 1048576 * 10) / 10
      });
    }

    /* ---------- 5b) MÃ PIN VAI QUẢN LÝ (Trường chốt 01/09) ----------
       PIN băm SHA-256 + muối, cất trong kt_khoa (bảng NGOÀI allowlist API đọc).
       Nhập đúng → cấp VÉ ngẫu nhiên, máy đó lưu vé nên chỉ phải nhập MỘT lần.
       Đường nguy hiểm (dọn kho xoá thật) đòi vé hợp lệ. */
    /* ============================================================
       5a-bis) VÉ PHIÊN (22/09) — xem ghi chú đầy đủ trong ve.js.
       Web gọi đường này ngay sau khi người dùng chọn tên. Không mật khẩu,
       không ai phải gõ gì; máy chủ chỉ cần biết lời gọi sau đó là của ai.
       ============================================================ */
    if (url.pathname === '/api/ve' && request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const kq = await capVe(env, b.ai);
      return json(kq, kq.loi ? 403 : 200);
    }
    /* sổ đếm lời gọi chưa có vé — đọc để biết khi nào an toàn khoá (đợt 2) */
    if (url.pathname === '/api/ve-so') return json({ ds: await docSo(env) });

    /* ============================================================
       XOÁ HẲN MỘT PHIẾU ĐÃ XONG (25/09 — Trường chốt).
       Đây là đường PHÁ HUỶ VĨNH VIỄN: gỡ dòng phiếu, gỡ toàn bộ diễn biến,
       và xoá thật ảnh/video của phiếu đó khỏi kho. Không có đường hoàn lại.

       Vì vậy mọi cửa chặn đặt Ở MÁY CHỦ, không tin gì từ phía web:
         ① PHẢI có vé, và vé phải mang vai quản lý. Khác với các đường còn
            lại, đường này KHÔNG nới trong giai đoạn chưa khoá — máy không vé
            thì bị chặn ngay, vì một lời gọi lọt qua là mất dữ liệu thật.
         ② Phiếu phải ĐÃ XONG (nghiệm thu / hoàn thành). Trạng thái đọc từ
            kho chứ không lấy theo lời web nói.
         ③ Phải gõ đúng chữ XOA.
       Xong xuôi ghi vào nhật ký: ai xoá, phiếu nào, mấy file — 4-5 người dùng
       chung tài khoản admin nên phải biết là máy nào.
       ============================================================ */
    if (url.pathname === '/api/xoa-phieu' && request.method === 'POST') {
      if (!env.DB) return json({ loi: 'Chưa nối kho' }, 500);
      if (!veNay) return json({ loi: 'Cần mở lại app rồi thử lại' }, 401);
      if (veNay.vai !== 'quanly') return json({ loi: 'Chỉ quản lý mới xoá được phiếu' }, 403);

      const b = await request.json().catch(() => ({}));
      if (b.xacNhan !== 'XOA') return json({ loi: 'Phải gõ đúng chữ XOA' }, 400);
      const id = String(b.id || '');
      if (!id) return json({ loi: 'Thiếu mã phiếu' }, 400);

      /* ============================================================
         ĐỪNG NUỐT LỖI KHO THÀNH "KHÔNG CÓ PHIẾU" (vá 25/09).
         Bản đầu tao select cột 'noi_dung' — bảng này không có cột đó, tên thật
         là 'thiet_bi'. Câu lệnh nổ, nhưng vì bọc catch trả null nên người dùng
         nhận được "Không có phiếu này" trong khi phiếu vẫn nằm sờ sờ ở đó.
         Lỗi thật bị hoá trang thành lỗi khác là thứ tốn thời gian nhất khi truy.
         Giờ tách hai thứ: kho hỏng thì nói kho hỏng, không tìm thấy thì nói
         không tìm thấy.
         ============================================================ */
      let p = null;
      try {
        p = await env.DB.prepare(
          'select id,trang_thai,anh_truoc,anh_sau,thiet_bi from phieu_loi where id=?1 and deleted=0'
        ).bind(id).first();
      } catch (e) {
        return json({ loi: 'Kho báo lỗi: ' + ((e && e.message) || e) }, 500);
      }
      if (!p) return json({ loi: 'Không có phiếu này' }, 404);
      if (!['nghiemthu', 'hoanthanh'].includes(String(p.trang_thai))) {
        return json({ loi: 'Chỉ xoá được phiếu đã xong — phiếu này đang ' + p.trang_thai }, 400);
      }

      /* gom mọi đường dẫn file: ảnh trước, ảnh sau, và ảnh trong từng dòng trao đổi */
      const gom = new Set();
      const nhat = v => {
        try { (JSON.parse(v || '[]') || []).forEach(u => u && gom.add(String(u))); } catch (e) { }
      };
      nhat(p.anh_truoc); nhat(p.anh_sau);
      const db = await env.DB.prepare('select anh from dien_bien where phieu_id=?1')
        .bind(id).all().catch(() => ({ results: [] }));
      (db.results || []).forEach(r => nhat(r.anh));

      /* xoá file khỏi kho ảnh — xoá cả bản nhỏ đi kèm (cùng tên, thêm -nho) */
      let soFile = 0;
      if (env.ANH) {
        for (const u of gom) {
          const khoa = decodeURIComponent(String(u).replace(/^\/anh\//, '').split('?')[0]);
          if (!khoa || khoa.indexOf('..') >= 0) continue;
          try { await env.ANH.delete(khoa); soFile++; } catch (e) { }
          const nho = khoa.replace(/(\.[a-z0-9]+)$/i, '-nho$1');
          if (nho !== khoa) { try { await env.ANH.delete(nho); } catch (e) { } }
        }
      }

      /* gỡ dữ liệu: diễn biến trước, phiếu sau — sót diễn biến thì thành rác mồ côi */
      try { await env.DB.prepare('delete from dien_bien where phieu_id=?1').bind(id).run(); } catch (e) { }
      try { await env.DB.prepare('delete from kt_da_xem where phieu_id=?1').bind(id).run(); } catch (e) { }
      const r = await env.DB.prepare('delete from phieu_loi where id=?1').bind(id).run();

      /* ghi sổ: ai xoá cái gì, lúc nào — không có dòng này thì không truy được */
      try {
        await env.DB.prepare(
          'insert into kt_nhat_ky (phieu_id,nguoi_id,nguoi_ten,hanh_dong,chi_tiet,may,created_at) ' +
          'values (?1,?2,?3,?4,?5,?6,?7)'
        ).bind(id, veNay.ai, String(b.nguoiTen || ''), 'xoa_phieu',
          JSON.stringify({ noiDung: String(p.thiet_bi || '').slice(0, 120), soFile: soFile }),
          String(request.headers.get('user-agent') || '').slice(0, 160),
          new Date().toISOString()).run();
      } catch (e) { }

      return json({ ok: true, xoa: (r.meta && r.meta.changes) || 0, soFile: soFile });
    }

    if (url.pathname === '/api/pin' && request.method === 'POST') {
      if (!env.DB) return json({ loi: 'Chưa nối D1' }, 500);
      await env.DB.prepare('create table if not exists kt_khoa (k text primary key, v text not null)').run();
      const b = await request.json().catch(() => ({}));
      const doc = async () => {
        const r = await env.DB.prepare("select v from kt_khoa where k='pin'").first();
        try { return r && JSON.parse(r.v); } catch (e) { return null; }
      };
      const bam = async (muoi, pin) => {
        const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(muoi + '|' + pin));
        return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
      };
      const capVe = async () => {
        const ve = crypto.randomUUID().replace(/-/g, '');
        await env.DB.prepare('insert into kt_khoa (k,v) values (?1,?2) on conflict(k) do update set v=excluded.v')
          .bind('ve-' + ve, new Date().toISOString()).run();
        return ve;
      };
      const dang = await doc();
      if (b.viec === 'co') return json({ co: !!dang });
      const pin = String(b.pin || '');
      if (!/^\d{4,8}$/.test(pin)) return json({ loi: 'PIN phải là 4–8 chữ số' }, 400);
      if (b.viec === 'dat') {
        if (dang) {   /* đổi PIN: phải đúng PIN cũ */
          if (await bam(dang.muoi, String(b.pinCu || '')) !== dang.bam) {
            await new Promise(r => setTimeout(r, 600));
            return json({ loi: 'PIN cũ không đúng' }, 403);
          }
        }
        const muoi = crypto.randomUUID();
        await env.DB.prepare("insert into kt_khoa (k,v) values ('pin',?1) on conflict(k) do update set v=excluded.v")
          .bind(JSON.stringify({ muoi: muoi, bam: await bam(muoi, pin) })).run();
        return json({ ok: true, ve: await capVe() });
      }
      if (b.viec === 'kiem') {
        if (!dang) return json({ loi: 'Chưa đặt PIN' }, 400);
        if (await bam(dang.muoi, pin) !== dang.bam) {
          await new Promise(r => setTimeout(r, 600));   /* chậm lại cho đỡ bị dò */
          return json({ loi: 'PIN không đúng' }, 403);
        }
        return json({ ok: true, ve: await capVe() });
      }
      return json({ loi: 'Việc lạ: ' + b.viec }, 400);
    }

    /* ---------- 6) THÔNG BÁO ĐẨY ---------- */

    /* 6a) khoá công khai để trang web đăng ký máy.
       Khoá giờ TỰ SINH và nằm trong D1 (bảng kt_khoa, ngoài allowlist API) —
       không cần wrangler secret, không ai phải cầm chuỗi bí mật. */
    if (url.pathname === '/api/day-khoa') {
      env = await napKhoaDay(env);
      return json({ cong: env.VAPID_PUBLIC || '', bat: !!(env.VAPID_PUBLIC && env.VAPID_PRIVATE) });
    }

    /* 6b) đường cũ giữ lại cho khỏi gãy link — giờ chỉ xác nhận khoá đã sẵn sàng,
       KHÔNG BAO GIỜ in khoá riêng ra ngoài nữa */
    if (url.pathname === '/api/day-tao-khoa') {
      env = await napKhoaDay(env);
      if (!env.VAPID_PRIVATE) return json({ loi: 'chưa nối D1 nên chưa tạo được khoá' }, 500);
      return json({
        bat: true, cong: env.VAPID_PUBLIC,
        loiNhan: 'Khoá đẩy đã tự tạo và nằm an toàn trong D1 — không cần wrangler secret. ' +
          'Từng người mở web từ icon màn hình chính → Cài đặt → Bật thông báo là xong.'
      });
    }

    /* 6c) gửi thông báo cho một nhóm người */
    if (url.pathname === '/api/day-gui' && request.method === 'POST') {
      env = await napKhoaDay(env);
      const b = await request.json().catch(() => ({}));
      if (!b.ai || !b.ai.length || !b.mau) return json({ loi: 'thiếu người nhận hoặc mẫu' }, 400);
      const tin = MAU_TIN(b.mau, b.du || {});
      if (!tin) return json({ loi: 'không có mẫu ' + b.mau }, 400);
      if (!env.VAPID_PRIVATE) return json({ loi: 'chưa có khoá đẩy (D1 chưa nối?)' }, 500);
      let may = await layMay(env, b.ai);
      /* ============================================================
         LOẠI / CHỌN THEO MÁY, KHÔNG THEO NGƯỜI (24/09 — Trường chốt:
         "admin 4-5 người dùng chung tài khoản, phải theo từng máy").

         Bệnh cũ: web bỏ chính người vừa bấm ra khỏi danh sách nhận (để khỏi
         tự rung máy mình) — nhưng bỏ theo MÃ NGƯỜI. Bốn năm admin dùng chung
         mã 'ql' nên một người bấm là CẢ CHÍN MÁY admin bị loại: giám đốc giao
         việc khẩn mà ba người còn lại không hề biết.
         Cùng gốc: nút "Gửi thử vào máy này" gửi theo mã người nên bấm một cái
         là điện thoại của cả năm người cùng kêu.

         Giờ web gửi kèm mã máy của chính nó:
           · boMay  → loại đúng máy đó, các máy khác cùng mã người vẫn nhận
           · chiMay → chỉ gửi đúng máy đó (dùng cho Gửi thử)
         Máy chưa bật thông báo thì không có mã máy — không sao, lúc đó cũng
         chẳng có gì để loại.
         ============================================================ */
      if (b.chiMay) may = may.filter(m => m.endpoint === b.chiMay);
      else if (b.boMay) may = may.filter(m => m.endpoint !== b.boMay);
      if (!may.length) return json({ gui: 0, soMay: 0, ghiChu: 'chưa ai bật thông báo' });
      const kq = await guiNhieu(may, tin, env);
      if (kq.het.length) await xoaMayHet(env, kq.het);
      /* trả thêm chi tiết để nút "Gửi thử" trên điện thoại nói được lý do thật */
      kq.soMay = may.length;
      return json(kq);
    }

    /* ---------- 7) Còn lại: trang web tĩnh ---------- */
    return env.ASSETS.fetch(request);
  },

  /* Cloudflare gọi hàm này theo giờ đã hẹn trong wrangler.toml */
  /* ============================================================
     HAI LẦN MỖI NGÀY (21/10 — Trường: "làm thêm 1 cái vào 13h chiều tương tự
     như 9h sáng, vì 9h khả năng chưa ai ngủ dậy").

     Cloudflare chạy cron theo giờ UTC, mình ở UTC+7:
       "0 2 * * *"  →  9 giờ sáng giờ Việt Nam
       "0 6 * * *"  →  1 giờ chiều giờ Việt Nam

     event.cron cho biết biểu thức nào vừa kích hoạt — nhờ đó phân biệt được
     buổi, và cũng nhờ đó mà SAO LƯU chỉ chạy một lần mỗi ngày (lượt sáng).
     Sao lưu hai lần thì bản thứ hai ghi đè bản thứ nhất cùng ngày, vừa tốn
     lượt ghi vừa chẳng thêm an toàn gì.
     ============================================================ */
  async scheduled(event, env, ctx) {
    const chieu = String(event && event.cron || '') === '0 6 * * *';
    ctx.waitUntil(chayCron(env, chieu ? 'chieu' : 'sang'));
  }
};

/* ---------- đọc / xoá máy đã đăng ký (qua Supabase REST) ---------- */
async function sbGet(env, duong) {
  const r = await fetch(env.SUPABASE_URL + '/rest/v1/' + duong, {
    headers: { apikey: env.SUPABASE_KEY, authorization: 'Bearer ' + env.SUPABASE_KEY }
  });
  return r.ok ? r.json() : [];
}
async function layMay(env, dsAi) {
  if (env.DB) return await mayDay(env, dsAi);              // D1
  if (!env.SUPABASE_URL) return [];                        // đường cũ, giữ để lùi được
  const loc = 'kt_day?select=nguoi_id,endpoint,p256dh,auth&bat=is.true&nguoi_id=in.(' +
    dsAi.map(x => '"' + String(x).replace(/"/g, '') + '"').join(',') + ')';
  return await sbGet(env, loc);
}
async function xoaMayHet(env, dsEnd) {
  if (env.DB) return await tatMay(env, dsEnd);              // D1
  for (const e of dsEnd) {
    await fetch(env.SUPABASE_URL + '/rest/v1/kt_day?endpoint=eq.' + encodeURIComponent(e), {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_KEY, authorization: 'Bearer ' + env.SUPABASE_KEY,
        'content-type': 'application/json', prefer: 'return=minimal'
      },
      body: JSON.stringify({ bat: false })
    }).catch(() => { });
  }
}

/* ============================================================
   KHOÁ ĐẨY TỰ SINH — không cần wrangler secret.
   Lần gọi đầu: tạo cặp khoá VAPID, cất vào bảng kt_khoa trong D1.
   Bảng này KHÔNG nằm trong allowlist của /api/db nên web không đọc được,
   và không đường API nào in khoá riêng ra ngoài.
   Vẫn ưu tiên secret cũ nếu có (ai đã cài bằng wrangler secret thì giữ nguyên).
   Ghi cả cặp trong MỘT dòng (JSON) + on conflict do nothing: hai máy Cloudflare
   cùng khởi tạo một lúc cũng không thể ra nửa khoá nọ nửa khoá kia.
   ============================================================ */
let KHOA_DAY_NHO = null;
async function napKhoaDay(env) {
  if (env.VAPID_PRIVATE && env.VAPID_PUBLIC) return env;
  if (!env.DB) return env;
  if (!KHOA_DAY_NHO) {
    try {
      await env.DB.prepare('create table if not exists kt_khoa (k text primary key, v text not null)').run();
      const doc = async () => {
        const r = await env.DB.prepare("select v from kt_khoa where k='day'").first();
        try { return r && JSON.parse(r.v); } catch (e) { return null; }
      };
      let k = await doc();
      if (!k || !k.cong || !k.rieng) {
        const moi = await taoKhoa();
        await env.DB.prepare('insert into kt_khoa (k,v) values (?,?) on conflict(k) do nothing')
          .bind('day', JSON.stringify(moi)).run();
        k = await doc();                       // đọc lại: nếu máy khác nhanh hơn thì lấy của nó
      }
      KHOA_DAY_NHO = k;
    } catch (e) { return env; }
  }
  if (!KHOA_DAY_NHO) return env;
  /* phủ lên env bằng prototype — không đụng vào các binding DB/ANH */
  return Object.create(env, {
    VAPID_PUBLIC: { value: KHOA_DAY_NHO.cong },
    VAPID_PRIVATE: { value: KHOA_DAY_NHO.rieng }
  });
}

/* ---------- BẢN TIN 8H SÁNG (Cloudflare cron) ---------- */
export async function chayCron(env, buoi) {
  /* Sao lưu chạy TRƯỚC và bọc riêng: nó không cần khoá đẩy, mà dòng dưới
     `if (!env.VAPID_PRIVATE) return` lại thoát sớm nếu chưa có khoá — để sau
     là có ngày khoá đẩy trục trặc kéo luôn sao lưu chết theo mà không ai biết.
     CHỈ CHẠY LƯỢT SÁNG: lượt chiều ghi đè bản cùng ngày, tốn lượt ghi mà
     không thêm an toàn. */
  if (buoi !== 'chieu') {
    try { await chaySaoLuu(env); } catch (e) { /* hỏng thì bản tin vẫn phải đi */ }
  }

  env = await napKhoaDay(env);
  if (!env.VAPID_PRIVATE) return;
  let phieu, nguoi, coso;
  if (env.DB) {
    const [a, b, c] = await env.DB.batch([
      env.DB.prepare("select * from phieu_loi where loai='kythuat' and deleted=0 and trang_thai<>'huy'"),
      env.DB.prepare('select id,ten,vai,co_so_id from kt_nguoi where hien=1'),
      env.DB.prepare('select id,ten from co_so')
    ]);
    const doi = r => { const o = {}; for (const k in r) o[k] = /^(anh|anh_truoc|anh_sau|nguoi_sua)$/.test(k) ? (() => { try { return JSON.parse(r[k] || '[]'); } catch (e) { return []; } })() : r[k]; return o; };
    phieu = (a.results || []).map(doi); nguoi = b.results || []; coso = c.results || [];
  } else {
    if (!env.SUPABASE_URL) return;
    phieu = await sbGet(env, 'phieu_loi?select=*&loai=eq.kythuat&deleted=is.false&trang_thai=neq.huy');
    nguoi = await sbGet(env, 'kt_nguoi?select=id,ten,vai,co_so_id&hien=is.true');
    coso = await sbGet(env, 'co_so?select=id,ten');
  }
  const goi = banTinSang(phieu, nguoi, coso, buoi);    // [{ai, tin}]
  if (!goi.length) return;

  /* ============================================================
     HỎI KHO MỘT LẦN CHO CẢ ĐỘI (21/09).
     Bản cũ hỏi kho riêng cho từng người — 13 người là 13 lượt hỏi, cộng với
     mỗi máy một lượt bắn đi là ~40 lượt gọi ra ngoài. Mức Cloudflare miễn phí
     cho đúng 50 lượt mỗi lần chạy: thêm dăm cái điện thoại nữa là vỡ, và vỡ
     thì bản tin đứt giữa chừng, ai đứng cuối danh sách không nhận được gì.
     Hỏi một lượt rồi tự chia theo người: 13 lượt xuống còn 1.
     ============================================================ */
  const tatMay = await layMay(env, goi.map(g => g.ai));
  const theoNguoi = {};
  for (const m of tatMay) (theoNguoi[m.nguoi_id] = theoNguoi[m.nguoi_id] || []).push(m);

  /* một kho chữ ký dùng chung cho cả 13 lượt gửi — xem ghi chú trong push.js */
  const khoKy = {};
  for (const g of goi) {
    const may = theoNguoi[g.ai];
    if (may && may.length) await guiNhieu(may, g.tin, env, khoKy);
  }
}

/* ============================================================
   SAO LƯU PHẦN CHỮ MỖI ĐÊM (20/10 — Trường chốt sau khi soát rủi ro).

   VÌ SAO CÓ: toàn bộ phiếu, tin nhắn, người, cơ sở chỉ nằm MỘT bản duy nhất
   trong D1. Xoá nhầm một khoảng ngày, tài khoản trục trặc, hay một câu lệnh
   xoá viết sai là mất sạch, không có đường quay về.

   CHỈ SAO LƯU CHỮ, KHÔNG SAO LƯU ẢNH. Đo ngày 20/10: toàn bộ chữ nặng 174 KB,
   ảnh và video nặng 1 GB. Chữ là thứ không chụp lại được nên phải giữ; ảnh thì
   nặng gấp 6000 lần mà trường hợp xấu nhất vẫn ra hiện trường chụp lại được.
   Giữ 30 bản = khoảng 5 MB, tức 0,05% chỗ trống còn lại của kho.

   Chạy trong cron 2 giờ sáng, SAU phần gửi bản tin và bọc riêng try/catch:
   sao lưu hỏng thì bản tin sáng vẫn phải đi, hai việc không được kéo nhau chết.
   ============================================================ */
const SAO_LUU_GIU = 30;          /* giữ bao nhiêu bản gần nhất */

async function chaySaoLuu(env) {
  if (!env.DB || !env.ANH) return { loi: 'thiếu D1 hoặc R2' };
  const [a, b, c, d, e] = await env.DB.batch([
    env.DB.prepare('select * from phieu_loi'),
    env.DB.prepare('select * from dien_bien'),
    env.DB.prepare('select * from kt_nguoi'),
    env.DB.prepare('select * from co_so'),
    env.DB.prepare('select * from gian_hang')
  ]);
  const goi = {
    luc: new Date().toISOString(),
    ban: 1,
    ghiChu: 'Ban sao phan chu cua web Ky thuat IKID. Khong chua anh/video.',
    phieu: a.results || [],
    dienBien: b.results || [],
    nguoi: c.results || [],
    coSo: d.results || [],
    gianHang: e.results || []
  };
  const chu = JSON.stringify(goi);
  const ngay = new Date().toISOString().slice(0, 10);
  const khoa = 'sao-luu/' + ngay + '.json';
  await env.ANH.put(khoa, chu, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: { soPhieu: String(goi.phieu.length), soTin: String(goi.dienBien.length) }
  });

  /* dọn bản cũ: liệt kê rồi xoá hết trừ SAO_LUU_GIU bản mới nhất. Tên file là
     ngày nên xếp theo chữ cái cũng ra đúng thứ tự thời gian. */
  let xoaCu = 0;
  try {
    const ds = [];
    let con;
    do {
      const r = await env.ANH.list({ prefix: 'sao-luu/', limit: 1000, cursor: con });
      r.objects.forEach(o => ds.push(o.key));
      con = r.truncated ? r.cursor : undefined;
    } while (con);
    ds.sort();
    const cu = ds.slice(0, Math.max(0, ds.length - SAO_LUU_GIU));
    if (cu.length) { await env.ANH.delete(cu); xoaCu = cu.length; }
  } catch (x) { /* dọn hỏng không sao, bản mới đã nằm trên kho rồi */ }

  return {
    khoa: khoa, kb: Math.round(chu.length / 1024),
    soPhieu: goi.phieu.length, soTin: goi.dienBien.length,
    soNguoi: goi.nguoi.length, soCoSo: goi.coSo.length, xoaCu: xoaCu
  };
}

function json(o, ma) {
  return new Response(JSON.stringify(o), {
    status: ma || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
function sach(s) { return String(s).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 60); }

/* ============================================================
   BẢN NHỎ ĐI KÈM BẢN GỐC (20/10 — suýt xoá nhầm cả kho ảnh thu nhỏ).

   Mỗi tấm ảnh nằm trên kho thành HAI file: bản gốc x.jpg và bản nhỏ
   x-nho.jpg (~40 KB, dùng cho ô ảnh trong danh sách, khỏi kéo bản 3 MB).
   Nhưng phiếu CHỈ ghi địa chỉ bản gốc — bản nhỏ không được ghi ở đâu cả, web
   tự suy ra tên khi cần (xem anhNho() trong kt-data.js).

   Hệ quả: bất kỳ chỗ nào đối chiếu "file này có ai dùng không" mà chỉ so với
   địa chỉ trong phiếu thì MỌI BẢN NHỎ đều bị coi là rác. Bản đầu của hàm dọn
   rác dính đúng thế: đếm ra 683 file rác trong khi thực tế chỉ 545 MB là rác
   thật — phần dôi ra chính là bản nhỏ của ảnh đang dùng.

   Hàm này trả về cả hai tên cho một địa chỉ, dùng chung cho:
     · xoá theo khoảng ngày → xoá cả bản nhỏ (nếu không thì nó nằm lại làm rác)
     · dọn rác              → giữ cả bản nhỏ (nếu không thì xoá mất ảnh đang dùng)
   ============================================================ */
function khoaVaBanNho(khoa) {
  const ra = [khoa];
  const m = /^(.+)(\.(?:jpe?g|webp|png))$/i.exec(khoa);
  if (m && !/-nho$/i.test(m[1])) ra.push(m[1] + '-nho' + m[2]);
  return ra;
}
