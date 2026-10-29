/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Khởi động và bắt sự kiện
   ============================================================ */
'use strict';

/* ---------- MÀN CHỌN NGƯỜI ---------- */
let NGUOI_CU = null;      /* người đang dùng máy, giữ tạm để lùi ra khỏi màn "Bạn là ai?" */
function veManVao() {
  const cs = D.ai.filter(a => a.vai === 'coso');
  const tho = D.ai.filter(a => a.vai === 'tho');
  const ql = D.ai.filter(a => a.vai === 'quanly');
  let h = '';

  /* ---------- B · VỪA DÙNG TRÊN MÁY NÀY (Trường chốt 29/08) ----------
     Máy dùng chung bật lên là phải dò tên giữa 20+ người, 12 cơ sở tên na ná
     nhau, rất dễ vào nhầm. Ba người gần nhất đẩy lên trên cùng, nút to,
     bấm MỘT phát là vào. Chỉ hiện khi danh sách đủ dài để việc dò là thật sự
     mất công — đội 3 người thì khối này chỉ tổ chật màn. */
  if (NGUOI_CU && NGUOI_CU.ten) {
    h += '<button class="nutVeCu" data-vecu="1">← Thôi, quay lại · <b>' + esc(NGUOI_CU.ten) + '</b></button>';
  }
  const gan = ganDay().map(id => D.ai.find(a => a.id === id)).filter(Boolean).slice(0, 3);
  if (gan.length && D.ai.length > 4) {
    const VAI_G = { coso: 'cơ sở', tho: 'kỹ thuật', quanly: 'quản lý' };
    h += '<div class="nhomVao">VỪA DÙNG TRÊN MÁY NÀY</div><div class="luoiGan">' + gan.map(a =>
      '<button class="nutGan" data-ai="' + esc(a.id) + '">' + veAv(a.ten, a.mau, a.anh) +
      '<b>' + esc(a.ten) + '</b><div class="s">' + (VAI_G[a.vai] || '') + '</div></button>').join('') + '</div>';
  }

  if (cs.length) h += '<div class="nhomVao">CƠ SỞ</div><div class="luoiCS">' + cs.map(a =>
    '<button class="nutCS" data-ai="' + esc(a.id) + '"><span class="k" style="background:' + esc(a.mau) + '">' +
    esc((a.ten || '').replace(/[^A-Za-zÀ-ỹ]/g, '').slice(0, 2).toUpperCase()) + '</span>' +
    '<div><b>' + esc(a.ten) + '</b><div class="s">cơ sở</div></div></button>').join('') + '</div>';
  if (tho.length) h += '<div class="nhomVao">KỸ THUẬT — ' + tho.length + ' KỸ THUẬT</div><div class="luoiTho">' + tho.map(a =>
    '<button class="nutTho" data-ai="' + esc(a.id) + '">' + veAv(a.ten, a.mau, a.anh) + '<b>' + esc(a.ten) + '</b><div class="s">kỹ thuật</div></button>').join('') + '</div>';
  if (ql.length) h += '<div class="nhomVao">QUẢN LÝ</div>' + ql.map(a =>
    '<button class="nutQL" data-ai="' + esc(a.id) + '"><span class="k">👔</span><div><b>' + esc(a.ten) + '</b>' +
    '<div class="s">xem tất cả cơ sở, thống kê, xuất Excel</div></div><span style="margin-left:auto;color:#CBD5E1;font-size:18px">›</span></button>').join('');
  document.getElementById('vaoNoi').innerHTML = h || '<div class="dangTai">Chưa có danh sách người dùng. Chạy file SQL-KT-1.sql trong Supabase trước.</div>';
}

function chonAi(id) {
  const a = D.ai.find(x => x.id === id); if (!a) return;
  NGUOI_CU = null;
  datNguoi({ id: a.id, ten: a.ten, vai: a.vai, coSoId: a.coSoId, mau: a.mau, anh: a.anh || '' });
  themGanDay(a.id);
  vaoApp();
  nhac('Chào ' + a.ten, 'la');
}

function vaoApp() {
  const nv = document.querySelector('.nutVeCu'); if (nv) nv.remove();   /* dọn nút quay lại */
  document.getElementById('manVao').classList.add('an');
  document.getElementById('app').classList.remove('an');
  L.the = ''; L.chip = 'tatca';
  veHet();
  /* đăng ký thông báo cũ có thể đã hỏng (đổi kho, đổi khoá) mà web vẫn hiện "ĐANG BẬT" —
     tự kiểm và đăng ký lại ngầm, người dùng không phải làm gì */
  if (typeof chuaLanhDay === 'function') setTimeout(chuaLanhDay, 2500);
  /* chưa bật thông báo thì chặn cửa — Trường chốt 26/08 bắt buộc cả đội phải nhận */
  if (typeof kiemChanDay === 'function') setTimeout(kiemChanDay, 900);
  /* vai quản lý trên máy chưa mở khoá → hỏi PIN (01/09, nhập 1 lần/máy) */
  if (typeof kiemPinQuanLy === 'function') setTimeout(kiemPinQuanLy, 500);
}
function raManVao() {
  document.getElementById('app').classList.add('an');
  document.getElementById('manVao').classList.remove('an');
  veManVao();
  /* có người dùng dở thì cắm một nấc: nút Back của máy / vuốt mép trái cũng lùi ra */
  if (NGUOI_CU) { try { history.pushState({ ktVao: 1 }, ''); } catch (e) { } }
}

/* ============================================================
   A · LINK RIÊNG TỪNG NGƯỜI  —  ...workers.dev/?ai=tho_tuan
   Trường chốt 29/08: "ấn 1 phát phải vào luôn". Nhét sẵn tên vào đường link
   thì còn hơn thế — mở icon là vào, KHÔNG phải bấm phát nào, không thấy màn
   "Bạn là ai?" lần nào, không có cửa nào để vào nhầm tên.
   Người trong link THẮNG tất: thắng người đang lưu trong máy, thắng cả công
   tắc "máy dùng chung" (mở icon RIÊNG của mình thì không việc gì phải hỏi lại).
   Vào xong thì dọn chữ ?ai= khỏi thanh địa chỉ — nếu để nguyên, người sau bấm
   "Đổi người" rồi lỡ bấm F5 là máy nhảy ngược về người của link.
   Icon đã lưu ra màn hình chính vẫn giữ ?ai= trong đường mở của nó, nên lần
   sau mở icon vẫn vào đúng người.
   ============================================================ */
function apLinkAi() {
  if (!AI_LINK) return false;
  const a = D.ai.find(x => x.id === AI_LINK);
  if (!a) return false;
  datNguoi({ id: a.id, ten: a.ten, vai: a.vai, coSoId: a.coSoId, mau: a.mau, anh: a.anh || '' });
  themGanDay(a.id);
  return true;
}
function donLinkAi() {
  try {
    const u = new URL(location.href);
    if (!u.searchParams.has('ai')) return;
    u.searchParams.delete('ai');
    const q = u.searchParams.toString();
    history.replaceState({}, '', u.pathname + (q ? '?' + q : '') + u.hash);
  } catch (e) { }
}

/* ---------- KHỞI ĐỘNG ---------- */
(async function chay() {
  /* ============================================================
     BẬT BỘ HIỆU ỨNG (12/10 — gói Trường gửi).
     gan() cắm một người canh (MutationObserver) để mọi ô mang data-hu-dem
     đều tự chạy số, kể cả ô được vẽ lại sau mỗi lần cập nhật.
     CHỈ canh #theHang chứ không canh cả trang: bảng phiếu vẽ lại liên tục,
     canh toàn bộ là bắt trình duyệt rà hàng nghìn nút mỗi lần có tin mới.
     Hoãn tới khi hàng thẻ dựng xong, vì lúc này nó còn rỗng.
     ============================================================ */
  if (typeof HieuUng !== 'undefined' && HieuUng.gan) {
    const canhThe = () => {
      const h = document.getElementById('theHang');
      if (h) HieuUng.gan(h); else setTimeout(canhThe, 300);
    };
    setTimeout(canhThe, 300);
  }
  const coCache = docCache();
  D.nguoi = layNguoi();

  if (coCache) { veManVao(); const q = apLinkAi(); if (D.nguoi && (q || !mayChung())) vaoApp(); }

  /* XIN VÉ TRƯỚC KHI TẢI DỮ LIỆU (22/09) — có vé thì máy chủ mới biết người
     này là cơ sở nào để chỉ trả phiếu của cơ sở đó. Xin sau thì lượt tải đầu
     tiên vẫn kéo về phiếu của cả 13 cơ sở, tức là đúng cái đang muốn bỏ.
     chacVe() tự kiểm: vé còn tươi thì trả về ngay, không gọi mạng. */
  if (D.nguoi) { try { await chacVe(); } catch (e) { } }

  const ok = await taiHet(coCache);
  if (!D.ai.length) D.ai = aiMacDinh();

  const theoLink = apLinkAi();

  /* người đã chọn nhưng danh sách đổi tên → khớp lại */
  if (D.nguoi) {
    const con = D.ai.find(a => a.id === D.nguoi.id);
    if (con) datNguoi({ id: con.id, ten: con.ten, vai: con.vai, coSoId: con.coSoId, mau: con.mau, anh: con.anh || '' });
  }

  veManVao();
  if (D.nguoi && (theoLink || !mayChung())) vaoApp();
  else raManVao();
  /* link có ?ai= nhưng không tìm ra người: nói thật, đừng để họ tưởng link hỏng */
  if (AI_LINK && !theoLink) nhac('Link này trỏ tới người không còn trong danh sách — chọn tên bên dưới', 'canh');
  donLinkAi();

  if (typeof moTheoLink === 'function') setTimeout(moTheoLink, 300);
  chayHang();
  window.addEventListener('online', chayHang);
  /* ============================================================
     TỰ GỬI BÙ, KHÔNG BẮT AI BẤM (Trường chốt 07/09: "lúc nào cũng phải tải bù
     với tải lại thì có nghĩa lý gì"). Còn ảnh tồn từ lần trước thì mở app là
     tự gửi tiếp; mất mạng giữa đường, có sóng lại cũng tự gửi. Hộp chờ vẫn
     hiện để biết đang có gì, nhưng người dùng không phải làm gì cả.
     ============================================================ */
  if (typeof veHopCho === 'function') setTimeout(veHopCho, 800);
  /* AI quét bù phiếu cũ — chạy muộn 6 giây để không tranh đường với việc tải
     dữ liệu và ảnh lúc mở web (20/09) */
  if (typeof aiQuetNgam === 'function') setTimeout(aiQuetNgam, 6000);
  const tuGuiBu = async (vi) => {
    if (typeof guiBuHopCho !== 'function' || typeof hopDem !== 'function') return;
    if (typeof HOP_DANG_GUI !== 'undefined' && HOP_DANG_GUI) return;
    if (!navigator.onLine) return;
    try {
      const k = await hopDem();
      if (!k.so) return;
      /* Thử 6 lượt LIÊN TIẾP mà không tấm nào lên thì thôi tự động, để người
         dùng quyết. Lượt nào có tấm lên được là đếm về 0 (24/09) — trước đây
         đếm cả lượt thành công nên mới hay tắt sớm rồi bắt bấm tay. */
      if ((k.thu || 0) >= 6) return;
      guiBuHopCho();
    } catch (e) { }
  };
  setTimeout(() => tuGuiBu('mo-app'), 2500);
  window.addEventListener('online', () => setTimeout(() => tuGuiBu('co-mang'), 1200));

  /* ============================================================
     LÀM TƯƠI DỮ LIỆU — trước đây 10 PHÚT mới tải lại một lần nên
     chuông đứng im, Trường tưởng "web bị chết". Giờ ba đường:
     ① 90 giây một lần khi app đang mở trên màn hình
     ② quay lại app (đổi từ app khác sang) là tải ngay
     ③ có thông báo đẩy tới là service worker huých — tải ngay lập tức
     Mỗi lần tải là 1 lượt /api/db/tai-het (~vài trăm dòng đọc) — D1 cho
     5 TRIỆU dòng đọc/ngày, cả đội bấm cả ngày cũng không chạm 1%.
     ============================================================ */
  let LAN_TUOI = 0;
  async function lamTuoi(vi) {
    const gio = Date.now();
    if (gio - LAN_TUOI < 8000) return;          // chặn dội: nhiều nguồn gọi cùng lúc
    LAN_TUOI = gio;
    await taiHet(true);
    if (!document.getElementById('app').classList.contains('an')) {
      veHet();
      if (PH) {
        const m = phieu(PH.id);
        if (m) { PH = m; veNgan(true); }
        /* tin nhắn cũng phải tải lại — trước đây chỉ tải lại danh sách phiếu nên
           chat đứng im, người kia nhắn mà máy mình không thấy (Trường báo 26/08) */
        napDienBien(PH.id, true);
      }
    }
  }
  setInterval(() => { if (document.visibilityState === 'visible') lamTuoi('chukym'); }, 90000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { lamTuoi('quaylai'); kiemBanMoi(); }
  });
  setTimeout(kiemBanMoi, 6000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data || e.data.loai !== 'day-moi') return;
    /* Thông báo đẩy vừa về: nếu đúng phiếu đang mở thì lấy tin NGAY, không đợi
       nhịp và không đợi chặn dội 8 giây của lamTuoi — đây là đường nhanh nhất,
       gần như tức thì (Trường 26/08 đòi chat phải nhanh nhất có thể). */
    if (PH && (!e.data.phieu || e.data.phieu === PH.id)) {
      napDienBien(PH.id, true).then(coMoi => { if (coMoi && typeof nongChat === 'function') nongChat(); });
    }
    lamTuoi('day');
  });
})();

/* ============================================================
   NÚT BACK CỦA MÁY = LÙI MỘT LỚP (Trường chốt 04/09). Trước đây bấm nút lùi
   Android / vuốt cạnh là VĂNG KHỎI APP — giờ nó đóng đúng lớp trên cùng:
   sửa ảnh → xem ảnh → tấm trượt → ngăn chi tiết → tab Thống kê → rồi mới thoát.
   Cách làm: mỗi lần MỞ một lớp thì cắm 1 nấc vào lịch sử trình duyệt; bấm Back
   là trình duyệt nhả nấc đó ra và mình đóng lớp tương ứng.
   Riêng màn PIN quản lý KHÔNG cho back né qua — back là về màn chọn người.
   ============================================================ */
(function backLuiLop() {
  /* NGĂN PHIẾU đã có nấc lịch sử riêng từ trước (?p= trong kt-form) — ở đây chỉ
     cắm thêm nấc cho 3 lớp còn thiếu: tấm trượt, xem ảnh, sửa ảnh.
     Handler popstate DUY NHẤT nằm trong kt-form — không có handler thứ hai. */
  const dayNac = () => { try { history.pushState({ ktLop: 1 }, ''); } catch (e) { } };
  const goc = { moSheet: window.moSheet, moXem: window.moXem, moSuaAnh: window.moSuaAnh, dongSheet: window.dongSheet };
  moSheet = function (h) {
    const dang = !document.getElementById('sheet').classList.contains('an');
    goc.moSheet(h);
    if (!dang && !TU_LICH) dayNac();        /* sheet đè sheet = một lớp, không cắm thêm */
  };
  moXem = function (u, b2) { const dang = !!document.getElementById('xemAnh'); const r = goc.moXem(u, b2); if (!dang && !TU_LICH) dayNac(); return r; };
  moSuaAnh = function (u, b2) { const dang = !!document.getElementById('suaAnh'); const r = goc.moSuaAnh(u, b2); if (!dang && !TU_LICH) dayNac(); return r; };
  /* đóng sheet bằng nút ✕ / sau khi lưu: nhả đúng cái nấc mình đã cắm,
     để lịch sử không tồn nấc rác làm nút Back "trơ" một nhịp */
  /* giuNac = true: đóng tấm trượt nhưng KHÔNG nhả nấc lịch sử — dùng khi từ
     một màn nhảy sang phiếu, để Back còn đường quay về màn đó (24/09) */
  dongSheet = function (giuNac) {
    const dang = !document.getElementById('sheet').classList.contains('an');
    goc.dongSheet();
    if (dang && !giuNac && !TU_LICH && history.state && history.state.ktLop) { BO_POP = true; try { history.back(); } catch (e) { BO_POP = false; } }
  };
})();

/* ============================================================
   TỰ CẬP NHẬT BẢN MỚI (#46 Trường chốt 03/09). App cài ngoài màn hình mở lại
   là dùng luôn trang CŨ còn nằm trong bộ nhớ — deploy bao nhiêu bản cũng không
   biết, phải dặn nhau "kill app mở lại 2 lần". Giờ: lúc mở app và mỗi lần quay
   lại app, hỏi máy chủ số bản trong index (?kb= né mọi cache); lệch là dọn kho
   tĩnh + tự nạp lại — người dùng không phải làm gì.
   ============================================================ */
const BAN_HIEN = (() => {
  const s = document.querySelector('script[src*="kt-chay.js?v="]');
  const m = s ? String(s.src).match(/[?&]v=(\d+)/) : null;
  return m ? Number(m[1]) : 0;
})();
let KIEM_BAN_LUC = 0;
async function kiemBanMoi() {
  if (!BAN_HIEN) return;
  if (Date.now() - KIEM_BAN_LUC < 5 * 60000) return;   // 5 phút hỏi 1 lần là đủ
  KIEM_BAN_LUC = Date.now();
  let banMay = 0;
  try {
    const r = await fetch('/?kb=' + Date.now(), { cache: 'no-store' });
    const m = (await r.text()).match(/kt-chay\.js\?v=(\d+)/);
    banMay = m ? Number(m[1]) : 0;
  } catch (e) { return; }                               // mất mạng thì thôi, lần sau hỏi lại
  if (!banMay || banMay <= BAN_HIEN) return;
  /* DÒNG BÁO BẢN MỚI (Trường chốt 04/09): luôn hiện ngay dưới header — ấn là
     cập nhật. Ai còn thấy dòng này tức là chưa lên bản mới, hết cảnh mù mờ. */
  veBangMoi(banMay);
  /* đang gõ dở tin / đang mở form thì KHÔNG tự nạp lại kẻo mất chữ — dòng báo
     đứng chờ, người dùng tự bấm lúc thuận tay */
  const banRon = !document.getElementById('sheet').classList.contains('an') ||
    !document.getElementById('ngan').classList.contains('an') ||
    /INPUT|TEXTAREA/.test(((document.activeElement || {}).tagName) || '');
  if (banRon) return;
  /* chống xoáy nạp-lại-mãi: CDN nửa đường (index mới, js cũ) thì chỉ tự thử 1 lần */
  try {
    if (sessionStorage.getItem('kt_nap_vi') === String(banMay)) return;
    sessionStorage.setItem('kt_nap_vi', String(banMay));
  } catch (e) { }
  nhac('Có bản mới — đang tự cập nhật…', 'la');
  capNhatNgay();
}
/* dọn kho tĩnh rồi nạp lại — dùng chung cho tự động lẫn bấm tay */
function capNhatNgay() {
  (async () => {
    try {
      const ks = await caches.keys();
      await Promise.all(ks.filter(k => k.indexOf('kt-tinh') === 0).map(k => caches.delete(k)));
    } catch (e) { }
    setTimeout(() => location.reload(), 500);
  })();
}
/* ============================================================
   DÒNG BÁO BẢN MỚI — DỰNG LẠI 21/10 (Trường chốt ảnh 3).
   Mượn kiểu của web Camera Audit: thẻ nổi ở ĐÁY màn, nền vàng nhạt, có nút
   bấm riêng và nút tắt.

   Vì sao đổi: bản cũ là một dải xanh lá chắn ngang NGAY DƯỚI THANH TRÊN, đè
   lên dải thẻ KPI. Nó to, chói, chặn mất thứ người ta đang muốn xem, và không
   có cách nào tắt — ai chưa muốn cập nhật thì phải chịu đựng nó suốt buổi.
   Đáy màn thì nằm ngoài vùng mắt đang đọc, có nút ✕ để dẹp, mà vẫn thấy rõ.

   Giữ nguyên toàn bộ phần dò bản (kiemBanMoi) và phần cập nhật (capNhatNgay)
   — chỉ thay cái vỏ.
   ============================================================ */
function veBangMoi(banMay) {
  if (document.getElementById('bangMoi')) return;
  const el = document.createElement('div');
  el.id = 'bangMoi'; el.className = 'bangMoi';
  el.innerHTML =
    '<span class="bmIc">↻</span>' +
    '<div class="bmChu"><b>Đã có bản mới</b>' +
    '<span>Bấm cập nhật — mất vài giây, việc đang làm không mất</span></div>' +
    '<button class="bmNut" data-capnhat="1">Cập nhật</button>' +
    '<button class="bmTat" data-bomoi="1" aria-label="Để sau">✕</button>';
  document.body.appendChild(el);
}

/* ============================================================
   C · GIỮ AVATAR 1 GIÂY → RA THẲNG MÀN ĐỔI NGƯỜI
   Trước: Cài đặt → nút "Đổi người" → chọn = 3 phát. Giờ giữ avatar rồi chọn
   = 2 phát. Bấm nhanh vẫn mở Cài đặt y như cũ, không ai phải học lại gì.
   Chặn ở pha bắt (capture) để cú click sau khi giữ không lọt xuống document
   rồi mở luôn cả Cài đặt.
   ============================================================ */
(function giuAvatarDoiNguoi() {
  const av = document.getElementById('avTop');
  if (!av) return;
  let hen = 0, daGiu = false;
  const batDau = () => {
    daGiu = false;
    clearTimeout(hen);
    hen = setTimeout(() => {
      daGiu = true;
      try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { }
      if (typeof dongSheet === 'function') dongSheet();
      NGUOI_CU = D.nguoi;      /* giữ tạm để còn nút "← Thôi, quay lại" (08/09) */
      xoaNguoi();
      raManVao();
    }, 600);
  };
  const thoi = () => clearTimeout(hen);
  av.addEventListener('pointerdown', batDau);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => av.addEventListener(k, thoi));
  av.addEventListener('contextmenu', e => e.preventDefault());
  av.addEventListener('click', e => {
    if (!daGiu) return;
    daGiu = false; e.preventDefault(); e.stopPropagation();
  }, true);
})();

/* ---------- SỰ KIỆN ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a,tr,[data-ai],[data-xem]');
  if (!t) return;
  const d = t.dataset || {};

  /* chọn người */
  if (d.ai) return chonAi(d.ai);

  /* đổi tháng (nút tháng + cột biểu đồ) */
  if (d.thang) { L.thang = d.thang; L.trang = 1; veHet(); return; }

  /* thẻ thống kê + cảnh báo + chip */
  if (d.the !== undefined && (t.classList.contains('the') || t.classList.contains('cb') || t.closest('.chipLoc'))) {
    /* BẤM THẺ NÀO LÀ BỎ LỌC CŨ (Trường chốt 27/08). Trước đây thẻ ghi "Chưa ai
       tiếp nhận 9" mà bấm vào ra 0 việc, vì lọc "Của tôi" vẫn bật chồng lên —
       việc chưa ai nhận thì đâu phải của mình. Tệ hơn: nút tắt lọc đó bị ẩn trên
       máy tính nên không có đường thoát. Giờ số trên thẻ LUÔN khớp danh sách. */
    const truoc = typeof dangLocGi === 'function' && dangLocGi();
    L.the = (L.the === d.the) ? '' : d.the;
    L.chip = 'tatca'; L.ma = null; L.gian = '';
    /* vừa từ "không lọc" sang "có lọc" → cắm một nấc để nút Back lùi được */
    if (!truoc && L.the) { try { history.pushState({ ktLop: 1 }, ''); } catch (x) { } }
    L.trang = 1; veHet();
    document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (d.boloc) {
    /* xoá SẠCH mọi đường lọc — trước đây chỉ xoá thẻ, chip, cơ sở nên bấm
       "Bỏ hết lọc" mà nhóm lỗi, mức độ, kỹ thuật vẫn dính (21/09) */
    L.the = ''; L.chip = 'tatca'; L.coSo = ''; L.gian = ''; L.ma = null;
    L.nhom = ''; L.mucDo = ''; L.tho = ''; L.tt = ''; L.vuong = ''; L.tim = '';
    const oT = document.getElementById('oTim'); if (oT) oT.value = '';
    L.trang = 1; veHet(); return;
  }
  /* bỏ ĐÚNG MỘT đường lọc — dấu ✕ trên từng chip của dải "Đang lọc" (21/09) */
  if (d.bo1) {
    const k = String(d.bo1);
    if (k === 'ma') L.ma = null;
    else if (k === 'chip') L.chip = 'tatca';
    else if (k === 'tim') { L.tim = ''; const o = document.getElementById('oTim'); if (o) o.value = ''; }
    else L[k] = '';
    L.trang = 1; veHet(); return;
  }
  if (d.chip) { L.chip = (L.chip === d.chip ? 'tatca' : d.chip); L.the = ''; L.ma = null; L.gian = ''; L.trang = 1; veHet(); return; }
  if (d.trang) { L.trang = Number(d.trang); veDanhSach(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

  /* thanh cơ sở + biểu đồ: bấm 1 cơ sở là lọc, bấm đúng cái đang chọn là bỏ */
  if (d.bocs) { L.coSo = ''; L.trang = 1; veHet(); return; }
  if (d.coso) {
    /* bấm cột cơ sở trong biểu đồ (tab Thống kê) = muốn XEM DANH SÁCH cơ sở đó (04/09) */
    if (typeof TAB_CHINH !== 'undefined' && laQuanLy()) TAB_CHINH = 'ds';
    L.coSo = (L.coSo === d.coso ? '' : d.coso); L.ma = null; L.gian = ''; L.trang = 1; veHet();
    /* KHÔNG tự cuộn xuống khi bấm chip: thanh cơ sở và dải "Đang lọc" nằm ngay trên
       danh sách rồi, cuộn xuống là đẩy chúng ra khỏi màn, mất luôn chỗ để bỏ lọc. */
    if (!t.classList.contains('csO')) document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (d.nhom) {
    const truoc = typeof dangLocGi === 'function' && dangLocGi();
    L.nhom = (L.nhom === d.nhom ? '' : d.nhom); L.ma = null; L.trang = 1; veHet();
    if (!truoc && L.nhom) { try { history.pushState({ ktLop: 1 }, ''); } catch (x) { } }
    return;
  }

  /* mở chi tiết */
  if (t.tagName === 'TR' && d.id) return moChiTiet(d.id);
  if (t.classList.contains('vc') && d.id) return moChiTiet(d.id);
  if (t.classList.contains('vxO') && d.id) return moChiTiet(d.id);   /* ô trong dải 👣 VỪA XEM (10/09) */
  /* ============================================================
     ‹ và ✕ LÀM HAI VIỆC KHÁC NHAU (Trường chốt 24/09)
       ‹  = lùi một bước — đến từ hộp thư thì về hộp thư, từ Radar thì về
            Radar, từ danh sách thì về danh sách.
       ✕  = đóng hẳn, bỏ luôn đường về.
     Trước đây hai nút dùng chung data-dong nên bấm mũi tên cũng văng thẳng
     về màn chính, mất chỗ đang đứng.
     ============================================================ */
  /* ============================================================
     VÁ 02/10 — HAI THỨ KHÁC NHAU TỪNG CÙNG TÊN data-ve.
     Nút ‹ "Trở lại" trong phiếu tao đặt data-ve="1" hồi 24/09. Nhưng màn Sửa
     người có từ 08/09 cũng đặt data-ve="goc" trên nút LƯU để nhớ đường về.
     Nhánh này nằm trên, nên mọi cú bấm Lưu rơi vào đây rồi return — hàm lưu
     KHÔNG BAO GIỜ chạy, mà cũng chẳng báo lỗi gì: bấm xong im thin thít, đúng
     như Trường gặp khi sửa người của Lotte Bắc Giang.
     Đây là lần thứ hai dính cùng một kiểu (hồi 24/09 là hai nút chung
     data-dong). Đặt tên cho thuộc tính data phải soát CẢ WEB trước.
     Đã đổi nút Trở lại sang data-velai — tên riêng, không ai đụng.
     ============================================================ */
  if (d.velai) {
    dongNgan();
    if (veManTruoc()) { try { history.pushState({ ktLop: 1 }, ''); } catch (x) { } }
    return;
  }
  if (d.dong) { MAN_TRUOC = null; return dongNgan(); }
  if (d.tab) { TAB = d.tab; veNgan(); return; }

  /* nút chính. Kỹ thuật bấm ⚡ (Trường chốt 04/09): không mở form ghi việc nữa —
     xoá sạch lọc rồi nhảy thẳng tới dải CẦN LÀM NGAY ở đầu danh sách */
  if (t.id === 'fab' && laTho()) {
    L.the = ''; L.chip = 'tatca'; L.coSo = ''; L.trang = 1;
    const oT = document.getElementById('oTim'); if (oT && oT.value) { oT.value = ''; L.tim = ''; }
    veHet();
    const ds2 = document.getElementById('dsHang');
    if (ds2) ds2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!document.querySelector('.daiNong')) nhac('Không có việc nào cháy — êm 👌', 'la');
    return;
  }
  if (t.id === 'nutGiao' || t.id === 'fab') return formGiaoViec();
  if (t.id === 'nutExcel') return xuatExcel();
  /* avatar = TRANG CÁ NHÂN (Trường chốt 04/09) — Cài đặt chỉ còn ở tab ⚙ */
  if (t.id === 'avTop') return formCaNhan();
  /* 🔎 RADAR thay màn Cần chú ý cho vai QUẢN LÝ (14/09 — Trường: "tao cần 1 cái
     gì đấy mới lạ, thay thế luôn tab chú ý này cũng dc"). Cơ sở và kỹ thuật giữ
     màn cũ: họ cần "việc của tôi hôm nay", không cần máy soi cả hệ thống. */
  if (t.id === 'nutChuong') return (laQuanLy() && typeof formRadar === 'function') ? formRadar() : formThongBao();
  /* 2 nút nhanh trên header (Trường xin 21/08: "ra ngoài cho tiện ấn") */
  if (t.id === 'nutTai') { t.textContent = '⏳'; location.reload(); return; }
  /* nút 🌓 bỏ 03/10 — chỉ còn giao diện sáng */
  if (d.tbmo) return moPhieuTu(d.tbmo, formTraoDoi);
  /* mỗi màn một đường về riêng — dùng chung là Back trả về nhầm chỗ (24/09) */
  if (d.csmo) return moPhieuTu(d.csmo, formCoSoToi);
  if (d.cymo) return moPhieuTu(d.cymo, formThongBao);
  /* ============================================================
     NÚT TRONG MÀN 🔎 RADAR (14/09)
     ============================================================ */
  if (d.radmo) return moPhieuTu(d.radmo, formRadar);
  if (d.radthu) { moPhieuTu(d.radthu, formRadar); return setTimeout(formThuHoi, 350); }
  if (d.radgiao) { dongSheet(); return formChonTho(d.radgiao); }
  if (d.radchia) { dongSheet(); return formChiaViec(); }
  if (d.radcs) { dongSheet(); L.coSo = d.radcs; L.the = ''; L.chip = 'tatca'; L.trang = 1; veHet();
    document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (d.radloc) {                       /* lọc đúng mấy phiếu radar vừa chỉ ra */
    dongSheet(); L.the = ''; L.chip = 'tatca'; L.coSo = ''; L.trang = 1;
    L.ma = String(d.radloc).split(',');
    veHet(); document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    nhac('Đang xem ' + L.ma.length + ' phiếu radar chỉ ra — bấm ✕ Bỏ lọc để xem lại tất cả', 'canh');
    return;
  }
  if (d.radgian) {                      /* xem mọi phiếu của một gian hàng */
    const v = String(d.radgian).split('|');
    dongSheet(); L.the = ''; L.chip = 'tatca'; L.coSo = v[0]; L.gian = v[1]; L.trang = 1;
    veHet(); document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  /* quét lại nhóm lỗi bằng AI (20/09) */
  if (d.aiquet) return aiQuetLai();
  if (d.aixem) return formAiVuaDoi();
  if (d.aihoantac) return aiHoanTac();
  if (d.aiok) { const el = document.getElementById('aiNhac'); if (el) el.remove(); AI_VUA_DOI = []; dongSheet(); return; }
  if (d.aibo) { AI_BO[d.aibo] = !AI_BO[d.aibo]; return veAiKetQua(phieuThat().length); }
  if (d.ailuu) return aiLuuKetQua();
  if (d.radbo || d.radbo7) {
    radBo(d.radbo || d.radbo7, d.radbo7 ? 7 : 30);
    formRadar(); nhac('Đã tạm ẩn — máy sẽ nhắc lại sau ' + (d.radbo7 ? '7' : '30') + ' ngày', 'canh');
    return;
  }

  /* chọn sáng/tối bỏ 03/10 — chỉ còn giao diện sáng */
  if (d.aidabat) return formAiDaBat();
  /* dọn máy treo dưới mã người đã đổi (20/10) */
  if (d.donmacu) {
    const xem = await fetch('/api/day-don-ma-cu').then(x => x.json()).catch(() => null);
    if (!xem || xem.loi || !xem.tongMay) return nhac((xem && xem.loi) || 'Không còn máy mã cũ nào', 'canh');
    if (!confirm('Gỡ ' + xem.tongMay + ' máy khỏi sổ thông báo?\n\n' +
      xem.moCoi.map(x => '· ' + (x.ten || x.ma) + ' — mã ' + x.ma + ' (' + x.soMay + ' máy)').join('\n') +
      '\n\nMấy máy này đang không nhận được tin nào. Gỡ xong người đó mở web bật lại là có mã mới.')) return;
    t.disabled = true; t.textContent = 'Đang dọn…';
    const r = await fetch('/api/day-don-ma-cu', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') },
      body: JSON.stringify({ xacNhan: 'XOA' })
    }).then(x => x.json()).catch(() => ({ loi: 'lỗi mạng' }));
    if (r.loi) { t.disabled = false; t.textContent = '🧹 Dọn máy mã cũ khỏi sổ'; return nhac(r.loi, 'do'); }
    nhac('Đã gỡ ' + r.daXoa + ' máy của ' + r.soMa + ' mã cũ', 'la');
    return formAiDaBat();
  }
  if (d.chonthang) return chonThang(d.chonthang);
  if (d.loicuoi) return xemLoiCuoi();
  if (d.xoahang) { localStorage.setItem(KHOA_HANG, '[]'); dongSheet(); nhac('Đã bỏ hàng đợi', 'canh'); return; }
  if (d.thuphieu) return doiThePhieu(false);
  if (d.mophieu) return doiThePhieu(true);

  /* ============================================================
     PHỄU LỌC TRÊN ĐẦU CỘT BẢNG (03/10) — PHẢI ĐỨNG NGOÀI KHỐI d.ld.
     Lần đầu tao nhét nhầm vào TRONG khối "lệnh trong ngăn chi tiết", mà khối
     đó mở đầu bằng `if (d.ld)` rồi `if (!PH) return` — nút phễu không có
     data-ld nên chẳng bao giờ tới nơi, bấm vào im như thóc. Đúng kiểu lỗi khó
     tìm: không báo gì, không nổ gì, chỉ là không chạy.
     ============================================================ */
  if (d.phe) { moPheu(d.phe, t); return; }
  if (d.phechon !== undefined) {
    L[d.phechon] = d.gt || '';
    L.ma = null; L.trang = 1;
    dongPheu(); veHet();
    return;
  }

  /* ③ nhận việc một chạm */
  if (d.nhanngay) { if (!PH) return; return nhanTheoNgay(); }

  /* lệnh trong ngăn chi tiết */
  if (d.ld) {
    if (!PH) return;
    if (d.ld === 'tiepnhan') return formTiepNhan();
    if (d.ld === 'baoxong') return formBaoXong();
    if (d.ld === 'dat') return formNghiemThu(true);
    if (d.ld === 'chuadat') { xoaTam(); return formNghiemThu(false); }
    if (d.ld === 'vuong') return formVuong();
    if (d.ld === 'doingay') return formDoiNgay();
    if (d.ld === 'duyetdoi') return formDuyetDoi();         /* admin quyết lời xin dời hạn (28/09) */
    if (d.ld === 'rutxin') {                                /* kỹ thuật rút lời xin của chính mình */
      if (!PH || !dangXinDoi(PH)) return;
      return (async () => {
        try { await rutXinDoi(PH); veNgan(); veHet(); nhac('Đã rút lời xin dời hạn', 'la'); }
        catch (e) { nhac('Chưa rút được — ' + (e.message || e), 'do'); }
      })();
    }
    if (d.ld === 'huy') return formHuy();
    if (d.ld === 'xoaphieu') return formXoaPhieu();
    if (d.ld === 'suaphieu') return formSuaPhieu();
    if (d.ld === 'giaocho') return formChonTho(PH.id);      /* admin giao / đổi người (04/09) */
    if (d.ld === 'thuhoigiao') return formThuHoi();         /* admin thu hồi việc giao nhầm (14/09) */
    if (d.ld === 'doinhom') return formDoiNhom();           /* sửa nhóm lỗi AI đoán sai (20/09) */
    if (d.ld === 'traviec') return formTraViec();           /* kỹ thuật trả việc lại team */
  }

  /* trang cá nhân + ảnh đại diện (04/09) */
  if (d.bcphieu) return moPhieuTu(d.bcphieu, formCaNhan);   /* lôi phiếu quá hạn ra xem ngay */
  /* ============================================================
     THẺ HỒ SƠ: thu gọn / mở rộng (16/10).
     Đặt TRƯỚC d.doianh vì hai nút nằm cạnh nhau trong cùng thẻ — nút mũi tên
     phải được bắt trước, không thì bấm mũi tên lại nhảy vào màn đổi ảnh.
     Đây đúng kiểu lỗi đã dính hai lần (data-ve trùng, data-dong trùng).
     ============================================================ */
  if (d.hoso) {
    const t = document.getElementById('hsThe');
    if (t) {
      t.classList.toggle('gon');
      try { localStorage.setItem('kt_hoso_gon_v1', t.classList.contains('gon') ? '1' : '0'); } catch (e) { }
    }
    return;
  }
  if (d.doianh) return formDoiAnh();
  if (d.caidat) return formCaiDat();   /* Cài đặt lồng trong ảnh đại diện (Trường chốt 07/09) */
  if (d.avchon) return chonAnhDaiDien(d.avchon);
  if (d.avluu) return luuAnhTam();                        /* ✓ Dùng ảnh này (07/09) */
  if (d.avthoi) { AV_TAM = null; return formCaNhan(); }   /* bỏ ảnh vừa chọn */
  if (d.avchu) { boAnhDaiDien().then(() => { veTop(); formCaNhan(); }).catch(e => nhac('Chưa gỡ được ảnh — ' + (e.message || 'thử lại'), 'do')); return; }
  if (d.vieccuatoi) {
    dongSheet(); L.chip = 'toi'; L.the = ''; L.trang = 1; veHet();
    document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (d.choduyet) {
    dongSheet(); L.the = 'chocht'; L.chip = 'tatca'; L.trang = 1; veHet();
    document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  /* hiệu suất + chia việc (04/09) */
  if (d.giaomoi) return formGiaoViec();
  if (d.hieusuat) return formHieuSuat();
  if (d.chiaviec) return formChiaViec();
  if (d.hskt) return formChiTietKT(d.hskt);
  /* LỊCH BẬN (11/09) — gỡ hết 20/10 (Trường: "bỏ lịch anh em đi").
     Tám đường xử lý: mở màn team, màn của tôi, đổi tuần, thêm, chọn lý do,
     lưu, xoá. Sau hai tháng chạy thật, bảng kt_lich có đúng 0 dòng. */


  /* ============================================================
     MÀN GIAO VIỆC — ADMIN BẤM CHỌN NGƯỜI (11/09)
     ============================================================ */
  if (d.chongiao) {                                         /* bấm tên = tích / bỏ tích */
    const ten = String(d.chongiao);
    const i = CHON_GIAO.indexOf(ten);
    if (i >= 0) CHON_GIAO.splice(i, 1); else CHON_GIAO.push(ten);
    const pid = (document.querySelector('[data-giaochon]') || {}).dataset?.giaochon;
    if (pid) veChonTho(pid);
    return;
  }
  if (d.chonhet) {                                          /* chọn cả team / bỏ hết */
    const tat = dsTho().map(x => x.ten);
    CHON_GIAO = CHON_GIAO.length === tat.length ? [] : tat;
    const pid = (document.querySelector('[data-giaochon]') || {}).dataset?.giaochon;
    if (pid) veChonTho(pid);
    return;
  }
  if (d.giaochon) {                                         /* bấm Giao cho N người */
    const pid = String(d.giaochon);
    const p2 = phieu(pid); if (!p2 || !CHON_GIAO.length) return;
    const ds = CHON_GIAO.slice();
    t.disabled = true; t.textContent = 'Đang giao…';
    try {
      if (ds.length === 1 && p2.nguoiNhanKt && p2.nguoiNhanKt !== ds[0] && p2.trangThai !== 'moi')
        await doiNguoiNhan(p2, ds[0]);
      else await giaoNhieuNguoi(p2, ds);
      dongSheet(); veHet(); if (PH && PH.id === pid) veNgan();
      nhac(ds.length === 1
        ? '📌 Đã giao ' + pid + ' cho ' + ds[0] + ' — máy nó sẽ rung'
        : '📌 Đã giao ' + pid + ' cho ' + ds.length + ' người — ai nhận trước thì cầm việc', 'la');
    } catch (e) { hongLuu(e, '', ''); }
    return;
  }
  if (d.giaonguoi) {                                        /* chọn tay từ trong phiếu */
    const vt = String(d.giaonguoi).indexOf('|');
    const pid = String(d.giaonguoi).slice(0, vt), tenT = String(d.giaonguoi).slice(vt + 1);
    const p2 = phieu(pid); if (!p2) return;
    try {
      if (p2.nguoiNhanKt && p2.nguoiNhanKt !== tenT && p2.trangThai !== 'moi') await doiNguoiNhan(p2, tenT);
      else if (p2.nguoiNhanKt && p2.nguoiNhanKt !== tenT) await doiNguoiNhan(p2, tenT);
      else await giaoDichDanh(p2, tenT);
      dongSheet(); veHet(); if (PH && PH.id === pid) veNgan();
      nhac('📌 Đã giao ' + pid + ' cho ' + tenT + ' — máy nó sẽ rung', 'la');
    } catch (e) { hongLuu(e, '', ''); }
    return;
  }
  if (d.giaogoiy) {                                         /* giao 1 việc theo gợi ý */
    const vt = String(d.giaogoiy).indexOf('|');
    const pid = String(d.giaogoiy).slice(0, vt), tenT = String(d.giaogoiy).slice(vt + 1);
    const p2 = phieu(pid); if (!p2) return;
    try {
      await giaoDichDanh(p2, tenT);
      nhoVuaGiao(pid, tenT);                /* để còn bấm ↩ ngay nếu trượt tay (14/09) */
      veHet(); nhac('📌 Đã giao ' + pid + ' cho ' + tenT, 'la'); formChiaViec();
    } catch (e) { hongLuu(e, '', ''); }
    return;
  }
  /* ============================================================
     THÊM NGƯỜI HỖ TRỢ (14/09 — Trường: "lỗi Huế vẫn bắt buộc hiện cho tao vì
     đôi khi tao cho người vào hỗ trợ"). Ghép người máy gợi ý VÀO CÙNG người
     đang giữ — không hất ai ra. Cả nhóm nhận thông báo, ai bấm nhận trước thì
     việc về tay người đó, những người kia thấy "X ĐANG SỬA".
     ============================================================ */
  if (d.themho) {
    const vt = String(d.themho).indexOf('|');
    const pid = String(d.themho).slice(0, vt), tenT = String(d.themho).slice(vt + 1);
    const p2 = phieu(pid); if (!p2 || !tenT) return;
    const giu = p2.nguoiNhanKt ? [p2.nguoiNhanKt] : ((p2.nguoiGiao || []).slice());
    if (giu.indexOf(tenT) >= 0) { nhac(tenT + ' đã có trong việc này rồi', 'canh'); return; }
    t.disabled = true; t.textContent = 'Đang thêm…';
    try {
      await giaoNhieuNguoi(p2, giu.concat([tenT]));
      nhoVuaGiao(pid, tenT);
      veHet(); if (PH && PH.id === pid) veNgan();
      nhac('👥 ' + tenT + ' vào hỗ trợ ' + giu.join(', ') + ' ở ' + pid, 'la');
      formChiaViec();
    } catch (e) { hongLuu(e, '', ''); }
    return;
  }
  if (d.doigiao) {
    const vt = String(d.doigiao).indexOf('|');
    /* tên sau dấu | là người ĐÃ tích sẵn khi mở màn chọn: người máy gợi ý
       (phiếu trống), hoặc những người đang giữ (phiếu đã có chủ) */
    return formChonTho(String(d.doigiao).slice(0, vt), String(d.doigiao).slice(vt + 1));
  }
  if (d.giaohet) {                                          /* giao cả loạt theo gợi ý */
    /* CHỈ giao loạt những phiếu CHƯA CÓ AI GIỮ (14/09). Phiếu đã có người
       phụ trách mà quét qua đây là hất người ta ra khỏi việc bằng một cú bấm —
       thêm hỗ trợ phải là quyết định riêng cho từng phiếu. */
    const ds2 = (GOI_Y || []).filter(g => !(g.giu || []).length);
    if (!ds2.length) return;
    t.disabled = true; t.textContent = 'Đang giao…';
    let ok = 0;
    for (const g of ds2) {
      const p2 = phieu(g.id);
      if (p2 && chuaAiNhan(p2)) { try { await giaoDichDanh(p2, g.ten); nhoVuaGiao(g.id, g.ten); ok++; } catch (e) { } }
    }
    veHet(); nhac('📌 Đã giao ' + ok + '/' + ds2.length + ' việc theo gợi ý', ok ? 'la' : 'do');
    formChiaViec();
    return;
  }
  if (t.id === 'th_ok') {                                   /* admin xác nhận thu hồi (14/09) */
    if (!PH) return;
    const ly = ((document.getElementById('th_ly') || {}).value || '').trim();
    t.disabled = true; t.textContent = 'Đang thu hồi…';
    try {
      const kq = await thuHoiGiao(PH, ly);
      dongSheet(); veNgan(); veHet();
      nhac('↩ Đã thu hồi — việc quay lại chưa ai nhận · ' +
        ((kq.ai || []).join(', ') || 'người nhận') + ' được báo', 'canh');
    } catch (e) { return hongLuu(e, 'th_ok', 'Thu hồi'); }
    return;
  }
  /* thu hồi NGAY TRONG MÀN CHIA VIỆC: vừa bấm Giao xong, nhìn lại thấy sai thì
     bấm ↩ ở đúng chỗ đó, không phải đi tìm lại phiếu (14/09) */
  /* chọn nhóm lỗi mới trong màn Đổi nhóm (20/09) */
  if (d.chonnhom) {
    if (!PH) return;
    const k = String(d.chonnhom);
    if (!NHOM_LOI[k]) return;
    if (k === PH.nhomLoi) { dongSheet(); return; }
    const cu = PH.nhomLoi;
    t.disabled = true;
    try {
      await ghi('phieu_loi', 'update', { loai_loi: k }, PH.id);
      PH.nhomLoi = k;
      veVet(PH.id, 'doi_nhom_tay', { tu: cu, sang: k });
      luuCache(); dongSheet(); veNgan(); veHet();
      nhac('🏷 Đã đổi nhóm lỗi: ' + (NHOM_LOI[cu] || 'Khác') + ' → ' + NHOM_LOI[k], 'la');
    } catch (e) { hongLuu(e, '', ''); }
    return;
  }
  if (d.thuhoigy) {
    const p2 = phieu(String(d.thuhoigy)); if (!p2) return;
    t.disabled = true; t.textContent = '…';
    try {
      const kq = await thuHoiGiao(p2, '');
      veHet();
      nhac('↩ Đã thu hồi ' + p2.id + ' — ' + ((kq.ai || []).join(', ') || 'người nhận') + ' được báo', 'canh');
      formChiaViec();
    } catch (e) { hongLuu(e, '', ''); }
    return;
  }
  if (d.traok) {                                            /* kỹ thuật xác nhận trả việc */
    const ly = ((document.getElementById('tv_ly') || {}).value || '').trim();
    if (!ly) { nhac('Phải ghi lý do trả lại — team còn biết kẹt gì', 'do'); return; }
    if (!PH) return;
    try {
      await traViec(PH, ly);
      dongSheet(); veNgan(); veHet();
      nhac('↩ Đã trả việc lại team — cả team được báo', 'canh');
    } catch (e) { hongLuu(e, 'traok', 'Trả việc'); }
    return;
  }

  /* form: lưu */
  if (t.id === 'g_gui') return luuGiaoViec();
  if (t.id === 's_luu') return luuSuaPhieu();
  if (t.id === 'n_ok') return luuTiepNhan();
  if (t.id === 'x_ok') return luuBaoXong();
  if (t.id === 'd_ok') return luuNghiemThu(true);
  if (t.id === 'd_khong') return luuNghiemThu(false);
  if (t.id === 'v_ok') {
    const el = document.querySelector('#sheet .mn.on');
    try {
      await doiVuong(PH, el ? el.dataset.vuong : '', (document.getElementById('v_ghi').value || '').trim());
      dongSheet(); veNgan(); veHet(); nhac('Đã cập nhật tình trạng', 'la');
    } catch (e) { hongLuu(e, 'v_ok', 'Lưu'); }
    return;
  }
  if (t.id === 'dn_ok') {
    const ng = document.getElementById('dn_ngay').value, ly = (document.getElementById('dn_ly').value || '').trim();
    if (!ng || !ly) { nhac('Điền ngày mới và lý do', 'do'); return; }
    /* admin đổi thẳng; kỹ thuật chỉ xin, chờ admin duyệt (28/09) */
    if (laQuanLy()) {
      try { await doiNgay(PH, ng, ly); dongSheet(); veNgan(); veHet(); nhac('Đã dời ngày dự kiến', 'canh'); }
      catch (e) { hongLuu(e, 'dn_ok', 'Dời ngày'); }
    } else {
      try { await xinDoiNgay(PH, ng, ly); dongSheet(); veNgan(); veHet(); xongViec('Đã gửi lời xin dời hạn', 'chờ quản lý duyệt — hạn cũ vẫn giữ nguyên'); }
      catch (e) { hongLuu(e, 'dn_ok', 'Gửi quản lý duyệt'); }
    }
    return;
  }
  /* ---- admin quyết lời xin dời hạn (28/09) ---- */
  if (t.id === 'dd_ok') {
    try { await duyetDoiNgay(PH); dongSheet(); veNgan(); veHet(); xongViec('Đã duyệt dời hạn', 'hạn mới có hiệu lực'); }
    catch (e) { hongLuu(e, 'dd_ok', '✓ Duyệt'); }
    return;
  }
  if (t.id === 'dd_khong') {
    const khung = document.getElementById('dd_khungly');
    /* bấm lần đầu: mở ô lý do ra đã, chưa từ chối vội — bắt buộc ghi (Trường chốt) */
    if (khung && khung.style.display === 'none') {
      khung.style.display = '';
      t.textContent = '✕ Xác nhận không duyệt';
      setTimeout(() => { const o = document.getElementById('dd_ly'); if (o) o.focus(); }, 200);
      return;
    }
    const ly = (document.getElementById('dd_ly') || {}).value || '';
    if (!ly.trim()) { nhac('Phải ghi vì sao không duyệt', 'do'); return; }
    try { await tuChoiDoiNgay(PH, ly.trim()); dongSheet(); veNgan(); veHet(); nhac('Đã từ chối — giữ nguyên hạn cũ', 'canh'); }
    catch (e) { hongLuu(e, 'dd_khong', '✕ Xác nhận không duyệt'); }
    return;
  }
  if (t.id === 'h_ok') {
    const ly = (document.getElementById('h_ly').value || '').trim();
    if (!ly) { nhac('Phải ghi lý do huỷ', 'do'); return; }
    /* ============================================================
       HUỶ PHIẾU QUA THANH HOÀN TÁC (21/10 — học từ web Camera Audit).
       Không gọi máy chủ ngay. Giấu phiếu khỏi danh sách, hiện thanh hoàn tác
       5 giây, hết giờ mới ghi thật. Bấm nhầm thì chưa có gì để sửa lại.
       Phiếu giấu bằng cờ trong máy chứ không đổi trangThai — đổi trangThai
       rồi lùi lại là các màn khác đọc nhầm trạng thái trong 5 giây đó.
       ============================================================ */
    const p = PH, ma = p.id;
    if (typeof hoanTac === 'function') {
      dongSheet(); dongNgan();
      p.__anTam = true;                       /* lọc danh sách bỏ qua phiếu này */
      veHet();
      hoanTac({
        chu: 'Đã huỷ phiếu ' + ma,
        phu: (p.noiDung || '') + (p.coSoId ? ' · ' + tenCoSo(p.coSoId) : ''),
        lam: async () => {
          delete p.__anTam;
          await huyPhieu(p, ly);
          veHet();
          nhac('Đã huỷ phiếu ' + ma, 'canh');
        },
        traLai: () => { delete p.__anTam; }
      });
      return;
    }
    try { await huyPhieu(PH, ly); dongSheet(); dongNgan(); veHet(); nhac('Đã huỷ phiếu', 'canh'); }
    catch (e) { hongLuu(e, 'h_ok', 'Huỷ phiếu'); }
    return;
  }
  /* ============================================================
     XOÁ HẲN PHIẾU (25/09). Máy chủ mới là chỗ chặn thật — nó tự kiểm vé có
     phải vai quản lý không, phiếu đã xong chưa, và chữ XOA có đúng không.
     Phần kiểm ở đây chỉ để báo sớm cho người dùng, không phải hàng rào.
     ============================================================ */
  if (t.id === 'xp_ok') {
    if (!PH) return;
    const xn = ((document.getElementById('xp_xn') || {}).value || '').trim().toUpperCase();
    if (xn !== 'XOA') { nhac('Gõ đúng chữ XOA để xác nhận', 'do'); return; }
    const p = PH, ma = p.id;
    t.disabled = true; t.textContent = 'Đang xoá…';
    try {
      const r = await fetch('/api/xoa-phieu', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: ma, xacNhan: 'XOA', nguoiTen: (D.nguoi || {}).ten || '' })
      }).then(x => x.json());
      if (r.loi) throw new Error(r.loi);
      /* gỡ khỏi bộ nhớ trong máy luôn, khỏi phải tải lại cả kho */
      D.phieu = (D.phieu || []).filter(x => x.id !== ma);
      delete D.dienBien[ma];
      if (D.soChat) delete D.soChat[ma];
      luuCache();
      dongSheet(); dongNgan(); veHet();
      nhac('Đã xoá hẳn phiếu ' + ma + (r.soFile ? ' và ' + r.soFile + ' file ảnh/video' : ''), 'canh');
    } catch (e) {
      t.disabled = false; t.textContent = 'Xoá hẳn';
      nhac(e.message || 'Xoá không được', 'do');
    }
    return;
  }

  /* form: chọn trong form */
  if (d.muc) {
    document.querySelectorAll('#g_muc button').forEach(b => { b.classList.remove('on'); b.style.cssText = ''; });
    t.classList.add('on'); t.style.color = MUC_DO[d.muc].chu; t.style.background = MUC_DO[d.muc].nen;
    return;
  }
  if (d.tho) { t.classList.toggle('on'); return; }
  /* chip lý do xong muộn (19/09) — chọn một, bấm lại là bỏ */
  if (d.lytre) {
    const dang = t.classList.contains('on');
    [].forEach.call(t.parentNode.children, x => x.classList.remove('on'));
    if (!dang) t.classList.add('on');
    return;
  }
  if (d.vuong !== undefined) { document.querySelectorAll('#sheet .mn').forEach(b => b.classList.remove('on')); t.classList.add('on'); return; }

  /* ảnh */
  if (d.themanh) {
    const co = document.getElementById('g_gui') ? 'giaoviec' : (document.getElementById('s_luu') ? 'suaphieu' : (document.getElementById('x_ok') ? 'baoxong' : (document.getElementById('d_khong') ? 'chuadat' : '')));
    if (co) luuForm(co);
    return formThemAnh('form');
  }
  if (d.anhchat) { xoaTam(); TAM.dich = 'chat'; return formThemAnh('chat'); }
  /* khay nút ＋ trong chat + menu ⋯ việc với phiếu (07/09) */
  if (d.khay) { xoaTam(); TAM.dich = 'chat'; return formKhay(); }
  if (d.menuphieu) return moMenuPhieu();
  if (d.boanh) { TAM.anh.splice(Number(d.boanh), 1); veLaiOAnh(); return; }
  /* ✎ Khoanh — sửa một tấm đã nằm trong khay form (10/09) */
  if (d.suatam !== undefined) return suaAnhTam(Number(d.suatam));
  /* DỪNG ảnh đang tải (#45): cắm cờ huy — file xong cũng không gắn đi đâu nữa */
  if (d.bocho !== undefined) {
    const c = (TAM.cho || [])[Number(d.bocho)];
    if (c) {
      c.huy = true;
      TAM.cho = TAM.cho.filter(x => x !== c);
      veLaiOAnh();
      nhac('Đã dừng gửi tấm đó', 'canh');
    }
    return;
  }
  if (d.dunghet) {
    (TAM.cho || []).forEach(c => { c.huy = true; });
    TAM.cho = [];
    veLaiOAnh();
    nhac('Đã dừng gửi tất cả', 'canh');
    return;
  }
  if (d.chon === 'chup') return chonFile('chup');
  if (d.chon === 'album') return chonFile('album');
  if (d.chon === 'video') return chonFile('video');
  /* 'quaymay' = giao cho app Camera của máy. Bản tự quay trong web đã bỏ 20/08 vì iPhone
     cứ nhấc <video> lên trình phát toàn màn hình của nó, che mất nút Bắt đầu quay. */
  if (d.chon === 'quaymay') return chonFile('quaymay');
  if (d.dccanh) { moXem((PH.anhTruoc || [])[0], 'truoc'); V.canh = true; veXem(); return; }
  if (d.dclat)  { moXem((PH.anhTruoc || [])[0], 'truoc'); V.lonLat = true; veXem(); return; }
  if (d.xem) return moXem(d.xem, d.bo);
  if (d.xdong) return dongXem();
  if (d.xi !== undefined) { V.i = Number(d.xi); V.goc = 0; V.ti = 1; V.lat = 1; V.x = 0; V.y = 0; veXem(); ganKeo(); return; }
  if (d.x) return lenhXem(d.x);

  /* hộp chờ (01/09) */
  if (d.hopgui) return guiBuHopCho();
  if (d.hopbo) {
    const ds = await hopDoc();
    for (const x of ds) await hopXoa(x.id);
    HOP_TRANG = null;                       /* dọn cả mặt "vừa hỏng" của hộp (07/09) */
    veHopCho(); nhac('Đã bỏ các file chờ', 'canh');
    return;
  }

  /* chat */
  if (d.guitin) return guiTin();
  if (d.goiy !== undefined) return chonGoiY(d.goiy);
  if (d.vitri) return guiViTri();
  if (d.daro) return guiDaRo();
  if (d.thoaic) { dongSheet(); return moGhiAm(); }
  /* chip trả lời nhanh (31/08): đổ câu vào ô rồi đi đường guiTin thường —
     nhờ vậy đang trả lời tin nào thì chip cũng thành tin trả lời */
  if (d.chipnhanh) {
    /* chip giờ nằm trong khay ＋ nên phải đóng khay lại rồi mới gửi (07/09) */
    if (!document.getElementById('sheet').classList.contains('an')) dongSheet();
    const o = document.getElementById('oTin'); if (o) o.value = d.chipnhanh;
    return guiTin();
  }
  /* ghim tin (31/08): 📌 trên tin — đang ghim thì bấm lần nữa là bỏ */
  if (d.ghimtin !== undefined) {
    const dang = PH && dsGhim(PH).some(g => String(g.id) === String(d.ghimtin));
    return ghimTin(d.ghimtin, dang);
  }
  if (d.boghim !== undefined) return ghimTin(d.boghim, true);
  if (d.gomghim) { if (PH) { GHIM_MO[PH.id] = !GHIM_MO[PH.id]; veNgan(); } return; }
  /* menu ⋯ trên tin (04/09) */
  if (d.menutin !== undefined) return moMenuTin(d.menutin, t);
  /* thu hồi tin (01/09) + nút ⌄ về đáy */
  if (d.thuhoi !== undefined) return thuHoiTin(d.thuhoi);
  if (d.vedaay) {
    const nn = document.getElementById('nganNoi');
    if (nn) { nn.scrollTop = nn.scrollHeight; if (PH) SO_TIN_DAY = soTinChat(PH.id); capNhatNutDay(); }
    return;
  }
  /* trả lời / trích tin (30/08) */
  if (d.traloi !== undefined) return batTraLoi(d.traloi);
  if (d.botraloi) { TRA_LOI = null; veThanhTraLoi(); return; }
  if (d.cuontin !== undefined) {
    const b = document.querySelector('.bb[data-tin="' + (window.CSS && CSS.escape ? CSS.escape(String(d.cuontin)) : String(d.cuontin)) + '"]');
    if (b) { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.classList.add('nhay'); setTimeout(() => b.classList.remove('nhay'), 1400); }
    else nhac('Không thấy tin gốc — có thể đã cũ', 'canh');
    return;
  }

  /* báo cáo họp + lý lịch gian hàng (01/09) */
  if (d.baocao) return formBaoCao(BC_KY);
  /* 📊 TỔNG KẾT THÁNG — bản chiếu lên màn hình họp (14/09) */
  if (d.tongket) return formTongKet();
  if (d.tkthang) return formTongKet(Number(d.tkthang));
  if (d.tkchieu) return tkChieu();      /* chiếu toàn màn hình (16/10) */
  if (d.tkin) return inTongKet();
  if (d.tkcopy) {
    const chu = chuTongKet();
    if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(chu); nhac('Đã copy tổng kết tháng — dán vào Zalo là xong', 'la'); return; }
      catch (e) { }
    }
    const ta = document.createElement('textarea');
    ta.value = chu; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); nhac('Đã copy tổng kết tháng', 'la'); } catch (e) { nhac('Máy không cho copy tự động', 'do'); }
    ta.remove();
    return;
  }
  if (d.bck) return formBaoCao(d.bck);
  if (d.bccopy) return copyBaoCao();
  if (d.lylich) return formLyLich(d.lylich);
  if (d.moll) return moPhieuTu(d.moll, null);

  /* PIN quản lý (01/09) */
  if (d.pinok) return pinOk(d.pinok);
  if (d.pinthoat) { dongSheet(); xoaNguoi(); raManVao(); return; }
  if (d.doipin) return formPin('doi');

  /* cài đặt */
  if (d.doinguoi) { dongSheet(); NGUOI_CU = D.nguoi; xoaNguoi(); raManVao(); return; }
  /* Trường bắt 08/09: vào màn "Bạn là ai?" rồi không có nút Back nào để lùi ra.
     Nút này chỉ hiện khi máy đang có người dùng dở — bấm là trả về đúng người đó. */
  if (d.vecu) {
    if (!NGUOI_CU) return raManVao();
    datNguoi(NGUOI_CU); NGUOI_CU = null; vaoApp(); return;
  }
  if (d.maychung) { datMayChung(!mayChung()); formCaiDat(); nhac(mayChung() ? 'Đã bật máy dùng chung' : 'Đã tắt máy dùng chung', 'la'); return; }
  /* d.xemkho gỡ 20/10: mục "Kho ảnh & video" đã gộp vào "Dọn dữ liệu", dung
     lượng giờ tự hiện lúc mở Trang cá nhân (xem cuối formTrangCaNhan). */
  /* dòng báo bản mới ở đáy màn (21/10) */
  if (d.capnhat) {
    const h = document.getElementById('bangMoi');
    if (h) { h.querySelector('.bmNut').textContent = 'Đang cập nhật…'; h.querySelector('.bmNut').disabled = true; }
    capNhatNgay(); return;
  }
  if (d.bomoi) { const h = document.getElementById('bangMoi'); if (h) h.remove(); return; }
  if (d.taillai) { dongSheet(); nhac('Đang tải lại…', 'canh'); await taiHet(); veHet(); nhac('Đã tải lại ' + D.phieu.length + ' việc', 'la'); return; }

  /* màn quản lý */
  if (d.quanly) { dongSheet(); return formQuanLy(); }
  if (d.qltab) { QL_TAB = d.qltab; veLaiQL(); document.querySelectorAll('.qlTab button').forEach(b => b.classList.toggle('on', b.dataset.qltab === QL_TAB)); return; }
  if (d.qlthem) return formQLThem(d.qlthem, d.id);
  /* ============================================================
     MÀN CƠ SỞ HAI CỘT (16/10): bấm cơ sở KHÔNG mở màn mới nữa, chỉ đổi nội
     dung cột phải. Trên điện thoại thì lớp .daChon lật sang bước 2.
     ============================================================ */
  if (d.qlcs) {
    QL_CS = d.qlcs; QL_CS_TAB = 'tin';
    veLaiQL();
    /* điện thoại: cuộn lên đầu cho thấy ngay phần chi tiết vừa lật sang */
    if (!matchMedia('(min-width:901px)').matches) {
      const n = document.querySelector('#sheet .sheetNoi'); if (n) n.scrollTop = 0;
    }
    return;
  }
  if (d.qlcstab) { QL_CS_TAB = d.qlcstab; veLaiQL(); return; }
  /* nút ‹ chỉ hiện trên điện thoại — bỏ chọn để quay về danh sách */
  if (d.qlveds) { QL_CS = ''; veLaiQL(); return; }
  if (d.qlve) return qlVeMan(d.qlve);                 /* ‹ Quay lại — lùi từng lớp, không sập về đầu */
  if (d.qlsua) return formQLSua(d.qlsua, d.id);
  /* xuất danh sách cơ sở · gian hàng · CHT (02/10) */
  if (d.qlxuat) return formQLXuat();
  if (d.qlchep) return qlChepDs();
  if (d.qltaixls) return qlTaiDsXls();
  if (d.qlan) return qlAnNguoi(d.qlan);
  if (d.qlxoa) return formQLXoa(d.qlxoa, d.id);      /* màn hỏi lại trước khi xoá (08/09) */
  if (d.qlhien) return qlHienNguoi(d.qlhien);
  if (t.id === 'q_xoaOk') return qlXoa(d.loai, d.id);
  if (d.qvai) {
    document.querySelectorAll('#q_vai button').forEach(b => { b.classList.remove('on'); b.style.cssText = ''; });
    t.classList.add('on'); t.style.color = '#0E7490'; t.style.background = '#ECFEFF';
    const box = document.getElementById('q_csBox'); if (box) box.style.display = d.qvai === 'coso' ? 'block' : 'none';
    return;
  }
  if (t.id === 'q_luuCS') return qlThemCoSo();
  if (t.id === 'q_luuGH') return qlThemGianHang();
  if (t.id === 'q_luuNG') return qlThemNguoi();
  if (t.id === 'q_luuSua') return qlLuuSua(d.loai, d.id, d.ve);

  if (d.doduong) return manDoDuong();        /* 🚦 kiểm tra đường truyền (09/09) */
  if (d.docopy) return chepDoDuong();
  if (d.sapmo) return formSapXep();          /* ⇅ đổi kiểu sắp xếp (09/09) */
  if (d.sap) { dongSheet(); return datSap(d.sap); }
  if (d.locthem) {
    /* ============================================================
       BẤM Ô ⚙ LỌC LÀ PHẢI MỞ BẢNG (20/09 — Trường: "ấn vào không ra cái gì").
       Bản cũ trên máy tính chỉ bật/tắt class 'mo' của dãy ô chọn — mà class
       đó CHỈ có tác dụng trong khối CSS của điện thoại (max-width 900px).
       Trên máy tính dãy ô vốn đã hiện sẵn nên bấm vào không thấy gì thay đổi,
       trông như nút chết. Giờ cả hai cỡ màn đều mở bảng lọc gộp.
       Riêng nút "Lọc thêm" nhỏ cạnh dãy ô (data-locbung) vẫn bung/gập tại chỗ.
       ============================================================ */
    return formLoc();
  }
  if (d.locbung) {
    const el = document.getElementById('loc2');
    if (!el || !matchMedia('(min-width:901px)').matches) return formLoc();
    el.classList.toggle('mo'); return;
  }
  if (d.dongsheet) {
    /* đóng menu thêm ảnh thì quay lại form đang gõ, chứ không mất phiếu */
    if (document.querySelector('#sheet [data-chon]') && moLaiForm()) return;
    /* ✕ và nút Đóng = THOÁT HẲN cả cụm (luật 08/09) — muốn lùi từng bước thì
       dùng ‹ hoặc vuốt cạnh. Dọn luôn chỗ cuộn đã nhớ của cụm Quản lý. */
    if (typeof QL_CUON !== 'undefined') Object.keys(QL_CUON).forEach(k => delete QL_CUON[k]);
    FORM = null; xoaTam(); return dongSheet();   /* Huỷ thật thì mới bỏ ảnh đang chờ */
  }

  /* thanh dưới */
  if (d.tab === undefined && t.classList.contains('tabI')) return;
});

/* nền mờ = đóng */
document.getElementById('nenMo').onclick = dongNgan;
document.getElementById('nenSheet').onclick = dongSheet;

/* thanh dưới điện thoại */
/* Bắt trên cả trang để THANH DƯỚI (điện thoại) và THANH NGANG (máy tính) dùng
   chung một bộ xử lý — thêm thanh mới không phải viết lại logic (07/09) */
document.addEventListener('click', e => {
  /* .ctN = nút trong CỘT TRÁI (03/10). Thiếu nó thì nút Radar ở cột trái bấm
     không ăn — nút đổi chỗ mà bộ bắt sự kiện vẫn chỉ nhìn hai lớp cũ. */
  const b = e.target.closest('.tabI,.nutMan,.ctN'); if (!b || !b.dataset.tab) return;
  if (!b.classList.contains('nutMan') && !b.classList.contains('ctN') && !b.closest('#tabDay')) return;
  document.querySelectorAll('.tabI').forEach(x => x.classList.remove('on'));
  /* thanh dưới điện thoại sáng đúng mục; nút máy tính không cần tô sáng */
  document.querySelectorAll('#tabDay .tabI[data-tab="' + b.dataset.tab + '"]')
    .forEach(x => x.classList.add('on'));
  const k = b.dataset.tab;
  /* tab 📊 của quản lý là MÀN RIÊNG (04/09) — không phải cuộn xuống nữa */
  if (typeof TAB_CHINH !== 'undefined') TAB_CHINH = (k === 'tk' && laQuanLy()) ? 'tk' : 'ds';
  /* khối trượt nhẹ lên mỗi lần đổi màn (12/10). Hoãn một nhịp cho veHet()
     dựng xong nội dung mới rồi mới chạy, không thì hiệu ứng ăn vào màn cũ. */
  if (typeof hieuUngVaoMan === 'function') setTimeout(hieuUngVaoMan, 30);
  if (k === 'ds') { L.the = ''; L.chip = 'tatca'; L.ma = null; L.gian = ''; veHet(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (k === 'tk') {
    if (laQuanLy()) {
      veHet(); window.scrollTo({ top: 0, behavior: 'smooth' });
      /* cắm nấc để nút Back của máy đưa về Danh sách thay vì thoát app (04/09) */
      try { history.pushState({ ktLop: 1 }, ''); } catch (e) { }
    }
    else document.getElementById('bdHang').scrollIntoView({ behavior: 'smooth' });
  }
  if (k === 'thang') formChonThang();
  if (k === 'toi') { L.chip = laTho() ? 'toi' : 'tatca'; L.the = laTho() ? '' : 'chocht'; veHet(); document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth' }); }
  /* tab theo vai (Trường chốt 30/08) */
  if (k === 'nghiemthu') { L.the = 'chocht'; L.chip = 'tatca'; veHet(); document.getElementById('dsHang').scrollIntoView({ behavior: 'smooth' }); }
  /* 08/09: Trao đổi thành HỘP THƯ (trước là bộ lọc nên trùng Danh sách) */
  if (k === 'traodoi') formTraoDoi();
  if (k === 'chuy') { if (laQuanLy() && typeof formRadar === 'function') formRadar(); else formThongBao(); }
  if (k === 'csToi') formCoSoToi();          /* 📊 Cơ sở tôi — của vai cơ sở */
  if (k === 'thangToi') formChiTietKT((D.nguoi || {}).ten);   /* 👷 Tháng này — của kỹ thuật */
  if (k === 'chiaviec') formChiaViec();      /* 🧠 Chia việc — của quản lý */
  if (k === 'cd') formCaiDat();
});

/* Ô 📅 chọn tháng cũ ở thanh dưới đã nhường chỗ cho tab theo vai — giờ bấm dòng
   "Tháng 8 · 15 việc" trên header là ra màn chọn tháng (chỉ điện thoại; máy tính
   có sẵn dãy nút tháng). */
document.getElementById('topPhu').addEventListener('click', () => {
  if (window.innerWidth <= 900 && typeof formChonThang === 'function') formChonThang();
});

/* gõ trong ô nhắn: gợi ý @tên + đổi 🎤 thành ➤ (07/09) */
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'oTin') {
    if (typeof goiYTen === 'function') goiYTen();
    if (typeof doiMicGui === 'function') doiMicGui();
    /* đang gõ chữ → báo cho người kia thấy 3 chấm nhảy (31/08) */
    if (e.target.value.trim() && typeof goTinServer === 'function') goTinServer();
  }
});

/* ============================================================
   DÁN Ctrl+V + KÉO-THẢ ẢNH/VIDEO (Trường chốt 01/09) — CHT ngồi máy tính
   chụp màn hình camera là dán thẳng vào khung chat / form đang khai,
   khỏi lưu file rồi bấm ＋ chọn lại. Ảnh vẫn qua màn duyệt như chọn album.
   ============================================================ */
function fileTuNgoai(dt) {
  if (!dt) return [];
  let ds = [...(dt.files || [])];
  if (!ds.length && dt.items) ds = [...dt.items].map(i => i.kind === 'file' ? i.getAsFile() : null);
  return ds.filter(f => f && /^(image|video)\//.test(f.type || ''));
}
function nhanFileNgoai(fs) {
  if (!fs.length) return false;
  /* đích: form đang mở có ô ảnh → đính form; không thì phiếu đang mở → trao đổi */
  const formMo = !document.getElementById('sheet').classList.contains('an') &&
    (document.getElementById('g_anh') || document.getElementById('x_anh') || document.getElementById('d_anh') || document.getElementById('s_anh'));
  const chatMo = PH && !document.getElementById('ngan').classList.contains('an');
  if (!formMo && !chatMo) return false;
  const dich = formMo ? 'form' : 'chat';
  const pid = PH ? PH.id : null;
  const ten = (D.nguoi || {}).ten || '';
  const anh = fs.filter(f => /^image\//.test(f.type));
  const vid = fs.filter(f => /^video\//.test(f.type));
  if (formMo && typeof moLaiForm === 'function') { /* giữ chữ đang gõ trong form */ }
  if (vid.length) guiCacFile(vid, true, dich, pid, ten);
  if (anh.length) duyetTruocGui(anh).then(kq => { if (kq) guiCacFile(kq, false, dich, pid, ten); });
  return true;
}
document.addEventListener('paste', e => {
  if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '') && !fileTuNgoai(e.clipboardData).length) return;
  const fs = fileTuNgoai(e.clipboardData);
  if (fs.length && nhanFileNgoai(fs)) e.preventDefault();
});
document.addEventListener('dragover', e => {
  if ([...((e.dataTransfer || {}).types || [])].includes('Files')) e.preventDefault();
});
document.addEventListener('drop', e => {
  const fs = fileTuNgoai(e.dataTransfer);
  if (fs.length) { e.preventDefault(); nhanFileNgoai(fs); }
});

/* lọc bằng select */
document.addEventListener('change', e => {
  /* chọn kỹ thuật phụ trách cho một cơ sở (11/09) */
  const pt = e.target.closest('select[data-ptcs]');
  if (pt) return datKtPhuTrach(pt.dataset.ptcs, pt.value);
  const s = e.target.closest('select[data-loc]');
  if (s) { L[s.dataset.loc] = s.value; L.trang = 1; veHet(); return; }
});

/* tìm kiếm */
let timTimer = 0;
document.getElementById('oTim').addEventListener('input', e => {
  clearTimeout(timTimer);
  timTimer = setTimeout(() => { L.tim = e.target.value.trim(); L.trang = 1; veDanhSach(); veLoc(); }, 250);
});

/* Enter gửi tin, Esc đóng */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (document.getElementById('suaAnh')) return dongSuaAnh(); if (document.getElementById('xemAnh')) return dongXem(); if (!document.getElementById('sheet').classList.contains('an')) return dongSheet(); MAN_TRUOC = null; return dongNgan(); }
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'oTin') {
    e.preventDefault();
    /* hộp gợi ý @tên đang mở thì Enter = chọn tên đầu tiên, chưa gửi vội */
    const g = document.querySelector('#goiY [data-goiy]');
    if (g) return chonGoiY(g.dataset.goiy);
    guiTin();
  }
  /* phím tắt khi đang sửa ảnh — như bản dựng KT-11 */
  if (document.getElementById('suaAnh') && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) {
    const m = { v: 'chon', p: 'but', a: 'mui', r: 'khung', o: 'tron', t: 'chu', m: 'mo' }[e.key.toLowerCase()];
    if (m) { lenhSua('cong', m); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); lenhSua(e.shiftKey ? 'lamlai' : 'hoantac'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); luuAnhSua(); }
  }
});
