/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Trình xem ảnh + Sửa ảnh, ghi chữ
   Làm theo đúng bản dựng KT-10 (xem) và KT-11 (sửa).
   Nạp SAU kt-form.js nên ghi đè moXem/veXem của file đó.
   ============================================================ */
'use strict';

/* ================= TRÌNH XEM ================= */
const V = { ds: [], i: 0, goc: 0, ti: 1, lat: 1, x: 0, y: 0, keo: null, canh: false, bo: 'truoc', lonLat: false, cap: 0 };

/* ============================================================
   MỞ ẢNH TO — PHẢI VUỐT ĐƯỢC SANG TẤM KHÁC (Trường bắt 07/09: "gửi một mớ ảnh
   rồi bấm vào chỉ xem được 1 tấm, muốn xem tấm khác lại phải đóng ra").
   Lỗi cũ: ảnh gửi trong TRAO ĐỔI không nằm trong ảnh trước/sau của phiếu, nên
   code nhốt nó lại thành danh sách MỘT tấm.
   Giờ gom HẾT ảnh của phiếu — trước · sau · gửi trong trao đổi — thành một dải
   theo đúng thứ tự, vuốt ngang là chạy hết, không phải đóng ra mở lại.
   ============================================================ */
function moXem(url, bo) {
  const p = PH || {};
  const truoc = (p.anhTruoc || []).filter(u => u && !laTiengNoi(u));
  const sau = (p.anhSau || []).filter(u => u && !laTiengNoi(u));
  const daCo = {};
  V.ds = [];
  const them = (u, nhan) => {
    if (!u || laTiengNoi(u) || daCo[u]) return;
    daCo[u] = 1; V.ds.push({ u: u, bo: nhan });
  };
  truoc.forEach(u => them(u, 'truoc'));
  sau.forEach(u => them(u, 'sau'));
  /* ảnh/video gửi trong lúc trao đổi, theo thứ tự thời gian */
  ((typeof D !== 'undefined' && p.id && D.dienBien[p.id]) || [])
    .slice().sort((a, b) => a.t - b.t)
    .forEach(e => (e.anh || []).forEach(u => them(u, 'chat')));
  if (!V.ds.length) V.ds = [{ u: url, bo: bo || 'truoc' }];
  let vt = V.ds.findIndex(x => x.u === url);
  if (vt < 0) { them(url, bo || 'chat'); vt = V.ds.length - 1; }
  V.i = vt;
  V.goc = 0; V.ti = 1; V.lat = 1; V.x = 0; V.y = 0; V.canh = false; V.lonLat = false;
  let d = document.getElementById('xemAnh');
  if (!d) { d = document.createElement('div'); d.id = 'xemAnh'; d.className = 'xemAnh'; document.body.appendChild(d); }
  veXem();
  ganKeo();
}
function dongXem() {
  catNapAnh();                        /* đóng là cắt ngay ảnh đang tải — khỏi chiếm mạng của phiếu */
  try { if (MOI_IMG) { MOI_IMG.onload = null; MOI_IMG.src = ''; MOI_IMG = null; } } catch (e) { }
  const d = document.getElementById('xemAnh'); if (d) d.remove();
}

function veXem() {
  const d = document.getElementById('xemAnh'); if (!d) return;
  const it = V.ds[V.i] || {}; const u = it.u;
  /* nhãn đúng loại ảnh + số đếm "3/12" để biết đang ở tấm nào trong dải (07/09) */
  const dem = V.ds.length > 1 ? '<span class="xDem">' + (V.i + 1) + '/' + V.ds.length + '</span>' : '';
  /* video thì nhãn phải ghi VIDEO, đừng gọi là ảnh (08/09) */
  const laVid0 = laVideo(u);
  const nhan = (it.bo === 'sau' ? '<span class="xNhan la">' + (laVid0 ? 'VIDEO ' : '') + 'SAU KHI SỬA</span>'
    : it.bo === 'chat' ? '<span class="xNhan cm">' + (laVid0 ? 'VIDEO' : 'ẢNH') + ' TRAO ĐỔI</span>'
      : '<span class="xNhan">' + (laVid0 ? 'VIDEO ' : '') + 'TRƯỚC KHI SỬA</span>') + dem;
  const coCa = (PH && (PH.anhTruoc || []).length && (PH.anhSau || []).length);

  /* LẬT QUA LẬT LẠI: hai ảnh đè đúng lên nhau, đổi qua đổi lại tại chỗ.
     Mắt bắt được khe hở, vết nứt nhạy hơn nhiều so với xem cạnh nhau.
     ĐI THEO CẶP (Trường bắt 30/08: trước đây đóng đinh vào ảnh [0], vuốt kiểu
     gì cũng đứng im tấm đầu): cặp k = trước thứ k ↔ sau thứ k; bên nào ít ảnh
     hơn thì đứng lại ở tấm cuối của bên đó. Vuốt ngang / bấm ‹ › đổi cặp. */
  if ((V.lonLat || V.canh) && coCa) {
    const soCap = Math.max(PH.anhTruoc.length, PH.anhSau.length);
    V.cap = Math.min(Math.max(0, V.cap | 0), soCap - 1);
    const aT = PH.anhTruoc[Math.min(V.cap, PH.anhTruoc.length - 1)];
    const aS = PH.anhSau[Math.min(V.cap, PH.anhSau.length - 1)];
    const mui = soCap > 1 ? '<button class="xMui t" data-xbuoc="-1">‹</button><button class="xMui p" data-xbuoc="1">›</button>' : '';
    const goi = soCap > 1 ? '<div class="xGoi">Cặp ' + (V.cap + 1) + ' / ' + soCap + ' · vuốt ngang hoặc bấm ‹ › sang cặp khác</div>' : '';
    if (V.lonLat) {
      d.innerHTML = xTren(nhan, true) +
        '<div class="xemSanh xemLat" id="xSanh">' +
        '<img class="lat t" src="' + esc(aT) + '">' +
        '<img class="lat s an" src="' + esc(aS) + '">' +
        '<div class="latNhan" id="latNhan">TRƯỚC KHI SỬA' + (soCap > 1 ? ' · cặp ' + (V.cap + 1) + '/' + soCap : '') + '</div>' +
        '<button class="latNut" data-latdoi="1">⇄ Bấm để lật · giữ để xem ảnh SAU</button>' +
        mui + '</div>' + xBang();
      ganLat(); cuonDaiXem();
    } else {
      d.innerHTML = xTren(nhan, true) +
        '<div class="xemSanh xemCanh" id="xSanh">' +
        '<div><div class="xLb">TRƯỚC KHI SỬA</div><img src="' + esc(aT) + '"></div>' +
        '<div><div class="xLb la">SAU KHI SỬA</div><img src="' + esc(aS) + '"></div>' +
        mui + goi + '</div>' + xBang();
      ganKeo(); cuonDaiXem();           /* vuốt ngang đổi cặp — trước đây quên gắn */
    }
    return;
  }
  const vid = laVideo(u);
  d.innerHTML = xTren(nhan, coCa, vid) +
    '<div class="xemSanh" id="xSanh">' +
    (vid
      /* 20/10: bỏ max-width 94% / max-height 90% — trên điện thoại cái viền
         6-10% đó cộng với thanh trên và dải ảnh dưới làm video chỉ còn chiếm
         nửa màn. Để CSS lo, nó biết màn nào rộng bao nhiêu. */
      ? '<video id="xImg" class="xVid" src="' + esc(u) + '" controls autoplay playsinline></video>'
      /* Mở bằng BẢN NHỎ trước để thấy ngay, rồi thay bằng bản to khi tải xong.
         Trước đây gắn thẳng ảnh gốc 3–5MB: qua 4G nó vẽ dần từng dải, người xem
         thấy một vệt ảnh trên nền đen và tưởng web treo. */
      : '<img id="xImg" class="dangTai" decoding="async" src="' + esc(anhNho(u)) + '"' +
      ' style="transform:translate(' + V.x + 'px,' + V.y + 'px) rotate(' + V.goc + 'deg) scale(' + (V.ti * V.lat) + ',' + V.ti + ')">') +
    (vid ? '' : '<div class="xTai" id="xTai"><span class="vong"></span>Đang tải ảnh gốc…</div>') +
    (V.ds.length > 1 ? '<button class="xMui t" data-xbuoc="-1">‹</button><button class="xMui p" data-xbuoc="1">›</button>' : '') +
    '<div class="xGoi">' + (vid
      ? 'Bấm ▶ để phát · vuốt ngang sang tấm khác · bấm nút mở rộng của trình phát để xem toàn màn hình'
      : 'Bấm đúp vào chỗ cần soi → phóng 175% ngay chỗ đó · vuốt ngang sang ảnh khác') + '</div>' +
    '</div>' + xBang();
  cuonDaiXem();
  if (!vid) napAnhTo(u);
}

/* Tải bản gốc ở nền rồi mới đổi src — không bao giờ để người xem thấy ảnh vẽ dở.
   Tải xong thì mồi trước ảnh kế tiếp để vuốt sang là có ngay. */
let NAP_LAN = 0, NAP_THU = 0, NAP_URL = '';
/* ============================================================
   TẢI ẢNH GỐC — HUỶ CÁI CŨ TRƯỚC KHI TẢI CÁI MỚI (Trường bắt 08/09: "ấn vào
   ảnh rồi thoát ra thì phiếu lag, các tab cũng lag").
   Lỗ cũ: vuốt sang ảnh khác thì chỉ BỎ KẾT QUẢ của lượt cũ, còn request vẫn
   chạy tiếp; lại còn tải trước ẢNH GỐC của cả hai bên. Vuốt qua 24 ảnh là kéo
   ~70 lượt ảnh gốc cùng lúc — 4G tắc, máy hết bộ nhớ, cả app lag theo.
   Giờ: mỗi lúc chỉ MỘT ảnh gốc đang tải, chuyển ảnh là cắt ngay ảnh cũ; ảnh
   bên chỉ mồi BẢN NHỎ (~40KB) để hiện tức thì, bản gốc để lúc xem tới mới tải.
   ============================================================ */
let NAP_IMG = null;
function catNapAnh() {
  if (NAP_HEN) { clearInterval(NAP_HEN); NAP_HEN = 0; }
  NAP_CHO = null;
  if (typeof danhDauXem === 'function') danhDauXem(false);
  if (!NAP_IMG) return;
  try { NAP_IMG.onload = NAP_IMG.onerror = null; NAP_IMG.src = ''; } catch (e) { }
  NAP_IMG = null;
}
let NAP_CHO = null, NAP_HEN = 0, NAP_DA_CHO = false;   /* ảnh gốc đang đợi lúc rảnh đường */
function napAnhTo(u) {
  const lan = ++NAP_LAN;
  if (u !== NAP_URL) { NAP_URL = u; NAP_THU = 0; }     /* đổi tấm thì đếm lại từ 0 */
  catNapAnh();                                    /* cắt lượt tải trước, khỏi chồng nhau */
  /* ============================================================
     ẢNH CHÍNH MÁY NÀY VỪA GỬI → LẤY NGAY BẢN TRONG MÁY (10/09).
     Nét tức thì, không tải một byte nào, và không giành đường với mấy tấm
     còn lại đang gửi. Trường: "bấm vào tấm ảnh thì phải nét để tao còn xem".
     ============================================================ */
  if (typeof anhTamCua === 'function') {
    const blobUrl = anhTamCua(u);
    if (blobUrl) {
      const im0 = document.getElementById('xImg');
      const t0 = document.getElementById('xTai');
      if (t0) t0.remove();
      if (im0) { im0.src = blobUrl; im0.classList.remove('dangTai'); }
      NAP_DA_CHO = false;
      moiAnhBen();
      return;
    }
  }
  /* nói cho bộ gửi biết: đang có người ngồi chờ ảnh này → hạ xuống 1 luồng gửi.
     Phải cắm cờ SAU catNapAnh() — chính catNapAnh mới là chỗ hạ cờ xuống. */
  if (typeof danhDauXem === 'function') danhDauXem(true);
  /* BỎ HOÃN VÔ THỜI HẠN (vá 09/09 — Trường: "sao nó mờ mãi vậy").
     Lỗ tao tự tạo: bản nét giờ LUÔN đi nền, nên DANG_GUI gần như lúc nào cũng
     > 0 khi đang gửi một loạt 40 ảnh → điều kiện hoãn không bao giờ hết →
     ảnh gốc KHÔNG BAO GIỜ được tải → mờ mãi. Giờ chỉ nhường đường TỐI ĐA 3
     GIÂY rồi cứ tải: người ta đang mở ảnh ra soi thì ảnh đó là việc gấp nhất. */
  if (typeof DANG_GUI !== 'undefined' && DANG_GUI > 0 && !NAP_DA_CHO) {
    const t0 = document.getElementById('xTai');
    if (t0) t0.textContent = 'Đang gửi ảnh lên — hiện bản nhỏ trước, bản nét vào ngay…';
    NAP_CHO = u; NAP_DA_CHO = true;
    let dem = 0;
    if (!NAP_HEN) NAP_HEN = setInterval(() => {
      const ranh = !(typeof DANG_GUI !== 'undefined' && DANG_GUI > 0);
      if (!ranh && ++dem < 4) return;                 /* chờ nhiều nhất ~3 giây */
      clearInterval(NAP_HEN); NAP_HEN = 0;
      const v = NAP_CHO; NAP_CHO = null;
      if (v && document.getElementById('xImg')) napAnhTo(v);
    }, 800);
    return;
  }
  NAP_DA_CHO = false;
  const xong = (loi) => {
    if (lan !== NAP_LAN) return;                 // đã vuốt sang ảnh khác, bỏ kết quả cũ
    const im = document.getElementById('xImg');
    const t = document.getElementById('xTai');
    if (t) t.remove();
    if (typeof danhDauXem === 'function' && !loi) danhDauXem(false);   /* xong rồi, trả đường lại */
    if (im && !loi) { im.src = u; im.classList.remove('dangTai'); }
    else if (im) {
      im.classList.remove('dangTai');
      /* CHƯA CÓ BẢN NÉT TRÊN KHO: nó còn nằm trong hộp chờ. Chen nó lên gửi
         NGAY (người ta đang mở đúng tấm này ra soi) rồi tự thử lại — thay vì
         chỉ nhắc một câu rồi để mờ mãi (Trường bắt 09/09). */
      /* ĐỔI 10/09: chỉ thử MỘT lượt, và chỉ khi file còn nằm trong hộp chờ của
         MÁY NÀY. Trước đây quay 4 lượt kèm dòng "Đang lấy bản nét cho tấm này"
         cho MỌI ảnh — kể cả ảnh do máy khác gửi mà máy mình không thể chen hàng
         được — nên nó quay mãi không dứt (Trường gửi video 10/09). Từ bản này
         ảnh chỉ vào phiếu khi đã nằm trên kho, nên cảnh này gần như không còn;
         còn sót là mấy tấm gửi bằng bản cũ. */
      if (NAP_THU < 1 && typeof uuTienNet === 'function') {
        NAP_THU++;
        uuTienNet(u).then(co => {
          if (lan !== NAP_LAN) return;
          if (co) { setTimeout(() => { if (lan === NAP_LAN && document.getElementById('xImg')) napAnhTo(u); }, 400); return; }
          nhac('Tấm này gửi bằng bản web cũ nên chưa có ảnh nét — người đã chụp mở web lên là nó tự lên.', 'canh');
        }).catch(() => { });
        return;
      }
    }
    NAP_IMG = null;
    moiAnhBen();
  };
  if (anhNho(u) === u) { xong(false); return; }   // ảnh cũ không có bản nhỏ
  const t = new Image();
  NAP_IMG = t;
  t.onload = () => xong(false);
  t.onerror = () => xong(true);
  t.src = u;
  /* mạng yếu quá thì đừng bắt người ta chờ mãi — 12 giây là bỏ, xem bản nhỏ */
  setTimeout(() => { if (lan === NAP_LAN && document.getElementById('xTai')) { catNapAnh(); xong(true); } }, 12000);
}
/* mồi BẢN NHỎ của tấm kế tiếp (một chiều, một tấm) — đủ để vuốt sang là thấy
   ngay, mà chỉ tốn vài chục KB. Mạng yếu thì không mồi gì cả. */
let MOI_IMG = null;
function moiAnhBen() {
  if (typeof mangYeu === 'function' && mangYeu()) return;
  const it = V.ds[(V.i + 1) % V.ds.length];
  if (!it || laVideo(it.u)) return;
  try { if (MOI_IMG) { MOI_IMG.onload = null; MOI_IMG.src = ''; } } catch (e) { }
  MOI_IMG = new Image();
  MOI_IMG.src = anhNho(it.u);
}
/* ---------- tải về KHÔNG bị kẹt (Trường báo 21/08) ----------
   Link download kiểu cũ trên iPhone mở ra màn xem trước KHÔNG CÓ NÚT THOÁT,
   tên file lại là chuỗi số vô nghĩa. Đổi sang bảng chia sẻ của chính iOS:
   bấm Tải về → hiện bảng → chọn "Lưu ảnh" là vào thẳng Thư viện ảnh, tự đóng.
   Máy tính không có bảng chia sẻ thì tải thẳng xuống như cũ. */
function tenTai(u, i) {
  const duoi = ((u || '').split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  return ((PH || {}).id || 'IKID') + '-' + (laVideo(u) ? 'video' : 'anh') + '-' + (i + 1) + '.' + duoi;
}
async function taiVe(dsU) {
  const nhieu = dsU.length > 1;
  try {
    if (nhieu) nhac('Đang gom ' + dsU.length + ' tệp…', 'la');
    const dsF = [];
    for (let i = 0; i < dsU.length; i++) {
      const r = await fetch(dsU[i]);
      if (!r.ok) throw new Error('máy chủ trả ' + r.status);
      const b = await r.blob();
      dsF.push(new File([b], tenTai(dsU[i], i), { type: b.type || 'image/jpeg' }));
    }
    if (navigator.canShare && navigator.canShare({ files: dsF })) {
      await navigator.share({ files: dsF });
      return;
    }
    throw new Error('may-tinh');           // không có bảng chia sẻ → tải thẳng
  } catch (e) {
    if (e && e.name === 'AbortError') return;             // người dùng tự đóng bảng — không phải lỗi
    /* đường lui: tải thẳng từng tệp (máy tính, hoặc share bị iOS từ chối vì video nặng chờ lâu) */
    let ok = false;
    for (let i = 0; i < dsU.length; i++) {
      try {
        const r = await fetch(dsU[i]); const b = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = tenTai(dsU[i], i); a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 8000); ok = true;
      } catch (e2) { nhac('Không tải được: ' + (e2.message || e2), 'do'); }
      if (i < dsU.length - 1) await new Promise(x => setTimeout(x, 350));
    }
    if (ok) nhac(nhieu ? 'Đã tải ' + dsU.length + ' tệp' : 'Đã tải về', 'la');
  }
}

function xTren(nhan, coCa, vid) {
  const it = V.ds[V.i] || {};
  if (vid) return '<div class="xemTren"><button class="nut" data-xdong="1">✕</button>' +
    '<div><b>Video ' + (V.i + 1) + ' / ' + V.ds.length + '</b><div class="s">' + ((PH || {}).id || '') + ' · bấm Toàn màn hình để xem to hết cỡ</div></div>' + nhan +
    /* 20/10 — Trường: "phần hiển thị ảnh và video nó không phóng được to hẳn ra".
       Video trước chỉ trông vào nút mở rộng tí xíu trong thanh điều khiển của
       trình duyệt, mà nút đó trên iPhone nằm lẫn giữa mấy nút khác, ngón tay
       bấm trượt suốt. Giờ có nút riêng, to, gọi thẳng Fullscreen API. */
    '<div class="xCong"><button class="nut la" data-x="toanman">⛶ Toàn màn hình</button>' +
    '<button class="nut" data-x="taive">⬇ Tải về</button>' +
    '<button class="nut" data-x="chep">🔗 Chép liên kết</button></div></div>';
  return '<div class="xemTren"><button class="nut" data-xdong="1">✕</button>' +
    '<div><b>Ảnh ' + (V.i + 1) + ' / ' + V.ds.length + '</b>' +
    '<div class="s">' + ((PH || {}).id || '') + ' · xoay ' + V.goc + '° · ' + Math.round(V.ti * 100) + '%</div></div>' + nhan +
    '<div class="xCong">' +
    '<button class="nut" data-x="xoayl">↺ Xoay trái</button>' +
    '<button class="nut" data-x="xoayr">↻ Xoay phải</button>' +
    '<button class="nut" data-x="lat">⇔ Lật</button>' +
    '<span class="xVach"></span>' +
    '<button class="nut" data-x="nho">➖</button><button class="nut" data-x="to">➕</button>' +
    '<button class="nut" data-x="vua">⤢ Vừa khung</button><button class="nut" data-x="mot">1:1</button>' +
    '<span class="xVach"></span>' +
    '<button class="nut tim" data-xsua="1">✎ Sửa &amp; ghi chữ</button>' +
    (coCa ? '<button class="nut" data-x="canh">' + (V.canh ? '↩ Xem một ảnh' : '⊞ Xem cạnh nhau') + '</button>' : '') +
    (coCa ? '<button class="nut" data-x="lonlat">' + (V.lonLat ? '↩ Xem một ảnh' : '⇄ Lật để so') + '</button>' : '') +
    (coCa ? '<button class="nut" data-x="doi">⇄ Trước / Sau</button>' : '') +
    '<button class="nut" data-x="taive">⬇ Tải về</button>' +
    (V.ds.length > 1 ? '<button class="nut" data-x="taihet">⬇ Tải tất cả</button>' : '') +
    '<button class="nut" data-x="chep">🔗 Chép liên kết</button>' +
    '</div></div>';
}
/* ============================================================
   DẢI ẢNH DƯỚI ĐÁY (Trường bắt 08/09, có video): mỗi ô đánh SỐ THỨ TỰ để biết
   đang ở tấm nào trong 24 tấm; ô đang xem tô sáng. Nhãn loại ảnh viết tắt
   (T = trước · S = sau · TĐ = trao đổi) cho khỏi che mất ảnh.
   ============================================================ */
function xBang() {
  const nhanBo = b => b === 'sau' ? 'S' : (b === 'chat' ? 'TĐ' : 'T');
  return '<div class="xemBang" id="xBang">' + V.ds.map((x, i) =>
    '<button class="tm ' + (i === V.i ? 'on' : '') + (laVideo(x.u) ? ' vid' : '') + '" data-xi="' + i + '"' +
    ' title="' + (laVideo(x.u) ? 'Video ' : 'Ảnh ') + (i + 1) + '"' +
    '>' +
    /* Ô DẢI DÙNG <img loading="lazy"> (09/09 — Trường: "phải nhanh và xem được
       chứ lag"). Trước đây mỗi ô là background-image, mà nền CSS thì trình
       duyệt TẢI NGAY tất cả: phiếu 70 ảnh là 70 lượt × 44KB ≈ 3MB đổ xuống
       cùng lúc lúc vừa mở màn xem, tranh hết đường của đúng tấm đang cần soi.
       Thẻ img lazy chỉ tải ô nào lọt vào tầm nhìn — dải cuộn ngang nên mỗi lúc
       chỉ ~5 ô, nhẹ đi hơn 90%. */
    (laVideo(x.u) ? '' : '<img class="tmA" loading="lazy" decoding="async" src="' + esc(anhNho(x.u)) + '" alt="">') +
    /* ô video trong dải: lấy khung đầu làm hình xem trước rồi phủ dấu ▶ lên.
       preload="none" cho ô KHÔNG xem: mỗi thẻ video preload="metadata" là một
       kết nối riêng tải phần đầu file — 5 video là 5 đường tranh nhau. */
    (laVideo(x.u) ? '<video src="' + esc(x.u) + '#t=0.2" muted preload="' +
      (i === V.i ? 'metadata' : 'none') + '" playsinline></video><em class="tmVid">▶</em>' : '') +
    '<i class="' + (x.bo === 'sau' ? 'la' : (x.bo === 'chat' ? 'cm' : '')) + '">' + nhanBo(x.bo) + '</i>' +
    '<b class="tmSo">' + (i + 1) + '</b></button>').join('') +
    (function () {
      const sv = V.ds.filter(x => laVideo(x.u)).length, sa = V.ds.length - sv;
      const chu = [sv ? sv + ' video' : '', sa ? sa + ' ảnh' : ''].filter(Boolean).join(' · ');
      return '<span class="xDem">' + chu + ' · bấm ô nào xem ô đó</span>';
    })() + '</div>';
}

/* dải phải CHẠY THEO ảnh đang xem — trước đây veXem() vẽ lại cả dải nên nó luôn
   nhảy về đầu, xem tới ảnh 10/24 mà dải vẫn đứng ở ô 1, tưởng bấm không được */
function cuonDaiXem(muot) {
  const bang = document.getElementById('xBang'); if (!bang) return;
  const o = bang.querySelector('.tm.on'); if (!o) return;
  const giua = o.offsetLeft - (bang.clientWidth - o.offsetWidth) / 2;
  try { bang.scrollTo({ left: Math.max(0, giua), behavior: muot ? 'smooth' : 'auto' }); }
  catch (e) { bang.scrollLeft = Math.max(0, giua); }
}

function lenhXem(k) {
  /* TOÀN MÀN HÌNH cho video (20/10). Thử ba đường vì mỗi máy một kiểu:
     chuẩn requestFullscreen, bản -webkit của Android cũ, và
     webkitEnterFullscreen của iPhone — iOS KHÔNG cho phần tử thường vào
     fullscreen, chỉ riêng thẻ <video> mới có hàm này. */
  if (k === 'toanman') {
    const v = document.getElementById('xImg');
    if (!v) return;
    try {
      if (v.requestFullscreen) v.requestFullscreen();
      else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
      else nhac('Máy này không cho mở toàn màn hình — xoay ngang điện thoại cũng to hơn hẳn.', 'canh');
    } catch (e) {
      nhac('Không mở được toàn màn hình: ' + (e.message || e), 'canh');
    }
    return;
  }
  if (k === 'xoayl') V.goc -= 90;
  if (k === 'xoayr') V.goc += 90;
  if (k === 'lat') V.lat = -V.lat;
  if (k === 'to') V.ti = Math.min(6, V.ti * 1.25);
  if (k === 'nho') V.ti = Math.max(.2, V.ti / 1.25);
  if (k === 'vua') { V.ti = 1; V.goc = 0; V.lat = 1; V.x = 0; V.y = 0; }
  if (k === 'mot') { V.ti = 1; V.x = 0; V.y = 0; }
  if (k === 'canh' || k === 'lonlat') {
    if (k === 'canh') { V.canh = !V.canh; V.lonLat = false; } else { V.lonLat = !V.lonLat; V.canh = false; }
    /* vào chế độ so: cặp bắt đầu = đúng tấm đang xem (30/08) */
    if ((V.canh || V.lonLat) && PH) {
      const it2 = V.ds[V.i] || {};
      const bo = it2.bo === 'sau' ? (PH.anhSau || []) : (PH.anhTruoc || []);
      const vt2 = bo.indexOf(it2.u);
      if (vt2 >= 0) V.cap = vt2;
    }
  }
  if (k === 'doi') {
    const cu = V.ds[V.i].bo;
    const j = V.ds.findIndex(x => x.bo !== cu);
    if (j >= 0) { V.i = j; V.ti = 1; V.goc = 0; V.x = 0; V.y = 0; }
  }
  if (k === 'chep') {
    const u = (V.ds[V.i] || {}).u || '';
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => nhac('Đã chép liên kết ảnh', 'la'), () => nhac('Không chép được', 'do'));
    return;
  }
  if (k === 'taive') { taiVe([(V.ds[V.i] || {}).u].filter(Boolean)); return; }
  if (k === 'taihet') { taiVe(V.ds.map(x => x.u)); return; }
  veXem(); ganKeo();
}
function buocXem(n) {
  /* đang ở chế độ so trước/sau: bước = sang CẶP kế (30/08) */
  if ((V.lonLat || V.canh) && PH && (PH.anhTruoc || []).length && (PH.anhSau || []).length) {
    const soCap = Math.max(PH.anhTruoc.length, PH.anhSau.length);
    V.cap = ((V.cap | 0) + n + soCap) % soCap;
    veXem();
    return;
  }
  V.i = (V.i + n + V.ds.length) % V.ds.length;
  V.goc = 0; V.ti = 1; V.lat = 1; V.x = 0; V.y = 0;
  veXem(); ganKeo();
  /* Trường bắt 30/08 "vuốt sang mà nó cứ kiểu gì": ảnh mới NHẢY PHỰT vào giữa
     màn, không có nhịp trượt nên nhìn như giật. Cho ảnh mới trượt vào từ đúng
     phía vừa vuốt — mắt nối được chuyển động, hết cảm giác khựng. */
  const im = document.getElementById('xImg');
  if (im && n) {
    im.style.transition = 'none';
    im.style.transform = 'translate(' + (n > 0 ? 72 : -72) + 'px,0)';
    im.style.opacity = '.35';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      im.style.transition = 'transform .22s ease-out, opacity .22s';
      im.style.transform = 'translate(0,0)';
      im.style.opacity = '';
    }));
  }
}

/* Có tính là một cú vuốt sang không? Tách riêng để test được bằng máy.
   Hai cửa: kéo DÀI (≥56px) hoặc kéo NHANH (hất tay ≥24px với tốc độ ≥0,45px/ms) —
   trước đây chỉ có cửa dài 60px, hất nhanh kiểu Zalo là trượt cửa, tưởng web đơ. */
function laVuotSang(dx, dy, ms) {
  if (V.ds.length < 2 || V.ti > 1.05) return 0;
  if (Math.abs(dx) <= Math.abs(dy) * 1.4) return 0;
  const nhanh = Math.abs(dx) / Math.max(1, ms) >= 0.45;
  if (Math.abs(dx) >= 56 || (nhanh && Math.abs(dx) >= 24)) return dx < 0 ? 1 : -1;
  return 0;
}

/* ============================================================
   ② BẤM ĐÚP PHÓNG ĐÚNG CHỖ
   Nút ➕ phóng vào giữa ảnh, vết hỏng ở góc thì phải kéo đi tìm.
   Bấm đúp thì phóng ngay điểm ngón tay đặt — điểm đó đứng yên.
   ============================================================ */
const DUP_TI = 1.75;

function datAnh(khongMuot) {
  const im = document.getElementById('xImg'); if (!im) return;
  im.style.transition = khongMuot ? 'none' : '';   /* kéo tay thì bỏ hiệu ứng cho khỏi trôi */
  im.style.transform = 'translate(' + V.x + 'px,' + V.y + 'px) rotate(' + V.goc + 'deg) scale(' + (V.ti * V.lat) + ',' + V.ti + ')';
  const s2 = document.querySelector('.xemTren .s');
  if (s2) s2.textContent = ((PH || {}).id || '') + ' · xoay ' + V.goc + '° · ' + Math.round(V.ti * 100) + '%';
}

/* phóng quanh một điểm trên màn hình: điểm đó nằm nguyên chỗ cũ.
   Tâm hộp bao của ảnh đã là tâm hiện tại (scale/rotate lấy gốc ở giữa),
   nên chỉ cần bù lệch theo tỉ lệ mới — đúng cả khi ảnh đang xoay. */
function phongTai(px, py, moi, khongMuot) {
  const im = document.getElementById('xImg'); if (!im) return;
  moi = Math.min(6, Math.max(.2, moi));
  const r = im.getBoundingClientRect();
  const k = moi / V.ti;
  V.x += (px - (r.left + r.width / 2)) * (1 - k);
  V.y += (py - (r.top + r.height / 2)) * (1 - k);
  V.ti = moi;
  datAnh(khongMuot);
}

function bamDup(px, py) {
  if (V.ti > 1.4) { V.ti = 1; V.x = 0; V.y = 0; datAnh(); }
  else phongTai(px, py, DUP_TI);
}

/* bấm đúp phóng · kéo di ảnh · vuốt ngang sang ảnh khác · lăn chuột · chụm 2 ngón */
function ganKeo() {
  const s = document.getElementById('xSanh'); if (!s) return;
  s.onwheel = e => { e.preventDefault(); phongTai(e.clientX, e.clientY, V.ti * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); };

  let bd = null, hai = null, lanTruoc = 0, diemTruoc = null, tuX = 0, tuY = 0, tuLuc = 0;

  s.onpointerdown = e => {
    if (laVideo((V.ds[V.i] || {}).u)) return;      /* video để controls tự lo */
    if (e.target.closest('button,a')) return;      /* mũi ‹ › và các nút vẫn bấm bình thường */
    const gio = Date.now();
    if (gio - lanTruoc < 320 && diemTruoc &&
      Math.hypot(e.clientX - diemTruoc.x, e.clientY - diemTruoc.y) < 40) {
      lanTruoc = 0; diemTruoc = null; bd = null;
      return bamDup(e.clientX, e.clientY);
    }
    lanTruoc = gio; diemTruoc = { x: e.clientX, y: e.clientY };
    bd = { x: e.clientX - V.x, y: e.clientY - V.y };
    tuX = e.clientX; tuY = e.clientY; tuLuc = gio;
    try { s.setPointerCapture(e.pointerId); } catch (x) { }
  };
  s.onpointermove = e => {
    if (!bd) return;
    V.x = e.clientX - bd.x;
    /* chưa phóng to thì cú kéo là để SANG ẢNH — khoá trục dọc, ảnh chỉ rê ngang
       cho ra nhịp album; đang phóng thì kéo tự do để soi (30/08) */
    V.y = V.ti > 1.05 ? (e.clientY - bd.y) : 0;
    datAnh(true);
  };
  s.onpointerup = e => {
    if (!bd) return;
    bd = null;
    /* Cú KÉO không được tính là nửa đầu của bấm-đúp (Trường bắt 30/08: lướt
       liên tiếp thì cú thứ 2 cách cú 1 dưới 0,3s + gần cùng chỗ → web tưởng
       bấm đúp → phóng 175% → từ đó lướt kiểu gì cũng không sang ảnh nữa). */
    if (Math.hypot(e.clientX - tuX, e.clientY - tuY) > 12) { lanTruoc = 0; diemTruoc = null; }
    if (V.ti > 1.05) return;                       /* đang phóng thì kéo là di ảnh */
    const h = laVuotSang(e.clientX - tuX, e.clientY - tuY, Date.now() - tuLuc);
    if (h) return buocXem(h);
    V.x = 0; V.y = 0; datAnh();                    /* vuốt không tới thì ảnh về chỗ cũ */
  };
  s.onpointercancel = () => { bd = null; };

  s.ontouchstart = e => { if (e.touches.length === 2) { bd = null; hai = kc(e.touches); } };
  s.ontouchmove = e => {
    if (e.touches.length === 2 && hai) {
      e.preventDefault();
      const m = kc(e.touches);
      const gx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const gy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const ti = m / hai; hai = m;
      phongTai(gx, gy, V.ti * ti, true);
    }
  };
  s.ontouchend = () => { hai = null; };
  function kc(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  s.ondblclick = e => { e.preventDefault(); };     /* khỏi bôi đen ảnh khi bấm đúp chuột */
}

/* lật: bấm để đổi hẳn, giữ để xem tạm ảnh SAU rồi nhả về ảnh TRƯỚC */
function ganLat() {
  const s = document.getElementById('xSanh'); if (!s) return;
  const t = s.querySelector('.lat.t'), sa = s.querySelector('.lat.s');
  const nhan = document.getElementById('latNhan');
  let dangSau = false, giu = null;
  const dat = q => {
    dangSau = q;
    t.classList.toggle('an', q); sa.classList.toggle('an', !q);
    if (nhan) { nhan.textContent = q ? 'SAU KHI SỬA' : 'TRƯỚC KHI SỬA'; nhan.classList.toggle('la', q); }
  };
  s.onpointerdown = e => {
    if (e.target.closest('a,.xMui')) return;    /* mũi ‹ › để sang cặp, đừng lật nhầm */
    const truocKhiGiu = dangSau;
    giu = setTimeout(() => { giu = 'daGiu'; dat(!truocKhiGiu); }, 220);
  };
  s.onpointerup = () => {
    if (giu === 'daGiu') { dat(dangSau ? false : true); giu = null; return; }
    clearTimeout(giu); giu = null; dat(!dangSau);
  };
  s.onpointercancel = () => { clearTimeout(giu); giu = null; };
}

/* ================= SỬA ẢNH & GHI CHỮ ================= */
const S = {
  cong: 'but', mau: '#EF4444', day: 5, coChu: 22, sang: 100,
  lop: [], boLop: [], img: null, goc: 0, dangVe: null, url: '', bo: 'truoc'
};
const MAU_S = ['#EF4444', '#F59E0B', '#FDE047', '#22C55E', '#3B82F6', '#FFFFFF', '#0F172A'];
const CONG_S = [
  ['chon', '✥', 'Chọn'], ['but', '✎', 'Bút vẽ'], ['mui', '➜', 'Mũi tên'], ['khung', '▭', 'Khung'],
  ['tron', '◯', 'Vòng tròn'], ['chu', 'T', 'Ghi chữ'], ['mo', '▨', 'Che mờ'],
  ['cat', '✂', 'Cắt'], ['xoay', '↻', 'Xoay'], ['sang', '☀', 'Sáng tối']
];

function moSuaAnh(url, bo) {
  if (laVideo(url)) { nhac('Video thì chưa sửa được — chỉ ảnh mới vẽ lên được', 'canh'); return; }
  S.che = 'kho';                       // sửa ảnh ĐÃ nằm trên kho (đường cũ)
  S.url = url; S.bo = bo || (V.ds[V.i] || {}).bo || 'truoc';
  S.lop = []; S.boLop = []; S.goc = 0; S.sang = 100; S.cong = 'but';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { S.img = img; veSua(); };
  img.onerror = () => nhac('Không mở được ảnh để sửa', 'do');
  img.src = url;
  let d = document.getElementById('suaAnh');
  if (!d) { d = document.createElement('div'); d.id = 'suaAnh'; d.className = 'suaAnh'; document.body.appendChild(d); }
  d.innerHTML = '<div class="sTren"><div><b>Đang mở ảnh…</b></div></div>';
}

/* ---------- SỬA TRƯỚC KHI GỬI — kiểu Zalo (Trường xin 21/08) ----------
   Vừa chụp / vừa chọn ảnh từ album là mở ngay màn sửa, khoanh vẽ ghi chữ
   XONG MỚI GỬI lên kho. cb nhận: File đã sửa · null = gửi ảnh gốc · 'HUY' = thôi. */
function moSuaAnhGoi(file, thu, tong, cb, thay) {
  S.che = 'goi'; S.cb = cb; S.thu = thu; S.tong = tong; S.thay = !!thay;
  S.tenGoc = (file.name || ('anh-' + thu + '.jpg'));
  S.url = URL.createObjectURL(file); S.bo = 'truoc';
  S.lop = []; S.boLop = []; S.goc = 0; S.sang = 100; S.cong = 'but';
  const img = new Image();
  img.onload = () => { S.img = img; veSua(); };
  img.onerror = () => { nhac('Không mở được ảnh này, gửi bản gốc', 'canh'); const c = S.cb; S.cb = null; dongSuaAnh(); if (c) c(null); };
  img.src = S.url;
  let d = document.getElementById('suaAnh');
  if (!d) { d = document.createElement('div'); d.id = 'suaAnh'; d.className = 'suaAnh'; document.body.appendChild(d); }
  d.innerHTML = '<div class="sTren"><div><b>Đang mở ảnh…</b></div></div>';
}
/* suaHangLoat() gỡ 20/10 — không chỗ nào gọi. */

/* ---------- DUYỆT TRƯỚC KHI GỬI (Trường chốt 29/08) ----------
   Trước: chọn 5 tấm là bị ÉP đi qua màn sửa cả 5, mỗi tấm một lần bấm.
   Giờ: chọn xong hiện CẢ LOẠT — bấm tấm nào thì sửa tấm đó, xong quay lại
   màn duyệt, cuối cùng MỘT nút Gửi. Trả mảng File, huỷ trả null. */
const DG = { ds: [], res: null };
/* ============================================================
   BẢN XEM TRƯỚC NHỎ (Trường bắt 07/09: "chọn 7 ảnh thì KHÔNG có phần xác nhận,
   2-3 ảnh thì có"). Nguyên nhân: màn duyệt trước đây nhét ẢNH GỐC vào <img>.
   Ảnh iPhone ~4000×3000 = 12 triệu điểm mỗi tấm; 7 tấm là ~85 triệu điểm giải
   mã cùng lúc → Safari hết RAM, iOS GIẾT TAB → màn duyệt chưa kịp vẽ đã mất,
   web nạp lại và ảnh rơi vào hộp chờ (đúng cái hộp vàng Trường chụp).
   Chữa: mỗi tấm chỉ vẽ bản nhỏ 320px, làm TUẦN TỰ một tấm một lượt. File gốc
   vẫn giữ nguyên để gửi — chỉ cái hiển thị là nhỏ.
   ============================================================ */
const DG_XEM = 320;
function anhXemNho(file) {
  return new Promise(async ok => {
    /* ① LUỒNG RIÊNG (07/09): mở 15 bản xem mà giao diện vẫn cuộn được */
    if (typeof nenLuongRieng === 'function' && typeof NEN_HONG !== 'undefined' && !NEN_HONG) {
      try {
        const b = await nenLuongRieng(file, DG_XEM, 0.7, false);
        if (b) return ok(URL.createObjectURL(b));
      } catch (e) { /* rơi xuống đường cũ */ }
    }
    /* ② createImageBitmap có resize sẵn: giải mã thẳng ra cỡ nhỏ, không phình RAM */
    try {
      if (window.createImageBitmap) {
        const bm = await createImageBitmap(file, { resizeWidth: DG_XEM, resizeQuality: 'low' })
          .catch(() => createImageBitmap(file));
        const ti = Math.min(1, DG_XEM / Math.max(bm.width, bm.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bm.width * ti));
        c.height = Math.max(1, Math.round(bm.height * ti));
        c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
        try { bm.close(); } catch (e) { }
        return c.toBlob(b => ok(b ? URL.createObjectURL(b) : ''), 'image/jpeg', 0.7);
      }
    } catch (e) { }
    /* máy cũ không có createImageBitmap: đi đường <img>, vẫn thu nhỏ rồi mới vẽ.
       PHẢI CÓ HẠN GIỜ — <img> gặp ảnh nó không đọc nổi cũng treo im như <video>
       (bắt được trên web thật 07/09), treo là màn duyệt đứng mãi ở ⏳ */
    try {
      const u = URL.createObjectURL(file);
      const img = new Image();
      let xong = false;
      const dut = url => {
        if (xong) return; xong = true;
        clearTimeout(het);
        try { URL.revokeObjectURL(u); } catch (e) { }
        ok(url || '');
      };
      const het = setTimeout(() => dut(''), 12000);
      img.onload = () => {
        if (xong) return; xong = true; clearTimeout(het);
        try {
          const ti = Math.min(1, DG_XEM / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * ti));
          c.height = Math.max(1, Math.round(img.height * ti));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(u);
          c.toBlob(b => ok(b ? URL.createObjectURL(b) : ''), 'image/jpeg', 0.7);
        } catch (e) { try { URL.revokeObjectURL(u); } catch (x) { } ok(''); }
      };
      img.onerror = () => dut('');
      img.src = u;
    } catch (e) { ok(''); }
  });
}
function duyetTruocGui(fs) {
  return new Promise(async res => {
    /* mở màn duyệt NGAY với ô trống — người dùng thấy phản hồi tức thì, không
       phải ngồi đoán xem máy có nhận ảnh hay không */
    DG.ds = fs.map(f => ({ f, url: '', sua: false }));
    DG.res = res;
    veDuyet();
    /* ============================================================
       NÉN NGAY TỪ BÂY GIỜ, ĐỪNG CHỜ NGƯỜI TA BẤM GỬI (10/09 — Trường: "tải
       ảnh lên trong phiếu báo lỗi và ảnh sau khi sửa vẫn còn chậm").
       Người dùng còn đang xem màn duyệt rồi còn điền nội dung, gian hàng, mức
       độ, ngày — cả chục giây đó máy để không. Nén trước ở đây thì lúc bấm Gửi
       là byte đi liền, cắt hẳn phần việc nặng nhất khỏi lúc phải chờ.
       Ai sửa tấm nào thì tấm đó thành file mới → tự nén lại, không gửi bản cũ.
       ============================================================ */
    if (typeof nenSanTruoc === 'function') nenSanTruoc(fs);
    /* dựng ảnh xem trước 2 tấm một lượt (trước đây tuần tự từng tấm) — 18 tấm
       thì màn duyệt hiện đủ hình sớm hơn gần một nửa, mà RAM vẫn không dồn */
    const hang = DG.ds.slice();
    const chay = async () => {
      while (hang.length) {
        const x = hang.shift();
        x.url = await anhXemNho(x.f);
        /* không xem trước được (ảnh lạ / quá lâu) thì ĐÁNH DẤU rồi đi tiếp — vẫn
           gửi được tấm đó, chỉ là không xem thử trước (07/09) */
        if (!x.url) x.khongXem = true;
        if (!DG.res) return;              /* người dùng đã bấm Huỷ giữa lúc mở ảnh */
        veDuyet();
      }
    };
    await Promise.all([chay(), chay()]);
  });
}
function veDuyet() {
  let d = document.getElementById('duyetAnh');
  if (!d) { d = document.createElement('div'); d.id = 'duyetAnh'; d.className = 'duyetAnh'; document.body.appendChild(d); }
  d.style.display = '';
  const soXong = DG.ds.filter(x => x.url || x.khongXem).length, tong = DG.ds.length;
  const dangMo = soXong < tong;
  d.innerHTML = '<div class="dgHop">' +
    '<div class="dgDau"><b>Gửi ' + tong + ' ảnh</b>' +
    '<div class="s">' + (dangMo
      ? 'Đang mở ảnh ' + (soXong + 1) + '/' + tong + '… chờ một nhịp'
      : '✎ Bấm vào ảnh để KHOANH VÙNG chỗ hỏng và ghi chữ — không cần thì bấm Gửi luôn') + '</div></div>' +
    '<div class="dgLuoi">' + DG.ds.map((x, i) =>
      '<div class="dgO' + (x.url || x.khongXem ? '' : ' dgCho') + '" data-dgsua="' + i + '">' +
      (x.url ? '<img src="' + x.url + '" alt="" decoding="async">'
        : (x.khongXem ? '<span class="dgLa">🖼<i>vẫn gửi được</i></span>' : '<span class="dgDoi">⏳</span>')) +
      /* NHÃN RÕ THAY DẤU ✎ MỜ (10/09 — Trường: "sao không có phần chỉnh sửa
         à... tao nhớ phần này tao đã góp ý rồi mà"). Bộ khoanh vẽ vốn có sẵn,
         chỉ là cái dấu ✎ bé xíu ở góc không ai nhận ra là bấm được. */
      (x.sua ? '<span class="dgNhan">✎ đã khoanh</span>'
             : (x.url ? '<span class="dgSuaGoi">✎ Khoanh · ghi chữ</span>' : '')) +
      '<button class="dgXoa" data-dgxoa="' + i + '" title="Bỏ ảnh này">✕</button></div>').join('') + '</div>' +
    '<div class="dgChan"><button class="nut xam" data-dghuy="1">Huỷ</button>' +
    '<button class="nut la" data-dggui="1"' + (dangMo ? ' disabled' : '') + '>' +
    (dangMo ? 'Đang mở ảnh… ' + soXong + '/' + tong : 'Gửi ' + tong + ' ảnh ›') + '</button></div></div>';
}
function xongDuyet(kq) {
  DG.ds.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { } });
  const res = DG.res; DG.res = null; DG.ds = [];
  const d = document.getElementById('duyetAnh'); if (d) d.remove();
  if (res) res(kq);
}
function dongSuaAnh() {
  const d = document.getElementById('suaAnh'); if (d) d.remove();
  if (S.che === 'goi') { try { URL.revokeObjectURL(S.url); } catch (e) { } }
  /* đóng ngang (Huỷ / phím Esc) khi đang sửa-trước-gửi = thôi không gửi nữa */
  if (S.che === 'goi' && S.cb) { const cb = S.cb; S.cb = null; S.che = ''; cb('HUY'); }
  S.che = '';
}

function veSua() {
  const d = document.getElementById('suaAnh'); if (!d) return;
  const goi = S.che === 'goi';
  d.innerHTML =
    '<div class="sTren">' +
    (goi
      ? (S.tuDuyet
        ? '<div><b>Sửa ảnh ' + S.thu + '/' + S.tong + '</b>' +
          '<div class="s">Khoanh vẽ, ghi chữ xong bấm Xong — quay lại màn duyệt, chưa gửi đi đâu cả</div></div>'
        /* S.thay = sửa một tấm ĐÃ nằm trong khay form (10/09). Chữ phải khác
           hẳn lúc chọn ảnh mới: ở đây "Huỷ" là giữ ảnh cũ, không phải bỏ ảnh
           khỏi phiếu — nói sai là người dùng sợ không dám bấm. */
        : (S.thay
          ? '<div><b>Khoanh vùng chỗ hỏng</b>' +
            '<div class="s">Vẽ khung, mũi tên, ghi chữ lên ảnh. Xong bấm Xong — tấm này trong phiếu được thay bằng bản có khoanh.</div></div>'
          : '<div><b>Sửa trước khi gửi' + (S.tong > 1 ? ' — ảnh ' + S.thu + '/' + S.tong : '') + '</b>' +
            '<div class="s">Khoanh chỗ hỏng, ghi chữ… rồi mới gửi. Không cần sửa thì bấm Gửi luôn.</div></div>'))
      : '<div><b>Sửa ảnh — ' + esc((PH || {}).id || '') + '</b><div class="s">Ảnh gốc luôn được giữ, bản sửa lưu thành ảnh mới</div></div>') +
    '<div class="sCong">' +
    '<button class="nut" data-shoantac="1">↶ Hoàn tác</button>' +
    '<button class="nut" data-slamlai="1">↷ Làm lại</button>' +
    '<button class="nut" data-sgoc="1">⟲ Về ảnh gốc</button>' +
    '<span class="xVach"></span>' +
    (goi
      ? (S.tuDuyet
        ? '<button class="nut xam" data-sdong="1">Thôi, không sửa</button>' +
          '<button class="nut la" data-sluu="1">✓ Xong — quay lại</button>'
        : (S.thay
          ? '<button class="nut xam" data-sdong="1">Thôi, giữ ảnh cũ</button>' +
            '<button class="nut la" data-sluu="1">✓ Xong — thay tấm này</button>'
          : '<button class="nut xam" data-sdong="1">Huỷ gửi</button>' +
            '<button class="nut" data-sbo="1">Gửi luôn không sửa ›</button>' +
            '<button class="nut la" data-sluu="1">✓ Xong — gửi ảnh này</button>'))
      : '<button class="nut xam" data-sdong="1">Huỷ</button>' +
        '<button class="nut la" data-sluu="1">✓ Lưu ảnh đã sửa</button>') +
    '</div></div>' +
    '<div class="sThan">' +
    '<div class="sCot">' + CONG_S.map(c =>
      '<button class="sI ' + (S.cong === c[0] ? 'on' : '') + '" data-scong="' + c[0] + '"><em>' + c[1] + '</em>' + c[2] + '</button>').join('') + '</div>' +
    '<div class="sSanh"><canvas id="sCanvas"></canvas>' + sThanhThuocTinh() + '</div>' +
    '<div class="sPhai"><h4>CÁC LỚP ĐÃ VẼ</h4><div id="sLop">' + sDanhSachLop() + '</div>' +
    '<div class="sGhi">CHT khoanh đỏ chỗ chưa đạt rồi bấm <b>Chưa đạt</b> — kỹ thuật nhìn ảnh là biết làm lại chỗ nào.</div></div>' +
    '</div>';
  dungCanvas();
}
function sThanhThuocTinh() {
  return '<div class="sTT">' +
    '<span class="lb">MÀU</span><span class="sMau">' + MAU_S.map(m =>
      '<i data-smau="' + m + '" class="' + (S.mau === m ? 'on' : '') + '" style="background:' + m + '"></i>').join('') + '</span>' +
    '<span class="xVach"></span><span class="lb">NÉT</span><span class="sDay">' +
    [3, 5, 8, 12].map(v => '<i data-sday="' + v + '" class="' + (S.day === v ? 'on' : '') + '" style="height:' + v + 'px"></i>').join('') + '</span>' +
    '<span class="xVach"></span><span class="lb">CỠ CHỮ</span>' +
    '<select data-scochu="1">' + [16, 22, 30, 42, 60].map(v => '<option value="' + v + '"' + (S.coChu === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' +
    (S.cong === 'sang' ? '<span class="xVach"></span><span class="lb">SÁNG</span><input type="range" min="40" max="180" value="' + S.sang + '" data-ssang="1">' : '') +
    (S.cong === 'cat' ? '<span class="xVach"></span><button class="nut la" data-scat="1">✂ Cắt theo khung</button>' : '') +
    '</div>';
}
function sDanhSachLop() {
  if (!S.lop.length) return '<div class="sTrong">Chưa vẽ gì</div>';
  const ten = { but: ['✎', 'Bút vẽ'], mui: ['➜', 'Mũi tên'], khung: ['▭', 'Khung'], tron: ['◯', 'Vòng tròn'], chu: ['T', 'Chữ'], mo: ['▨', 'Che mờ'] };
  return S.lop.map((l, i) => {
    const t = ten[l.loai] || ['•', l.loai];
    return '<div class="sLp"><span class="k" style="background:' + (l.mau || '#334155') + '22;color:' + (l.mau || '#334155') + '">' + t[0] + '</span>' +
      (l.loai === 'chu' ? '“' + esc(String(l.text).slice(0, 18)) + '”' : t[1]) +
      '<button class="x" data-sxoalop="' + i + '">✕</button></div>';
  }).reverse().join('');
}

/* ---------- canvas ---------- */
let CTX = null, TL = 1;    // TL: tỉ lệ hiển thị so với ảnh gốc
function dungCanvas() {
  const c = document.getElementById('sCanvas'); if (!c || !S.img) return;
  const sanh = c.parentElement.getBoundingClientRect();
  const rong = Math.max(240, sanh.width - 28), cao = Math.max(220, sanh.height - 96);
  const w = S.goc % 180 === 0 ? S.img.width : S.img.height;
  const h = S.goc % 180 === 0 ? S.img.height : S.img.width;
  TL = Math.min(rong / w, cao / h, 1);
  c.width = Math.round(w * TL); c.height = Math.round(h * TL);
  CTX = c.getContext('2d');
  veCanvas();
  ganVe(c);
}
function veCanvas() {
  const c = document.getElementById('sCanvas'); if (!c || !CTX || !S.img) return;
  CTX.save();
  CTX.clearRect(0, 0, c.width, c.height);
  CTX.filter = 'brightness(' + S.sang + '%)';
  CTX.translate(c.width / 2, c.height / 2);
  CTX.rotate(S.goc * Math.PI / 180);
  const w = S.img.width * TL, h = S.img.height * TL;
  CTX.drawImage(S.img, -w / 2, -h / 2, w, h);
  CTX.restore();
  CTX.filter = 'none';
  S.lop.concat(S.dangVe ? [S.dangVe] : []).forEach(l => veLop(CTX, l, TL));
}
function veLop(ctx, l, ti) {
  ctx.save();
  ctx.strokeStyle = l.mau; ctx.fillStyle = l.mau;
  ctx.lineWidth = (l.day || 5) * ti * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const X = v => v * ti, Y = v => v * ti;
  if (l.loai === 'but' && l.diem && l.diem.length) {
    ctx.beginPath(); ctx.moveTo(X(l.diem[0][0]), Y(l.diem[0][1]));
    l.diem.forEach(p => ctx.lineTo(X(p[0]), Y(p[1]))); ctx.stroke();
  }
  if (l.loai === 'khung') { ctx.strokeRect(X(l.x), Y(l.y), X(l.w), Y(l.h)); }
  if (l.loai === 'tron') {
    ctx.beginPath(); ctx.ellipse(X(l.x + l.w / 2), Y(l.y + l.h / 2), Math.abs(X(l.w / 2)), Math.abs(Y(l.h / 2)), 0, 0, 7); ctx.stroke();
  }
  if (l.loai === 'mui') {
    const x1 = X(l.x), y1 = Y(l.y), x2 = X(l.x + l.w), y2 = Y(l.y + l.h);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1), m = ctx.lineWidth * 3.2;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - m * Math.cos(a - .4), y2 - m * Math.sin(a - .4));
    ctx.lineTo(x2 - m * Math.cos(a + .4), y2 - m * Math.sin(a + .4));
    ctx.closePath(); ctx.fill();
  }
  if (l.loai === 'chu') {
    const co = (l.co || 22) * ti * 2;
    ctx.font = '800 ' + co + 'px Segoe UI, system-ui, sans-serif';
    const w = ctx.measureText(l.text).width;
    ctx.fillStyle = l.mau; ctx.globalAlpha = .92;
    ctx.fillRect(X(l.x) - 6, Y(l.y) - co, w + 12, co * 1.35);
    ctx.globalAlpha = 1;
    ctx.fillStyle = (l.mau === '#FFFFFF' || l.mau === '#FDE047') ? '#0F172A' : '#fff';
    ctx.fillText(l.text, X(l.x), Y(l.y) + co * .1);
  }
  if (l.loai === 'mo') {
    const x = X(Math.min(l.x, l.x + l.w)), y = Y(Math.min(l.y, l.y + l.h));
    const w = Math.abs(X(l.w)), h = Math.abs(Y(l.h));
    const b = Math.max(6, Math.round(Math.min(w, h) / 8));
    const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w / b)); t.height = Math.max(1, Math.round(h / b));
    const tc = t.getContext('2d');
    tc.drawImage(document.getElementById('sCanvas'), x, y, w, h, 0, 0, t.width, t.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(t, 0, 0, t.width, t.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  }
  ctx.restore();
}

/* vẽ bằng chuột / ngón tay */
function ganVe(c) {
  const toa = e => {
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) / TL, (e.clientY - r.top) / TL];
  };
  c.onpointerdown = e => {
    if (['chon', 'xoay', 'sang'].includes(S.cong)) return;
    c.setPointerCapture(e.pointerId);
    const [x, y] = toa(e);
    if (S.cong === 'chu') {
      const t = prompt('Ghi chữ lên ảnh:'); if (!t) return;
      day({ loai: 'chu', x, y, text: t, co: S.coChu, mau: S.mau }); return;
    }
    if (S.cong === 'but') S.dangVe = { loai: 'but', mau: S.mau, day: S.day, diem: [[x, y]] };
    else S.dangVe = { loai: S.cong === 'cat' ? 'khung' : S.cong, mau: S.cong === 'mo' ? '#94A3B8' : S.mau, day: S.day, x, y, w: 0, h: 0, cat: S.cong === 'cat' };
    veCanvas();
  };
  c.onpointermove = e => {
    if (!S.dangVe) return;
    const [x, y] = toa(e);
    if (S.dangVe.loai === 'but') S.dangVe.diem.push([x, y]);
    else { S.dangVe.w = x - S.dangVe.x; S.dangVe.h = y - S.dangVe.y; }
    veCanvas();
  };
  c.onpointerup = () => {
    if (!S.dangVe) return;
    const l = S.dangVe; S.dangVe = null;
    if (l.cat) { S.khungCat = l; veCanvas(); return; }
    if (l.loai !== 'but' && Math.abs(l.w) < 4 && Math.abs(l.h) < 4) { veCanvas(); return; }
    day(l);
  };
}
function day(l) { S.lop.push(l); S.boLop = []; veCanvas(); capNhatLop(); }
function capNhatLop() { const el = document.getElementById('sLop'); if (el) el.innerHTML = sDanhSachLop(); }

/* ---------- lệnh ---------- */
function lenhSua(k, gt) {
  if (k === 'cong') {
    S.cong = gt;
    if (gt === 'xoay') { S.goc = (S.goc + 90) % 360; dungCanvas(); }
    veSua(); return;
  }
  if (k === 'mau') { S.mau = gt; veSua(); return; }
  if (k === 'day') { S.day = Number(gt); veSua(); return; }
  if (k === 'cochu') { S.coChu = Number(gt); return; }
  if (k === 'sang') { S.sang = Number(gt); veCanvas(); return; }
  if (k === 'hoantac') { if (S.lop.length) { S.boLop.push(S.lop.pop()); veCanvas(); capNhatLop(); } return; }
  if (k === 'lamlai') { if (S.boLop.length) { S.lop.push(S.boLop.pop()); veCanvas(); capNhatLop(); } return; }
  if (k === 'goc') { S.lop = []; S.boLop = []; S.goc = 0; S.sang = 100; S.khungCat = null; dungCanvas(); capNhatLop(); nhac('Đã trả về ảnh gốc', 'canh'); return; }
  if (k === 'xoalop') { S.lop.splice(Number(gt), 1); veCanvas(); capNhatLop(); return; }
  if (k === 'cat') return catAnh();
}

function catAnh() {
  const l = S.khungCat;
  if (!l || Math.abs(l.w) < 10 || Math.abs(l.h) < 10) { nhac('Kéo một khung trên ảnh trước rồi bấm Cắt', 'do'); return; }
  const full = veFull();
  const x = Math.round(Math.min(l.x, l.x + l.w)), y = Math.round(Math.min(l.y, l.y + l.h));
  const w = Math.round(Math.abs(l.w)), h = Math.round(Math.abs(l.h));
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  t.getContext('2d').drawImage(full, x, y, w, h, 0, 0, w, h);
  const im = new Image();
  im.onload = () => { S.img = im; S.lop = []; S.boLop = []; S.goc = 0; S.khungCat = null; S.cong = 'but'; veSua(); nhac('Đã cắt ảnh', 'la'); };
  im.src = t.toDataURL('image/jpeg', .92);
}

/* vẽ ra ảnh đầy đủ độ phân giải */
function veFull() {
  const w = S.goc % 180 === 0 ? S.img.width : S.img.height;
  const h = S.goc % 180 === 0 ? S.img.height : S.img.width;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.save(); x.filter = 'brightness(' + S.sang + '%)';
  x.translate(w / 2, h / 2); x.rotate(S.goc * Math.PI / 180);
  x.drawImage(S.img, -S.img.width / 2, -S.img.height / 2);
  x.restore(); x.filter = 'none';
  const cu = document.getElementById('sCanvas');
  const tam = { id: 'sCanvas' };
  S.lop.forEach(l => {
    if (l.loai === 'mo') {          // che mờ cần đọc từ chính canvas đích
      const xx = Math.round(Math.min(l.x, l.x + l.w)), yy = Math.round(Math.min(l.y, l.y + l.h));
      const ww = Math.round(Math.abs(l.w)), hh = Math.round(Math.abs(l.h));
      const b = Math.max(8, Math.round(Math.min(ww, hh) / 8));
      const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(ww / b)); t.height = Math.max(1, Math.round(hh / b));
      t.getContext('2d').drawImage(c, xx, yy, ww, hh, 0, 0, t.width, t.height);
      x.imageSmoothingEnabled = false;
      x.drawImage(t, 0, 0, t.width, t.height, xx, yy, ww, hh);
      x.imageSmoothingEnabled = true;
    } else veLop(x, l, 1);
  });
  return c;
}

async function luuAnhSua() {
  /* chế độ sửa-trước-gửi: KHÔNG đụng kho ở đây — trả File về cho hàng đợi gửi */
  if (S.che === 'goi') {
    const cb = S.cb; S.cb = null;
    if (!S.lop.length && S.goc === 0 && S.sang === 100) { dongSuaAnh(); if (cb) cb(null); return; }
    const c = veFull();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
    dongSuaAnh();
    if (cb) cb(new File([blob], S.tenGoc.replace(/\.\w+$/, '') + '-sua.jpg', { type: 'image/jpeg' }));
    return;
  }
  if (!PH) { nhac('Không rõ đang sửa ảnh của phiếu nào', 'do'); return; }
  if (!S.lop.length && S.goc === 0 && S.sang === 100) { nhac('Chưa sửa gì', 'canh'); return; }
  const c = veFull();
  nhac('Đang lưu ảnh đã sửa…', 'canh');
  batLuu();
  try {
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
    /* Trước đây ảnh đã sửa đẩy vào kho Supabase — sót lại từ thời chưa có R2.
       Giờ đi cùng một đường với mọi ảnh khác: /api/tai-len -> kho R2. */
    const url = await taiLen(blob, PH.id, 'image/jpeg', 'sua-' + Date.now() + '.jpg');
    const cot = S.bo === 'sau' ? 'anh_sau' : 'anh_truoc';
    /* THAY BẢN CŨ TẠI CHỖ (Trường chốt 30/08) — trước đây mỗi lần sửa lại CỘNG
       THÊM một ảnh mới, sửa vài lần là phiếu phình ra cả chục tấm sinh đôi,
       vuốt sang tưởng đơ. Ảnh gốc vẫn nằm trong kho + dòng Trao đổi bên dưới
       giữ ảnh mới, không mất vết gì. */
    const ds = (S.bo === 'sau' ? (PH.anhSau || []) : (PH.anhTruoc || [])).slice();
    const vt = ds.indexOf(S.url);
    if (vt >= 0) ds[vt] = url; else ds.push(url);
    await ghi('phieu_loi', 'update', { [cot]: ds }, PH.id);
    if (S.bo === 'sau') PH.anhSau = ds; else PH.anhTruoc = ds;
    await themDienBien(PH.id, 'chat', 'Đã ghi chú lên ảnh' + (S.lop.some(l => l.loai === 'chu') ? ': ' + S.lop.filter(l => l.loai === 'chu').map(l => '“' + l.text + '”').join(' ') : ''), [url]);
    veVet(PH.id, 'sua_anh', { soLop: S.lop.length, bo: S.bo });
    luuCache();
    dongSuaAnh(); dongXem(); veNgan(); veHet();
    nhac('Đã lưu ảnh đã sửa vào phiếu', 'la');
  } catch (e) {
    nhac('Lưu ảnh không được — thử lại', 'do');
  } finally { tatLuu(); }
}

/* ================= SỰ KIỆN RIÊNG CỦA CỤM ẢNH ================= */
document.addEventListener('click', e => {
  const t = e.target.closest('button,a,i,[data-xi],[data-dgsua]'); if (!t) return;
  const d = t.dataset || {};

  /* màn duyệt trước khi gửi */
  if (d.dgxoa !== undefined) {
    const i = Number(d.dgxoa);
    try { URL.revokeObjectURL((DG.ds[i] || {}).url); } catch (e2) { }
    DG.ds.splice(i, 1);
    if (!DG.ds.length) { xongDuyet(null); } else veDuyet();
    return;
  }
  if (d.dghuy !== undefined) return xongDuyet(null);
  if (d.dggui !== undefined) {
    /* còn ảnh đang mở dở thì chưa cho gửi — bấm lúc này là gửi thiếu (07/09).
       Ảnh không xem trước được vẫn tính là xong (x.khongXem) — nó gửi được. */
    if (DG.ds.some(x => !x.url && !x.khongXem)) { nhac('Chờ mở xong hết ảnh đã — sắp rồi', 'canh'); return; }
    return xongDuyet(DG.ds.map(x => x.f));
  }
  if (d.dgsua !== undefined) {
    const i = Number(d.dgsua), x = DG.ds[i]; if (!x) return;
    if (!x.url) { nhac('Ảnh này đang mở, chờ một nhịp', 'canh'); return; }
    const dv = document.getElementById('duyetAnh'); if (dv) dv.style.display = 'none';
    S.tuDuyet = true;
    moSuaAnhGoi(x.f, i + 1, DG.ds.length, async kq => {
      S.tuDuyet = false;
      if (kq && kq !== 'HUY') {
        try { URL.revokeObjectURL(x.url); } catch (e2) { }
        x.f = kq; x.sua = true;
        x.url = await anhXemNho(kq);      /* bản xem lại cũng phải là bản NHỎ */
      }
      veDuyet();
    });
    return;
  }

  if (d.xbuoc) return buocXem(Number(d.xbuoc));
  if (d.xsua) { const it = V.ds[V.i] || {}; dongXem(); return moSuaAnh(it.u, it.bo); }
  if (d.scong) return lenhSua('cong', d.scong);
  if (d.smau) return lenhSua('mau', d.smau);
  if (d.sday) return lenhSua('day', d.sday);
  if (d.shoantac) return lenhSua('hoantac');
  if (d.slamlai) return lenhSua('lamlai');
  if (d.sgoc) return lenhSua('goc');
  if (d.sxoalop) return lenhSua('xoalop', d.sxoalop);
  if (d.scat) return lenhSua('cat');
  if (d.sdong) return dongSuaAnh();
  if (d.sbo) { const cb = S.cb; S.cb = null; dongSuaAnh(); if (cb) cb(null); return; }
  if (d.sluu) return luuAnhSua();
});
document.addEventListener('change', e => {
  const s = e.target;
  if (s.dataset && s.dataset.scochu) return lenhSua('cochu', s.value);
});
document.addEventListener('input', e => {
  const s = e.target;
  if (s.dataset && s.dataset.ssang) return lenhSua('sang', s.value);
});
window.addEventListener('resize', () => { if (document.getElementById('sCanvas')) dungCanvas(); });
