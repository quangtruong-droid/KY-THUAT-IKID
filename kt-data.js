/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Tầng dữ liệu
   - Đọc/ghi thẳng Supabase (chung kho với IKID OMS)
   - Nhớ người dùng trong máy, không mật khẩu
   - Có bản sao trong máy để mở là thấy ngay, mất sóng vẫn dùng
   ============================================================ */
'use strict';

/* ============================================================
   TỪ 20/08/2026: web KHÔNG nói trực tiếp với cơ sở dữ liệu nữa.
   Điện thoại gọi /api/db/... , Worker nói với kho D1 của Cloudflare.
   Vì sao đổi:
    · Supabase tính tiền theo GB tải xuống, hết hạn mức là chặn cả tháng.
      D1 tính theo số dòng đọc, KHÔNG tính tải xuống.
    · Khoá cơ sở dữ liệu không còn nằm lộ trong mã trang web nữa.
   ============================================================ */
const API = '/api/db/';

async function goiAPI(duong, than, lanHai) {
  const r = await fetch(API + duong, than ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(than)
  } : undefined);
  /* ============================================================
     VÉ CŨ / CHƯA CÓ VÉ → XIN LẠI RỒI GỌI LẠI, NGƯỜI DÙNG KHÔNG THẤY GÌ.
     Đây là lưới an toàn cho đợt 2 (lúc máy chủ bắt đầu khoá): máy nào vé hết
     hạn hay đổi người giữa chừng thì tự chữa, khỏi bắt ai đóng app mở lại.
     Chỉ thử LẠI MỘT LẦN — xin vé mà vẫn 401 thì là lỗi thật, không quay vòng.
     ============================================================ */
  if (r.status === 401 && !lanHai) {
    const ve = await xinVe();
    if (ve) return goiAPI(duong, than, true);
  }
  let kq = null;
  try { kq = await r.json(); } catch (e) { }
  if (!r.ok || !kq || kq.loi) {
    const e = new Error((kq && kq.loi) || ('máy chủ trả lỗi ' + r.status));
    e.code = 'API' + r.status;          // có code = máy chủ đã trả lời, không phải mất mạng
    throw e;
  }
  return kq;
}

/* ---------- kho trong máy ---------- */
const KHOA_NGUOI = 'kt_nguoi_v1';
const KHOA_CHUNG = 'kt_maychung_v1';
const KHOA_GANDAY = 'kt_ganday_v1';   // 3 người vừa dùng trên máy này (cách B)
const KHOA_CACHE = 'kt_cache_v1';
const KHOA_HANG  = 'kt_hangdoi_v1';

const D = {
  nguoi: null,        // { id, ten, vai, coSoId, mau }
  cosos: [],
  gianhangs: [],
  ai: [],             // kt_nguoi (đang dùng)
  aiAn: [],           // kt_nguoi đã ẩn — chỉ admin thấy để hiện lại
  phieu: [],
  dienBien: {},       // phieuId -> []
  soChat: {},         // phieuId -> { so, cuoi } — máy chủ đếm tin chat
  taiXong: false,
  luotTai: 0
};

/* ---------- tiện ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ms = v => v ? new Date(v).getTime() : 0;
const iso = t => t ? new Date(t).toISOString() : null;
const HOM_NAY = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const NGAY = 86400000;
const dd = t => { if (!t) return ''; const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
const ddyy = t => { if (!t) return ''; const d = new Date(t); return dd(t) + '/' + d.getFullYear(); };
const gio = t => { if (!t) return ''; const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') };
/* Mốc SỰ KIỆN thì kèm giờ:phút. Dữ liệu cũ lưu 00:00 (không có giờ thật) thì giấu đi,
   đừng khoe "00:00" như thể ai cũng làm việc lúc nửa đêm. */
const coGio = t => { if (!t) return false; const d = new Date(t); return d.getHours() !== 0 || d.getMinutes() !== 0; };
const ddGio = t => t ? dd(t) + (coGio(t) ? ' ' + gio(t) : '') : '';
const ddyyGio = t => t ? ddyy(t) + (coGio(t) ? ' ' + gio(t) : '') : '';
const tien = n => (Number(n) || 0).toLocaleString('vi-VN');
const ngayISO = t => { const d = new Date(t || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- từ điển ---------- */
const MUC_DO = {
  khancap: { ten: 'Khẩn cấp', nen: '#FEE2E2', chu: '#B91C1C', uu: 3 },
  binhthuong: { ten: 'Bình thường', nen: '#FEF3C7', chu: '#B45309', uu: 2 },
  nhe: { ten: 'Nhẹ', nen: '#F1F5F9', chu: '#64748B', uu: 1 }
};
const TT = {
  moi: { ten: 'Chưa sửa', nen: '#FEE2E2', chu: '#B91C1C' },
  tiepnhan: { ten: 'Đã tiếp nhận', nen: '#DBEAFE', chu: '#1D4ED8' },
  hoanthanh: { ten: 'Đã hoàn thành', nen: '#DCFCE7', chu: '#15803D' },
  nghiemthu: { ten: 'Đã nghiệm thu', nen: '#DCFCE7', chu: '#166534' },
  huy: { ten: 'Đã huỷ', nen: '#F1F5F9', chu: '#64748B' }
};
const VUONG = {
  vat_tu: { ten: 'Chờ vật tư', nen: '#FEF3C7', chu: '#B45309' },
  nha_thau: { ten: 'Chờ nhà thầu', nen: '#EDE9FE', chu: '#6D28D9' },
  lam_dem: { ten: 'Cần làm đêm', nen: '#E0F2FE', chu: '#0369A1' },
  may_moc: { ten: 'Chờ máy móc', nen: '#FFEDD5', chu: '#C2410C' },
  khong_sua_duoc: { ten: 'Không sửa được', nen: '#FEE2E2', chu: '#B91C1C' }
};
/* nhóm lỗi — Trường chốt lại sau, đổi ở đây là xong */
const NHOM_LOI = {
  khoa_cua: 'Khoá – cửa – kho',
  camera: 'Camera',
  dien_den: 'Điện – đèn',
  san_tham: 'Sàn – thảm – decal',
  may_game: 'Máy game',
  do_choi: 'Đồ chơi – khu hạt',
  nuoc_ve_sinh: 'Nước – vệ sinh',
  dieu_hoa: 'Điều hoà – quạt',
  am_thanh: 'Âm thanh – màn hình',
  bien_bang: 'Biển – bảng – trang trí',
  khac: 'Khác'
};
/* tên nhóm lỗi cho người đọc: nhóm lạ (dữ liệu web cũ, gõ tay) thì gọi là
   "Khác" chứ đừng lòi mã thô kiểu maygame ra màn hình (08/09) */
const tenNhom = k => NHOM_LOI[k] || 'Khác';


/* ============================================================
   TỰ ĐOÁN NHÓM LỖI từ nội dung (Trường chốt 04/09 — bỏ ô chọn tay cho đỡ
   rườm). Dò theo cụm từ KHÔNG DẤU, cụm dài ưu tiên trước cụm ngắn để
   "máy gắp" thắng "máy", "nhà bóng" thắng "bóng đèn". Không trúng gì → 'khac'.
   Đoán sai thì admin chỉnh lại trong ✎ Sửa phiếu — thống kê không bị mù.
   ============================================================ */
const TU_NHOM = [
  ['may_game', ['may gap', 'gap gau', 'gap thu', 'may game', 'game', 'tro choi dien tu', 'ban sung', 'dua xe', 'ghe rung', 'dap chuot', 'bat bong ro']],
  ['do_choi', ['nha bong', 'nha banh', 'cau truot', 'bap benh', 'xich du', 'khu hat', 'nha hoi', 'lego', 'do choi', 'thu nhun', 'bong nhua', 'khu cat']],
  ['camera', ['camera', 'cam quan sat', 'mat cam']],
  ['dieu_hoa', ['dieu hoa', 'may lanh', 'quat', 'thong gio', 'nong qua', 'khong mat']],
  ['nuoc_ve_sinh', ['nuoc', 'bon cau', 'lavabo', 'voi', 'ro ri', 'tac cong', 'nha ve sinh', 'toilet', 'bon rua']],
  ['am_thanh', ['loa', 'am thanh', 'mic', 'man hinh', 'tivi', 'ti vi', 'may chieu']],
  ['khoa_cua', ['khoa', 'cua', 'kho', 'ban le', 'chot', 'tay nam']],
  ['san_tham', ['san', 'tham', 'decal', 'gach', 'xop lot', 'bong troc']],
  ['bien_bang', ['bien', 'bang hieu', 'bang ten', 'trang tri', 'banner', 'standee']],
  ['dien_den', ['den', 'dien', 'bong', 'chap', 'o cam', 'day nguon', 'cau dao', 'aptomat', 'mat nguon', 'chay khet']]
];
function doanNhomLoi(text) {
  const t = ' ' + boDau(text) + ' ';
  let tot = null;
  for (const [nhom, cums] of TU_NHOM)
    for (const c of cums) {
      const vt = t.indexOf(c);
      if (vt < 0) continue;
      /* người mình báo lỗi đặt VẬT HỎNG đầu câu ("Đèn nhà bóng cháy" = cái ĐÈN
         hỏng, nhà bóng chỉ là chỗ) → cụm xuất hiện SỚM thắng, hoà mới xét dài */
      if (!tot || vt < tot.vt || (vt === tot.vt && c.length > tot.dai)) tot = { nhom: nhom, vt: vt, dai: c.length };
    }
  return tot ? tot.nhom : 'khac';
}

/* ============================================================
   VÉ PHIÊN (22/09 — Trường chốt mục ① cửa dữ liệu; xem đầy đủ trong ve.js)

   Máy chủ trước nay không biết ai đang gọi: "chọn tên mình" chỉ ghi vào máy.
   Giờ chọn tên xong thì xin máy chủ một cái vé có ký tên, máy nhớ luôn, mọi
   lời gọi sau đều đính kèm. Người dùng KHÔNG gõ gì, không nhớ gì, không thấy
   gì — vẫn một link, không mật khẩu, đúng luật Trường đặt từ đầu.

   VÌ SAO BỌC fetch CHỨ KHÔNG SỬA TỪNG CHỖ: web gọi /api/ ở 20 chỗ rải khắp
   7 file (tải lên, gửi thông báo, AI, dọn kho, đo đường...). Sửa tay từng
   chỗ thì kiểu gì cũng sót một cái, mà sót đúng cái nào thì đợt 2 khoá lại
   là chỗ đó chết. Bọc một lần ở đây thì không thể sót.
   ============================================================ */
/* TÊN PHẢI KHÁC KHOA_VE TRONG kt-form.js (24/09 — tao đặt trùng, cả web chết
   không bấm được nút nào): hai file cùng khai một tên ở cấp toàn cục là lỗi
   cú pháp, file nạp sau chết sạch. Chỗ lưu cũng phải khác: 'kt_ve_v1' đang
   giữ vé PIN quản lý, dùng chung là hai thứ đè lên nhau. */
const KHOA_VE_PHIEN = 'kt_vephien_v1';
const GIA_HAN_NGAY = 3;        /* vé cũ hơn 3 ngày thì xin cái mới cho tươi */

function layVe() {
  try { const o = JSON.parse(localStorage.getItem(KHOA_VE_PHIEN) || 'null'); return (o && o.ve) || ''; }
  catch (e) { return ''; }
}
function veCuaAi() {
  try { const o = JSON.parse(localStorage.getItem(KHOA_VE_PHIEN) || 'null'); return o || null; }
  catch (e) { return null; }
}
async function xinVe(nguoiId) {
  const id = String(nguoiId || (D.nguoi && D.nguoi.id) || '');
  if (!id) return '';
  try {
    const r = await fetch('/api/ve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ai: id })
    }).then(x => x.json());
    if (!r || !r.ve) return '';
    try { localStorage.setItem(KHOA_VE_PHIEN, JSON.stringify({ ve: r.ve, ai: id, luc: Date.now() })); } catch (e) { }
    return r.ve;
  } catch (e) { return ''; }
}
/* gọi lúc mở app: chưa có vé, vé của người khác, hoặc vé đã cũ thì xin lại */
async function chacVe() {
  if (!D.nguoi || !D.nguoi.id) return;
  const o = veCuaAi();
  if (o && o.ve && o.ai === D.nguoi.id && (Date.now() - (o.luc || 0)) < GIA_HAN_NGAY * 86400000) return;
  await xinVe(D.nguoi.id);
}
/* ============================================================
   SỐ BẢN WEB, ĐÍNH VÀO MỌI LỜI GỌI (24/09).
   Vì sao cần: có những lúc máy CHƯA CÓ VÉ mà hoàn toàn bình thường — người
   vừa mở web, chưa chọn tên, nên chưa biết mình là ai để xin vé; nhưng vẫn
   phải hỏi máy chủ danh sách người để vẽ màn "Bạn là ai?".
   Nếu chỉ nhìn "có vé hay không" thì máy chủ không phân biệt được lượt gọi
   lành đó với một máy còn chạy bản web cũ. Hậu quả: sổ đếm không bao giờ về
   0, và đợt 2 khoá lại là màn chọn tên chết luôn.
   Nên mọi bản web từ 182 trở đi tự khai số bản của mình. Máy chủ thấy số bản
   là biết "đây là bản mới, chỉ chưa chọn tên" — không tính vào sổ.
   Số lấy thẳng từ đường dẫn file đang chạy nên không bao giờ quên cập nhật.
   ============================================================ */
const BAN_WEB = (function () {
  try {
    const s = Array.prototype.map.call(document.scripts, x => x.src || '')
      .find(x => /kt-data\.js\?v=/.test(x));
    return s ? (s.split('v=')[1] || '').split('&')[0] : '1';
  } catch (e) { return '1'; }
})();

(function bocFetch() {
  if (typeof window === 'undefined' || !window.fetch) return;
  const goc = window.fetch;
  window.fetch = function (dau, init) {
    try {
      const d = typeof dau === 'string' ? dau : ((dau && dau.url) || '');
      const laApi = d.indexOf('/api/') === 0 || d.indexOf(location.origin + '/api/') === 0;
      if (laApi) {
        const moi = init ? Object.assign({}, init) : {};
        const h = new Headers((init && init.headers) || (typeof dau !== 'string' && dau.headers) || {});
        h.set('x-kt-ban', BAN_WEB);
        const ve = layVe();
        /* đường xin vé không tự đính vé — nếu không thì vé cũ lại đẻ vé cũ */
        if (ve && d.indexOf('/api/ve') !== 0) h.set('x-kt-ve', ve);
        moi.headers = h;
        init = moi;
      }
    } catch (e) { /* bọc hỏng thì gọi như cũ, không được làm chết lời gọi thật */ }
    return goc.call(this, dau, init);
  };
})();

/* ---------- người dùng ---------- */
function layNguoi() {
  try { return JSON.parse(localStorage.getItem(KHOA_NGUOI) || 'null'); } catch (e) { return null; }
}
function datNguoi(n) {
  D.nguoi = n;
  try { localStorage.setItem(KHOA_NGUOI, JSON.stringify(n)); } catch (e) { }
  /* đổi người là đổi vé — vé cũ mang tên người cũ, cơ sở cũ.
     Không chờ: web tải dữ liệu ngay sau đó, mà đợt 1 chưa khoá nên không sao;
     lỡ chậm thì goiAPI bên dưới tự xin lại rồi gọi lại. */
  if (n && n.id) { try { xinVe(n.id); } catch (e) { } }
}
function xoaNguoi() { D.nguoi = null; try { localStorage.removeItem(KHOA_NGUOI); } catch (e) { } }
const mayChung = () => localStorage.getItem(KHOA_CHUNG) === '1';
const datMayChung = v => localStorage.setItem(KHOA_CHUNG, v ? '1' : '0');

/* ---------- B · NGƯỜI VỪA DÙNG TRÊN MÁY NÀY ----------
   Máy dùng chung mở lên phải dò tên trong danh sách 20+ người, 12 cơ sở tên na ná.
   Nhớ 3 người gần nhất, đẩy lên trên cùng màn "Bạn là ai?" → bấm 1 phát là vào. */
function ganDay() {
  try { const a = JSON.parse(localStorage.getItem(KHOA_GANDAY) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function themGanDay(id) {
  if (!id) return;
  try { localStorage.setItem(KHOA_GANDAY, JSON.stringify([id].concat(ganDay().filter(x => x !== id)).slice(0, 3))); }
  catch (e) { }
}

/* ---------- A · LINK RIÊNG TỪNG NGƯỜI ---------- */
const AI_LINK = (function () {
  try { return (new URLSearchParams(location.search).get('ai') || '').trim(); } catch (e) { return ''; }
})();
/* linkAi() đã bỏ 10/09 cùng màn Link riêng — cả đội dùng một link chung. */

/* ============================================================
   ẢNH ĐẠI DIỆN (Trường chốt 04/09) — mặt thật hiện khắp nơi thay chữ cái.
   veAv: có ảnh thì vẽ ảnh, không thì chữ cái + màu như cũ.
   ============================================================ */
const anhCua = ten => ((D.ai || []).find(a => a.ten === ten) || {}).anh || '';
function veAv(ten, mau, anh, lop) {
  if (anh) return '<span class="av coAnh ' + (lop || '') + '" style="background-image:url(' + esc(anh) + ')"></span>';
  return '<span class="av ' + (lop || '') + '" style="background:' + esc(mau || '#0E7490') + '">' +
    esc((ten || '?').trim().slice(0, 1).toUpperCase()) + '</span>';
}
/* cắt VUÔNG giữa ảnh + nén 128px (~10-15KB) — đủ nét cho hình tròn bé */
function nenVuong(file, canh) {
  /* cắt vuông ở LUỒNG RIÊNG trước đã — giao diện không đứng (07/09) */
  if (!NEN_HONG) {
    return nenLuongRieng(file, canh || 128, 0.85, true)
      .catch(() => nenVuongCu(file, canh));
  }
  return nenVuongCu(file, canh);
}
function nenVuongCu(file, canh) {
  const veRaBlob = (nguon, w, h) => {
    const m = Math.min(w, h);
    const sx = (w - m) / 2, sy = (h - m) / 2;
    const c = document.createElement('canvas'); c.width = c.height = canh || 128;
    c.getContext('2d').drawImage(nguon, sx, sy, m, m, 0, 0, c.width, c.height);
    return new Promise((ok, loi) =>
      c.toBlob(b => b ? ok(b) : loi(new Error('máy không nén nổi ảnh này')), 'image/jpeg', 0.85));
  };
  return new Promise((ok, loi) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let xong = false;
    /* iPhone/Android chậm có lúc không bắn cả onload lẫn onerror → treo mãi,
       người dùng tưởng web chết. 20 giây là bỏ, còn báo được lỗi (07/09) */
    const het = setTimeout(() => {
      if (xong) return; xong = true;
      try { URL.revokeObjectURL(url); } catch (e) { }
      loi(new Error('đọc ảnh quá lâu — thử ảnh khác'));
    }, 20000);
    img.onload = async () => {
      if (xong) return; xong = true; clearTimeout(het);
      try { const b = await veRaBlob(img, img.width, img.height); URL.revokeObjectURL(url); ok(b); }
      catch (e) { URL.revokeObjectURL(url); loi(e); }
    };
    /* <img> không đọc được (ảnh HEIC/HEIF của iPhone là ca thường gặp nhất —
       Trường báo 07/09 đổi ảnh không lưu được): thử đường createImageBitmap,
       Safari mới và Chrome Android giải mã HEIC được bằng đường này (07/09) */
    img.onerror = async () => {
      if (xong) return; xong = true; clearTimeout(het);
      try { URL.revokeObjectURL(url); } catch (e) { }
      if (!window.createImageBitmap) return loi(new Error('máy không đọc được kiểu ảnh này'));
      try {
        const bm = await createImageBitmap(file);
        const b = await veRaBlob(bm, bm.width, bm.height);
        try { bm.close(); } catch (e) { }
        ok(b);
      } catch (e) {
        loi(new Error('kiểu ảnh này máy không đọc được (thử chụp ảnh mới thay vì chọn từ album)'));
      }
    };
    img.src = url;
  });
}
/* ============================================================
   LƯU ẢNH ĐẠI DIỆN — nhận ảnh ĐÃ nén vuông từ màn xem trước.
   Trường bắt 07/09: cột anh_dd trong kho TOÀN TRỐNG dù đã bấm chọn ảnh —
   lỗi bị nuốt ở đâu đó mà không ai biết. Giờ mỗi bước (tải lên kho / ghi vào
   kho dữ liệu) có lỗi riêng nói rõ hỏng ở đâu, KHÔNG bao giờ im lặng nữa.
   ============================================================ */
async function luuAnhDaiDien(nho) {
  if (!D.nguoi) throw new Error('chưa chọn người dùng');
  let url;
  try {
    url = await taiLen(nho, 'avatar', 'image/jpeg', 'av-' + D.nguoi.id + '-' + Date.now());
  } catch (e) {
    throw new Error('không gửi được ảnh lên kho — ' + (e.message || 'mạng rớt') + '. Thử lại khi có sóng tốt.');
  }
  if (!url) throw new Error('kho không trả về địa chỉ ảnh');
  try {
    await ghiBuoc('kt_nguoi', 'update', { anh_dd: url }, D.nguoi.id);
  } catch (e) {
    throw new Error('ảnh đã lên kho nhưng chưa gắn được vào tên — ' + (e.message || 'kho từ chối'));
  }
  D.nguoi.anh = url; D.nguoi.anhLuc = Date.now(); datNguoi(D.nguoi);
  const a = D.ai.find(x => x.id === D.nguoi.id); if (a) a.anh = url;
  luuCache();
  return url;
}
/* doiAnhDaiDien() gỡ 20/10 — "đường cũ giữ lại cho chỗ nào còn gọi" mà quét
   cả 18.000 dòng không còn chỗ nào gọi thật. */
async function boAnhDaiDien() {
  if (!D.nguoi) return;
  await ghiBuoc('kt_nguoi', 'update', { anh_dd: '' }, D.nguoi.id);
  D.nguoi.anh = ''; D.nguoi.anhLuc = 0; datNguoi(D.nguoi);
  const a = D.ai.find(x => x.id === D.nguoi.id); if (a) a.anh = '';
  luuCache();
  nhac('Đã về chữ cái như cũ', 'la');
}

const laTho = () => D.nguoi && D.nguoi.vai === 'tho';
const laCoSo = () => D.nguoi && D.nguoi.vai === 'coso';
const laQuanLy = () => D.nguoi && D.nguoi.vai === 'quanly';

/* ---------- bản sao trong máy ---------- */
function luuCache() {
  try {
    localStorage.setItem(KHOA_CACHE, JSON.stringify({
      t: Date.now(), cosos: D.cosos, gianhangs: D.gianhangs, ai: D.ai, aiAn: D.aiAn || [], lich: D.lich || [],
      phieu: D.phieu.slice(0, 600), dienBien: D.dienBien, soChat: D.soChat || {}
    }));
  } catch (e) { }
}
function docCache() {
  try {
    const c = JSON.parse(localStorage.getItem(KHOA_CACHE) || 'null');
    if (!c || !c.phieu) return false;
    D.cosos = c.cosos || []; D.gianhangs = c.gianhangs || []; D.ai = c.ai || []; D.aiAn = c.aiAn || [];
    D.lich = c.lich || [];
    D.phieu = c.phieu || []; D.dienBien = c.dienBien || {}; D.soChat = c.soChat || {};
    return true;
  } catch (e) { return false; }
}

/* ============================================================
   NHÃN 💬 TRÊN DANH SÁCH (Trường 30/08: "đâu biết là phiếu nào đang trao đổi")
   Máy chủ đếm tổng tin chat theo phiếu (D.soChat). Máy này nhớ MÌNH ĐÃ ĐỌC
   TỚI TIN THỨ MẤY của từng phiếu (kt_daxem_v1) — nhớ theo SỐ ĐẾM chứ không
   theo giờ, vì số chỉ tăng nên trừ nhau là ra đúng số tin chưa đọc.
   ============================================================ */
const KHOA_DAXEM = 'kt_daxem_v1';
function daXemChat() {
  try { return JSON.parse(localStorage.getItem(KHOA_DAXEM) || '{}') || {}; } catch (e) { return {}; }
}
/* ============================================================
   MỐC "MÌNH VỪA VÀO PHIẾU NÀY" (09/09 — Trường: "xếp theo số phiếu mình vừa
   vào từ gần đến lâu nhất và ngược lại"). Khác hẳn hoạt động của phiếu: đây là
   lịch sử của CHÍNH MÁY NÀY, ai mở phiếu nào lúc nào. Nhớ 400 phiếu gần nhất.
   ============================================================ */
const KHOA_VAO = 'kt_vao_v1';
function mocVao() {
  try { return JSON.parse(localStorage.getItem(KHOA_VAO) || '{}') || {}; } catch (e) { return {}; }
}
function ghiVao(id) {
  if (!id) return;
  try {
    const m = mocVao(); m[id] = Date.now();
    const ks = Object.keys(m);
    if (ks.length > 400) ks.sort((a, b) => m[a] - m[b]).slice(0, ks.length - 400).forEach(k => delete m[k]);
    localStorage.setItem(KHOA_VAO, JSON.stringify(m));
  } catch (e) { }
}
function lucVao(id) { return mocVao()[id] || 0; }

function ghiDaXem(id) {
  try {
    const d = daXemChat(); d[id] = soTinChat(id);
    localStorage.setItem(KHOA_DAXEM, JSON.stringify(d));
  } catch (e) { }
}
/* lấy số LỚN HƠN giữa đếm của máy chủ và đếm trong máy: vừa gửi một câu thì
   máy mình đã có tin đó trước khi máy chủ kịp đếm lại */
function soTinChat(id) {
  const sv = (D.soChat && D.soChat[id]) ? D.soChat[id].so : 0;
  const may = (D.dienBien[id] || []).filter(x => x.loai === 'chat').length;
  return Math.max(sv, may);
}
function tinChuaDoc(id) {
  return Math.max(0, soTinChat(id) - (daXemChat()[id] || 0));
}

/* ---------- đọc dữ liệu ---------- */
/* 20/09: từng có hàm tenNgan() ở đây để rút tên CHT cho cột hẹp, nhưng
   kt-ui.js đã có sẵn một tenNgan() khác (bỏ tiền tố "Aeon Mall" khỏi tên cơ
   sở) — hai hàm cùng tên, bản nạp sau đè bản trước, rất dễ gây lỗi câm về
   sau. Cột CHT giờ chỉ hiện dấu ✓ nên không cần hàm này nữa, gỡ hẳn. */

/* ============================================================
   KHỚP LẠI TÊN THỢ GHI THIẾU (19/09).
   Soát kho thấy KT-0002 và KT-0004 ghi người nhận là "Tuân" trong khi trong
   danh sách team là "Hoàng Văn Tuân" — chắc hồi đầu sửa tay trong kho. Tên
   không khớp thì MỌI chỗ đối chiếu theo tên đều trượt: hiệu suất, đúng hẹn,
   đang ôm mấy việc, gợi ý giao việc. Hai phiếu đó biến mất khỏi thống kê mà
   không ai biết.
   Sửa ngay lúc nạp dữ liệu về máy, KHÔNG đụng vào kho: tên trong kho giữ
   nguyên làm bằng chứng, chỉ phần tính toán dùng tên đã khớp.
   Chỉ khớp khi CHẮC CHẮN: đúng một người trong team có tên chứa chuỗi đó.
   Hai người cùng tên gọi "Tuân" thì thà để nguyên còn hơn gán nhầm.
   ============================================================ */
function khopTenTho(ten) {
  const t = String(ten || '').trim();
  if (!t) return '';
  const ds = (D.ai || []).filter(a => a.vai === 'tho');
  if (ds.some(a => a.ten === t)) return t;             /* khớp sẵn rồi */
  const k = boDau(t);
  const hop = ds.filter(a => {
    const b = boDau(a.ten);
    return b === k || b.split(/\s+/).includes(k) || b.endsWith(' ' + k);
  });
  return hop.length === 1 ? hop[0].ten : t;            /* mơ hồ thì giữ nguyên */
}

function chuyenPhieu(r) {
  return {
    id: r.id,
    coSoId: r.co_so_id, gianHangId: r.gian_hang_id,
    noiDung: r.thiet_bi || r.mo_ta || '', moTa: r.mo_ta || '',
    nhomLoi: r.loai_loi || 'khac',
    mucDo: r.muc_do === 'khancap' ? 'khancap' : (r.muc_do === 'nhe' || r.muc_do === 'thap' ? 'nhe' : 'binhthuong'),
    trangThai: r.trang_thai || 'moi',
    dangVuong: r.dang_vuong || '', vuongGhi: r.vuong_ghi || '',
    nguoiTao: r.nguoi_tao || '',
    ngayBao: ms(r.ngay_tao) || ms(r.created_at),
    mongMuon: r.mong_muon ? ms(r.mong_muon + 'T00:00:00') : 0,
    nguoiNhanKt: khopTenTho(r.nguoi_nhan_kt), nhanLuc: ms(r.nhan_luc),
    /* nguoiGiao (11/09): admin giao cho nhiều người cùng lúc — ai bấm nhận thì
       người đó thành nguoiNhanKt, danh sách này giữ lại để biết đã báo cho ai */
    nguoiGiao: Array.isArray(r.nguoi_giao) ? r.nguoi_giao : [],
    duKien: ms(r.du_kien),
    ngayXong: ms(r.done_at),
    nguoiSua: (Array.isArray(r.nguoi_sua) ? r.nguoi_sua : []).map(khopTenTho).filter(Boolean),
    chiPhi: Number(r.chi_phi) || 0,
    xuLyGhi: r.xu_ly_ghi || '',
    lyDoTre: r.ly_do_tre || '',
    chtKetQua: r.cht_ket_qua || '', chtNguoi: r.cht_nguoi || '',
    chtLuc: ms(r.cht_luc), chtGhi: r.cht_ghi || '',
    anhTruoc: r.anh_truoc || [], anhSau: r.anh_sau || [],
    nguonKt: r.nguon_kt || '',
    /* lời xin dời hạn đang chờ admin duyệt (28/09). doiXinNgay khác 0 nghĩa là
       đang có lời xin treo — du_kien vẫn là hạn thật cho tới lúc admin duyệt. */
    doiXinNgay: ms(r.doi_xin_ngay), doiXinLy: r.doi_xin_ly || '',
    doiXinNguoi: r.doi_xin_nguoi || '', doiXinLuc: ms(r.doi_xin_luc)
  };
}
/* đang treo một lời xin dời hạn? dùng ở cả nút bấm, dải báo và màn duyệt */
function dangXinDoi(p) { return !!(p && p.doiXinNgay && p.trangThai !== 'nghiemthu' && p.trangThai !== 'huy'); }

/* Chỉ xin đúng những cột web này dùng — xin 'select(*)' là kéo về cả chục cột
   của web cũ, tốn băng thông vô ích. Cửa sổ 180 ngày, cần cũ hơn thì bấm "Cả năm". */
const COT_PHIEU = [
  'id', 'co_so_id', 'gian_hang_id', 'thiet_bi', 'mo_ta', 'loai_loi', 'muc_do', 'trang_thai',
  'dang_vuong', 'vuong_ghi', 'nguoi_tao', 'ngay_tao', 'mong_muon', 'nguoi_nhan_kt', 'nhan_luc',
  'du_kien', 'done_at', 'nguoi_sua', 'chi_phi', 'xu_ly_ghi', 'cht_ket_qua', 'cht_nguoi',
  'cht_luc', 'cht_ghi', 'anh_truoc', 'anh_sau', 'nguon_kt'
].join(',');
const CUA_SO_NGAY = 180;

async function taiHet(im) {
  D.luotTai++;
  let d;
  try {
    d = await goiAPI('tai-het?ngay=' + CUA_SO_NGAY);
  } catch (e) {
    if (!im) nhac('Không tải được dữ liệu — đang dùng bản lưu trong máy', 'do');
    console.error('[taiHet]', e);
    return false;
  }

  /* kt_phu_trach: tên kỹ thuật lo chính cơ sở đó (11/09) — cột mới, bản cũ
     chưa có thì là undefined và mọi thứ chạy như trước */
  D.cosos = (d.co_so || []).filter(c => c.trang_thai !== 'ngung')
    .map(c => ({ id: c.id, ten: c.ten, ktPhuTrach: c.kt_phu_trach || '' }));
  D.gianhangs = (d.gian_hang || []).map(g => ({ id: g.id, coSoId: g.co_so_id, ten: g.ten }));
  /* LỊCH BẬN (11/09): [{id, ten, tu, den, ly, ghi}] — ngày dạng YYYY-MM-DD */
  D.lich = (d.kt_lich || []).map(x => ({ id: x.id, ten: x.nguoi_ten, tu: x.tu_ngay,
    den: x.den_ngay, ly: x.ly_do || '', ghi: x.ghi_chu || '' }));
  /* kho trả CẢ người đã ẩn (08/09) — D.ai là người đang dùng được, D.aiAn để
     admin bấm "hiện lại". Bảng cũ chưa có cột hien thì coi như đang hiện. */
  const dsAi = (d.kt_nguoi || []).map(x => ({ id: x.id, ten: x.ten, vai: x.vai, coSoId: x.co_so_id,
    mau: x.mau || '#0E7490', thuTu: x.thu_tu, anh: x.anh_dd || '',
    an: x.hien === 0 || x.hien === false }));
  D.ai = dsAi.filter(a => !a.an);
  D.aiAn = dsAi.filter(a => a.an);
  if (!D.ai.length) D.ai = aiMacDinh();
  D.phieu = (d.phieu_loi || []).map(chuyenPhieu);
  /* số tin nhắn theo phiếu — cho nhãn 💬 trên danh sách (Trường xin 30/08) */
  D.soChat = {};
  /* 14/09: nhận thêm người + nội dung tin cuối để màn Radar nói được "ai nhắn
     gì" mà không cần mở từng phiếu (diễn biến chỉ nạp khi mở phiếu) */
  (d.chat || []).forEach(x => {
    D.soChat[x.phieu_id] = { so: Number(x.so) || 0, cuoi: ms(x.cuoi),
      ai: x.ai || '', tin: x.tin || '', soAnh: Number(x.so_anh) || 0 };
  });
  D.taiXong = true;
  D.docLan = d.doc || 0;                 // số dòng D1 đã quét — theo dõi hạn mức
  try { D.nangLan = Math.round(JSON.stringify(d).length / 1024); } catch (e) { }
  luuCache();
  return true;
}

/* dự phòng khi chưa chạy SQL nạp kt_nguoi */
function aiMacDinh() {
  const tho = [['tho_tuan', 'Tuân', '#16A34A'], ['tho_luc', 'Lực', '#B45309'], ['tho_luyen', 'Luyện', '#1D4ED8'],
  ['tho_doan', 'Đoàn', '#6D28D9'], ['tho_hien', 'A Hiến', '#B91C1C'], ['tho_hieu', 'A Hiếu', '#0F766E']];
  return [].concat(
    D.cosos.map((c, i) => ({ id: 'cs_' + c.id, ten: c.ten, vai: 'coso', coSoId: c.id, mau: '#BE185D', thuTu: 10 + i })),
    tho.map((t, i) => ({ id: t[0], ten: t[1], vai: 'tho', coSoId: null, mau: t[2], thuTu: i + 1 })),
    [{ id: 'ql', ten: 'Quản lý', vai: 'quanly', coSoId: null, mau: '#0E7490', thuTu: 99 }]
  );
}

/* ---------- tra cứu ---------- */
const coso = id => D.cosos.find(c => c.id === id) || { id: id, ten: id || '—' };
const gianhang = id => D.gianhangs.find(g => g.id === id) || null;
const tenCoSo = id => coso(id).ten;
const tenGianHang = id => { const g = gianhang(id); return g ? g.ten : ''; };
const dsTho = () => D.ai.filter(a => a.vai === 'tho');

/* Diễn biến do web OMS cũ ghi để UUID ở cột nguoi_dung_id, hiện ra là một chuỗi
   dài vô nghĩa. Dò sang tên nếu khớp, không khớp thì nói thẳng là của web cũ. */
const LA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function tenNguoi(v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (!LA_UUID.test(v)) return v;
  const a = (D.ai || []).find(x => x.id === v || x.uuid === v);
  return a ? a.ten : 'Người dùng web cũ';
}
const mauTho = ten => (dsTho().find(t => t.ten === ten) || {}).mau || '#64748B';

/* ---------- luật quá hạn ---------- */
function han(p) {                       // hạn thực tế của phiếu
  return p.duKien || p.mongMuon || 0;
}
/* ============================================================
   XONG MUỘN (19/09 — Trường: "quá hạn rồi sau đó sửa thì tính là gì").
   soNgayTre() chỉ đếm việc CHƯA xong, nên sửa xong là mọi dấu vết trễ biến
   mất khỏi màn hình: làm trễ 5 ngày trông y hệt làm đúng hẹn, chỉ còn con số
   % đúng hẹn trong màn Hiệu suất mà số đó không nói phiếu nào, trễ mấy ngày.
   Hàm này đếm ngược lại: việc ĐÃ xong thì trễ bao nhiêu ngày so với ngày đã
   tự hẹn. Đệm 1 ngày giống cách tính % đúng hẹn — xong trong ngày hẹn vẫn là
   đúng hẹn, không bắt bẻ mấy tiếng.
   ============================================================ */
function soNgayMuon(p) {
  if (!p || !p.ngayXong || !p.duKien) return 0;
  if (!['hoanthanh', 'nghiemthu'].includes(p.trangThai)) return 0;
  /* làm TRÒN LÊN, không phải tròn xuống: hẹn hết ngày 10 mà xong ngày 13 là
     muộn 3 ngày (11, 12, 13). Tròn xuống ra 2 — thiếu mất một ngày vì mốc hạn
     đã trừ 1 mili giây. Xong lúc 14h ngày 11 cũng tính tròn 1 ngày muộn. */
  const d = Math.ceil((p.ngayXong - (p.duKien + NGAY - 1)) / NGAY);
  return d > 0 ? d : 0;
}

function soNgayTre(p) {
  if (['hoanthanh', 'nghiemthu', 'huy'].includes(p.trangThai)) return 0;
  const h = han(p); if (!h) return 0;
  const d = Math.floor((HOM_NAY() - h) / NGAY);
  return d > 0 ? d : 0;
}
function sapTre(p) {                    // còn <= 24h → 0 = hạn hôm nay, 1 = còn 1 ngày, -1 = không tính
  if (['hoanthanh', 'nghiemthu', 'huy'].includes(p.trangThai)) return -1;
  const h = han(p); if (!h) return -1;
  const con = Math.round((h - HOM_NAY()) / NGAY);
  return (con === 0 || con === 1) ? con : -1;
}
/* ============================================================
   "CHƯA AI TIẾP NHẬN" = CHƯA AI BẤM NHẬN, dù phiếu đã có tên người (11/09).
   Trước đây phiếu được giao đích danh thì rơi khỏi thẻ này — hợp lý hồi đó vì
   chỉ quản lý mới giao tay, giao xong thì tự biết. Nhưng từ bản này, cơ sở có
   kỹ thuật phụ trách thì MỌI phiếu tự mang tên người đó ngay khi báo: nếu vẫn
   trừ ra thì hôm anh ấy ốm, phiếu mang tên anh ấy nằm im mà thẻ báo 0 —
   quản lý không thấy, cả team tưởng có người lo rồi. Đúng cái bẫy Trường hỏi.
   Giờ: chưa bấm nhận (chưa có ngày hẹn) thì vẫn đếm là chưa tiếp nhận.
   Ai đang được giao thì thẻ phiếu vẫn ghi rõ "ĐÃ GIAO CHO X".
   ============================================================ */
const chuaAiNhan = p => p.trangThai === 'moi';
/* ĐƯỢC GIAO ĐÍCH DANH (Trường chốt 04/09): phiếu 'moi' mà ĐÃ có tên người nhận
   = quản lý chỉ định, chờ người đó vào hẹn ngày. Không thêm cột mới nào cả. */
const duocGiao = p => p.trangThai === 'moi' && (!!p.nguoiNhanKt || ((p.nguoiGiao || []).length > 0));
/* việc này có giao cho tôi không — dùng cho ô "Của tôi" và màn Chú ý */
const giaoChoToi = (p, ten) => {
  const t = ten || (D.nguoi || {}).ten;
  return p.nguoiNhanKt === t || (p.nguoiGiao || []).indexOf(t) >= 0;
};
/* ============================================================
   LỊCH BẬN CỦA KỸ THUẬT — GỠ 20/10 (Trường: "bỏ lịch anh em đi").
   Dựng 11/09 theo yêu cầu "ae kỹ thuật thi thoảng phải đi setup, nghỉ làm,
   có việc cá nhân đã báo cho tao". Hai tháng sau: bảng kt_lich 0 dòng, không
   một ai báo lấy một lần, dù có ba cửa vào trên giao diện.
   Gỡ: LY_BAN, banNgay, banTrongKhoang, chuBan, themLichBan, xoaLichBan.
   GIỮ NGUYÊN bảng kt_lich trên máy chủ và D.lich trong bộ nhớ — xoá dữ liệu
   là quyền của Trường, và còn kho thì sau này dựng lại được.
   ============================================================ */
const ngayNgan = d => new Date(d).toISOString().slice(0, 10);

/* tên kỹ thuật phụ trách một cơ sở — rỗng nghĩa là cơ sở đó chạy như cũ
   (ai rảnh tự nhận). Chỉ nhận người đang HIỆN và đúng vai kỹ thuật, để người
   đã nghỉ việc không còn được giao phiếu mới. */
function ktPhuTrach(coSoId) {
  try {
    const c = (D.cosos || []).find(x => x.id === coSoId);
    const ten = (c && c.ktPhuTrach) || '';
    if (!ten) return '';
    const a = (D.ai || []).find(x => x.ten === ten && x.vai === 'tho' && x.hien !== false);
    return a ? a.ten : '';
  } catch (e) { return ''; }
}
const choCHT = p => p.trangThai === 'hoanthanh' && !p.chtKetQua;
const xong = p => p.trangThai === 'nghiemthu' || p.trangThai === 'hoanthanh';

/* ---------- ghi dữ liệu ---------- */
let dangLuu = 0;
function batLuu() { dangLuu++; document.getElementById('chanLuu').classList.remove('an'); }
function tatLuu() { dangLuu = Math.max(0, dangLuu - 1); if (!dangLuu) document.getElementById('chanLuu').classList.add('an'); }

/* Mất mạng THẬT thì mới xếp hàng. Máy chủ từ chối (sai kiểu, sai ràng buộc, RLS chặn)
   thì xếp hàng vô ích — gửi lại bao nhiêu lần cũng hỏng — mà lại báo sai là "mất mạng"
   làm không ai biết lỗi thật nằm đâu. */
function laMatMang(e) {
  if (!e) return false;
  /* Có mã / chi tiết / gợi ý = máy chủ ĐÃ trả lời rồi, dù nó từ chối.
     Không được xét navigator.onLine trước — có máy báo offline sai, thế là
     lỗi máy chủ bị dán nhãn "mất mạng" và xếp hàng gửi lại vô ích mãi mãi. */
  if (e.code || e.details || e.hint) return false;
  const m = String(e.message || e || '');
  if (/Failed to fetch|Load failed|NetworkError|ERR_|timed? ?out|AbortError/i.test(m)) return true;
  return navigator.onLine === false;
}
function loiGon(e) {
  if (!e) return 'không rõ';
  return String(e.message || e.details || e.hint || e.code || e).slice(0, 150);
}

/* im = true: ghi ngầm (nhật ký), hỏng thì chỉ vào console, không quấy người dùng */
let LOI_CUOI = null;

async function ghiKq(bang, kieu, du, khoa, im, theo) {
  batLuu();
  try {
    const kq = await goiAPI('ghi', { bang: bang, kieu: kieu, du: du, khoa: khoa, theo: theo });
    /* kho báo mã phiếu bị người khác chiếm nên đã cấp mã khác — xem d1.js */
    if (kq && kq.doiMa && kq.ma) return { ok: true, ma: kq.ma, maCu: kq.maCu };
    return { ok: true };
  } catch (e) {
    if (laMatMang(e)) {
      xepHang({ bang, kieu, du, khoa, lan: 0 });
      if (!im) nhac('Mất mạng — đã xếp hàng, có sóng sẽ tự gửi', 'canh');
      return { ok: false, matMang: true, loi: loiGon(e) };
    }
    /* máy chủ từ chối: nói thật, KHÔNG xếp hàng */
    console.error('[ghi] ' + bang + '.' + kieu + ' bị từ chối:', e, du);
    LOI_CUOI = { luc: Date.now(), bang: bang, kieu: kieu, loi: loiGon(e) };
    if (!im) nhac('Không lưu được ' + bang + ': ' + loiGon(e), 'do');
    return { ok: false, matMang: false, loi: loiGon(e) };
  } finally { tatLuu(); }
}
async function ghi(bang, kieu, du, khoa, im, theo) {
  return (await ghiKq(bang, kieu, du, khoa, im, theo)).ok;
}

/* XOÁ một dòng danh mục (cơ sở / gian hàng / người) — máy chủ chỉ cho 3 bảng này.
   Không xếp hàng khi mất mạng: xoá là việc dứt khoát, phải biết chắc đã xoá hay chưa. */
async function xoaDong(bang, id) {
  const kq = await goiAPI('ghi', { bang: bang, kieu: 'xoa', khoa: id });
  return kq;
}

/* ============================================================
   GHI BƯỚC VÒNG ĐỜI — phải CHẶN nếu máy chủ từ chối.
   Trước đây các hàm giao việc / tiếp nhận / báo xong đều gọi ghi()
   rồi BỎ QUA kết quả, cứ cập nhật màn hình như đã lưu. Máy chủ từ
   chối mà màn hình vẫn ghi "Đã hoàn thành" — mất việc mà tưởng xong.
   Mất mạng thì khác: đã xếp hàng, có sóng tự gửi, nên cho đi tiếp.
   ============================================================ */
let BI_CHAN = '';        // máy chủ đang chặn cả project (vượt hạn mức...)

async function ghiBuoc(bang, kieu, du, khoa, theo) {
  const r = await ghiKq(bang, kieu, du, khoa, false, theo);
  if (r.ok) {
    if (BI_CHAN) { BI_CHAN = ''; veBangChan(); }
    return r.ma ? r : true;                        // trả cả mã mới nếu kho đã đổi mã
  }
  if (r.matMang) return true;                       // đã xếp hàng, sẽ gửi lại
  if (/restricted|quota|exceed_egress|upgrade their plan/i.test(r.loi || '')) {
    BI_CHAN = r.loi; veBangChan();
  }
  throw new Error(r.loi || 'máy chủ từ chối lưu');
}

/* băng đỏ dính trên đầu web khi máy chủ chặn — để 6 kỹ thuật khỏi làm hoài mà không lưu */
function veBangChan() {
  let el = document.getElementById('bangChan');
  if (!BI_CHAN) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'bangChan'; el.className = 'bangChan';
    document.body.appendChild(el);
  }
  el.innerHTML = '<b>⛔ MÁY CHỦ ĐANG CHẶN — KHÔNG LƯU ĐƯỢC GÌ</b>' +
    '<span>Vượt hạn mức Supabase. Mọi thao tác bây giờ <u>không</u> được ghi lại. ' +
    'Đừng làm tiếp, báo quản lý xử lý hạn mức trước.</span>';
}

/* hàng đợi khi mất sóng */
function xepHang(v) {
  try {
    const h = JSON.parse(localStorage.getItem(KHOA_HANG) || '[]');
    h.push(v); localStorage.setItem(KHOA_HANG, JSON.stringify(h));
  } catch (e) { }
}
async function chayHang() {
  let h = [];
  try { h = JSON.parse(localStorage.getItem(KHOA_HANG) || '[]'); } catch (e) { }
  /* dọn rác của bản cũ: nhật ký thao tác không cần gửi lại, hỏng thì bỏ */
  h = h.filter(v => v && v.bang !== 'kt_nhat_ky');
  if (!h.length) { localStorage.setItem(KHOA_HANG, '[]'); return; }
  const con = []; let bo = 0;
  for (const v of h) {
    let loi = null;
    try { await goiAPI('ghi', { bang: v.bang, kieu: v.kieu, du: v.du, khoa: v.khoa, theo: v.theo }); }
    catch (e) { loi = e; }
    if (!loi) continue;
    v.lan = (v.lan || 0) + 1;
    /* thử 5 lần mà máy chủ vẫn từ chối thì bỏ, đừng để hàng đợi phình mãi */
    if (v.lan >= 5 || !laMatMang(loi)) { bo++; console.error('[hàng đợi] bỏ', v, loi); }
    else con.push(v);
  }
  localStorage.setItem(KHOA_HANG, JSON.stringify(con));
  const xong = h.length - con.length - bo;
  if (xong > 0) nhac('Đã gửi ' + xong + ' việc đang chờ', 'la');
  if (bo > 0) nhac('Bỏ ' + bo + ' việc máy chủ từ chối — xem Cài đặt → Lỗi gần nhất', 'do');
}

/* nhật ký + diễn biến */
/* Nhật ký thao tác chỉ để tra lại về sau. Hỏng thì im, tuyệt đối không hiện gì cho
   người dùng — trước đây nó là thủ phạm làm mỗi lần bấm lưu đều báo "Mất mạng". */
function veVet(phieuId, hanhDong, chiTiet) {
  ghi('kt_nhat_ky', 'insert', {
    phieu_id: phieuId, nguoi_id: (D.nguoi || {}).id || '', nguoi_ten: (D.nguoi || {}).ten || '',
    hanh_dong: hanhDong, chi_tiet: chiTiet || {}, may: (navigator.userAgent || '').slice(0, 120), created_at: iso(Date.now())
  }, null, true);
}
/* ============================================================
   GHI DIỄN BIẾN
   Bảng dien_bien trong D1 có cột nguoi_ten (TEXT) nên chỉ ghi TÊN.
   Bản cũ phải dò 3 kiểu cột vì bảng Supabase để nguoi_dung_id kiểu
   uuid — chuyện đó chấm dứt cùng Supabase, đã bỏ hẳn phần dò.
   ============================================================ */
async function themDienBien(phieuId, loai, text, anh, tenGhi) {
  /* tenGhi: ai bấm gửi LÚC CHỌN ảnh — gửi nền xong muộn thì người dùng có khi đã đổi
     sang tài khoản khác, không được ghi nhầm tên người mới */
  const ten = tenGhi || (D.nguoi || {}).ten || '';
  /* hiện ngay trên màn, không đợi máy chủ */
  (D.dienBien[phieuId] = D.dienBien[phieuId] || []).push({
    id: 'tam' + Date.now(), t: Date.now(), loai, ten, text: text || '', anh: anh || []
  });
  const r = await ghiKq('dien_bien', 'insert', {
    phieu_id: phieuId, nguoi_ten: ten, loai: loai,
    noi_dung: text || '', anh: anh || [], created_at: iso(Date.now())
  });
  if (r.ok || r.matMang) return true;          // mất mạng thì ghiKq đã xếp hàng
  if (/restricted|quota|exceed_egress|upgrade their plan/i.test(r.loi || '')) {
    BI_CHAN = r.loi; veBangChan();
  }
  return false;
}

/* Dùng cho tin nhắn: hỏng thì PHẢI nổ lỗi để ô nhắn giữ lại chữ đã gõ. */
async function themDienBienBuoc(phieuId, loai, text, anh) {
  const ok = await themDienBien(phieuId, loai, text, anh);
  if (!ok) throw new Error(LOI_CUOI ? LOI_CUOI.loi : 'máy chủ từ chối lưu tin');
  return true;
}

/* maMoi() gỡ 20/10 — hỏi máy chủ cấp mã, nhưng mọi chỗ gửi phiếu đều dùng
   maDoan() ngay dưới đây để bớt một vòng đi-về trên 4G. Không ai gọi nữa. */
/* Đoán mã ngay trong máy, KHÔNG gọi mạng — dùng cho lúc gửi phiếu để bớt một
   vòng đi-về (trên 4G mỗi vòng mất 200–400ms, gửi phiếu đang phải chờ 2 vòng).
   Đoán trùng cũng không sao: kho tự cấp mã kế tiếp rồi trả về mã thật (xem d1.js). */
function maDoan() {
  const n = D.phieu.filter(p => /^KT-\d+$/.test(p.id)).map(p => Number(p.id.slice(3))).sort((a, b) => b - a)[0] || 0;
  return 'KT-' + String(n + 1).padStart(4, '0');
}


/* ============================================================
   MÀU ĐỊNH DANH CƠ SỞ — mỗi cơ sở MỘT màu cố định vĩnh viễn,
   như màu avatar Zalo. Quét dọc danh sách là các thẻ cùng cơ sở
   tự cụm lại bằng màu, không phải đọc chữ (Trường yêu cầu 21/08).
   Màu tính từ mã cơ sở nên thêm cơ sở mới cũng không xô màu cũ.
   ============================================================ */
/* 12 cặp màu cố tình CÁCH XA NHAU về tông — hai cơ sở đứng cạnh không được na ná
   (bản đầu có 2 màu vàng gần nhau, Royal City với Hải Dương nhìn lướt tưởng một) */
const BANG_MAU_CS = [
  ['#EDE9FE', '#6D28D9'],   /* tím        */
  ['#FCE7F3', '#BE185D'],   /* hồng       */
  ['#DBEAFE', '#1D4ED8'],   /* xanh dương */
  ['#DCFCE7', '#15803D'],   /* xanh lá    */
  ['#FEF3C7', '#B45309'],   /* vàng       */
  ['#CFFAFE', '#0E7490'],   /* cyan       */
  ['#FFE4E6', '#BE123C'],   /* đỏ hồng    */
  ['#F1F5F9', '#334155'],   /* xám xanh   */
  ['#ECFCCB', '#4D7C0F'],   /* xanh nõn   */
  ['#E0E7FF', '#4338CA'],   /* chàm       */
  ['#FFEDD5', '#C2410C'],   /* cam        */
  ['#CCFBF1', '#0F766E']    /* ngọc       */
];
/* Bản đầu băm mã cơ sở ra số rồi chia lấy dư — nghe hay nhưng bài nghiệm thu 21/08
   lòi ra: 12 cơ sở mà chỉ ra 9 màu, 3 cặp đụng nhau (băm là thế, không hứa không trùng).
   Trùng màu thì cả ý nghĩa của việc tô màu mất sạch. Giờ phát màu theo THỨ TỰ mã cơ sở
   đã xếp: 12 cơ sở = 12 màu khác nhau, chắc chắn. Mã cơ sở không đổi nên màu cũng
   không đổi; thêm cơ sở mới xếp sau thì các cơ sở cũ giữ nguyên màu. */
const MAU_CS_NHO = {};
function mauCoSo(id) {
  const t = String(id || '');
  if (MAU_CS_NHO[t]) return MAU_CS_NHO[t];
  const ds = ((typeof D !== 'undefined' && D.cosos) || []).map(c => String(c.id)).sort();
  let i = ds.indexOf(t);
  if (i < 0) {                        /* cơ sở lạ (chưa tải xong / đã ẩn): quay về cách băm */
    let h = 0;
    for (let k = 0; k < t.length; k++) h = (h * 31 + t.charCodeAt(k)) >>> 0;
    i = h % BANG_MAU_CS.length;
  }
  const m = BANG_MAU_CS[i % BANG_MAU_CS.length];
  if (ds.length) MAU_CS_NHO[t] = m;   /* nhớ lại để màu không nhảy giữa phiên */
  return m;
}

/* ---------- 4 hành động ---------- */
async function giaoViec(v) {                       // ① cơ sở giao việc
  /* GỬI PHIẾU NHANH NHẤT: đoán mã ngay trong máy thay vì hỏi máy chủ trước —
     bớt hẳn một vòng đi-về. Nếu đoán trùng mã người khác vừa lấy thì kho tự
     cấp mã kế tiếp và trả về, đã có test nt4-ma chứng minh (Trường 26/08). */
  let id = maDoan();
  /* ============================================================
     KỸ THUẬT PHỤ TRÁCH THEO CƠ SỞ (Trường chốt 11/09 — cơ sở Huế cách Hà Nội
     700km, "ai rảnh tự nhận" là luật cho team cùng địa bàn; với Huế thì thực
     tế chỉ một người đi được, để phiếu nằm chờ ai đó nhận là chờ vô nghĩa).
     Cơ sở nào có người phụ trách thì phiếu TỰ GẮN TÊN người đó ngay khi báo —
     họ nhận thông báo đích danh, khỏi chờ ai để ý.
     NHƯNG phiếu vẫn ở trạng thái 'moi' (CHƯA AI NHẬN), vì hai lý do:
       · giữ kỷ luật "nhận việc là hẹn ngày" — không có ngày hẹn thì cột quá
         hạn và tỉ lệ đúng hẹn hỏng theo
       · người phụ trách ốm/nghỉ mà im lặng thì thẻ "Chưa ai tiếp nhận" vẫn
         đếm, quản lý biết mà nhắc — thay vì cả team tưởng "có người lo rồi"
     Người khác vẫn nhận thay được (duocGiao → nhãn "ĐÃ GIAO CHO X — bạn vẫn
     nhận thay được"), và người được giao có nút "↩ Trả việc lại team".
     Để trống ô phụ trách thì chạy y như cũ.
     ============================================================ */
  const phuTrach = (typeof ktPhuTrach === 'function' ? ktPhuTrach(v.coSoId) : '');
  const p = {
    id: id, loai: 'kythuat', co_so_id: v.coSoId, gian_hang_id: v.gianHangId || null,
    thiet_bi: v.noiDung, mo_ta: v.moTa || '', loai_loi: v.nhomLoi, muc_do: v.mucDo,
    trang_thai: 'moi', nguoi_tao: (D.nguoi || {}).ten || '', ngay_tao: iso(Date.now()),
    nguoi_nhan_kt: phuTrach || null,
    mong_muon: v.mongMuon || null, anh_truoc: v.anh || [], nguon_kt: 'ktweb', deleted: false
  };
  const kq = await ghiBuoc('phieu_loi', 'insert', p);
  /* Hai người bấm Gửi cùng lúc thì kho cấp mã khác để không đè phiếu nhau — nhận mã
     thật về đây, nếu không thì mọi thứ sau (diễn biến, ảnh, thông báo) treo vào mã sai. */
  if (kq && kq.ma && kq.ma !== id) { id = kq.ma; p.id = id; }
  D.phieu.unshift(chuyenPhieu(p));
  /* diễn biến + nhật ký chạy NỀN, không bắt người dùng đứng chờ */
  themDienBien(id, 'tao', 'Cơ sở giao việc — mong muốn xong ' + (v.mongMuon ? ddyy(ms(v.mongMuon + 'T00:00:00')) : 'chưa đặt'), v.anh || []);
  veVet(id, 'giao_viec', { mucDo: v.mucDo, mongMuon: v.mongMuon });
  luuCache();
  /* AI đọc lại nội dung để đoán nhóm lỗi — CHẠY NỀN, không ai phải chờ.
     Phiếu đã lưu xong và đã báo thành công trước khi dòng này chạy. */
  aiDoanNhom(id, v.noiDung + ' ' + (v.moTa || ''));
  return id;
}

/* ============================================================
   AI ĐOÁN NHÓM LỖI — CHẠY NỀN (20/09 — Trường chốt).
   Luật xương sống của web này là "gửi phải nhanh", nên AI KHÔNG được nằm
   trên đường đi của nút Gửi. Phiếu lưu xong, cơ sở thấy báo thành công, rồi
   mới tới lượt AI đọc. Nó trả lời sau 1–2 giây thì web tự cập nhật lại nhóm;
   trả lời sai, hết hạn mức, hay mất mạng thì phiếu giữ nguyên nhóm do bộ dò
   từ khoá đoán — y như trước, không ai biết là có chuyện gì.
   ============================================================ */
async function aiDoanNhom(phieuId, chu) {
  try {
    const r = await fetch('/api/ai-nhom', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: phieuId, chu: String(chu || '').slice(0, 400) })
    }).then(x => x.json());
    const nhom = r && r.ds && r.ds[0] && r.ds[0].nhom;
    if (!nhom || !NHOM_LOI[nhom]) return;
    const p = phieu(phieuId);
    if (!p || p.nhomLoi === nhom) return;
    const cu = p.nhomLoi;
    await ghi('phieu_loi', 'update', { loai_loi: nhom }, phieuId);
    p.nhomLoi = nhom;
    /* ghi vết để sau này tra được cái nào do AI đổi, đổi từ gì sang gì */
    veVet(phieuId, 'ai_nhom', { tu: cu, sang: nhom });
    luuCache();
    if (typeof veHet === 'function') veHet();
    if (typeof PH !== 'undefined' && PH && PH.id === phieuId && typeof veNgan === 'function') veNgan();
  } catch (e) { /* AI hỏng thì thôi, nhóm từ điển vẫn còn đó */ }
}

async function tiepNhan(p, duKienISO, ghiChu) {    // ② kỹ thuật tiếp nhận + hẹn ngày
  const du = {
    trang_thai: 'tiepnhan', nguoi_nhan_kt: (D.nguoi || {}).ten || '',
    nhan_luc: iso(Date.now()), du_kien: iso(ms(duKienISO + 'T00:00:00'))
  };
  await ghiBuoc('phieu_loi', 'update', du, p.id);
  p.trangThai = 'tiepnhan'; p.nguoiNhanKt = du.nguoi_nhan_kt; p.nhanLuc = Date.now(); p.duKien = ms(duKienISO + 'T00:00:00');
  themDienBien(p.id, 'nhan', 'Kỹ thuật tiếp nhận — cam kết xong ' + ddyy(p.duKien) + (ghiChu ? ' · ' + ghiChu : ''));
  veVet(p.id, 'tiep_nhan', { duKien: duKienISO });
  luuCache();
}

async function doiVuong(p, vuong, ghiChu) {        // đang vướng
  await ghiBuoc('phieu_loi', 'update', { dang_vuong: vuong || null, vuong_ghi: ghiChu || '' }, p.id);
  p.dangVuong = vuong || ''; p.vuongGhi = ghiChu || '';
  themDienBien(p.id, 'vuong', vuong ? ('Chuyển sang ' + (VUONG[vuong] || {}).ten + (ghiChu ? ' — ' + ghiChu : '')) : 'Hết vướng, làm tiếp');
  veVet(p.id, 'doi_vuong', { vuong, ghiChu });
  luuCache();
}

/* ============================================================
   DỜI HẠN — ADMIN ĐỔI THẲNG, KỸ THUẬT PHẢI XIN (28/09, Trường chốt).
   Admin giữ nguyên quyền cũ: bấm là đổi, không ai duyệt admin.
   Kỹ thuật đi qua xinDoiNgay → duyetDoiNgay / tuChoiDoiNgay / rutXinDoi.
   ============================================================ */
async function doiNgay(p, duKienISO, lyDo) {       // dời ngày dự kiến (admin)
  const cu = p.duKien;
  await ghiBuoc('phieu_loi', 'update', { du_kien: iso(ms(duKienISO + 'T00:00:00')) }, p.id);
  p.duKien = ms(duKienISO + 'T00:00:00');
  themDienBien(p.id, 'doingay', 'Dời ngày dự kiến ' + (cu ? ddyy(cu) + ' → ' : '') + ddyy(p.duKien) + (lyDo ? ' · ' + lyDo : ''));
  veVet(p.id, 'doi_ngay', { cu: cu, moi: duKienISO, lyDo });
  luuCache();
}

/* ① kỹ thuật xin dời — du_kien KHÔNG đổi, chỉ treo lời xin lên chờ admin */
async function xinDoiNgay(p, duKienISO, lyDo) {
  const ten = (D.nguoi || {}).ten || '';
  const moi = ms(duKienISO + 'T00:00:00');
  await ghiBuoc('phieu_loi', 'update', {
    doi_xin_ngay: iso(moi), doi_xin_ly: lyDo || '',
    doi_xin_nguoi: ten, doi_xin_luc: iso(Date.now())
  }, p.id);
  p.doiXinNgay = moi; p.doiXinLy = lyDo || ''; p.doiXinNguoi = ten; p.doiXinLuc = Date.now();
  themDienBien(p.id, 'xindoi', 'Xin dời hạn ' + (p.duKien ? ddyy(p.duKien) + ' → ' : '') + ddyy(moi) +
    ' — chờ quản lý duyệt' + (lyDo ? '\nLý do: ' + lyDo : ''));
  veVet(p.id, 'xin_doi_ngay', { cu: p.duKien, xin: duKienISO, lyDo });
  luuCache();
}

/* dọn sạch lời xin — dùng chung cho duyệt, từ chối, rút và cả lúc báo xong */
function donLoiXin(p) {
  p.doiXinNgay = 0; p.doiXinLy = ''; p.doiXinNguoi = ''; p.doiXinLuc = 0;
  return { doi_xin_ngay: null, doi_xin_ly: '', doi_xin_nguoi: '', doi_xin_luc: null };
}

/* ② admin duyệt — lúc này ngày mới mới thành hạn thật */
async function duyetDoiNgay(p) {
  const ten = (D.nguoi || {}).ten || '';
  const cu = p.duKien, moi = p.doiXinNgay, aiXin = p.doiXinNguoi;
  if (!moi) return;
  const du = Object.assign({ du_kien: iso(moi) }, donLoiXin(p));
  await ghiBuoc('phieu_loi', 'update', du, p.id);
  p.duKien = moi;
  themDienBien(p.id, 'duyetdoi', '✓ ' + ten + ' DUYỆT dời hạn ' + (cu ? ddyy(cu) + ' → ' : '') + ddyy(moi) +
    (aiXin ? ' (' + aiXin + ' xin)' : ''));
  veVet(p.id, 'duyet_doi_ngay', { cu: cu, moi: iso(moi), aiXin: aiXin });
  luuCache();
}

/* ③ admin từ chối — bắt buộc ghi lý do (Trường chốt), hạn cũ giữ nguyên */
async function tuChoiDoiNgay(p, lyDo) {
  const ten = (D.nguoi || {}).ten || '';
  const xin = p.doiXinNgay, aiXin = p.doiXinNguoi;
  const du = donLoiXin(p);
  await ghiBuoc('phieu_loi', 'update', du, p.id);
  themDienBien(p.id, 'tuchoidoi', '✕ ' + ten + ' KHÔNG duyệt dời hạn sang ' + ddyy(xin) +
    (aiXin ? ' (' + aiXin + ' xin)' : '') + ' — giữ hạn ' + (p.duKien ? ddyy(p.duKien) : 'cũ') +
    '\nLý do: ' + lyDo);
  veVet(p.id, 'tu_choi_doi_ngay', { xin: iso(xin), lyDo: lyDo, aiXin: aiXin });
  luuCache();
}

/* ④ kỹ thuật rút lời xin khi admin chưa kịp quyết */
async function rutXinDoi(p) {
  const ten = (D.nguoi || {}).ten || '';
  const xin = p.doiXinNgay;
  const du = donLoiXin(p);
  await ghiBuoc('phieu_loi', 'update', du, p.id);
  themDienBien(p.id, 'rutxin', '↩ ' + ten + ' rút lời xin dời hạn sang ' + ddyy(xin));
  veVet(p.id, 'rut_xin_doi', { xin: iso(xin) });
  luuCache();
}

async function baoXong(p, v) {                     // ③ kỹ thuật báo đã sửa xong
  /* Xong HÔM NAY (trường hợp thường gặp nhất) thì ghi ĐÚNG GIỜ PHÚT bấm nút —
     "xong 21/08 14:32" nói được nhiều hơn hẳn "xong 21/08". Chọn ngày quá khứ
     thì chịu, không ai nhớ giờ, để 00:00 và chỗ hiển thị sẽ tự giấu giờ đi. */
  const lucXong = v.ngayXong === ngayISO(Date.now()) ? Date.now() : ms(v.ngayXong + 'T00:00:00');
  /* ============================================================
     CHI PHÍ CỘNG DỒN (28/09 — Trường chốt).
     Bản cũ GHI ĐÈ: phiếu bị CHT chấm chưa đạt, sửa lần hai, ô tiền mở ra trống
     trơn, gõ số mới vào là tiền lần trước biến mất khỏi kho — mà thống kê
     tháng, bản tin 9h và cột "gian hàng ngốn tiền nhất" đều đọc đúng ô đó.
     Giờ v.chiPhi là TIỀN PHÁT SINH LẦN NÀY, cộng vào số đã có.
     Từng lần vẫn ghi riêng trong diễn biến để còn tra lại được.
     ============================================================ */
  const themTien = Number(v.chiPhi) || 0;
  const tienCu = Number(p.chiPhi) || 0;
  const tongTien = tienCu + themTien;
  const lanSua = demLanSua(p.id) + 1;
  const du = Object.assign({
    trang_thai: 'hoanthanh', nguoi_sua: v.nguoiSua, done_at: iso(lucXong),
    chi_phi: tongTien, xu_ly_ghi: v.xuLyGhi || '',
    ly_do_tre: v.lyDoTre || '',
    anh_sau: v.anh || [], dang_vuong: null, vuong_ghi: ''
    /* xong rồi thì lời xin dời hạn còn treo là vô nghĩa — tự huỷ, khỏi bắt
       admin đi duyệt một việc đã làm xong (Trường chốt) */
  }, dangXinDoi(p) ? donLoiXin(p) : {});
  await ghiBuoc('phieu_loi', 'update', du, p.id);
  Object.assign(p, {
    trangThai: 'hoanthanh', nguoiSua: v.nguoiSua, ngayXong: lucXong,
    chiPhi: tongTien, xuLyGhi: v.xuLyGhi || '', lyDoTre: v.lyDoTre || '',
    anhSau: v.anh || [], dangVuong: '', vuongGhi: ''
  });
  /* lý do trễ ghi thẳng vào dòng thời gian phiếu — mở phiếu ra là thấy, không
     phải đi tìm trong báo cáo (19/09) */
  themDienBien(p.id, 'xong', 'Báo đã sửa xong' + (lanSua > 1 ? ' (lần ' + lanSua + ')' : '') +
    ' — ' + v.nguoiSua.join(', ') +
    (themTien ? ' · ' + (lanSua > 1 ? 'thêm ' : '') + tien(themTien) + '₫' : ' · không phát sinh chi phí') +
    (lanSua > 1 ? ' · tổng ' + tien(tongTien) + '₫' : '') +
    (v.xuLyGhi ? ' · ' + v.xuLyGhi : '') +
    (v.lyDoTre ? '\n⏰ Xong muộn — ' + v.lyDoTre : ''), v.anh || []);
  veVet(p.id, 'bao_xong', { nguoiSua: v.nguoiSua, chiPhi: themTien, tong: tongTien, lan: lanSua });
  luuCache();
}
/* đã báo xong mấy lần rồi — đếm trong diễn biến đã nạp về máy. Chưa mở phiếu
   bao giờ thì diễn biến chưa có, trả 0 và nhãn "lần n" chỉ đơn giản không hiện;
   con số tiền vẫn cộng đúng vì nó dựa vào p.chiPhi chứ không dựa vào đây. */
function demLanSua(id) {
  const ds = (D.dienBien || {})[id] || [];
  return ds.filter(e => e.loai === 'xong').length;
}

async function nghiemThu(p, dat, lyDo) {           // ④ CHT nghiệm thu
  const ten = (D.nguoi || {}).ten || '';
  if (dat) {
    await ghiBuoc('phieu_loi', 'update', {
      trang_thai: 'nghiemthu', cht_ket_qua: 'dat', cht_nguoi: ten, cht_luc: iso(Date.now()), cht_ghi: ''
    }, p.id);
    Object.assign(p, { trangThai: 'nghiemthu', chtKetQua: 'dat', chtNguoi: ten, chtLuc: Date.now(), chtGhi: '' });
    themDienBien(p.id, 'nghiemthu', 'CHT nghiệm thu: ĐẠT — ' + ten);
  } else {
    await ghiBuoc('phieu_loi', 'update', {
      trang_thai: 'tiepnhan', cht_ket_qua: 'chua_dat', cht_nguoi: ten, cht_luc: iso(Date.now()),
      cht_ghi: lyDo || '', done_at: null, nguoi_sua: null
    }, p.id);
    Object.assign(p, { trangThai: 'tiepnhan', chtKetQua: 'chua_dat', chtNguoi: ten, chtLuc: Date.now(), chtGhi: lyDo || '', ngayXong: 0, nguoiSua: [] });
    themDienBien(p.id, 'traLai', 'CHT nghiệm thu: CHƯA ĐẠT — ' + ten + (lyDo ? ' · ' + lyDo : ''));
  }
  veVet(p.id, 'nghiem_thu', { dat, lyDo });
  luuCache();
}

/* ============================================================
   GIAO VIỆC ĐÍCH DANH + TRẢ VIỆC + ĐỔI NGƯỜI (Trường chốt 04/09).
   Team vẫn tự nhận như cũ — đây là quyền THÊM của quản lý.
   ============================================================ */
async function giaoDichDanh(p, tenTho) {           // admin chỉ định người làm
  await ghiBuoc('phieu_loi', 'update',
    { nguoi_nhan_kt: tenTho, nguoi_giao: [], nhan_luc: null, trang_thai: 'moi' }, p.id);
  p.trangThai = 'moi'; p.nguoiNhanKt = tenTho; p.nguoiGiao = []; p.nhanLuc = 0;
  themDienBien(p.id, 'giao', '📌 Quản lý giao đích danh cho ' + tenTho);
  veVet(p.id, 'giao_dich_danh', { cho: tenTho });
  luuCache();
}
/* ============================================================
   ADMIN GIAO MỘT VIỆC CHO NHIỀU NGƯỜI (11/09).
   Một người  → như cũ: nguoi_nhan_kt = tên đó.
   Nhiều người → nguoi_giao = danh sách, nguoi_nhan_kt để trống; cả nhóm nhận
   thông báo và thấy việc trong ô "Của tôi". Ai bấm nhận thì tiepNhan() ghi
   nguoi_nhan_kt = người đó — những người kia nhìn thấy "X ĐANG SỬA".
   ============================================================ */
async function giaoNhieuNguoi(p, tens) {
  const ds = (tens || []).filter(Boolean);
  if (!ds.length) return;
  if (ds.length === 1) return giaoDichDanh(p, ds[0]);
  await ghiBuoc('phieu_loi', 'update',
    { nguoi_giao: ds, nguoi_nhan_kt: null, nhan_luc: null, trang_thai: 'moi' }, p.id);
  p.trangThai = 'moi'; p.nguoiGiao = ds; p.nguoiNhanKt = ''; p.nhanLuc = 0;
  themDienBien(p.id, 'giao', '📌 Quản lý giao cho ' + ds.length + ' người: ' + ds.join(', ') +
    ' — ai nhận trước thì việc về tay người đó');
  veVet(p.id, 'giao_nhom', { cho: ds });
  luuCache();
}

async function doiNguoiNhan(p, tenMoi) {           // admin chuyển việc sang người khác
  const cu = p.nguoiNhanKt;
  await ghiBuoc('phieu_loi', 'update', { nguoi_nhan_kt: tenMoi }, p.id);
  p.nguoiNhanKt = tenMoi;
  themDienBien(p.id, 'giao', '📌 Quản lý chuyển việc: ' + (cu ? cu + ' → ' : '') + tenMoi);
  veVet(p.id, 'doi_nguoi_nhan', { tu: cu, sang: tenMoi });
  luuCache();
}
async function traViec(p, lyDo) {                  // kỹ thuật kẹt thì trả lại team
  const cu = p.nguoiNhanKt;
  await ghiBuoc('phieu_loi', 'update',
    { nguoi_nhan_kt: '', nhan_luc: null, du_kien: null, trang_thai: 'moi' }, p.id);
  p.trangThai = 'moi'; p.nguoiNhanKt = ''; p.nhanLuc = 0; p.duKien = 0;
  themDienBien(p.id, 'traviec', '↩ ' + cu + ' trả việc lại team — ' + (lyDo || 'không ghi lý do'));
  veVet(p.id, 'tra_viec', { tu: cu, lyDo: lyDo });
  luuCache();
}

/* ============================================================
   THU HỒI GIAO VIỆC (14/09 — Trường: "trượt tay giao nhầm việc thì admin
   phải thu hồi lại").
   Việc quay về đúng trạng thái CHƯA AI NHẬN, y như chưa từng giao: bỏ tên
   người nhận, bỏ danh sách giao nhóm, bỏ giờ nhận và ngày dự kiến mà thợ đã
   hẹn. Phiếu lại hiện trong ô "Chưa ai tiếp nhận" và trong màn gợi ý chia việc.
   BA ĐIỀU CHỐT CÙNG TRƯỜNG:
   ① thợ ĐÃ bấm nhận rồi vẫn thu hồi được, nhưng phải hỏi lại một lần
   ② người bị thu hồi nhận thông báo đẩy, không để họ đi làm việc đã mất
   ③ ghi một dòng vào diễn biến phiếu — ai mở phiếu cũng thấy, không ai phải
      đoán vì sao việc biến khỏi danh sách của mình
   KHÔNG xoá gì cả: diễn biến cũ giữ nguyên, đúng luật "thu hồi không xoá bản
   gốc" mà Trường đặt cho phần thu hồi tin nhắn.
   ============================================================ */
async function thuHoiGiao(p, lyDo) {
  const cu = p.nguoiNhanKt || '';
  const nhom = (p.nguoiGiao || []).slice();
  const daNhan = p.trangThai === 'tiepnhan';
  if (!cu && !nhom.length) return { ai: [], daNhan: false };
  await ghiBuoc('phieu_loi', 'update',
    { nguoi_nhan_kt: '', nguoi_giao: [], nhan_luc: null, du_kien: null, trang_thai: 'moi' }, p.id);
  p.trangThai = 'moi'; p.nguoiNhanKt = ''; p.nguoiGiao = []; p.nhanLuc = 0; p.duKien = 0;
  const ai = cu ? [cu] : nhom;
  themDienBien(p.id, 'thuhoi', '↩ Quản lý thu hồi việc đã giao cho ' + ai.join(', ') +
    (daNhan ? ' (đã bấm nhận)' : '') + (lyDo ? ' — ' + lyDo : '') + ' · việc quay lại chưa ai nhận');
  veVet(p.id, 'thu_hoi_giao', { ai: ai, daNhan: daNhan, lyDo: lyDo || '' });
  luuCache();
  return { ai: ai, daNhan: daNhan };
}

async function nhanTin(p, text, anh) {             // trao đổi
  await themDienBienBuoc(p.id, 'chat', text, anh || []);
  veVet(p.id, 'chat', { dai: (text || '').length, anh: (anh || []).length });
}

async function huyPhieu(p, lyDo) {
  await ghiBuoc('phieu_loi', 'update', { trang_thai: 'huy' }, p.id);
  p.trangThai = 'huy';
  await themDienBien(p.id, 'huy', 'Huỷ phiếu — ' + (lyDo || 'không ghi lý do'));
  veVet(p.id, 'huy', { lyDo });
  luuCache();
}

/* ---------- file ảnh / video ---------- */
const laVideo = u => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(u || ''));
const laTiengNoi = u => /\.(weba|m4a|mp3|ogg)(\?|$)/i.test(String(u || ''));

/* ============================================================
   HỘP CHỜ (Trường chốt 01/09 — "ảnh rất quan trọng"): file CHƯA lên kho xong
   được lưu tạm vào IndexedDB của máy. iPhone giết web chạy nền / lỡ đóng tab
   giữa chừng thì mở lại vẫn còn nguyên file, bấm một nút là gửi tiếp — hết
   cảnh "chọn 9 ảnh, nghe cú điện thoại, mất sạch".
   Xoá khỏi hộp NGAY khi file đã nằm trên kho — từ đó trở đi phần ghi vào phiếu
   đã có hàng đợi mất-mạng riêng lo. Hộp tự dọn: quá 7 ngày hoặc quá 40 món.
   ============================================================ */
/* ============================================================
   CÔNG TẮC RUNG (14/09 — Trường tách ô "Thông báo đẩy" làm hai: một nút bật
   thông báo, một nút bật rung; bật cả hai thì vừa hiện vừa rung).
   Vì sao phải dùng IndexedDB mà không dùng localStorage như mọi cài đặt khác:
   lúc thông báo về, trang web thường KHÔNG chạy — chỉ có service worker chạy,
   và service worker không đọc được localStorage. IndexedDB thì đọc được từ cả
   hai phía. Đây là lý do duy nhất, đừng đổi sang localStorage cho "gọn".
   ============================================================ */
/* ============================================================
   CÔNG TẮC RUNG — LƯU Ở MÁY CHỦ, KHÔNG PHẢI TRONG MÁY (21/09).
   Bản 14/09 cất cờ này vào IndexedDB để service worker đọc ra trước khi hiện
   thông báo. Chính lượt đọc đó đã làm cả hệ thống đẩy im lặng (xem ghi chú
   trong sw.js). Giờ cờ nằm ở máy chủ theo từng máy đã đăng ký, và đi kèm luôn
   trong nội dung đẩy — service worker không phải đọc gì cả.
   localStorage vẫn giữ để màn Cài đặt vẽ ngay, khỏi chờ mạng.
   ============================================================ */
async function datRung(bat) {
  const cu = rungBat();
  try { localStorage.setItem('kt_rung_v1', bat ? '1' : '0'); } catch (e) { }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    /* chưa bật thông báo thì không có dòng nào trên kho để sửa — nhớ trong máy
       là đủ, lúc bật thông báo sẽ mang cờ này lên (xem batDay trong kt-day.js) */
    if (!sub) return true;
    await ghi('kt_day', 'update', { rung: bat ? 1 : 0 }, null, true,
      { cot: 'endpoint', gt: sub.endpoint });
    return true;
  } catch (e) {
    /* KHÔNG ĐƯỢC ĐỂ LỆCH: máy chủ mới là nơi quyết định rung hay không. Ghi
       không lên thì trả công tắc về như cũ, thà báo hỏng còn hơn màn hình nói
       một đằng máy làm một nẻo. */
    try { localStorage.setItem('kt_rung_v1', cu ? '1' : '0'); } catch (x) { }
    return false;
  }
}

/* mặc định BẬT: ai không đụng tới thì máy vẫn rung y như trước */
const rungBat = () => { try { return localStorage.getItem('kt_rung_v1') !== '0'; } catch (e) { return true; } };

const HOP_TEN = 'kt_hopcho';
function moHop() {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(HOP_TEN, 1);
    r.onupgradeneeded = () => { try { r.result.createObjectStore('cho', { keyPath: 'id', autoIncrement: true }); } catch (e) { } };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error || new Error('không mở được hộp chờ'));
  });
}
async function hopThem(file, du) {
  try {
    const db = await moHop();
    return await new Promise((ok, loi) => {
      const tx = db.transaction('cho', 'readwrite');
      const r = tx.objectStore('cho').add({
        blob: file, tenFile: file.name || '', kieu: file.type || '',
        laVid: !!(du || {}).laVid, daNen: !!(du || {}).daNen,
        tenKho: (du || {}).tenKho || '', daGan: !!(du || {}).daGan,
        phieuId: (du || {}).phieuId || '',
        nguoi: (du || {}).ten || '', luc: Date.now()
      });
      tx.oncomplete = () => { db.close(); ok(r.result); };
      tx.onerror = () => { db.close(); loi(tx.error); };
    });
  } catch (e) { return null; }   /* máy chặn IndexedDB (duyệt ẩn danh…) — chạy như cũ, không hộp */
}
async function hopXoa(id) {
  if (id == null) return;
  try {
    const db = await moHop();
    await new Promise(ok => {
      const tx = db.transaction('cho', 'readwrite');
      tx.objectStore('cho').delete(id);
      tx.oncomplete = () => { db.close(); ok(); };
      tx.onerror = () => { db.close(); ok(); };
    });
  } catch (e) { }
}
async function hopDoc() {
  try {
    const db = await moHop();
    return await new Promise(ok => {
      const tx = db.transaction('cho', 'readonly');
      const r = tx.objectStore('cho').getAll();
      r.onsuccess = () => { db.close(); ok(r.result || []); };
      r.onerror = () => { db.close(); ok([]); };
    });
  } catch (e) { return []; }
}
/* ĐẾM NHẸ (Trường bắt 07/09 "lag vcl"): trước đây mỗi lần vẽ hộp chờ đều gọi
   hopDoc() = nạp CẢ ẢNH (4MB) từ kho máy ra chỉ để đếm 3 cái — gửi 3 file là
   nạp 3 lượt, máy đứng. Giờ chỉ đọc số đo, không chạm vào ảnh. */
async function hopDem() {
  try {
    const db = await moHop();
    return await new Promise(ok => {
      const tx = db.transaction('cho', 'readonly');
      const kq = { so: 0, vid: 0, byte: 0, thu: 0, luc: 0 };
      const r = tx.objectStore('cho').openCursor();
      r.onsuccess = e => {
        const c = e.target.result;
        if (!c) { db.close(); return ok(kq); }
        const v = c.value || {};
        kq.so++;
        if (v.laVid) kq.vid++;
        kq.byte += (v.blob && v.blob.size) || 0;   /* .size là số đo, không đọc nội dung */
        kq.thu = Math.max(kq.thu, v.thu || 0);
        kq.luc = Math.max(kq.luc, v.luc || 0);
        c.continue();
      };
      r.onerror = () => { db.close(); ok(kq); };
    });
  } catch (e) { return { so: 0, vid: 0, byte: 0, thu: 0, luc: 0 }; }
}
/* đếm thêm một lần thử cho mọi file còn trong hộp — để biết đã gửi lại mấy lượt */
/* ============================================================
   ĐẾM LẠI TỪ ĐẦU KHI CÓ TẤM LÊN ĐƯỢC (24/09 — Trường).
   Hộp chờ thôi tự gửi sau 6 lượt thử, để máy khỏi quay vòng vô ích khi mạng
   chết hẳn. Nhưng nó đếm SỐ LƯỢT, không đếm số lượt thật sự vô vọng — mà từ
   14/09 mỗi tấm gửi bù còn bị kẹt 60 giây rồi hết giờ (đã vá ở bản 190), nên
   đếm vọt qua 6 rất nhanh và từ đó bắt người dùng bấm tay.
   Giờ: lượt nào có ÍT NHẤT MỘT tấm lên được thì đếm lại từ 0 — đường truyền
   rõ ràng đang thông, không có lý do gì bỏ cuộc. Chỉ khi cả lượt không tấm
   nào lên mới tính là một lần thất bại thật.
   KHÔNG làm ảnh lên nhanh hơn, chỉ bớt việc phải bấm.
   ============================================================ */
async function hopXoaLanThu() {
  try {
    const db = await moHop();
    await new Promise(ok => {
      const tx = db.transaction('cho', 'readwrite');
      const st = tx.objectStore('cho');
      const r = st.openCursor();
      r.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        const v = c.value;
        if (v.thu) { v.thu = 0; st.put(v); }
        c.continue();
      };
      tx.oncomplete = () => { db.close(); ok(); };
      tx.onerror = () => { db.close(); ok(); };
    });
  } catch (e) { }
}

async function hopThemLanThu() {
  try {
    const db = await moHop();
    await new Promise(ok => {
      const tx = db.transaction('cho', 'readwrite');
      const st = tx.objectStore('cho');
      const r = st.openCursor();
      r.onsuccess = e => {
        const c = e.target.result;
        if (!c) return;
        const v = c.value; v.thu = (v.thu || 0) + 1;
        st.put(v); c.continue();
      };
      tx.oncomplete = () => { db.close(); ok(); };
      tx.onerror = () => { db.close(); ok(); };
    });
  } catch (e) { }
}
async function hopDonCu() {
  const ds = await hopDoc();
  const moc = Date.now() - 7 * 86400000;
  const bo = ds.filter(x => x.luc < moc).map(x => x.id);
  const con = ds.filter(x => x.luc >= moc).sort((a, b) => a.luc - b.luc);
  while (con.length > 40) bo.push(con.shift().id);
  for (const id of bo) await hopXoa(id);
}

/* tải lên kho R2 qua chính web này (kho riêng tư, không mở công khai) */
/* Chỉ cho 3 file chạy cùng lúc — gửi ào 9-10 file một lượt là điện thoại
   và mạng nghẽn, sinh lỗi "Load failed". Xếp hàng thì chậm hơn chút nhưng chắc. */
let DANG_GUI = 0;
/* ============================================================
   ĐO MẠNG RỒI MỚI GỬI (Trường chốt 07/09). Trước đây mạng nào cũng gửi 3 file
   cùng lúc, ảnh nào cũng 2400px — 4G một vạch là ba đường tranh nhau rồi rớt
   cả ba. Giờ mạng yếu thì gửi MỘT file một lúc và ảnh nhẹ hơn: thà chậm 2 giây
   mà TỚI, hơn là nhanh rồi phải gửi bù.
   ============================================================ */
/* ============================================================
   ĐO TỐC ĐỘ THẬT (09/09 — Trường gửi video: 5G đầy vạch mà 5 phút mới xong 3
   lượt). Gốc bệnh: mangYeu() cũ chỉ hỏi navigator.connection, mà Safari trên
   iPhone KHÔNG CÓ cái đó → luôn trả "mạng tốt" → luôn 4 luồng ảnh 1,2MB kể cả
   khi đường lên chỉ còn 0,1 Mbps. 4 luồng tranh nhau → lượt nào cũng vượt hạn
   giờ → cắt → thử lại → càng tắc. Cái vạch 5G chỉ nói về đường XUỐNG, đường
   LÊN ở trung tâm thương mại đông người có thể chỉ còn vài chục KB/s.
   Giờ web tự bấm giờ từng lượt gửi: byte thật ÷ giây thật = KB/s thật, rồi
   tự hạ luồng và nén nhẹ hơn cho những ảnh còn lại. Không tin vạch sóng nữa. */
/* SỬA 09/09 (Trường: "bản tối hôm qua tải từ điện thoại nhanh hơn").
   Trường nói đúng, và lỗi ở tao. Bản đầu tao đo tốc độ theo TỪNG LƯỢT GỬI
   RIÊNG LẺ. Nhưng web gửi 4 ảnh cùng lúc, nên mỗi lượt chỉ được 1/4 đường —
   đo ra 1/4 con số thật. Mạng tổng 200 KB/s bị đọc thành 50 KB/s, web tưởng
   "mạng như 2G" nên tự hạ còn MỘT luồng và nén ảnh xuống 1280px. Tức là chính
   cái cơ chế cứu mạng yếu lại bóp mạng đang bình thường — chậm hơn bản tối qua.
   Giờ đo TỔNG THÔNG LƯỢNG: cộng byte của MỌI luồng vào một sổ, rồi chia cho
   thời gian thật trong cửa sổ 6 giây gần nhất. 4 luồng × 50 KB/s giờ đọc đúng
   là 200 KB/s. Không có số liệu tươi thì coi như mạng tốt và chạy 4 luồng —
   y như bản tối qua. */
let TOC_KBS = 0;                 /* chỉ còn dùng cho số đo TAY từ màn 🚦 */
let TOC_LUC = 0;
const YEU_KBS = 90;             /* < 90 KB/s (~0,7 Mbps) coi là mạng yếu thật */
const VUA_KBS = 260;            /* < 260 KB/s thì chỉ nên 2 luồng */
let BYTE_DI = 0;                 /* tổng byte đã đẩy đi từ lúc mở web */
let MOC_BYTE = [];               /* [{t, b}] cửa sổ trượt */
function themByte(n) {
  if (!n || n < 0) return;
  BYTE_DI += n;
  const t = Date.now();
  const cuoi = MOC_BYTE[MOC_BYTE.length - 1];
  if (!cuoi || t - cuoi.t >= 400) MOC_BYTE.push({ t: t, b: BYTE_DI });
  else cuoi.b = BYTE_DI;
  if (MOC_BYTE.length > 40) MOC_BYTE.shift();
}
function ghiTocDo(byte, ms) { themByte(byte); }        /* giữ tên cũ cho chỗ khác gọi */
function datTocDo(kbs) { TOC_KBS = kbs || 0; TOC_LUC = kbs ? Date.now() : 0; }
function tocDoCon() {
  const t = Date.now();
  const cua = MOC_BYTE.filter(m => t - m.t <= 6000);
  if (cua.length >= 2) {
    const giay = (cua[cua.length - 1].t - cua[0].t) / 1000;
    if (giay >= 0.8) {
      const kbs = (cua[cua.length - 1].b - cua[0].b) / 1024 / giay;
      if (kbs > 0) return kbs;
    }
  }
  /* chưa gửi gì gần đây: dùng số đo tay của màn 🚦 nếu còn mới (3 phút) */
  if (TOC_LUC && t - TOC_LUC <= 180000) return TOC_KBS;
  return 0;
}
function mangYeu() {
  const t = tocDoCon();
  if (t && t < YEU_KBS) return true;                   /* ĐO ĐƯỢC là tin số đo trước tiên */
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData) return true;                       /* người dùng bật tiết kiệm dữ liệu */
    if (/^(slow-2g|2g|3g)$/.test(c.effectiveType || '')) return true;
    if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 1.6) return true;
    return false;
  } catch (e) { return false; }
}
const nghi = ms => new Promise(r => setTimeout(r, ms));

/* ============================================================
   ĐO ĐƯỜNG TRUYỀN (09/09). Trường: "chiều qua tối qua đẩy ảnh rất nhanh, giờ
   siêu chậm, không hiểu tại sao". Bấm sóng 5G đầy vạch chỉ nói về đường XUỐNG,
   còn gửi ảnh là đi đường LÊN — hai đường khác nhau hoàn toàn, và đường lên di
   động ở nơi đông người có thể sụt còn vài chục KB/s vào giờ cao điểm.
   Hàm này đo ba số để KHỎI ĐOÁN nữa:
     · máy chủ trả lời trong bao nhiêu ms  → máy chủ có chậm không
     · đường LÊN bao nhiêu KB/s            → gửi ảnh nhanh/chậm là ở đây
     · đường XUỐNG bao nhiêu KB/s          → xem ảnh nhanh/chậm là ở đây
   Gói đo KHÔNG lưu vào kho (máy chủ nhận rồi bỏ) nên đo bao nhiêu lần cũng
   không chất rác. ============================================================ */
async function doDuong(bao) {
  const ra = { ping: 0, len: 0, xuong: 0, loi: '' };
  const noi = s => { try { bao && bao(s); } catch (e) { } };
  try {
    /* ① máy chủ trả lời nhanh hay chậm — gói bé nhất, 3 lần lấy số giữa */
    noi('Đang hỏi máy chủ…');
    const ms = [];
    for (let i = 0; i < 3; i++) {
      const t = Date.now();
      await fetch('/api/do-duong?co=1024&r=' + Math.random(), { cache: 'no-store' });
      ms.push(Date.now() - t);
    }
    ms.sort((a, b) => a - b); ra.ping = ms[1];
    /* ② đường LÊN: 256KB rồi 768KB — gói nhỏ đi trước để mạng tệ không phải chờ lâu */
    for (const co of [256 * 1024, 768 * 1024]) {
      noi('Đang đo đường lên (' + Math.round(co / 1024) + 'KB)…');
      const goi = new Blob([new Uint8Array(co)], { type: 'application/octet-stream' });
      const t = Date.now();
      const r = await fetch('/api/do-duong', { method: 'POST', body: goi });
      if (!r.ok) throw new Error('máy chủ trả ' + r.status);
      const giay = (Date.now() - t - ra.ping) / 1000;
      if (giay > 0.05) ra.len = Math.round(co / 1024 / giay);
      if (ra.len && ra.len < 60) break;             /* đã rõ là chậm thì thôi, đừng bắt chờ gói to */
    }
    /* ③ đường XUỐNG: tải về 768KB */
    noi('Đang đo đường xuống…');
    {
      const t = Date.now();
      const r = await fetch('/api/do-duong?co=' + (768 * 1024) + '&r=' + Math.random(), { cache: 'no-store' });
      const b = await r.blob();
      const giay = (Date.now() - t - ra.ping) / 1000;
      if (giay > 0.05) ra.xuong = Math.round(b.size / 1024 / giay);
    }
  } catch (e) { ra.loi = (e && e.message) || 'đo không được'; }
  /* số đo đường lên dùng luôn cho bộ chọn luồng, khỏi phải chờ ảnh đầu tiên */
  if (ra.len) datTocDo(ra.len);
  return ra;
}
/* dịch ra tiếng người: một ảnh nét ~700KB thì mất bao lâu ở tốc độ này */
function lyDuong(d) {
  if (d.loi) return { mau: 'do', chu: 'Không đo được: ' + d.loi };
  const g0 = d.len ? 700 / d.len : 0;
  const giay = g0 ? (g0 < 1 ? 'dưới 1' : Math.round(g0)) : 0;
  if (!d.len) return { mau: 'do', chu: 'Đường lên không đo được — mạng đang chập' };
  if (d.len < 60) return { mau: 'do', chu: 'Đường LÊN rất chậm (' + d.len + ' KB/s) → mỗi ảnh mất ~' + giay +
    ' giây. Máy chủ vẫn nhanh (' + d.ping + 'ms) nên đây là mạng của máy, không phải web. Đổi wifi hoặc ra chỗ thoáng sóng rồi gửi lại.' };
  if (d.len < 200) return { mau: 'cam', chu: 'Đường LÊN tầm tầm (' + d.len + ' KB/s) → mỗi ảnh ~' + giay +
    ' giây. Gửi 10 ảnh mất khoảng ' + Math.round(giay * 10 / 6) + ' phút.' };
  return { mau: 'la', chu: 'Đường LÊN tốt (' + d.len + ' KB/s) → mỗi ảnh ~' + giay + ' giây. Gửi ảnh giờ này là nhanh.' };
}
/* 4 luồng khi mạng tốt (08/09, trước là 3) — mạng yếu vẫn 1 để khỏi tắc.
   laNho = bản nhỏ 520px: nó chỉ để danh sách chạy mượt, KHÔNG được chiếm đường
   của bản nét. Nên bản nhỏ đứng chờ tới khi không còn bản nét nào đang gửi. */
/* DANG_GUI_NET đếm bản nét cả lúc ĐANG CHỜ lượt, không chỉ lúc đang gửi —
   nếu chỉ đếm lúc gửi thì có khoảnh khắc trống giữa hai ảnh, bản nhỏ chen vào
   đúng lúc đó và chiếm luồng của bản nét còn lại. */
let DANG_GUI_NET = 0;
/* ĐANG MỞ ẢNH RA SOI thì hạ xuống 1 luồng gửi (09/09). Ảnh 42/52 của Trường
   đứng ở "Đang tải ảnh gốc…" vì 4 luồng đang đẩy lên chiếm hết đường, mà tải
   ảnh gốc XUỐNG lại là việc người ta đang ngồi chờ trước mắt. Nhường 1 nhịp. */
let XEM_GAP = 0;
function danhDauXem(co) { XEM_GAP = co ? Date.now() : 0; }
function dangXemGap() { return XEM_GAP && (Date.now() - XEM_GAP) < 25000; }
function soLuong() {                    /* bao nhiêu luồng cùng lúc — theo tốc độ ĐO ĐƯỢC */
  if (dangXemGap()) return 1;
  if (mangYeu()) return 1;
  const t = tocDoCon();
  if (t && t < VUA_KBS) return 2;
  return 4;
}
/* ĐẢO ƯU TIÊN 09/09 (Trường: "nhanh rồi, tao muốn nhanh hơn nữa").
   Trước đây bản nhỏ phải nhường bản nét, vì hồi đó bản nét mới là ảnh thật.
   Giờ ngược lại: bản nhỏ là cái LÀM ẢNH HIỆN RA, bản nét chỉ để soi sau. Nên
   gửi HẾT bản nhỏ của cả loạt trước — 40 ảnh × 35KB = 1,4MB, cả loạt hiện
   trong ~20 giây ở mạng tệ; bản nét (40 × 550KB = 22MB) bò về sau, ai cần soi
   tấm nào thì tấm đó được chen lên đầu hàng (uuTienNet).
   Cờ laNho giờ nghĩa là "việc ưu tiên": bản nhỏ, và bản nét của tấm đang mở. */
let DANG_NHO = 0;
/* ============================================================
   BA CẤP ƯU TIÊN (09/09 — Trường: "nó lấy nét hơi chậm nhỉ").
   Lỗ của bản trước: bản nét phải đợi HẾT hàng bản nhỏ. Phiếu 70 ảnh thì hàng
   bản nhỏ dài cả phút, nên tấm người ta đang mở ra soi cũng đứng chờ theo.
     2 = KHẨN (tấm đang mở xem): đi NGAY, được vượt trần luồng
     1 = bản nhỏ: đi trước bản nét
     0 = bản nét: đi sau, và nhường luôn khi có việc khẩn
   ============================================================ */
async function xepHangGui(viec, uu) {
  const cap = uu === true ? 1 : (Number(uu) || 0);
  const tran = soLuong();
  if (cap === 1) DANG_NHO++;
  try {
    if (cap === 2) {                       /* khẩn: chen ngay, chỉ chặn nếu quá đông */
      let cho = 0; while (DANG_GUI >= tran + 1 && cho++ < 60) await nghi(120);
    } else {
      /* bản nét đợi hàng bản nhỏ (tối đa 60s) */
      if (cap === 0) { let cho = 0; while (DANG_NHO > 0 && cho++ < 500) await nghi(120); }
      while (DANG_GUI >= tran) await nghi(180);
    }
    DANG_GUI++;
    try { return await viec(); } finally { DANG_GUI--; }
  } finally { if (cap === 1) DANG_NHO--; }
}

/* ============================================================
   TẢI LÊN CÓ HẠN GIỜ (Trường chốt 07/09: "quan trọng là phải tải ảnh THÀNH
   CÔNG, chứ lúc nào cũng phải gửi bù thì vô nghĩa").
   Lỗ cũ: fetch KHÔNG có hạn giờ. Wifi trung tâm thương mại hay 4G chập là
   kết nối TREO — không lỗi, không xong — nên ảnh đứng ở 94% vĩnh viễn, người
   dùng tưởng web hỏng. Giờ mỗi lần gửi có đồng hồ: quá giờ là CẮT rồi thử lại
   ngay bằng kết nối mới, thay vì ngồi chờ một đường dây đã chết.
   ============================================================ */
let LAN_THU = 4;                       /* 4 lượt: hầu hết ca chập chỉ cần lượt 2 */
function hanGio(co) {                  /* ước theo dung lượng: 20s + 10s mỗi MB */
  const mb = (co || 0) / 1048576;
  return Math.min(120000, Math.max(25000, Math.round(20000 + mb * 10000)));
}
/* ============================================================
   PHẦN TRĂM THẬT (Trường bắt 08/09: "hay bị load ở 94% gẫy ra hiểu lầm").
   Lỗi cũ: % là ĐỒNG HỒ GIẢ nhích 6% mỗi 0,6 giây rồi CHẶN Ở 94% — nên ảnh nào
   cũng đứng ở 94% tới lúc xong, không liên quan gì mạng. Giờ dùng XHR để đọc
   đúng số byte đã đẩy đi: 0→96% là byte thật, gửi hết byte thì đổi sang mặt
   "đang lưu…" (97-99%), có địa chỉ ảnh mới là 100%.
   ============================================================ */
function guiMotLuot(blob, url, kieu, han, tien) {
  return new Promise((ok, loi) => {
    if (typeof XMLHttpRequest === 'undefined') return loi(new Error('máy không hỗ trợ gửi có tiến trình'));
    const x = new XMLHttpRequest();
    let xong = false;
    const batDau = Date.now();               /* bấm giờ để đo KB/s thật */
    const dut = setTimeout(() => { if (!xong) { try { x.abort(); } catch (e) { } loi(new Error('mạng treo quá ' + Math.round(han / 1000) + ' giây')); } }, han);
    x.open('POST', url, true);
    x.setRequestHeader('content-type', kieu || (blob && blob.type) || 'application/octet-stream');
    /* ============================================================
       VÉ PHẢI ĐI KÈM CẢ Ở ĐÂY (24/09 — lỗi tao gây ra ở bản 182).
       Đường tải ảnh dùng XMLHttpRequest chứ không dùng fetch (cần XHR mới đọc
       được số byte đã đẩy để vẽ % thật). Mà chỗ đính vé lại nằm trong lớp bọc
       fetch — nên MỌI lần tải ảnh đều đi không vé.
       Đợt 1 chưa khoá nên vẫn lọt, chỉ bị ghi vào sổ đếm (đúng 2 lượt tai-len
       tao thấy trong sổ). Nhưng đợt 2 khoá lại là TẢI ẢNH CHẾT HOÀN TOÀN —
       mất đúng thứ Trường gọi là cốt lõi.
       ============================================================ */
    try {
      const ve = typeof layVe === 'function' ? layVe() : '';
      if (ve) x.setRequestHeader('x-kt-ve', ve);
      if (typeof BAN_WEB !== 'undefined') x.setRequestHeader('x-kt-ban', BAN_WEB);
    } catch (e) { }
    let daDem = 0;
    if (x.upload) {
      /* cộng byte vào SỔ CHUNG để đo tổng thông lượng — chạy cả khi không có
         hàm tiến trình (bản nhỏ, bản nét gửi nền cũng phải được tính) */
      x.upload.addEventListener && x.upload.addEventListener('progress', e => {
        if (!e.lengthComputable) return;
        themByte(e.loaded - daDem); daDem = e.loaded;
      });
    }
    if (x.upload && tien) {
      x.upload.onprogress = e => {
        if (!e.lengthComputable) return;
        tien(Math.min(96, Math.round(e.loaded / e.total * 96)), 'gui');
      };
      x.upload.onload = () => tien(97, 'luu');      /* byte đi hết — còn chờ kho lưu */
    }
    x.onload = () => {
      xong = true; clearTimeout(dut);
      let kq = {};
      try { kq = JSON.parse(x.responseText || '{}'); } catch (e) { }
      if (x.status < 200 || x.status >= 300 || !kq.url) return loi(new Error(kq.loi || ('máy chủ trả lỗi ' + x.status)));
      if (tien) tien(100, 'xong');
      ok(kq.url);
    };
    x.onerror = () => { xong = true; clearTimeout(dut); loi(new Error('Mạng rớt giữa đường')); };
    x.onabort = () => { xong = true; clearTimeout(dut); };
    x.send(blob);
  });
}
async function taiLen(blob, phieuId, kieu, ten, tien, laNho) {
  return xepHangGui(async () => {
    let loiCuoi = null;
    const han = hanGio(blob && blob.size);
    const url = '/api/tai-len?phieu=' + encodeURIComponent(phieuId || 'chung') +
      '&nguoi=' + encodeURIComponent((D.nguoi || {}).ten || '') +
      (ten ? '&ten=' + encodeURIComponent(ten) : '');
    for (let lan = 1; lan <= LAN_THU; lan++) {
      try {
        if (tien && lan > 1) tien(0, 'thulai');       /* thử lại thì kéo % về 0 cho thật */
        return await guiMotLuot(blob, url, kieu, han, tien);
      } catch (e) {
        loiCuoi = e;
        if (lan < LAN_THU) await nghi([1500, 4000, 8000][lan - 1] || 8000);
      }
    }
    const m = (loiCuoi && loiCuoi.message) || '';
    throw new Error(m === 'Load failed' ? 'Mạng rớt giữa đường' : (m || 'gửi không được'));
  }, laNho);
}

/* ảnh: gửi 2 bản — bản NÉT để xem và soi lỗi, bản NHỎ để danh sách chạy mượt.
   Bản nhỏ đặt cùng tên, thêm hậu tố -nho, nên chỉ cần lưu 1 địa chỉ. */
/* 2000px chất 82% ≈ 400–500KB (Trường chốt 08/09 sau khi đo: 2400px/84% ra
   ~870KB, hạ xuống đây NHẸ 44% mà vẫn soi được vết nứt và đọc được tem chữ nhỏ).
   Đã thử WebP: với ảnh máy ảnh có hạt nhiễu thì WebP còn NẶNG hơn JPEG — bỏ. */
/* ============================================================
   ĐỔI DỨT ĐIỂM 10/09 (Trường gửi video: "sao nó lấy nét mãi chưa nét").
   Cái sai của tao hôm qua: cho ảnh vào phiếu bằng ĐỊA CHỈ BẢN NÉT CHƯA CÓ
   THẬT, rồi 70 bản nét xếp hàng sau 70 bản nhỏ. Ba hậu quả:
     · trên 5G yếu hàng đó dài hàng chục phút → ảnh mờ rất lâu
     · ảnh do NGƯỜI KHÁC gửi thì máy mình không chen hàng được; họ đóng web
       là bản nét không bao giờ lên → mờ vĩnh viễn
     · bản nhỏ 480px đọc không nổi ảnh chụp bảng biểu, tức là mờ = vô dụng
   Giờ chỉ còn MỘT ảnh chính, nhẹ mà đủ nét, và địa chỉ trả về CHỈ KHI ảnh
   chính đã nằm trên kho. Không còn địa chỉ trỏ vào chỗ trống.
   1600px chất 76% ≈ 300–420KB: đọc được chữ trong ảnh chụp màn hình, soi được
   vết nứt sàn; nhẹ hơn bản 2000px/82% cũ khoảng 40%.
   ============================================================ */
const ANH_NET = 1600;
const ANH_CHAT = 0.76;
/* bản nhỏ: 480px chất 66% ≈ 30–40KB (trước 520/74% ra 64KB). Trong khung chat
   ảnh chỉ hiện rộng 179px nên 480px vẫn nét gấp 2,7 lần khung — mắt không thấy
   khác, mà cả loạt ảnh hiện ra nhanh gần gấp đôi. */
/* thumb chỉ để vẽ ô vuông trong danh sách và dải dưới đáy — 400px/64% ≈ 18–25KB.
   KHÔNG còn dùng làm "ảnh xem tạm" nữa, nên nhỏ bao nhiêu cũng được. */
const ANH_NHO = 400;
const CHAT_NHO = 0.64;
/* mạng yếu: 1600px/0,78 ≈ 200–300KB — vẫn soi được vết nứt, mà nhẹ gấp 3 lần
   nên gửi một phát là xong, khỏi treo rồi phải gửi bù (Trường chốt 07/09) */
const ANH_NET_YEU = 1400;
const ANH_CHAT_YEU = 0.72;
/* MẠNG RẤT YẾU (09/09 — Trường: "bật 5G mà mạng như shit"): đo được dưới
   60 KB/s thì 700KB một tấm là 12 giây, 10 tấm là 2 phút — không ai chờ nổi.
   Hạ hẳn về 1280px/0,70 ≈ 180–260KB: mỗi tấm còn ~4 giây. 1280px vẫn nhìn rõ
   vết nứt sàn, bong thảm, đèn cháy — đủ để kỹ thuật quyết định mang gì đi sửa.
   Ảnh nét hơn thì gửi bù khi về wifi (hộp chờ giữ nguyên bản đã nén). */
const ANH_NET_TE = 1200;
const ANH_CHAT_TE = 0.68;
const TE_KBS = 60;
/* ============================================================
   LOẠT NHIỀU ẢNH: 3 TẤM ĐẦU DÒ ĐƯỜNG, CÁC TẤM SAU NÉN THEO SỐ ĐO THẬT
   (10/09 — Trường: wifi nhà thì nhanh, chuyển 5G thì chậm hơn đáng kể).
   Lỗ cũ: bấm Gửi 18 tấm thì cả 18 chạy cùng lúc ở giây 0, lúc đó CHƯA có byte
   nào đi nên tocDoCon() = 0 → bacNen() trả bậc NÉT NHẤT cho cả 18 tấm. Đo thật
   18 ảnh 12MP: bậc nét 3,21 MB — ở 150 KB/s (5G chỗ đông người) là 22 giây;
   bậc vừa chỉ 2,46 MB → 17 giây, mà trên màn điện thoại mắt thường không phân
   biệt được (màn iPhone rộng ~1179 điểm thật, ảnh 1400px vẫn quá đủ).
   iPhone KHÔNG cho web biết đang là wifi hay 5G (Safari không có
   navigator.connection), nên không đoán được — phải đo bằng chính loạt gửi:
     · 3 tấm đầu: nén ngay, gửi ngay → có byte đi là có số đo thật
     · các tấm sau: chờ tối đa 4 giây lấy số đo rồi mới chọn bậc
   Wifi nhanh thì số đo về sau 1 giây và bậc vẫn là NÉT — không đổi gì.
   ============================================================ */
let LOAT_MOC = [];
function ghiLoat() {
  const t = Date.now();
  LOAT_MOC.push(t);
  LOAT_MOC = LOAT_MOC.filter(x => t - x < 5000);
  return LOAT_MOC.length;
}
async function choSoDo() {
  if (tocDoCon()) return;                       /* đã có số đo thì đi luôn */
  let cho = 0;
  while (!tocDoCon() && cho++ < 20) await nghi(200);   /* tối đa ~4 giây */
}
function bacNen() {
  const t = tocDoCon();
  if (t && t < TE_KBS) return { canh: ANH_NET_TE, chat: ANH_CHAT_TE, tran: 240 * 1024 };
  /* dưới 260 KB/s cũng đã đáng hạ: 550KB một tấm là gần 4 giây, 1600px chỉ
     còn 2,5 giây mà mắt thường không phân biệt được trên điện thoại */
  if ((t && t < VUA_KBS) || mangYeu()) return { canh: ANH_NET_YEU, chat: ANH_CHAT_YEU, tran: 320 * 1024 };
  return { canh: ANH_NET, chat: ANH_CHAT, tran: TRAN_MOT_ANH };
}
/* TRẦN DUNG LƯỢNG MỖI ẢNH (09/09). Đo thật: ảnh máy ảnh 12MP (4032×3024) nén
   2000px/0.82 vẫn ra 1.276KB — nặng gấp 2,6 lần con số 490KB đo trên ảnh khác
   hôm 08/09. Ảnh càng nhiều chi tiết (sàn nhà hơi, cỏ, hạt tuyết) thì JPEG
   càng nở. 6 tấm như thế = 7,6MB, đường lên yếu là chờ cả phút.
   Nên: nén xong mà còn quá trần thì HẠ TIẾP một hai bậc, vẫn soi được vết nứt. */
const TRAN_MOT_ANH = 430 * 1024;
const BAC_HA = [[1800, 0.78], [1600, 0.74], [1400, 0.70]];
/* ============================================================
   CHỌN ĐỊNH DẠNG NHẸ HƠN CHO TỪNG TẤM (10/09 — Trường: "còn cải thiện được
   nữa không"). Đo thật ở 1600px:
     · ảnh chụp màn hình POS365   JPEG 373KB → WebP 259KB  (nhẹ 30%)
     · bảng biểu dài              JPEG 193KB → WebP 150KB  (nhẹ 22%)
     · ảnh máy ảnh 12MP có nhiễu  JPEG 726KB → WebP 858KB  (NẶNG hơn 18%)
   Nên không thể chọn cứng một loại. Nén cả hai rồi lấy cái nhẹ hơn.
   Chi phí: WebP tốn thêm 50–250ms CPU mỗi tấm, nên bỏ qua khi ảnh vốn đã nhẹ
   (dưới 120KB, tiết kiệm không đáng) hoặc khi mạng nhanh hơn 1000 KB/s
   (lúc đó 100ms CPU còn lâu hơn thời gian tiết kiệm được). */
/* ============================================================
   ẢNH ĐÃ NÉN SẴN THÌ ĐỪNG NÉN LẠI (vá 10/09 — Trường nhắc "ảnh tải lên không
   chỉ mỗi ảnh chụp màn hình đâu, là ảnh tải về, ảnh chụp trước đó ở hiện
   trường... các kiểu ảnh nữa").
   Đo thật: ảnh tải về từ Zalo (1280px, đã nén q58, 197KB) nén lại ra 212KB —
   NẶNG HƠN 8% mà còn mất chất lượng lần hai (nén lên nén). Ảnh nhỏ tải về
   cũng vậy. Nên: nếu ảnh gốc đã vừa khổ (cạnh dài ≤ mức đang nén) và nhẹ hơn
   bản nén, thì GỬI THẲNG BẢN GỐC — nhẹ hơn, nét hơn, đỡ cả công nén.
   Chỉ áp cho JPEG/WebP; HEIC/PNG vẫn phải nén vì máy khác có thể không mở được.
   ============================================================ */
async function daVuaKho(file, canh) {
  try {
    if (!/^image\/(jpeg|webp)$/i.test(file.type || '')) return false;
    if (file.size > TRAN_MOT_ANH) return false;         /* to quá thì vẫn nén cho nhẹ */
    const bm = await createImageBitmap(file);
    const dai = Math.max(bm.width, bm.height);
    try { bm.close(); } catch (e) { }
    return dai <= (canh || ANH_NET) + 40;               /* cho dư 40px, khỏi nén vì lệch tí */
  } catch (e) { return false; }
}
/* ============================================================
   CHỌN ĐỊNH DẠNG THEO TỪNG TẤM, ĐOÁN BẰNG LOẠI FILE GỐC (vá 11/09).
   Bản trước học một lần rồi áp cho cả loạt — sai khi chọn hỗn hợp: tấm đầu là
   ảnh máy ảnh (WebP thua) thì mấy tấm chụp màn hình phía sau cũng bị ép JPEG,
   mất 31% dung lượng. Bài "đủ loại ảnh" bắt đúng chỗ này.
   Giờ quyết theo NGUỒN ẢNH, không tốn thêm lần nén nào:
     · gốc PNG / HEIC / WebP  → ảnh chụp màn hình hoặc đồ hoạ, WebP gần như
       luôn thắng (đo thật: 248KB → 135KB · 1628KB → 259KB)
     · gốc JPEG mà dưới 3MB → ảnh chụp màn hình iPhone (đo thật 1,6MB → WebP
       nhẹ hơn 31%), ảnh tải về, ảnh cũ → vẫn đáng thử
     · gốc JPEG từ 3MB trở lên (ảnh máy ảnh 12MP thật, đo được 6,7MB) → nhiễu
       nhiều, WebP NẶNG hơn 18% mà còn tốn 170ms CPU → bỏ luôn, khỏi thử
   Ngưỡng đặt ở 3MB vì hai loại này cách nhau xa: màn hình 1–2MB, máy ảnh 5–7MB.
   Đoán sai về phía thử thừa thì chỉ tốn chút CPU, không ra kết quả sai.
   ============================================================ */
const NANG_MAY_ANH = 3 * 1024 * 1024;
function nenThuWebp(file) {
  const t = String((file && file.type) || '').toLowerCase();
  if (/png|heic|heif|webp/.test(t)) return true;
  return (file && file.size || 0) < NANG_MAY_ANH;
}

async function nenTotNhat(file, canh, chat) {
  const jpg = await nenAnh(file, canh, chat);
  /* ảnh gốc vừa khổ mà còn nhẹ hơn bản nén → dùng luôn ảnh gốc */
  if (jpg && file.size <= jpg.size && await daVuaKho(file, canh))
    return { blob: file, kieu: (file.type || 'image/jpeg'), gocLuon: true };
  if (!jpg || jpg.size < 120 * 1024) return { blob: jpg, kieu: 'image/jpeg' };
  if (!nenThuWebp(file)) return { blob: jpg, kieu: 'image/jpeg' };
  const t = tocDoCon();
  /* mạng đang rất nhanh thì 170ms CPU còn lâu hơn thời gian tiết kiệm được */
  if (t && t > 1000) return { blob: jpg, kieu: 'image/jpeg' };
  try {
    const wp = await nenAnh(file, canh, Math.min(0.9, (chat || 0.76) + 0.02), 'image/webp');
    if (wp && wp.size < jpg.size * 0.92) return { blob: wp, kieu: 'image/webp' };
  } catch (e) { }
  return { blob: jpg, kieu: 'image/jpeg' };
}

/* ============================================================
   NÉN SẴN NGAY KHI CHỌN ẢNH (10/09).
   Đường cũ: chọn ảnh → màn duyệt dựng ảnh xem trước TUẦN TỰ 18 tấm → người
   bấm Gửi → BẤY GIỜ mới nén → rồi mới gửi. Suốt quãng đó không một byte nào
   đi, mà nén 18 ảnh 12MP trên iPhone là phần việc nặng nhất trong cả quy
   trình. Giờ nén ngay lúc người ta còn đang xem màn duyệt và điền form: bấm
   Gửi là byte đi liền.
   Nén ở bậc NÉT; tới lúc gửi mà đo ra mạng chậm hơn thì hạ bậc TỪ BẢN NÉT ĐÓ
   (9ms — đo 10/09) chứ không nén lại từ ảnh gốc 12MP (39ms).
   Người sửa ảnh trong màn duyệt thì file thành file mới → tự động không dùng
   bản nén sẵn nữa, không có chuyện gửi đi bản chưa sửa.
   ============================================================ */
const NEN_SAN = new WeakMap();
function nenSanTruoc(fs) {
  try {
    const bac = bacNen();
    (fs || []).forEach(f => {
      if (!f || NEN_SAN.has(f) || !/^image\//i.test(f.type || '')) return;
      NEN_SAN.set(f, {
        canh: bac.canh,
        hua: nenTotNhat(f, bac.canh, bac.chat).catch(() => null)
      });
    });
  } catch (e) { }
}
async function epTran(net, file, tran) {
  const muc = tran || TRAN_MOT_ANH;
  if (!net || net.size <= muc) return net;
  for (const [cd, ch] of BAC_HA.concat([[1280, 0.70], [1100, 0.66]])) {
    try {
      const nhe = await nenAnh(file, cd, ch);
      if (nhe && nhe.size < net.size) net = nhe;
      if (net.size <= muc) break;
    } catch (e) { break; }
  }
  return net;
}
/* Nén hỏng cả 2 lượt vẫn KHÔNG VỨT ẢNH (#48 Trường chốt 04/09 — "cứ 6-7 ảnh là
   đỏ 2-3 tấm"): gửi thẳng BẢN GỐC miễn ≤28MB. Nặng hơn, lâu hơn chút, nhưng TỚI. */
const TRAN_ANH_GOC = 28 * 1024 * 1024;
/* gửi một ảnh ĐÃ NÉN SẴN (dùng cho hộp chờ): khỏi nén lại lần hai */
/* ============================================================
   GỬI BÙ TỪ HỘP CHỜ = ĐI NGAY, KHÔNG XẾP HÀNG SAU BẢN NHỎ (24/09).

   Bệnh: xepHangGui với mức thường bắt bản nét ĐỢI HẾT hàng bản nhỏ, tối đa
   500 nhịp × 120ms = ĐÚNG 60 GIÂY mỗi tấm. Ba tấm gửi bù = 3 phút đứng im,
   thanh % kẹt ở 30% (trần của "chưa xong tấm nào" khi có 3 tấm) rồi nhảy lên
   63% (trần của "xong 1/3"). Đúng hai con số Trường kể.

   Vì sao phải ưu tiên: ảnh trong hộp chờ là ảnh ĐÃ THẤT BẠI một lần rồi,
   người dùng đang ngồi nhìn thanh chạy. Nó là thứ gấp nhất, không phải thứ
   xếp cuối hàng. Mức 2 = chen ngay, chỉ chờ khi quá đông.
   ============================================================ */
async function guiAnhDaNen(blob, phieuId, tien, tenKho) {
  const ten = tenKho || (Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const url = await taiLen(blob, phieuId, 'image/jpeg', ten, tien, tenKho ? 2 : undefined);
  if (!tenKho) nenAnh(blob, ANH_NHO, CHAT_NHO)      /* gửi bù bản nét: bản nhỏ đã nằm trên kho rồi */
    .then(nho => nho ? taiLen(nho, phieuId, 'image/jpeg', ten + '-nho', null, true) : null)
    .catch(() => null);
  return url;
}
/* ============================================================
   duHop = {laVid, phieuId, ten, khiVaoHop} → cất vào HỘP CHỜ.
   ĐỔI 09/09: hộp cất BẢN ĐÃ NÉN, không cất ảnh gốc nữa.
   Trường mở web thấy "17 ảnh chưa gửi xong (59.5MB)" = 3,5MB mỗi ảnh, tức là
   hộp đang giữ nguyên file máy ảnh. Hai cái giá phải trả:
     · chiếm 59,5MB trong máy thay vì ~12MB
     · mỗi lần bấm "Gửi tiếp" là iPhone phải NÉN LẠI 17 ảnh 12MP từ đầu —
       decode + resize mất 1–2 giây mỗi tấm, 17 tấm là nửa phút CPU mà thanh %
       thì đứng im, nhìn đúng như web treo.
   Nén một lần rồi cất bản nén: gửi bù chỉ còn việc đẩy byte.
   ============================================================ */
/* ============================================================
   KHO ẢNH VỪA GỬI, NẰM NGAY TRONG MÁY (Trường chốt 10/09: "bấm vào tấm ảnh
   thì phải nét để tao còn xem").
   Ảnh này chính máy mình vừa chụp và vừa nén — mà bấm xem thì web lại TẢI
   NGƯỢC bản nét từ kho về, đúng lúc đường lên đang bị mấy tấm còn lại chiếm.
   Giữ lại bản nét trong máy 1 giờ: bấm vào là nét tức thì, 0 byte tải.
   Chỉ giữ trong RAM nên đóng web là tự hết, không phình chỗ lưu của máy.
   ============================================================ */
const ANH_TAM = new Map();                 /* url → {blob, luc} */
const TAM_HAN = 60 * 60 * 1000;            /* giữ 1 giờ */
const TAM_TRAN_MB = 40;                    /* tổng tối đa, quá thì bỏ tấm cũ nhất */
function nhoAnhTam(url, blob) {
  if (!url || !blob) return;
  try {
    ANH_TAM.set(String(url), { blob: blob, luc: Date.now() });
    let tong = 0;
    ANH_TAM.forEach(v => tong += (v.blob && v.blob.size) || 0);
    const nay = Date.now();
    for (const [k, v] of ANH_TAM) {
      if (tong <= TAM_TRAN_MB * 1048576 && nay - v.luc < TAM_HAN) break;
      tong -= (v.blob && v.blob.size) || 0;
      ANH_TAM.delete(k);
    }
  } catch (e) { }
}
/* trả về địa chỉ blob dùng ngay được, hoặc '' nếu không có trong máy */
function anhTamCua(url) {
  const s = String(url || ''); if (!s) return '';
  const x = ANH_TAM.get(s);
  if (!x) return '';
  if (Date.now() - x.luc > TAM_HAN) { ANH_TAM.delete(s); return ''; }
  if (!x.url) { try { x.url = URL.createObjectURL(x.blob); } catch (e) { return ''; } }
  return x.url || '';
}

async function taiAnh(file, phieuId, tien, duHop) {
  const ten = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  /* tấm thứ 4 trở đi trong cùng một loạt: chờ số đo thật rồi hãy chọn bậc nén */
  if (ghiLoat() > 3) await choSoDo();
  const bac = bacNen();          /* mức nén theo tốc độ ĐO ĐƯỢC, không theo vạch sóng */
  /* bản nét nén từ ảnh gốc; bản NHỎ nén từ CHÍNH BẢN NÉT (JPEG 2400px) —
     đỡ hẳn một lần giải mã ảnh gốc 12MP, iPhone nhẹ đi một nửa (30/08) */
  let net = null;
  let kieuAnh = 'image/jpeg';
  try {
    /* dùng bản đã nén sẵn từ lúc chọn ảnh nếu có — khỏi nén lại từ ảnh gốc */
    let chon = null;
    const san = NEN_SAN.get(file);
    if (san) {
      chon = await san.hua;
      NEN_SAN.delete(file);
      /* nén sẵn ở bậc nét mà giờ đo ra mạng chậm hơn → hạ bậc TỪ BẢN ĐÃ NÉN */
      if (chon && chon.blob && !chon.gocLuon && bac.canh < san.canh) {
        try {
          const ha = await nenAnh(chon.blob, bac.canh, bac.chat, chon.kieu);
          if (ha && ha.size < chon.blob.size) chon = { blob: ha, kieu: chon.kieu };
        } catch (e) { }
      }
    }
    if (!chon || !chon.blob) chon = await nenTotNhat(file, bac.canh, bac.chat);
    net = chon.blob; kieuAnh = chon.kieu;
    /* đang dùng chính ảnh gốc (đã vừa khổ, đã nhẹ) thì thôi ép trần — ép nữa là
       nén lại đúng cái mình vừa tránh */
    if (!chon.gocLuon) net = await epTran(net, file, bac.tran);
    if (net && net.type && /webp|jpeg/.test(net.type)) kieuAnh = net.type;
  }
  catch (e) {
    const ly = (e && e.message) || 'nén hỏng';
    /* ghi lý do vào vết phiếu — lần sau Trường hỏi "sao thiếu ảnh" là có sổ để tra */
    try { if (phieuId && phieuId !== 'moi' && typeof veVet === 'function') veVet(phieuId, 'anh_goc', { ten: file.name || '', ly: ly }); } catch (x) { }
    if (file.size <= TRAN_ANH_GOC) {
      /* ẢNH HEIC gửi nguyên bản thì máy tính KHÔNG mở được (soát kho 19/09) —
         phải nói thẳng cho người gửi, kèm cách chỉnh máy để lần sau khỏi dính */
      const laHeic = /heic|heif/i.test(file.type || '') || /\.(heic|heif)$/i.test(file.name || '');
      if (typeof nhac === 'function') nhac(laHeic
        ? '⚠️ Ảnh iPhone định dạng HEIC — máy tính bên kia sẽ không mở được. Vào Cài đặt → Camera → Định dạng → chọn "Tương thích nhất" rồi chụp lại.'
        : '1 ảnh máy nén không nổi (' + ly + ') — đang gửi bản gốc, hơi lâu hơn chút', laHeic ? 'do' : 'canh');
      let hopG = null;
      if (duHop) {
        try { hopG = await hopThem(file, duHop); } catch (x) { hopG = null; }
        try { duHop.khiVaoHop && duHop.khiVaoHop(hopG); } catch (x) { }
      }
      const uG = await taiLen(file, phieuId, file.type || 'image/jpeg', ten + '-goc', tien);
      if (hopG != null) { try { await hopXoa(hopG); } catch (x) { } }
      return uG;
    }
    try { duHop && duHop.khiVaoHop && duHop.khiVaoHop(null); } catch (x) { }
    throw new Error('Ảnh nặng ' + Math.round(file.size / 1048576) + 'MB mà máy ' + ly);
  }
  /* BẢN NÉT ĐI TRƯỚC, MỘT MÌNH (Trường chốt 07/09). Trước đây gửi bản nét và
     bản nhỏ CÙNG LÚC: hai đường tranh băng thông, mạng yếu là rớt cả hai và
     ảnh coi như mất. Giờ bản nét lên xong là ảnh ĐÃ AN TOÀN; bản nhỏ (chỉ để
     danh sách chạy mượt) gửi sau, hỏng cũng không sao — chỗ nào cần ô nhỏ mà
     thiếu thì tự lùi về bản nét. */
  /* vào hộp chờ TRƯỚC khi gửi, bằng bản đã nén — web bị đóng giữa chừng thì
     mở lại vẫn còn, mà gửi tiếp không phải nén lại */
  let hopId = null;
  if (duHop) {
    try {
      hopId = await hopThem(new File([net], (file.name || 'anh') + '.jpg', { type: 'image/jpeg' }),
        /* BỎ daGan (vá 10/09): cờ đó sinh ra ở bản "nhỏ trước — nét sau", nghĩa
           là "ảnh đã gắn vào phiếu rồi, gửi bù chỉ để nét lên". Giờ ảnh chỉ vào
           phiếu SAU KHI lên kho, nên nếu còn để cờ này thì ảnh gửi bù sẽ không
           được gắn vào phiếu nữa — tức là mất ảnh. */
        Object.assign({}, duHop, { daNen: true, tenKho: ten }));
    } catch (e) { hopId = null; }
    try { duHop.khiVaoHop && duHop.khiVaoHop(hopId); } catch (e) { }
  }
  /* ============================================================
     BẢN NHỎ LÊN TRƯỚC, BẢN NÉT THEO SAU (Trường chốt 09/09, kiểu Zalo).
     Trước đây bản nét phải lên xong mới có địa chỉ để gắn ảnh vào phiếu, nên
     mạng 30 KB/s là người nhận ngồi chờ 20 giây một tấm mới thấy gì. Giờ:
       ① bản nhỏ ~45KB lên trong 1–2 giây → ẢNH HIỆN NGAY, nhắn qua lại được liền
       ② địa chỉ bản nét suy ra từ địa chỉ bản nhỏ (cùng tên, bỏ hậu tố -nho)
          nên gắn vào phiếu được luôn, không phải chờ
       ③ bản nét đẩy NỀN; lên xong là ảnh tự nét lên, không ai phải bấm gì
     Bản nét chưa lên thì bấm vào ảnh còn hơi mờ (520px) — đánh đổi đã chốt.
     Hộp chờ giữ ĐÚNG TÊN KHOÁ nên gửi bù là ảnh cũ tự nét, không tạo ảnh mới.
     ============================================================ */
  /* ẢNH CHÍNH: chờ nó lên kho XONG mới trả địa chỉ. Nhờ vậy ảnh vào phiếu là
     ảnh đã có thật, mở ra nét ngay, không bao giờ có cảnh "đang lấy bản nét". */
  const url = await taiLen(net, phieuId, kieuAnh, ten, tien);
  if (hopId != null) { try { await hopXoa(hopId); } catch (e) { } }
  /* mở ra là nét ngay: giữ chính bản vừa gửi trong máy 1 giờ */
  nhoAnhTam(url, net);
  /* ============================================================
     BẢN NHỎ GỬI SAU KHI BẢN NÉT ĐÃ LÊN (vá 10/09).
     Trước đây hai bản đi SONG SONG, sinh ra hai cái giá:
       ① tranh đường lên với bản nét — thứ duy nhất người ta cần để xem
       ② mất mạng giữa chừng thì bản nhỏ lên rồi mà bản nét chưa → dải ảnh
          có hình nhưng bấm vào là MỜ VĨNH VIỄN (Trường hỏi đúng chỗ này:
          "phiếu 2-3 tháng sau ấn vào còn nét không")
     Gửi sau thì không bao giờ có bản nhỏ mồ côi: có ô nhỏ tức là có bản nét.
     Bản nhỏ chỉ để danh sách chạy mượt, hỏng cũng không sao — chỗ nào thiếu
     thì tự lùi về bản nét. Nén từ CHÍNH BẢN NÉT nên chỉ mất ~9ms (đo 10/09:
     nén từ ảnh gốc 12MP mất 39ms — chậm 4,3 lần mà ra file y hệt). */
  if (url) nenAnh(net, ANH_NHO, CHAT_NHO, kieuAnh)
    .then(nho => nho ? taiLen(nho, phieuId, kieuAnh, ten + '-nho', null, 1) : null)
    .catch(() => null);
  return url;
}
/* ============================================================
   CHEN BẢN NÉT CỦA TẤM ĐANG XEM LÊN ĐẦU HÀNG (09/09 — Trường: "sao nó mờ mãi").
   Khi người ta mở một tấm ra soi mà bản nét còn nằm trong hộp chờ, việc gấp
   nhất là gửi ĐÚNG TẤM ĐÓ, không phải gửi tuần tự 40 tấm rồi mới tới nó.
   Tìm trong hộp theo tên khoá lấy từ địa chỉ ảnh, gửi ngay, xong thì xoá khỏi hộp.
   ============================================================ */
let DANG_UU_TIEN = {};
async function uuTienNet(url) {
  try {
    const s = String(url || '');
    if (!s) return false;
    const ds = await hopDoc();
    /* khớp theo tên khoá NẰM Ở BẤT KỲ ĐÂU trong địa chỉ — kho thật đặt tên vào
       đường dẫn, sân test đặt vào query, không phụ thuộc dạng nào */
    const x = ds.find(v => v.tenKho && s.indexOf(v.tenKho) >= 0);
    const ten = x ? x.tenKho : '';
    if (!ten || DANG_UU_TIEN[ten]) return false;
    if (!x.blob) return false;
    DANG_UU_TIEN[ten] = 1;
    try {
      await taiLen(x.blob, x.phieuId || 'chung', 'image/jpeg', x.tenKho, null, 2);   /* cấp KHẨN: đi ngay */
      await hopXoa(x.id);
      if (typeof veHopCho === 'function') veHopCho();
      return true;
    } finally { delete DANG_UU_TIEN[ten]; }
  } catch (e) { return false; }
}

/* địa chỉ bản nhỏ của một ảnh — dùng cho ô nhỏ trong danh sách */
const anhNho = u => {
  if (!u || laVideo(u) || laTiengNoi(u)) return u;
  if (!String(u).startsWith('/anh/')) return u;   // ảnh cũ ở Supabase: không có bản nhỏ
  if (/-goc\.\w+(\?|$)/i.test(String(u))) return u; // ảnh gửi BẢN GỐC (#48): không có bản nhỏ
  /* mở rộng cho .webp (10/09): ảnh chụp màn hình giờ có thể gửi dạng WebP */
  return String(u).replace(/(\.(?:jpe?g|webp|png))(\?|$)/i, '-nho$1$2');
};

/* Video: không nén được trên máy, chỉ kiểm tra rồi gửi thẳng.
   Giờ video do app Camera của máy quay nên web KHÔNG ép được độ phân giải.
   iPhone để 4K60 thì ~400MB/phút, 1080p30 thì ~60MB/phút — nên phải nói rõ cách hạ. */
const HAP_DAT = 'Vào Cài đặt → Camera → Quay video → chọn 1080p 30fps là nhẹ hơn 6 lần.';
/* Trần 200MB (Trường chốt 01/09 — trước là 92MB). Cloudflare chặn mỗi lần gửi
   100MB, nên video to đi đường CẮT MẢNH 80MB rồi ghép lại trên kho. */
const TRAN_VIDEO = 200 * 1024 * 1024;
/* ĐỔI 09/09 (Trường: "bắt buộc phải tải ảnh lên nhanh và video cũng vậy").
   Trước: chỉ video > 88MB mới cắt mảnh, còn lại đẩy MỘT KHỐI trên MỘT đường —
   video 40MB trên mạng có độ trễ cao là một dòng byte lẻ loi, rớt giữa đường
   là mất cả 40MB rồi gửi lại từ đầu. Giờ: video > 6MB cắt mảnh 6MB và gửi
   NHIỀU MẢNH CÙNG LÚC — vừa nhanh hơn hẳn, vừa rớt mảnh nào chỉ gửi lại mảnh
   đó. Mảnh cuối R2 cho phép nhỏ hơn 5MB, các mảnh giữa phải ≥5MB. */
const NGUONG_MANH = 6 * 1024 * 1024;
async function taiVideo(file, phieuId, tien, uuTien) {
  const mb = Math.round(file.size / 1048576);
  if (file.size > TRAN_VIDEO)
    throw new Error('Video nặng ' + mb + 'MB — tối đa 200MB. Quay ngắn lại. ' + HAP_DAT);
  /* doDaiVideo không bao giờ nổ nữa: đọc được thì trả số đo, không đọc nổi /
     quá 8 giây thì trả {khongRo:true} và mình CỨ GỬI (07/09) */
  const m = await doDaiVideo(file).catch(() => ({ khongRo: true }));
  if (m.giay > 75) throw new Error('Video dài ' + Math.round(m.giay) + ' giây — tối đa 60 giây. Quay lại đoạn ngắn hơn.');
  /* Camera trong web của iPhone quay thấp hơn hẳn app Camera thật — web không chỉnh được.
     Video mờ thì nói rõ ngay lúc chọn, đừng để kỹ thuật gửi xong mới biết không soi được. */
  const canh = Math.max(m.w || 0, m.h || 0);
  if (canh && canh < 1280 && typeof nhac === 'function')
    nhac('Video này chỉ ' + Math.min(m.w, m.h) + 'p nên sẽ mờ. Muốn nét: quay bằng app Camera của máy rồi bấm "Chọn video có sẵn".', 'canh');
  /* nặng nhưng vẫn nhận: cảnh báo để lần sau đỡ tốn dữ liệu di động */
  if (file.size > 45 * 1024 * 1024 && typeof nhac === 'function')
    nhac('Video ' + mb + 'MB, gửi sẽ lâu. ' + HAP_DAT, 'canh');
  if (file.size > NGUONG_MANH) return taiVideoTo(file, phieuId, tien);
  /* gửi bù từ hộp chờ thì chen ngay như ảnh (24/09) */
  return taiLen(file, phieuId, file.type || 'video/mp4', '', tien, uuTien);
}

/* video to: cắt mảnh 6MB, gửi song song, xong ghép trên kho.
   MANH_CO không hạ xuống dưới 5MB được: R2 bắt mọi mảnh trừ mảnh cuối phải
   ≥5MB, nhỏ hơn là kho từ chối ghép. 6MB đã sát đáy. */
const MANH_CO = 6 * 1024 * 1024;

/* ============================================================
   NHỚ CHỖ GỬI DỞ ĐỂ LẦN SAU ĐI TIẾP (28/09 — Tuân kẹt 3 ngày ở 6%).
   Bản cũ: một mảnh hỏng sau 3 lần thử → cả video coi như hỏng → lần sau gửi
   LẠI TỪ MẢNH 1, mấy mảnh đã lên vứt hết. Video 82MB cần 12 phút liên tục
   không rớt trên đường lên 117 KB/s — trong khu vui chơi giờ đông khách gần
   như không bao giờ đủ. Nên nó quay vòng: mỗi lượt bò được 1-2 mảnh rồi về
   vạch xuất phát, ba ngày vẫn 6% (đúng 1 mảnh trên 14).
   Giờ ghi lại mã phiên tải lên + danh sách mảnh đã xong ngay sau MỖI mảnh.
   Mở app lần sau, cùng file đó thì đi tiếp từ chỗ dở.
   Nhận ra "cùng file" bằng tên + cỡ + giờ sửa cuối — ba thứ này trùng nhau
   thì chắc chắn cùng một video.
   Dọn phiên quá 6 ngày: R2 giữ phiên dở khoảng 7 ngày, quá hạn thì mã phiên
   hết hiệu lực, giữ lại chỉ tổ làm người dùng chờ một lượt hỏng vô ích.
   ============================================================ */
const KHOA_VIDDO = 'kt_viddo_v1';
const VIDDO_HAN = 6 * 86400000;
function vidKhoa(file) {
  return [file.name || 'vid', file.size, file.lastModified || 0].join('|');
}
function vidDocSo() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KHOA_VIDDO) || '{}') || {}; } catch (e) { s = {}; }
  const nay = Date.now();
  let doi = false;
  for (const k in s) if (!s[k] || nay - (s[k].luc || 0) > VIDDO_HAN) { delete s[k]; doi = true; }
  if (doi) { try { localStorage.setItem(KHOA_VIDDO, JSON.stringify(s)); } catch (e) { } }
  return s;
}
function vidLayDo(file) {
  const s = vidDocSo();
  const v = s[vidKhoa(file)];
  return v && v.khoa && v.up ? v : null;
}
function vidGhiDo(file, khoa, up, manh) {
  try {
    const s = vidDocSo();
    s[vidKhoa(file)] = { khoa: khoa, up: up, manh: manh || [], luc: Date.now() };
    localStorage.setItem(KHOA_VIDDO, JSON.stringify(s));
  } catch (e) { /* kho máy đầy thì thôi, chỉ mất khả năng đi tiếp */ }
}
function vidXoaDo(file) {
  try {
    const s = vidDocSo();
    delete s[vidKhoa(file)];
    localStorage.setItem(KHOA_VIDDO, JSON.stringify(s));
  } catch (e) { }
}

async function taiVideoTo(file, phieuId, tien) {
  return xepHangGui(async () => {
    const kieu = file.type || 'video/mp4';
    const hoi = async (duong, o2) => {
      const r = await fetch(duong, o2 || { method: 'POST' });
      const kq = await r.json().catch(() => ({}));
      if (!r.ok || kq.loi) throw new Error(kq.loi || ('máy chủ trả lỗi ' + r.status));
      return kq;
    };
    /* CÓ PHIÊN DỞ CỦA ĐÚNG FILE NÀY THÌ ĐI TIẾP, KHÔNG MỞ PHIÊN MỚI (28/09) */
    const do_ = vidLayDo(file);
    const tao = do_ ? { khoa: do_.khoa, up: do_.up }
      : await hoi('/api/tai-len-to?buoc=tao&kieu=' + encodeURIComponent(kieu) +
        '&tong=' + file.size + '&phieu=' + encodeURIComponent(phieuId || 'chung') +
        '&nguoi=' + encodeURIComponent((D.nguoi || {}).ten || ''));
    const soManh = Math.ceil(file.size / MANH_CO);
    /* mảnh đã lên từ lượt trước — giữ nguyên etag, không gửi lại */
    const manh = (do_ && Array.isArray(do_.manh) ? do_.manh : []).filter(x => x && x.n && x.etag);
    const daXong = new Set(manh.map(x => Number(x.n)));
    if (!do_) vidGhiDo(file, tao.khoa, tao.up, manh);   /* ghi phiên mới ngay, kẻo rớt trước mảnh đầu */
    /* danh sách khúc: [{n, khuc}] — cắt trước, không giữ byte (slice là lát mỏng
       trỏ vào file, không copy). Bỏ qua khúc đã lên. */
    const khuc = [];
    for (let dau = 0, n = 1; dau < file.size; dau += MANH_CO, n++)
      if (!daXong.has(n)) khuc.push({ n: n, bl: file.slice(dau, Math.min(dau + MANH_CO, file.size)) });
    let xongManh = manh.length;
    if (do_ && xongManh && typeof nhac === 'function')
      nhac('Gửi tiếp video từ khúc ' + (xongManh + 1) + '/' + soManh + ' — không phải làm lại từ đầu', 'la');
    /* SONG SONG theo tốc độ đo được: mạng yếu 1 mảnh, tầm tầm 2, tốt 3.
       (3 chứ không 4 — video mảnh nào cũng 6MB, mở 4 đường là lại tranh nhau) */
    const tranM = Math.max(1, Math.min(3, soLuong() - 1));
    const baoTien = () => { if (tien) tien(Math.min(96, Math.round(xongManh / soManh * 96)), 'gui'); };
    baoTien();
    try {
      let i = 0;
      const chay = async () => {
        for (;;) {
          const j = i++; if (j >= khuc.length) return;
          const k = khuc[j];
          let kq = null, loiC = null;
          for (let lan = 1; lan <= 3; lan++) {
            try {
              const t0 = Date.now();
              kq = await hoi('/api/tai-len-to?buoc=manh&khoa=' + encodeURIComponent(tao.khoa) +
                '&up=' + encodeURIComponent(tao.up) + '&n=' + k.n, { method: 'POST', body: k.bl });
              ghiTocDo(k.bl.size, Date.now() - t0);      /* đo tốc độ thật từ video luôn */
              break;
            } catch (e) { loiC = e; kq = null; if (lan < 3) await nghi(lan * 1500); }
          }
          if (!kq || !kq.etag) throw new Error('Mạng rớt khi gửi khúc ' + k.n + '/' + soManh +
            (loiC ? ' — ' + loiC.message : ''));
          manh.push({ n: kq.n, etag: kq.etag });
          xongManh++; baoTien();
          /* GHI NGAY SAU MỖI MẢNH — đây là chỗ cứu cả việc. Rớt ở mảnh sau thì
             lượt tới vẫn còn nguyên mấy mảnh này. */
          vidGhiDo(file, tao.khoa, tao.up, manh);
        }
      };
      await Promise.all(Array.from({ length: Math.min(tranM, khuc.length) }, chay));
      manh.sort((a, b) => a.n - b.n);              /* kho ghép theo số khúc, phải xếp đúng thứ tự */
      if (tien) tien(97, 'luu');            /* mảnh đi hết — kho đang ghép */
      const xong = await hoi('/api/tai-len-to?buoc=xong', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ khoa: tao.khoa, up: tao.up, manh: manh })
      });
      if (!xong.url) throw new Error('ghép video trên kho không được');
      vidXoaDo(file);                        /* ghép xong rồi thì dọn phiên */
      if (tien) tien(100, 'xong');
      return xong.url;
    } catch (e) {
      /* ============================================================
         HỎNG GIỮA CHỪNG THÌ GIỮ NGUYÊN PHIÊN, ĐỪNG HUỶ (sửa 28/09).
         Bản cũ gọi buoc=huy ngay — vứt sạch mấy mảnh vừa gửi, nên lượt sau
         phải bò lại từ mảnh 1. Đó chính là cái làm Tuân kẹt 3 ngày.
         Giờ để phiên nằm đó; mấy mảnh dở có chiếm chỗ trên kho vài ngày cũng
         được, đổi lại video gửi được. R2 tự dọn phiên quá hạn.
         Chỉ huỷ khi lỗi là do PHIÊN HỎNG hẳn (kho không nhận mã phiên nữa) —
         lúc đó giữ lại chỉ tổ lượt sau cũng hỏng y như vậy.
         ============================================================ */
      const loi = String((e && e.message) || e);
      if (/NoSuchUpload|không tìm thấy phiên|phiên đã hết|InvalidPart/i.test(loi)) {
        vidXoaDo(file);
        fetch('/api/tai-len-to?buoc=huy', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ khoa: tao.khoa, up: tao.up })
        }).catch(() => { });
      }
      throw e;
    }
  });
}
/* ============================================================
   ĐO ĐỘ DÀI VIDEO — PHẢI CÓ HẠN GIỜ (bắt được trên web thật 07/09).
   Thẻ <video> gặp file nó không parse được metadata (.mov/HEVC của iPhone,
   video quay dở, codec lạ) thì KHÔNG bắn onloadedmetadata mà cũng KHÔNG bắn
   onerror — treo vĩnh viễn. Hậu quả: video đứng ở "đang gửi nền" mãi mãi mà
   chưa gửi byte nào, người dùng tưởng web chết.
   Giờ: quá 8 giây thì coi như KHÔNG RÕ độ dài và GỬI LUÔN. Thà gửi một video
   hơi dài, hơn là không gửi được gì.
   ============================================================ */
function doDaiVideo(file) {
  return new Promise(ok => {
    const v = document.createElement('video');
    const u = URL.createObjectURL(file);
    let xong = false;
    const dut = kq => {
      if (xong) return; xong = true;
      clearTimeout(het);
      try { v.removeAttribute('src'); v.load(); } catch (e) { }
      try { URL.revokeObjectURL(u); } catch (e) { }
      ok(kq || {});
    };
    const het = setTimeout(() => dut({ khongRo: true }), 8000);
    v.preload = 'metadata';
    v.onloadedmetadata = () => dut({ giay: v.duration || 0, w: v.videoWidth || 0, h: v.videoHeight || 0 });
    v.onerror = () => dut({ khongRo: true });
    v.src = u;
  });
}

/* xem kho còn bao nhiêu */
async function xemKho() {
  const r = await fetch('/api/kho').then(x => x.json()).catch(() => ({}));
  return r;
}

/* nén ngay trên máy — vừa nét vừa không quá nặng */
/* ============================================================
   NÉN CŨNG PHẢI XẾP HÀNG (Trường bắt 30/08: chọn 7 ảnh, 5 tấm kẹt 94% mãi,
   phiếu chỉ dính 2). Không phải mạng: 7 ảnh gốc 12MP giải mã CÙNG LÚC là vượt
   trần bộ nhớ ảnh của Safari iPhone — nó im lặng bỏ cuộc, không lỗi, promise
   treo vĩnh viễn. Chữa: ① nén tối đa 2 tấm một lúc ② treo quá 25 giây coi như
   hỏng để còn thử lại ③ hỏng thì tự thử lại 1 lần khi hàng đã vãn.
   ============================================================ */
let DANG_NEN = 0;
/* Điện thoại: nén MỘT tấm một lúc (Trường bắt 07/09 "lag vcl"). Giải mã ảnh
   12MP ăn ~50MB RAM mỗi tấm; hai tấm cùng lúc là Safari/Chrome Android đứng
   hình vài giây. Máy tính khoẻ thì vẫn cho hai tấm cho nhanh.
   (Chỉ còn dùng cho ĐƯỜNG CŨ — đường chính giờ nén ở luồng riêng, xem dưới.) */
const NEN_CUNG_LUC = (matchMedia('(min-width:920px)').matches && !/iPhone|iPad|Android/i.test(navigator.userAgent)) ? 2 : 1;

/* ============================================================
   NÉN Ở LUỒNG RIÊNG (Trường chốt 07/09). Test trên web thật cho thấy nén 8 ảnh
   12MP làm Chrome báo "renderer không phản hồi" — trang đứng hình, bấm không
   ăn. Vì nén chạy chung luồng với việc vẽ giao diện.
   Giờ đẩy sang kt-nen.js chạy ở luồng khác: máy nén 15 tấm mà web vẫn cuộn,
   vẫn gõ, vẫn bấm được. Máy cũ không có OffscreenCanvas thì tự lùi về đường cũ,
   không ai bị kẹt.
   ============================================================ */
let NEN_W = null, NEN_HONG = false, NEN_SO = 0;
const NEN_CHO = {};
/* 08/09: mở 2 luồng nén thay vì 1 — chọn 15 ảnh thì nén xong sớm hơn gần một nửa,
   ảnh bắt đầu được gửi ngay chứ không phải xếp hàng chờ nén tuần tự. */
let NEN_W2 = null, NEN_PHIEN = 0;
function moLuongNen() {
  if (NEN_HONG || NEN_W) return NEN_W;
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') { NEN_HONG = true; return null; }
    /* mang theo số bản để đổi bản là đổi file, không dính bản cũ trong kho máy */
    const s = document.querySelector('script[src*="kt-data.js?v="]');
    const m = s ? String(s.src).match(/[?&]v=(\d+)/) : null;
    NEN_W = new Worker('/kt-nen.js' + (m ? '?v=' + m[1] : ''));
    NEN_W.onmessage = e => {
      const d = e.data || {};
      const xong = NEN_CHO[d.id];
      if (!xong) return;
      delete NEN_CHO[d.id];
      xong(d);
    };
    NEN_W.onerror = () => { NEN_HONG = true; try { NEN_W.terminate(); } catch (x) { } NEN_W = null; };
    return NEN_W;
  } catch (e) { NEN_HONG = true; return null; }
}
/* luồng nén thứ hai — dựng y như luồng đầu, chia phiên chẵn/lẻ cho hai luồng */
/* các luồng nén phụ 1,2,3 (luồng 0 là NEN_W) */
const NEN_PHU = {};
function moLuongNenN(k) {
  if (NEN_HONG) return null;
  if (k === 1) return moLuongNen2();
  if (NEN_PHU[k]) return NEN_PHU[k];
  try {
    const m = (document.querySelector('script[src*="kt-data.js"]') || {}).src || '';
    const v = m.match(/v=(\d+)/);
    const w = new Worker('/kt-nen.js' + (v ? '?v=' + v[1] : ''));
    w.onmessage = e => {
      const d = e.data || {};
      const f = NEN_CHO[d.id];
      if (f) { delete NEN_CHO[d.id]; f(d); }
    };
    w.onerror = () => { try { w.terminate(); } catch (x) { } delete NEN_PHU[k]; };
    NEN_PHU[k] = w;
    return w;
  } catch (e) { return null; }
}
function moLuongNen2() {
  if (NEN_HONG || NEN_W2) return NEN_W2;
  if (!moLuongNen()) return null;                 /* luồng 1 hỏng thì thôi luôn */
  try {
    const s = document.querySelector('script[src*="kt-data.js?v="]');
    const m = s ? String(s.src).match(/[?&]v=(\d+)/) : null;
    NEN_W2 = new Worker('/kt-nen.js' + (m ? '?v=' + m[1] : ''));
    NEN_W2.onmessage = e => {
      const d = e.data || {};
      const xong = NEN_CHO[d.id];
      if (!xong) return;
      delete NEN_CHO[d.id];
      xong(d);
    };
    NEN_W2.onerror = () => { try { NEN_W2.terminate(); } catch (x) { } NEN_W2 = null; };
    return NEN_W2;
  } catch (e) { NEN_W2 = null; return null; }
}
function nenLuongRieng(blob, canh, chat, vuong, kieu) {
  return new Promise((ok, loi) => {
    const w1 = moLuongNen();
    if (!w1) return loi(new Error('máy không có luồng nén riêng'));
    /* máy 6 lõi trở lên mở tới 4 luồng nén (09/09): nén 40 ảnh 12MP là việc nặng
       nhất trước khi gửi, chia 4 phần thì nhanh gần gấp đôi so với 2 phần */
    const soL = (navigator.hardwareConcurrency || 2) >= 6 ? 4 : 2;
    const k = ++NEN_PHIEN % soL;
    const w = k === 0 ? w1 : (moLuongNenN(k) || w1);
    const id = ++NEN_SO;
    const het = setTimeout(() => { delete NEN_CHO[id]; loi(new Error('luồng nén quá lâu')); }, 30000);
    NEN_CHO[id] = d => {
      clearTimeout(het);
      if (d.loi || !d.blob) return loi(new Error(d.loi || 'nén ra rỗng'));
      ok(d.blob);
    };
    try { w.postMessage({ id: id, blob: blob, canh: canh, chat: chat, vuong: !!vuong, kieu: kieu }); }
    catch (e) { clearTimeout(het); delete NEN_CHO[id]; loi(e); }
  });
}
async function xepHangNen(viec) {
  while (DANG_NEN >= NEN_CUNG_LUC) await nghi(150);
  DANG_NEN++;
  try { return await viec(); } finally { DANG_NEN--; }
}
async function nenAnh(file, canh, chatLuong, kieu) {
  /* ① đường chính: luồng riêng — giao diện không đứng hình (07/09) */
  if (!NEN_HONG) {
    try { return await nenLuongRieng(file, canh || 3000, chatLuong || 0.92, false, kieu); }
    catch (e) { /* rơi xuống đường cũ */ }
  }
  /* ② đường cũ cho máy không có luồng riêng: vẫn xếp hàng cho đỡ nghẽn RAM */
  try { return await xepHangNen(() => nenAnhTho(file, canh, chatLuong)); }
  catch (e) {
    await nghi(900);   // đợi các tấm khác nén xong cho nhẹ máy rồi thử lại
    try { return await xepHangNen(() => nenAnhTho(file, canh, chatLuong)); }
    catch (e2) {
      /* ============================================================
         ③ ĐƯỜNG CHÓT CHO ẢNH HEIC (19/09).
         Soát kho ngày 19/09 thấy 8 tấm .heic nằm nguyên trong phiếu Huế —
         nén hỏng cả hai đường nên web đành gửi bản gốc. Hậu quả: Chrome trên
         Windows và Android KHÔNG mở được .heic, quản lý ngồi máy tính bấm vào
         chỉ thấy ô trắng — ảnh coi như mất dù vẫn nằm trên kho.
         Vì sao hai đường kia hỏng: đường ① giải mã bằng createImageBitmap
         trong luồng riêng, iOS không cấp codec HEIC cho luồng đó; đường ② vẽ
         qua <img> nhưng ảnh HEIC 12MP làm Safari kẹt bộ nhớ, quá 25 giây là
         nhả. Đường này hạ cạnh xuống 1600px rồi thử lại bằng createImageBitmap
         ở LUỒNG CHÍNH — nhẹ hơn nhiều, và luồng chính thì có codec.
         ============================================================ */
      try {
        const bm = await createImageBitmap(file);
        const ti = Math.min(1, 1600 / Math.max(bm.width, bm.height));
        const w = Math.round(bm.width * ti), h = Math.round(bm.height * ti);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(bm, 0, 0, w, h);
        try { bm.close(); } catch (x) { }
        const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
        if (b) return b;
      } catch (x) { }
      throw e2;
    }
  }
}
function nenAnhTho(file, canh = 3000, chatLuong = 0.92) {
  return new Promise((ok, loi) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let xong = false;
    const dut = (e) => { if (xong) return; xong = true; clearTimeout(het); try { URL.revokeObjectURL(url); } catch (x) { } e ? loi(e) : 0; };
    /* đường thoát: Safari kẹt bộ nhớ thì onload/onerror đều KHÔNG bắn — không có
       mốc này là promise treo mãi, ảnh mất lặng lẽ */
    const het = setTimeout(() => dut(new Error('đọc ảnh quá lâu')), 25000);
    img.onload = () => {
      if (xong) return; xong = true; clearTimeout(het);
      try {
        let { width: w, height: h } = img;
        const ti = Math.min(1, canh / Math.max(w, h));
        w = Math.round(w * ti); h = Math.round(h * ti);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? ok(b) : loi(new Error('nén lỗi')), 'image/jpeg', chatLuong);
      } catch (e) { loi(e); }
    };
    img.onerror = () => dut(new Error('không đọc được ảnh'));
    img.src = url;
  });
}

/* Bỏ dấu tiếng Việt để tìm kiếm: "Huế" → "hue", "Máy gắp" → "may gap".
   Dùng chuẩn Unicode NFD tách dấu ra rồi xoá, thêm tay đ/Đ vì nó không phải dấu. */
function boDau(t) {
  return String(t == null ? '' : t)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim();
}

/* ---------- nhắc ---------- */
let toastTimer = 0;
/* ============================================================
   NHẮC NHỎ — chuyển sang bộ hiệu ứng (12/10, Trường gửi gói hieu-ung).
   Sửa đúng MỘT chỗ này là cả web đổi theo: nhac() được gọi hơn 200 lần rải
   khắp 11 file, đi sửa từng chỗ vừa lâu vừa dễ sót.
   Ánh xạ ba kiểu cũ sang ba kiểu mới:
     la   (xanh lá, việc xong)  → ok
     do   (đỏ, hỏng)            → error   (bộ mới để lâu hơn: 4,5s thay vì 2,5s)
     canh (vàng, lưu ý)         → info
   Máy nào chưa nạp được hieu-ung.js thì tự rơi về toast cũ, không gãy.
   nhacNut() GIỮ NGUYÊN toast cũ vì nó có nút bấm, bộ mới không có chỗ cho nút.
   ============================================================ */
const KIEU_TOAST = { la: 'ok', do: 'error', canh: 'info' };
function nhac(text, kieu) {
  /* rung phản hồi (21/10). Chỉ rung khi BÁO HỎNG — mỗi lần lưu xong mà rung
     thì ngày rung mấy chục lần, thành phiền chứ không còn là tín hiệu.
     Rung "có việc mới" nằm ở chỗ nhận thông báo đẩy, không phải ở đây. */
  if (kieu === 'do' && typeof rung === 'function') rung('hong');
  if (typeof HieuUng !== 'undefined' && HieuUng.toast) {
    return HieuUng.toast(text, KIEU_TOAST[kieu] || 'info');
  }
  const el = document.getElementById('toast');
  el.className = 'toast ' + (kieu || 'la');
  el.innerHTML = '<b>' + esc(text) + '</b>';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('an'), 3200);
}
/* ============================================================
   XONG VIỆC LỚN — dấu ✓ nảy giữa màn rồi tự tắt.
   Luật trong hướng dẫn: việc LỚN dùng ✓, việc NHỎ dùng nhắc nhỏ, không dùng
   cả hai cho cùng một thao tác. Web này coi là việc lớn: gửi phiếu mới, nhận
   việc, báo xong, CHT nghiệm thu, xin dời hạn, duyệt dời hạn.
   Trả về Promise nên gọi kèm await thì đóng form xong mới chuyển màn.
   ============================================================ */
function xongViec(chu, phu) {
  if (typeof HieuUng !== 'undefined' && HieuUng.xong) return HieuUng.xong(chu, phu || '');
  nhac(chu + (phu ? ' — ' + phu : ''), 'la');
  return Promise.resolve();
}
/* toast có NÚT hành động (#48 Trường chốt 04/09): báo lỗi ảnh mà bắt người ta
   tự đi tìm đường gửi lại là vứt. Đứng lâu hơn toast thường để kịp bấm. */
function nhacNut(text, kieu, nhan, viec, giay) {
  const el = document.getElementById('toast');
  el.className = 'toast ' + (kieu || 'la');
  el.innerHTML = '<b>' + esc(text) + '</b><button class="tNut" id="toastNut">' + esc(nhan) + '</button>';
  const n = document.getElementById('toastNut');
  if (n) n.onclick = () => { el.classList.add('an'); try { if (viec) viec(); } catch (e) { } };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('an'), (giay || 12) * 1000);
}
