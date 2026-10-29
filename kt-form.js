/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Ngăn chi tiết, 4 form hành động, xem ảnh
   ============================================================ */
'use strict';

let PH = null;          // phiếu đang mở
let TAB = 'tt';         // tt | chat | anh
let TAM = { anh: [], cho: [], hua: [] };  // cho = đang tải · hua = lời hứa sẽ có URL
let FORM = null;        // form đang mở + dữ liệu đã gõ, để không mất khi đi thêm ảnh

/* ghi nhớ mọi thứ đang gõ trong tấm trượt */
function luuForm(loai) {
  const gt = {};
  document.querySelectorAll('#sheet input, #sheet textarea, #sheet select').forEach(e => {
    if (e.id) gt[e.id] = e.value;
  });
  const muc = document.querySelector('#g_muc .on');
  const tho = [].map.call(document.querySelectorAll('#x_tho .on'), b => b.dataset.tho);
  FORM = { loai: loai, gt: gt, muc: muc ? muc.dataset.muc : null, tho: tho };
}
/* MO_LAI = form đang được dựng lại sau khi đi chọn ảnh.
   Lúc đó TUYỆT ĐỐI không được xoá TAM.anh, nếu không ảnh đã gửi xong sẽ
   biến mất khỏi màn hình (mà vẫn lặng lẽ vào phiếu lúc bấm Gửi). */
let MO_LAI = false;

/* mở lại đúng form đó và điền lại những gì đã gõ */
function moLaiForm() {
  if (!FORM) return false;
  const f = FORM;
  MO_LAI = true;
  try {
    if (f.loai === 'giaoviec') formGiaoViec();
    else if (f.loai === 'baoxong') formBaoXong();
    else if (f.loai === 'chuadat') formNghiemThu(false);
    else if (f.loai === 'suaphieu') formSuaPhieu();
    else return false;
  } finally { MO_LAI = false; }
  setTimeout(() => {
    Object.keys(f.gt).forEach(id => {
      const e = document.getElementById(id);
      if (e && f.gt[id] !== undefined && f.gt[id] !== '') e.value = f.gt[id];
    });
    if (f.gt.g_cs) { napGianHang(); const e = document.getElementById('g_gh'); if (e && f.gt.g_gh) e.value = f.gt.g_gh; }
    if (f.muc) { const b = document.querySelector('#g_muc [data-muc="' + f.muc + '"]'); if (b) b.click(); }
    if (f.tho && f.tho.length) {
      document.querySelectorAll('#x_tho button').forEach(b => b.classList.toggle('on', f.tho.includes(b.dataset.tho)));
    }
  }, 30);
  return true;
}

const phieu = id => D.phieu.find(p => p.id === id);

/* ================= NGĂN CHI TIẾT ================= */
/* TU_LICH = đang mở/đóng do nút back của máy, đừng đẩy thêm bước lịch sử nữa */
let TU_LICH = false;
/* BO_POP = lần popstate sắp tới là do MÌNH chủ động history.back() để NHẢ cái nấc
   của ngăn/sheet vừa đóng — không phải người dùng bấm Back. Không có cờ này thì
   đóng 1 sheet ở tab Thống kê sẽ bị hiểu nhầm là "lùi thêm lớp" và đá về Danh
   sách (Trường báo 07/09: đang ở Thống kê, mở-đóng gì cũng văng về Danh sách). */
let BO_POP = false;

/* đường về màn vừa rời — xem ghi chú đầy đủ ở moPhieuTu bên dưới */
let MAN_TRUOC = null;

function moChiTiet(id) {
  /* mở phiếu theo đường thường = không có màn nào để quay về; moPhieuTu() sẽ
     cắm lại đường về NGAY SAU khi gọi hàm này (24/09) */
  MAN_TRUOC = null;
  PH = phieu(id); if (!PH) return;
  if (typeof ghiVao === 'function') ghiVao(id);   /* nhớ mốc "mình vừa vào" (09/09) */
  TAB = 'tt';
  /* nhớ số tin CHƯA ĐỌC ngay lúc mở (01/09) — lát nữa cuộn dừng đúng chỗ đó,
     phải chụp trước vì ghiDaXem sẽ ghi đè "đã đọc hết" ngay sau */
  CHUA_DOC_MO = VACH_SO = tinChuaDoc(id);
  SO_TIN_DAY = 0;
  document.getElementById('nenMo').classList.remove('an');
  document.getElementById('ngan').classList.remove('an');
  veNgan();
  napDienBien(id);
  /* Vừa mở phiếu là lúc người ta đang chăm chú nhất → bắt đầu bằng nhịp nhanh 1,5 giây,
     im lâu mới giãn dần ra. (Không đặt mốc này thì nhịp khởi động rơi vào 12 giây,
     mở phiếu ra ngồi đợi cả chục giây mới thấy tin — đúng cái Trường chê.) */
  LUC_CO_TIN = Date.now();
  batNhipChat(true);                  // tin của người kia tự về, không phải đóng mở lại phiếu
  /* báo cho máy chủ "đang mở phiếu này" + hỏi ai đang mở cùng (21/10) */
  if (typeof dangXemBat === 'function') dangXemBat(id);
  /* ghi một bước lịch sử để nút ‹ của iPhone / vuốt từ mép trái cũng đóng được phiếu */
  if (!TU_LICH) { try { history.pushState({ p: id }, '', '?p=' + encodeURIComponent(id)); } catch (e) { } }
}
function dongNgan() {
  const dangMo = !!PH;
  const idVua = PH && PH.id;
  PH = null;
  TRA_LOI = null;                     // đóng phiếu là thôi trạng thái "đang trả lời"
  CHUA_DOC_MO = VACH_SO = 0;          // vạch chưa-đọc chỉ sống trong một lần mở (01/09)
  tatNhipChat();                      // đóng phiếu là thôi hỏi máy chủ, khỏi tốn
  if (typeof dangXemTat === 'function') dangXemTat();
  const nnCu = document.getElementById('nganNoi');
  if (nnCu) nnCu.onscroll = null;     // tháo tay theo cuộn, khỏi chạy khi phiếu đã đóng
  document.getElementById('nenMo').classList.add('an');
  document.getElementById('ngan').classList.add('an');
  /* vừa đọc xong phiếu này → vẽ lại danh sách cho nhãn 💬 đỏ tắt ngay */
  if (idVua) { ghiDaXem(idVua); if (typeof veDanhSach === 'function') veDanhSach(); }
  if (!TU_LICH && dangMo && history.state && history.state.p) { BO_POP = true; try { history.back(); } catch (e) { BO_POP = false; } }
  /* ============================================================
     XOÁ ?p=... KHỎI ĐỊA CHỈ (28/10 — Trường: "mỗi lần tải lại trang là tự
     hiện cái phiếu này lên mà không hiểu tại sao").

     NGUYÊN NHÂN: mở phiếu thì web ghi ?p=KT-0015 vào địa chỉ (để nút ‹ của
     iPhone và link chia sẻ dùng được). Đóng phiếu thì nó gọi history.back()
     để nhả cái nấc đó ra — nhưng history.back() CHỈ chạy khi history.state
     còn mang mã phiếu. Mở phiếu rồi mở tiếp tấm trượt, hay đóng bằng đường
     khác, là state đã đổi → không back → địa chỉ vẫn dính ?p=KT-0015. Tải
     lại trang là moTheoLink() đọc đúng mã đó và mở lại y như cũ.

     Back chạy bất đồng bộ nên phải đợi một nhịp rồi mới kiểm, không thì xoá
     nhầm lúc back còn đang chạy dở.
     ============================================================ */
  setTimeout(xoaMaPhieuTrenLink, 60);
}

/* Gỡ ?p= khỏi địa chỉ mà KHÔNG thêm một nấc lịch sử mới (replaceState).
   Giữ nguyên mọi tham số khác — đường vào bằng ?ai=... vẫn còn tác dụng. */
function xoaMaPhieuTrenLink() {
  try {
    const u = new URL(location.href);
    if (!u.searchParams.has('p')) return;
    u.searchParams.delete('p');
    const q = u.searchParams.toString();
    history.replaceState(history.state, '', u.pathname + (q ? '?' + q : '') + u.hash);
  } catch (e) { }
}
/* MỘT handler back DUY NHẤT cho cả app (hợp nhất 04/09): lùi từng LỚP trên
   xuống — sửa ảnh → xem ảnh → duyệt ảnh → tấm trượt → phiếu → tab Thống kê →
   hết lớp mới thoát app. Màn PIN quản lý không cho back né qua. */
/* ============================================================
   LÙI MỘT LỚP TRONG CỤM TẤM TRƯỢT (luật Trường đặt 08/09):
   "← hoặc vuốt cạnh thì lùi lần lượt, ✕ mới thoát hẳn, và lùi về phải đúng chỗ
   vừa đứng chứ đừng giật lên đầu."
   Trước đây vuốt cạnh ở màn "Thêm ảnh" là ĐÓNG SẬP cả form đang khai (mất chữ
   đang gõ), ở màn một cơ sở là đóng sập cả cụm Quản lý. Hàm này lùi đúng một
   lớp và trả lại đúng vị trí cuộn; trả về true nghĩa là đã lùi, đừng đóng.
   ============================================================ */
/* ============================================================
   ĐƯỜNG VỀ MÀN TRƯỚC (24/09 — Trường nhắc: "ấn quay lại thì phải lần lượt
   quay về mục trước đó, trừ khi ấn ✕ thì quay lại hẳn").

   Bệnh cũ: bấm một dòng trong 💬 Trao đổi (hay Radar, Báo cáo, Lý lịch) thì
   mã gọi dongSheet() rồi mới mở phiếu. Mà dongSheet() NHẢ luôn cái nấc lịch
   sử của màn đó — nên từ phiếu bấm Back là thoát thẳng ra ngoài, mất đường
   về chỗ vừa đứng. Người dùng phải mò lại từ đầu.

   Cách chữa: nhớ lại màn vừa rời, đóng tấm trượt mà GIỮ nấc, rồi mở phiếu.
   Back ở phiếu → đóng phiếu rồi vẽ lại đúng màn đó.
   Bấm ✕ thì xoá đường về — đóng là đóng hẳn, đúng ý Trường.
   ============================================================ */
function moPhieuTu(id, veLai) {
  dongSheet(true);                 /* true = giữ nấc lịch sử của màn vừa rời */
  const r = moChiTiet(id);
  MAN_TRUOC = veLai || null;       /* đặt SAU: moChiTiet xoá đường về ở đầu hàm */
  return r;
}
function veManTruoc() {
  const f = MAN_TRUOC; MAN_TRUOC = null;
  if (typeof f !== 'function') return false;
  try { f(); } catch (e) { return false; }
  return true;
}

function luiMotLop() {
  const s = document.getElementById('sheet');
  if (!s || s.classList.contains('an')) return false;
  /* menu Thêm ảnh / khay ＋ đè lên form đang khai → về lại form, giữ chữ đang gõ */
  if (s.querySelector('[data-chon]') && typeof moLaiForm === 'function' && moLaiForm()) return true;
  /* cụm Quản lý: mọi màn con đều mang sẵn nút ‹ ghi rõ lùi về đâu */
  const lui = s.querySelector('[data-qlve]');
  if (lui && typeof qlVeMan === 'function') { qlVeMan(lui.dataset.qlve); return true; }
  return false;
}

window.addEventListener('popstate', e => {
  /* Back-ngầm của mình để nhả nấc ngăn/sheet vừa đóng: nuốt, đừng xử lý gì thêm */
  if (BO_POP) { BO_POP = false; return; }
  TU_LICH = true;
  try {
    const sheetMo = !document.getElementById('sheet').classList.contains('an');
    if (sheetMo && document.getElementById('pin1') && !document.getElementById('pin0')) {
      try { history.pushState({ ktLop: 1 }, ''); } catch (x) { }   /* PIN đứng im */
      return;
    }
    /* đang đứng ở màn "Bạn là ai?" mà còn người dùng dở → Back trả về người đó (08/09) */
    if (!document.getElementById('manVao').classList.contains('an') &&
        typeof NGUOI_CU !== 'undefined' && NGUOI_CU) {
      datNguoi(NGUOI_CU); NGUOI_CU = null; vaoApp(); return;
    }
    if (document.getElementById('suaAnh')) return dongSuaAnh();
    if (document.getElementById('xemAnh')) return dongXem();
    const duyet = document.getElementById('duyetAnh');
    if (duyet && duyet.style.display !== 'none') return xongDuyet(null);
    if (sheetMo) {
      /* vuốt cạnh / nút Back = lùi MỘT lớp; hết lớp mới đóng cả tấm trượt */
      if (luiMotLop()) { try { history.pushState({ ktLop: 1 }, ''); } catch (x) { } return; }
      return dongSheet();
    }
    const id = e.state && e.state.p;
    if (id && phieu(id)) return moChiTiet(id);
    if (PH) {
      dongNgan();
      /* có đường về thì vẽ lại màn đó và cắm nấc mới — Back tiếp sẽ đóng nó */
      if (veManTruoc()) { try { history.pushState({ ktLop: 1 }, ''); } catch (x) { } }
      return;
    }
    if (typeof TAB_CHINH !== 'undefined' && typeof laQuanLy === 'function' && laQuanLy() && TAB_CHINH === 'tk') {
      TAB_CHINH = 'ds'; veHet();
      try { history.pushState({ ktLop: 1 }, ''); } catch (x) { }   /* về Danh sách, chưa thoát */
      return;
    }
    /* ============================================================
       ĐANG LỌC THÌ BACK = BỎ LỌC (21/09 — Trường: "bất cứ khi nào ấn vào hệ
       thống lọc thì làm sao để back quay lại").
       Bấm một dòng biểu đồ là danh sách đổi hẳn — với người dùng đó là "đi vào
       một chỗ", nên Back phải đưa về chỗ cũ chứ không phải thoát app. Đặt sau
       cùng: mọi lớp khác (ảnh, tấm trượt, ngăn phiếu, tab Thống kê) vẫn được
       lùi trước như cũ.
       ============================================================ */
    if (typeof dangLocGi === 'function' && dangLocGi()) {
      L.the = ''; L.chip = 'tatca'; L.coSo = ''; L.gian = ''; L.ma = null;
      L.nhom = ''; L.mucDo = ''; L.tho = ''; L.tt = ''; L.vuong = ''; L.tim = '';
      const oT = document.getElementById('oTim'); if (oT) oT.value = '';
      L.trang = 1; veHet();
      try { history.pushState({ ktLop: 1 }, ''); } catch (x) { }
      if (typeof nhac === 'function') nhac('Đã bỏ lọc — xem lại tất cả', 'canh');
      return;
    }
    /* không còn lớp nào — để máy lùi thật (thoát app) như mọi app khác */
  } finally { TU_LICH = false; }
});
async function napDienBien(id, im) {
  let d;
  try { d = await goiAPI('dien-bien?phieu=' + encodeURIComponent(id)); }
  catch (e) { if (!im) console.error('[dienBien]', e); return; }
  const moi = (d.dien_bien || []).map(x => ({
    id: x.id, t: ms(x.created_at), loai: x.loai,
    ten: tenNguoi(x.nguoi_ten || x.nguoi_dung_id), text: x.noi_dung || '', anh: x.anh || []
  }));
  /* Vẽ lại chỉ khi THẬT SỰ có gì đổi — nếu cứ 7 giây vẽ lại một lần thì ngăn chat
     nhấp nháy và chữ đang gõ dở bay mất (Trường nhắn tin lúc người kia cũng đang gõ). */
  const cu = D.dienBien[id] || [];
  const khac = cu.length !== moi.length ||
    cu.some((x, i) => x.id !== moi[i].id || x.text !== moi[i].text || (x.anh || []).length !== (moi[i].anh || []).length);
  D.dienBien[id] = moi;
  /* AI ĐÃ XEM tới lúc nào (31/08) — đổi thì cũng phải vẽ lại để avatar đã-xem nhảy.
     Nhưng SO SÁNH BỎ CHÍNH MÌNH (03/09): mình gõ/mình xem cũng làm mốc của mình
     đổi → trước đây cứ 15 giây lại vẽ lại một phát vô ích ngay lúc đang gõ. */
  const xemMoi = (d.xem || []).map(x => ({ ten: tenNguoi(x.nguoi_ten) || x.nguoi_ten, luc: ms(x.luc), go: x.go ? ms(x.go) : 0 }));
  D.xemPhieu = D.xemPhieu || {};
  const boToi = ds => ds.filter(x => x.ten !== (D.nguoi || {}).ten);
  const xemKhac = JSON.stringify(boToi(xemMoi)) !== JSON.stringify(boToi(D.xemPhieu[id] || []));
  D.xemPhieu[id] = xemMoi;
  /* đang mở phiếu = đang đọc → nhớ "đã đọc tới tin thứ mấy" để nhãn 💬 ngoài
     danh sách tắt đỏ (Trường xin 30/08) + báo máy chủ cho người kia thấy ✓ đã xem */
  if (PH && PH.id === id) { ghiDaXem(id); ghiXemServer(id); }
  if (PH && PH.id === id && (khac || xemKhac)) veNgan(true);
  return khac;
}

/* báo "tôi đang xem phiếu này" — hãm 15 giây cho khỏi dội máy chủ.
   Khoá hãm theo PHIẾU + NGƯỜI: máy dùng chung đổi người trong 15 giây thì
   người mới vẫn được ghi đã-xem (bẫy tự dính 31/08). */
const XEM_GUI = {};
function ghiXemServer(id) {
  if (!id || !(D.nguoi || {}).ten) return;
  const k = id + '|' + D.nguoi.ten;
  const truoc = XEM_GUI[k] || 0;
  if (Date.now() - truoc < 15000) return;
  XEM_GUI[k] = Date.now();
  goiAPI('ghi-xem', { phieu_id: id, nguoi_ten: D.nguoi.ten })
    .catch(() => { XEM_GUI[k] = truoc; });   /* hỏng thì lần sau thử lại, không làm ồn */
}

/* báo "tôi ĐANG GÕ" (Trường chốt 31/08) — hãm 3 giây/lần, gõ cũng tính là đã xem */
let GO_GUI = 0;
function goTinServer() {
  if (!PH || !(D.nguoi || {}).ten) return;
  if (Date.now() - GO_GUI < 3000) return;
  GO_GUI = Date.now();
  XEM_GUI[PH.id + '|' + D.nguoi.ten] = Date.now();   // khỏi bắn thêm phát "xem" thường
  goiAPI('ghi-xem', { phieu_id: PH.id, nguoi_ten: D.nguoi.ten, go: 1 }).catch(() => { });
}

/* 3 chấm nhảy "… đang gõ" — ai khác có mốc gõ trong 6 giây và CHƯA kịp gửi tin.
   Hết 6 giây phải tự tắt kể cả không có tin mới → hẹn vẽ lại một phát. */
let DGO_T = 0;
function dangGoHtml(p, db, tenToi) {
  let h = '', conLai = 0;
  ((D.xemPhieu || {})[p.id] || []).forEach(x => {
    if (!x.go || x.ten === tenToi || Date.now() - x.go > 6000) return;
    const tinX = db.filter(e => e.loai === 'chat' && e.ten === x.ten).pop();
    if (tinX && tinX.t >= x.go) return;          // vừa gửi tin xong là thôi nhảy
    conLai = Math.max(conLai, 6000 - (Date.now() - x.go));   // còn bao lâu thì hết hạn
    const mau = mauTho(x.ten) !== '#64748B' ? mauTho(x.ten) : '#BE185D';
    h += '<div class="bb godg"><span class="av' + (anhCua(x.ten) ? ' coAnh' : '') + '" style="background:' + (anhCua(x.ten) ? 'url(' + esc(anhCua(x.ten)) + ') center/cover' : mau) + '" title="' + esc(x.ten) + ' đang nhắn…">' +
      esc((x.ten || '?').trim().slice(0, 1)) + '</span>' +
      '<div class="noi"><div class="bong dgo"><i></i><i></i><i></i></div></div></div>';
  });
  clearTimeout(DGO_T);
  /* hẹn tắt ĐÚNG lúc mốc gõ hết hạn (không phải 6,3s kể từ lần vẽ — vẽ lại
     giữa chừng là chấm sống lố, bẫy tự dính 31/08) */
  if (h) DGO_T = setTimeout(() => { if (PH && PH.id === p.id) veNgan(true); }, conLai + 250);
  return h;
}

/* ============================================================
   TIN NHẮN CHẠY LIÊN TỤC (Trường báo 26/08: "có trao đổi được đâu,
   nó không diễn ra liên tục"). Trước đây tin chỉ nạp MỘT LẦN lúc mở phiếu:
   người kia nhắn thì máy mình không bao giờ thấy, phải đóng mở lại phiếu.
   Giờ: đang mở phiếu + màn đang sáng thì cứ 7 giây hỏi máy chủ một lần,
   chỉ hỏi đúng phiếu đang mở (một câu nhẹ, vài dòng đọc), và chỉ vẽ lại
   khi có tin mới thật. Đóng phiếu hoặc tắt màn là dừng ngay, không tốn gì.
   ============================================================ */
/* NHỊP THÍCH ỨNG (Trường 26/08: "làm gì có chuyện đợi 7s mới nhận được tin nhắn"):
   Đang nói chuyện qua lại thì hỏi máy chủ 1,5 giây/lần — nhanh như nhắn Zalo.
   Im được nửa phút thì giãn ra 5 giây, im lâu nữa thì 12 giây. Nhờ vậy vừa nhanh
   lúc cần, vừa không hỏi vô ích cả ngày khi phiếu chẳng ai nói gì.
   Cộng thêm: có thông báo đẩy về là cập nhật NGAY, không đợi hết nhịp. */
let NHIP_CHAT = 0, LUC_CO_TIN = 0, NHIP_DANG = 0;
/* nút ⌄ + pill "N tin mới" + mốc chưa-đọc lúc mở phiếu (01/09).
   VACH_SO giữ vị trí vạch đỏ suốt phiên mở phiếu; CHUA_DOC_MO chỉ để cuộn 1 lần. */
let CHUA_DOC_MO = 0, SO_TIN_DAY = 0, VACH_SO = 0;
function capNhatNutDay() {
  const nn = document.getElementById('nganNoi');
  if (!nn || !PH || TAB !== 'chat') return;
  let nut = document.getElementById('nutDay');
  const oDay = (nn.scrollHeight - nn.scrollTop - nn.clientHeight) < 60;
  if (oDay) {
    SO_TIN_DAY = soTinChat(PH.id);            /* chạm đáy = đã xem hết */
    if (nut) nut.classList.add('an');
    return;
  }
  if (!nut) {
    nut = document.createElement('button');
    nut.id = 'nutDay'; nut.className = 'nutDay';
    nut.dataset.vedaay = '1';
    document.getElementById('ngan').appendChild(nut);
  }
  const moi = Math.max(0, soTinChat(PH.id) - (SO_TIN_DAY || soTinChat(PH.id)));
  nut.classList.remove('an');
  nut.classList.toggle('coMoi', moi > 0);
  nut.innerHTML = (moi ? moi + ' tin mới ' : '') + '<b>⌄</b>';
}
function nhipNen() {
  const im = Date.now() - (LUC_CO_TIN || 0);
  if (im < 30000) return 1500;          // vừa có tin trong 30 giây → đang trò chuyện
  if (im < 180000) return 5000;         // im 30 giây–3 phút
  return 12000;                          // phiếu nguội
}
function batNhipChat(ep) {
  const can = nhipNen();
  if (NHIP_CHAT && NHIP_DANG === can && !ep) return;     // đang đúng nhịp rồi
  tatNhipChat();
  NHIP_DANG = can;
  NHIP_CHAT = setInterval(async () => {
    if (!PH || document.visibilityState !== 'visible') return;
    const coMoi = await napDienBien(PH.id, true);
    if (coMoi) LUC_CO_TIN = Date.now();
    if (nhipNen() !== NHIP_DANG) batNhipChat(true);      // đổi nhịp khi cuộc nói chuyện nóng/nguội
  }, can);
}
function tatNhipChat() { if (NHIP_CHAT) { clearInterval(NHIP_CHAT); NHIP_CHAT = 0; NHIP_DANG = 0; } }
/* vừa gửi hoặc vừa nhận tin → coi như đang trò chuyện, siết nhịp xuống 1,5 giây */
function nongChat() { LUC_CO_TIN = Date.now(); if (PH) batNhipChat(true); }

function veNgan(tuNhip) {
  const p = PH; if (!p) return;
  /* ĐANG GÕ THÌ KHÔNG ĐẬP CẢ NGĂN (Trường bắt 03/09 kèm video: bàn phím cứ tụt).
     Vẽ lại innerHTML là Ô NHẮN bị thay mới → mất tiêu điểm → bàn phím sập.
     Đang gõ trong ô nhắn: chỉ thay phần DANH SÁCH TIN, giữ nguyên ô đang gõ. */
  if (tuNhip && TAB === 'chat' && document.activeElement && document.activeElement.id === 'oTin') {
    const tl = document.querySelector('#ngan .tinList');
    const nn0 = document.getElementById('nganNoi');
    if (tl && nn0) {
      const oDay0 = (nn0.scrollHeight - nn0.scrollTop - nn0.clientHeight) < 60;
      const choCu0 = nn0.scrollTop;
      tl.innerHTML = veTin(p);
      nn0.scrollTop = oDay0 ? nn0.scrollHeight : choCu0;
      capNhatNutDay();
      return;
    }
  }
  /* Vẽ lại vì tin mới về (không phải do người dùng bấm) thì phải GIỮ NGUYÊN
     chữ đang gõ dở và chỗ đang đọc — nếu không, đang gõ mà người kia nhắn là mất chữ. */
  const oCu = document.getElementById('oTin');
  const chuDangGo = tuNhip && oCu ? oCu.value : null;
  const nnCu = document.getElementById('nganNoi');
  const dangODay = !nnCu || (nnCu.scrollHeight - nnCu.scrollTop - nnCu.clientHeight) < 60;
  const choDocCu = nnCu ? nnCu.scrollTop : 0;
  const tre = soNgayTre(p);
  const soTin = (D.dienBien[p.id] || []).filter(e => e.loai === 'chat').length;
  /* Nhãn tab phải đếm CẢ ảnh gửi trong lúc trao đổi (07/09): phiếu có 31 ảnh
     chat mà tab ghi trơ "Ảnh đối chiếu" thì không ai biết trong đó có ảnh.
     Đếm theo địa chỉ duy nhất, bỏ tin thoại, khỏi cộng trùng. */
  const soAnh = (() => {
    const tap = {};
    (p.anhTruoc || []).concat(p.anhSau || []).forEach(u => { if (u && !laTiengNoi(u)) tap[u] = 1; });
    (D.dienBien[p.id] || []).forEach(e => (e.anh || []).forEach(u => { if (u && !laTiengNoi(u)) tap[u] = 1; }));
    return Object.keys(tap).length;
  })();
  if (TAB !== 'anh') TAB = 'chat';          /* chỉ còn 2 tab, bỏ tab Tiến trình */

  /* Băng đỏ và dải ghim nằm NGOÀI khung cuộn — cuộn tin thế nào cũng thấy.
     Trước đây thẻ phiếu nằm trong danh sách nên đọc xuống là mất hút. */
  const bang = tre
    ? '<div class="bangTre">⚠ QUÁ HẠN ' + tre + ' NGÀY<span>hẹn xong ' + ddyy(han(p)) + ' · hôm nay ' + ddyy(Date.now()) + '</span></div>'
    : (p.chtKetQua === 'chua_dat'
      ? '<div class="bangTre cam">↩ CHT TRẢ LẠI — CHƯA ĐẠT<span>' + esc(p.chtGhi || 'phải làm lại') + '</span></div>' : '');

  document.getElementById('ngan').innerHTML =
    /* ‹ = LÙI MỘT BƯỚC (về hộp thư / Radar / danh sách — tuỳ mình đến từ đâu)
       ✕ = ĐÓNG HẲN. Hai nút hai việc khác nhau, trước đây dùng chung một lệnh
       nên bấm mũi tên cũng văng thẳng về danh sách (Trường bắt 24/09). */
    /* data-velai chứ không phải data-ve: nút LƯU ở màn Sửa người đã dùng
       data-ve từ 08/09 để nhớ đường về, trùng tên là nút Lưu chết câm (02/10) */
    '<div class="nganDau"><button class="ve" data-velai="1" title="Trở lại">‹</button>' +
    '<div><div class="ma">' + esc(p.id) + ' · ' + esc(tenCoSo(p.coSoId)) + '</div><b>' + esc(p.noiDung) + '</b></div>' +
    /* nút ⋯ bỏ 03/10 (Trường chốt) — mọi việc với phiếu đã gom vào khay ＋
       dưới ô nhắn tin, một cửa duy nhất */
    '<button class="x" data-dong="1" title="Đóng">✕</button></div>' +
    /* chỗ cho nhãn "ai đang mở phiếu này" (21/10) — để RỖNG sẵn, nhịp 20 giây
       tự điền vào. Khai sẵn ô chứ không chèn thẻ mới mỗi lần: chèn thì ngăn
       nhảy giật một cái mỗi lần có người vào xem. */
    '<div id="dxCho" class="dxCho"></div>' +
    '<div class="nganTab">' +
    '<button data-tab="chat" class="' + (TAB === 'chat' ? 'on' : '') + '">Trao đổi' + (soTin ? ' <i>' + soTin + '</i>' : '') + '</button>' +
    '<button data-tab="anh" class="' + (TAB === 'anh' ? 'on' : '') + '">Ảnh đối chiếu' + (soAnh ? ' ' + soAnh : '') + '</button>' +
    '</div>' +
    (TAB === 'chat' ? bang + '<div class="ghim">' + ghimPhieu(p) + '</div>' + khungGhim(p) : '') +
    '<div class="nganNoi' + (TAB === 'anh' ? ' anhDC' : '') + '" id="nganNoi">' +
      (TAB === 'chat' ? '<div class="tinList">' + veTin(p) + '</div>' : veTabAnh(p)) +
    '</div>' +
    (TAB === 'chat' ? chanHai(p) : '');

  const nn = document.getElementById('nganNoi');
  if (TAB === 'chat' && nn) {
    const vach = nn.querySelector('.vachChuaDoc');
    if (CHUA_DOC_MO > 0 && vach) {
      /* MỞ PHIẾU CÓ TIN CHƯA ĐỌC (01/09, kiểu Zalo): dừng ngay chỗ đọc dở,
         không nhảy tọt xuống đáy nữa — vạch do veTin vẽ sẵn trong luồng */
      nn.scrollTop = Math.max(0, vach.offsetTop - 70);
      SO_TIN_DAY = soTin - CHUA_DOC_MO;      /* để nút ⌄ đếm đúng "N tin mới" */
      CHUA_DOC_MO = 0;
    } else {
      /* đang đọc lại tin cũ ở giữa thì đừng giật xuống đáy; đang ở đáy thì theo tin mới */
      nn.scrollTop = (tuNhip && !dangODay) ? choDocCu : nn.scrollHeight;
    }
    /* GÁN ĐÈ, KHÔNG CỘNG DỒN (Trường bắt 08/09: "mở phiếu rồi thoát ra là phiếu
       lag, không vuốt lên xuống được"). veNgan() chạy lại mỗi nhịp chat 1,5 giây
       và mỗi lần vẽ lại, mà #nganNoi thì không bị thay mới — addEventListener cũ
       cứ thế dồn lên nhau, mở phiếu vài phút là hàng chục handler cùng chạy trên
       MỖI cú vuốt. Dùng onscroll thì lần nào cũng chỉ có đúng một handler. */
    nn.onscroll = capNhatNutDay;
    capNhatNutDay();
  }
  if (typeof veThanhTraLoi === 'function') veThanhTraLoi();   /* vẽ lại thanh "đang trả lời" sau mỗi lần dựng ngăn */
  if (chuDangGo) {
    const oMoi = document.getElementById('oTin');
    if (oMoi) { oMoi.value = chuDangGo; }
  }
  /* vẽ lại ngăn thì phải đặt lại đúng nút 🎤 / ➤ theo ô có chữ hay không (07/09) */
  if (TAB === 'chat' && typeof doiMicGui === 'function') doiMicGui();
}

/* ============================================================
   ĐÁY KHUNG CHAT (gọn lại 07/09 — Trường: "nó cứ hiện cái này, tinh gọn lại").
   Chỉ còn: [việc CHÍNH nếu có] + MỘT dòng nhắn tin.
   · Việc chính = nút phải bấm theo trạng thái (Nhận việc / Báo xong / Xác nhận
     ĐẠT) — không bao giờ giấu, giấu là đứt vòng đời phiếu.
   · Việc phụ → menu ⋯ trên header.
   · Chip câu nhắn sẵn + chọn ảnh/video/thoại → khay của nút ＋.
   ============================================================ */
function chanHai(p) {
  const nut = nutHanhDong(p);
  const xong = ['nghiemthu', 'huy'].includes(p.trangThai);
  /* dòng cho biết ai đang làm — thay cả hàng nút cũ của CHT/admin */
  let dong = '';
  if (!xong && !nut && !laTho())
    dong = '<div class="chanTin">' + (p.nguoiNhanKt
      ? esc(p.nguoiNhanKt) + ' đang xử lý' + (p.duKien ? ' · hẹn xong ' + ddyy(p.duKien) : '')
      : 'Chờ kỹ thuật tiếp nhận') + '</div>';
  return '<div class="chanHai">' +
    (xong || !nut ? '' : '<div class="chanNut">' + nut + '</div>') + dong +
    oNhanTin() + '</div>';
}

/* CHIP TRẢ LỜI NHANH (Trường chốt 31/08, tham khảo Zalo): câu hay gõ nhất thành
   nút, bấm 1 phát là gửi luôn — thợ đang treo trên thang không rảnh tay gõ.
   Bộ chip theo VAI; đang gõ chữ thì hàng chip tự ẩn cho đỡ rối (mối lo 31/08). */
function chipNhanh() {
  let ds;
  if (laTho()) ds = ['👍 Đã nhận thông tin', '🔍 Đang kiểm tra', '📦 Chờ linh kiện', '🕐 Mai tôi qua xử lý'];
  else if (laCoSo()) ds = ['👍 Đã rõ', '⏰ Bao giờ xong?', '🙏 Ưu tiên giúp nhé', '✅ Đã chạy lại rồi'];
  else ds = ['👍 Đã rõ', '⏰ Bao giờ xong?', '👏 Tốt lắm', '🙏 Ưu tiên việc này nhé'];
  return '<div class="chipNhanh" id="chipNhanh">' + ds.map(c =>
    '<button data-chipnhanh="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
}

/* ============================================================
   ① BỘ ẢNH TO KIỂU ZALO
   Mở phiếu là thấy ngay lỗi gì, khỏi phải bấm mở từng ảnh bé.
   1 ảnh → full ngang · 2 ảnh → đôi · 3 ảnh → 1 to + 2 nhỏ
   4 ảnh → 2×2 · từ 5 ảnh → 1 to + lưới, ảnh cuối ghi "+N"
   ============================================================ */
function phutGiay(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function anhBo(ds, nhan) {
  ds = (ds || []).filter(u => u && !laTiengNoi(u));
  if (!ds.length) return '';
  /* Bố cục LUÔN KÍN, ô TO (Trường bắt 07/09 — trước đây 6 ô chia 3 cột nên teo,
     mà hàng cuối lại hở một chỗ đen).
     1 ảnh → một ô to · 2 → hai ô vuông · 3 → một to hai nhỏ · từ 4 trở lên →
     lưới 2×2 ô vuông, tấm thứ 4 mang "+N" như Zalo. */
  const hien = ds.slice(0, ds.length > 4 ? 4 : ds.length);
  const con = ds.length - hien.length;
  const lop = 'n' + Math.min(hien.length, 4);
  return '<div class="anhBo ' + lop + '">' + hien.map((u, i) => {
    const cuoi = (i === hien.length - 1 && con > 0) ? '<span class="them">+' + con + '</span>' : '';
    const dau = '<button class="o' + (laVideo(u) ? ' vid' : '') + '" data-xem="' + esc(u) + '" data-bo="' + (nhan || '') + '"';
    /* ẢNH TRONG BONG BÓNG CHAT DÙNG <img loading="lazy"> (09/09).
       Nền CSS thì trình duyệt tải NGAY cả trăm ô của mọi tin trong khung chat,
       dù mày mới cuộn tới tin thứ ba. Lazy thì chỉ tin nào đang trong tầm mắt
       mới tải. Video cũng hạ preload="none": mỗi thẻ video preload="metadata"
       là một kết nối riêng tải phần đầu file, 10 video là 10 đường tranh nhau. */
    return laVideo(u)
      ? dau + '><video src="' + esc(u) + '#t=0.2" muted preload="none" data-tl="1"></video>' +
      '<span class="pl">▶</span><span class="tl">▶</span>' + cuoi + '</button>'
      /* ============================================================
         ẢNH .HEIC (19/09 — soát kho thấy 8 tấm trong phiếu Huế).
         Chrome trên Windows và Android không giải mã được HEIC: thẻ <img> ra
         ô trắng, người xem tưởng ảnh mất. Máy iPhone thì mở bình thường.
         Nên: máy nào mở được cứ hiện như thường; máy không mở được thì onerror
         thay bằng tấm bìa có chữ, bấm vào là tải file về xem bằng app khác —
         thà nói thật "ảnh iPhone, máy này không mở được" còn hơn ô trắng câm.
         ============================================================ */
      : /\.(heic|heif)$/i.test(String(u))
        ? dau + ' data-heic="1"><img class="oA" loading="lazy" decoding="async" src="' + esc(anhNho(u)) +
          '" alt="" onerror="this.closest(\'.o\').classList.add(\'heicHong\')">' +
          '<span class="heicNhan">HEIC<i>ảnh iPhone · máy này không mở được</i></span>' + cuoi + '</button>'
        : dau + '><img class="oA" loading="lazy" decoding="async" src="' + esc(anhNho(u)) + '" alt="">' + cuoi + '</button>';
  }).join('') + '</div>';
}

/* nhãn thời lượng video — loadedmetadata không nổi bọt nên bắt ở pha capture */
document.addEventListener('loadedmetadata', e => {
  const v = e.target;
  if (!v || !v.dataset || !v.dataset.tl || !isFinite(v.duration)) return;
  const s = v.parentNode && v.parentNode.querySelector('.tl');
  if (s) s.textContent = '▶ ' + phutGiay(v.duration);
}, true);

/* ============================================================
   TAB ẢNH ĐỐI CHIẾU
   Trên cùng: TRƯỚC | SAU cùng một chỗ — CHT nghiệm thu chỉ cần xem đây.
   Thêm 2 nút: xem cạnh nhau toàn màn hình, và LẬT qua lật lại tại chỗ
   (lật soi khe hở, vết nứt nhạy hơn xem cạnh nhau nhiều).
   ============================================================ */
function veTabAnh(p) {
  const truoc = (p.anhTruoc || []).filter(u => !laTiengNoi(u));
  const sau = (p.anhSau || []).filter(u => !laTiengNoi(u));
  const chat = [];
  (D.dienBien[p.id] || []).forEach(e => (e.anh || []).forEach(u => {
    if (u && !laTiengNoi(u) && truoc.indexOf(u) < 0 && sau.indexOf(u) < 0 && chat.indexOf(u) < 0) chat.push(u);
  }));

  /* HAI KHỐI RÕ RÀNG (Trường chốt 30/08: "không so theo cặp, so theo TỔNG ảnh,
     muốn xem ảnh nào thì click vào ảnh đó, chia làm 2 phần cho dễ nhìn").
     Khối xanh dương = toàn bộ ảnh TRƯỚC, khối xanh lá = toàn bộ ảnh SAU —
     bấm ảnh nào mở đúng ảnh đó, trong trình xem vuốt tiếp thoải mái. */
  const khoi = (ten, ds, nhan, mau, ai, luc, rong) =>
    '<div class="dcKhoi ' + mau + '"><div class="h"><b>' + ten + '</b>' +
    '<i>' + (ds.length ? ds.length + (ds.some(laVideo) ? ' · có video' : '') : '') + '</i></div>' +
    (ai ? '<div class="dcAi">' + esc(ai) + (luc ? ' · ' + ddyyGio(luc) : '') + '</div>' : '') +
    (ds.length ? anhBo(ds, nhan) : '<div class="trong">' + rong + '</div>') + '</div>';

  return khoi('📷 TRƯỚC KHI SỬA', truoc, 'truoc', 't', p.nguoiTao, p.ngayBao, 'Chưa có ảnh hiện trường') +
    khoi('✅ SAU KHI SỬA', sau, 'sau', 's', (p.nguoiSua || []).join(', '), p.ngayXong,
      'Kỹ thuật chưa báo xong nên chưa có ảnh sau') +
    (chat.length ? khoi('💬 ẢNH GỬI TRONG LÚC TRAO ĐỔI', chat, '', 'c', '', 0, '') : '') +
    '<div class="dcNhac">Bấm vào ảnh để xem to · trong ảnh vuốt ngang để sang ảnh khác</div>';
}

/* ---------- trao đổi ---------- */
/* Gọi tên: tên người có dấu cách ("Lã Xuân Mạnh") nên không cắt theo dấu cách được —
   phải dò đúng tên trong danh sách người, tên dài dò trước. */
function tenGoi(txt, toi) {
  const mau = toi ? '#A5F3FC' : '#0E7490';
  const A = '\u0001', B = '\u0002';   /* dấu tạm, chắc chắn không có trong tin nhắn */
  const ten = (D.ai || []).map(a => a.ten).filter(Boolean).sort((a, b) => b.length - a.length);
  ten.forEach(t => { const tt = esc(t); txt = txt.split('@' + tt).join(A + tt + B); });
  txt = txt.replace(/@(\S+)/g, A + '$1' + B);        /* tên lạ thì vẫn tô một từ */
  return txt.split(A).join('<b style="color:' + mau + '">@').split(B).join('</b>');
}

/* ============================================================
   THẺ PHIẾU — tin nhắn đầu tiên trong khung trao đổi
   Mở khi việc chưa xong, thu khi đã nghiệm thu hoặc huỷ.
   Ai tự thu/mở thì máy nhớ riêng cho người đó, phiếu đó.
   Có thẻ này thì kỹ thuật ở luôn tab Trao đổi được, khỏi nhảy sang Tiến trình.
   ============================================================ */
const KHOA_THEP = 'kt_thephieu_v1';
let THEP = {};
try { THEP = JSON.parse(localStorage.getItem(KHOA_THEP) || '{}') || {}; } catch (e) { THEP = {}; }

function thePDangMo(p) {
  if (THEP[p.id] !== undefined) return !!THEP[p.id];
  /* ĐIỆN THOẠI THÌ MẶC ĐỊNH THU (09/09 — Trường: "ấn vào phiếu là đơ ở tab
     trao đổi, phải thu gọn phiếu mới vuốt được"). Đo thật: máy 393×720, thẻ
     phiếu mở cao 348px + băng quá hạn 50 + đầu ngăn 85 + 2 tab 41 + chân 142
     = 666px, màn có 720 → khung chat còn 32px, vuốt trong 32px thì như đơ.
     Thu lại còn một dòng thì chat được 308px. Máy tính màn cao nên vẫn mở. */
  if (innerWidth <= 900) return false;
  return !['nghiemthu', 'huy'].includes(p.trangThai);     // xong rồi thì thu
}
function doiThePhieu(mo) {
  if (!PH) return;
  THEP[PH.id] = !!mo;
  const ks = Object.keys(THEP);
  if (ks.length > 300) ks.slice(0, ks.length - 300).forEach(k => delete THEP[k]);
  try { localStorage.setItem(KHOA_THEP, JSON.stringify(THEP)); } catch (e) { }
  veNgan();
  if (!mo) nhac('Đã thu thẻ phiếu — bấm dòng trên cùng để mở lại', 'la');
}

function ghimPhieu(p) {
  const m = MUC_DO[p.mucDo] || MUC_DO.binhthuong;
  const anh = (p.anhTruoc || []);
  const gh = tenGianHang(p.gianHangId);
  const nh = NHOM_LOI[p.nhomLoi] || p.nhomLoi || '';
  const vg = p.dangVuong ? (VUONG[p.dangVuong] || {}) : null;

  /* ---- THU: một dòng, bấm ▾ để bung ---- */
  if (!thePDangMo(p)) return '<button class="ghimO" data-mophieu="1" style="border-left-color:' + m.chu + '">' +
    '<span class="ic" style="background:' + m.nen + ';color:' + m.chu + '"><img width="22" height="22" class="spIc" src="ic/tab-danhsach.webp" alt="" loading="lazy"></span>' +
    '<span class="c"><b>' + esc(p.noiDung) + '</b>' +
    '<i>' + esc(tenCoSo(p.coSoId)) + (gh ? ' · ' + esc(gh) : '') + ' · ' + esc(m.ten) +
    (anh.length ? ' · ' + anh.length + ' ảnh' : '') +
    (p.mongMuon ? ' · mong muốn xong ' + ddyy(p.mongMuon) : '') + '</i></span>' +
    '<span class="mui">▾</span></button>';

  /* ---- MỞ: đủ thông tin + ảnh to ---- */
  return '<div class="ghimMo" style="border-left-color:' + m.chu + '">' +
    '<div class="ghimDau">' +
    '<span class="ic" style="background:' + m.nen + ';color:' + m.chu + '"><img width="22" height="22" class="spIc" src="ic/tab-danhsach.webp" alt="" loading="lazy"></span>' +
    '<span class="c"><span class="ma">' + esc(p.id) + ' · ' + esc(p.nguoiTao || '') + ' · ' + ddyy(p.ngayBao) + ' ' + gio(p.ngayBao) + '</span>' +
    '<b>' + esc(p.noiDung) + '</b></span>' +
    '<button class="mui" data-thuphieu="1" title="Thu lại">▴</button></div>' +
    '<div class="vienO">' +
    (p.gianHangId
      ? '<button class="cs coLL" data-lylich="' + esc(p.gianHangId) + '" title="Xem lý lịch gian hàng này">' +
        esc(tenCoSo(p.coSoId)) + (gh ? ' · ' + esc(gh) : '') + ' 📜</button>'
      : '<span class="cs">' + esc(tenCoSo(p.coSoId)) + (gh ? ' · ' + esc(gh) : '') + '</span>') +
    '<span style="background:' + m.nen + ';color:' + m.chu + '">' + esc(m.ten) + '</span>' +
    (nh ? '<span class="nh">' + esc(nh) + '</span>' : '') +
    (p.mongMuon ? '<span class="mm">Mong muốn xong ' + ddyy(p.mongMuon) + '</span>' : '') +
    (p.duKien ? '<span class="dk">Kỹ thuật hẹn ' + ddyy(p.duKien) + '</span>' : '') +
    (vg ? '<span style="background:' + vg.nen + ';color:' + vg.chu + '">⏸ ' + esc(vg.ten) + (p.vuongGhi ? ' — ' + esc(p.vuongGhi) : '') + '</span>' : '') +
    '</div>' +
    daiXinDoi(p) +
    (p.moTa ? '<div class="ghimTa">' + esc(p.moTa) + '</div>' : '') +
    (anh.length ? anhBo(anh, 'truoc') : '') +
    (anh.length ? '<div class="ghimChan">bấm ảnh để soi to · bấm đúp phóng đúng chỗ</div>' : '') +
    '</div>';
}

/* ============================================================
   DẢI VÀNG "ĐANG CHỜ DUYỆT DỜI HẠN" (28/09). Ai mở phiếu cũng thấy, nhưng nút
   khác nhau: admin có hai nút quyết, người xin có nút rút, cơ sở chỉ đọc.
   Nói rõ HẠN HIỆN TẠI VẪN LÀ ngày cũ — để không ai tưởng đã dời xong.
   ============================================================ */
function daiXinDoi(p) {
  if (!dangXinDoi(p)) return '';
  const toiXin = p.doiXinNguoi === ((D.nguoi || {}).ten || '');
  return '<div style="display:flex;gap:9px;align-items:flex-start;background:#FEF3C7;border:1px solid #FCD34D;' +
    'border-radius:10px;padding:10px 11px;margin:8px 0 2px;font-size:12.5px;line-height:1.5;color:#92400E">' +
    '<span style="flex:none;font-size:15px">⏳</span><div style="min-width:0;flex:1">' +
    '<b>' + esc(p.doiXinNguoi || 'Kỹ thuật') + ' xin dời hạn sang ' + ddyy(p.doiXinNgay) + '</b>' +
    '<div style="opacity:.85">Hạn hiện tại vẫn là ' + (p.duKien ? ddyy(p.duKien) : 'chưa có') +
    ' — chờ quản lý duyệt</div>' +
    (p.doiXinLy ? '<div style="margin-top:5px;padding-left:9px;border-left:2px solid #D97706">' + esc(p.doiXinLy) + '</div>' : '') +
    (laQuanLy()
      ? '<div style="margin-top:9px"><button class="btn pri" style="padding:8px 14px;font-size:12.5px" data-ld="duyetdoi">Xem &amp; quyết ›</button></div>'
      : (toiXin ? '<div style="margin-top:9px"><button class="btn v" style="padding:7px 12px;font-size:12.5px" data-ld="rutxin">↩ Rút lời xin</button></div>' : '')) +
    '</div></div>';
}

/* Thẻ kết quả — gắn dưới mốc "✅ báo xong" trong dòng thời gian.
   Trước đây mấy thông tin này chỉ có ở tab Tiến trình đã bỏ. */
function theKetQua(p) {
  const sau = (p.anhSau || []);
  if (!sau.length && !p.chiPhi && !p.xuLyGhi && !(p.nguoiSua || []).length) return '';
  return '<div class="theKQ">' +
    '<div class="kqDau">✅ KẾT QUẢ SỬA</div>' +
    '<div class="vienO">' +
    ((p.nguoiSua || []).length ? '<span class="tho">Người sửa: ' + esc(p.nguoiSua.join(', ')) + '</span>' : '') +
    (p.ngayXong ? '<span>Xong ' + ddyyGio(p.ngayXong) + '</span>' : '') +
    (p.chiPhi ? '<span class="cp">Chi phí ' + tien(p.chiPhi) + '₫</span>' : '') +
    '</div>' +
    (p.xuLyGhi ? '<div class="ghimTa">' + esc(p.xuLyGhi) + '</div>' : '') +
    (sau.length ? anhBo(sau, 'sau') : '') +
    '</div>';
}

/* dãy avatar bé "ai đã xem" dưới tin cuối của mình (31/08) — tối đa 6 người */
function xemHang(p, e) {
  const tenToi = (D.nguoi || {}).ten;
  const ds = ((D.xemPhieu || {})[p.id] || [])
    .filter(x => x.ten && x.ten !== tenToi && x.luc >= e.t).slice(0, 6);
  if (!ds.length) return '';
  return '<div class="xemHang">' + ds.map(x =>
    '<span class="xv" style="background:' + (mauTho(x.ten) !== '#64748B' ? mauTho(x.ten) : '#BE185D') +
    '" title="' + esc(x.ten) + ' đã xem">' + esc((x.ten || '?').trim().slice(0, 1)) + '</span>').join('') + '</div>';
}

/* link http(s) trong tin nhắn bấm mở được (chạy trên chữ ĐÃ esc nên an toàn) */
const lamLink = s => String(s).replace(/(https?:\/\/[^\s<]+)/g,
  '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;word-break:break-all">$1</a>');

function veTin(p) {
  const db = (D.dienBien[p.id] || []).slice().sort((a, b) => a.t - b.t);
  let h = '';
  if (!db.filter(e => e.loai !== 'tao').length) {
    /* phiếu chưa có tin nào nhưng ĐANG GỬI ẢNH thì vẫn phải thấy bong bóng ảnh
       đang chạy — nếu không, người dùng gửi ảnh vào phiếu mới lại tưởng mất (07/09) */
    const bg = bongDangGui(p);
    return (bg ? '' : '<div class="rong">Chưa có trao đổi nào.<br>Nhắn một câu cho cơ sở và kỹ thuật.</div>') +
      theKetQua(p) + bg + dangGoHtml(p, db, (D.nguoi || {}).ten);
  }
  let ngayCu = ddyy(p.ngayBao);
  const ghimIds = dsGhim(p).map(g => g.id);   /* tin nào đang ghim thì 📌 tô đậm */
  /* TIN CUỐI CỦA MÌNH → dưới nó gắn dãy avatar bé "ai đã xem" (Trường chốt 31/08,
     kiểu Messenger — không chữ nghĩa dài dòng cho đỡ chật màn điện thoại) */
  const tenToi = (D.nguoi || {}).ten;
  const thuHoi = dsThuHoi(db);       /* tin nào đã bị thu hồi (01/09) */
  let tinCuoiToi = null;
  db.forEach(e => {
    if (e.loai === 'chat' && e.ten === tenToi && !capGhim(e.text) && !capThuHoi(e.text) && !thuHoi[String(e.id)]) tinCuoiToi = e;
  });
  /* vạch "Tin chưa đọc" (01/09): vẽ NGAY TRONG luồng để sống sót qua mọi lần
     vẽ lại (chèn DOM tay bị innerHTML nuốt mất — bẫy tự dính 01/09) */
  const tongBB = db.filter(e => e.loai === 'chat' && !capGhim(e.text) && !capThuHoi(e.text)).length;
  let demBB = 0;
  db.forEach(e => {
    if (e.loai === 'tao') return;          /* thẻ phiếu ở trên đã nói việc này rồi */
    const nd = ddyy(e.t);
    if (nd !== ngayCu) { h += '<div class="ngayChia"><span>' + nd + (nd === ddyy(Date.now()) ? ' · hôm nay' : '') + '</span></div>'; ngayCu = nd; }
    if (e.loai === 'chat') {
      /* lệnh ghim/bỏ ghim (31/08) vẽ thành dòng hệ thống gọn, không thành bong bóng */
      const gLenh = capGhim(e.text);
      if (gLenh) {
        h += '<div class="heThong">' + esc(gLenh.conLai.replace(/^📌\s*/, '📌 ')) +
          '<i class="luc">' + dd(e.t) + ' ' + gio(e.t) + '</i></div>';
        return;
      }
      if (capThuHoi(e.text)) return;   /* lệnh thu hồi (01/09): không vẽ, chỉ dùng làm dấu */
      demBB++;
      if (VACH_SO > 0 && demBB === tongBB - VACH_SO + 1)
        h += '<div class="vachChuaDoc"><span>Tin chưa đọc</span></div>';
      const toi = e.ten === (D.nguoi || {}).ten;
      const mau = mauTho(e.ten) !== '#64748B' ? mauTho(e.ten) : '#BE185D';
      /* TIN ĐÃ BỊ THU HỒI (01/09): bong xám thay chỗ — admin vẫn đọc được bản gốc mờ */
      if (thuHoi[String(e.id)]) {
        const tlg = capTraLoi(e.text);
        h += '<div class="bb ' + (toi ? 'toi' : '') + ' daThuHoi" data-tin="' + esc(String(e.id)) + '">' +
          '<span class="av" style="background:#94A3B8">' + esc((e.ten || '?').trim().slice(0, 1)) + '</span>' +
          '<div class="noi"><div class="ten">' + (toi ? 'Tôi · ' : '') + esc(e.ten) + '</div>' +
          '<div class="bong">🚫 Tin đã được thu hồi' +
          (laQuanLy() ? '<i class="goc">bản gốc (chỉ admin thấy): ' +
            esc(((tlg ? tlg.conLai : e.text) || '').slice(0, 200)) +
            ((e.anh || []).length ? ' · ' + e.anh.length + ' ảnh/video' : '') + '</i>' : '') +
          '</div><div class="gio">' + gio(e.t) + '</div></div></div>';
        return;
      }
      /* TRẢ LỜI/TRÍCH (Trường xin 30/08): tin có đầu [[TL:id|tên|trích]] thì vẽ
         khối trích phía trên — bấm khối là cuộn về tin gốc */
      const tl = capTraLoi(e.text);
      /* MENU ⋯ ĐẦU DÒNG TIN (Trường chốt 04/09, kiểu Zalo): thay 3 nút ↩📌🚫
         rải trên hàng tên bằng MỘT nút ⋯ đứng ngang bong bóng về phía giữa màn —
         bấm ra menu Sao chép · Trả lời · Ghim · Thu hồi */
      /* ẢNH TRONG CHAT PHẢI TO (07/09): bong bóng có ảnh thì nới rộng gần hết
         khung; nếu CHỈ có ảnh (không kèm chữ) thì bỏ luôn đệm và nền bong bóng
         để ảnh sát viền như Zalo */
      const dsAnhTin = (e.anh || []).filter(u => u && !laTiengNoi(u));
      const chuTin = (tl ? tl.conLai : e.text) || '';
      const chiAnh = dsAnhTin.length && !chuTin.trim() && !tl;
      h += '<div class="bb ' + (toi ? 'toi' : '') + (dsAnhTin.length ? ' coAnh' : '') +
        '" data-tin="' + esc(String(e.id)) + '">' + veAv(e.ten, mau, anhCua(e.ten)) +
        '<div class="noi"><div class="ten">' + (toi ? 'Tôi · ' : '') + esc(e.ten) + '</div>' +
        '<div class="bong' + (chiAnh ? ' chiAnh' : '') + '">' +
        (tl ? '<button class="tlKhoi" data-cuontin="' + esc(tl.id) + '">↩ <b>' + esc(tl.ten) + '</b>: ' + esc(tl.trich) + '</button>' : '') +
        lamLink(tenGoi(esc(tl ? tl.conLai : e.text), toi)).replace(/\n/g, '<br>') +
        (e.anh && e.anh.length ? (e.anh.some(laTiengNoi)
          ? e.anh.filter(laTiengNoi).map(oThoai).join('')
          : anhBo(e.anh, '')) : '') +
        '</div><div class="gio">' +
        /* trạng thái tin CỦA MÌNH (31/08): 🕓 chưa tới máy chủ · ✓ đã tới */
        (toi ? '<span class="ttG" title="' + (String(e.id).indexOf('tam') === 0 ? 'Đang gửi…' : 'Đã tới máy chủ') + '">' +
          (String(e.id).indexOf('tam') === 0 ? '🕓' : '✓') + '</span>' : '') +
        gio(e.t) + '</div>' +
        /* avatar bé = người đó đã xem tới tin này (chỉ gắn ở tin cuối của mình) */
        (tinCuoiToi && e === tinCuoiToi ? xemHang(p, e) : '') +
        '</div><button class="menuTin" data-menutin="' + esc(String(e.id)) + '" title="Sao chép · Trả lời · Ghim · Thu hồi">⋯</button></div>';
    } else {
      const kieu = e.loai === 'traLai' || e.loai === 'huy' || e.loai === 'tuchoidoi' ? 'do'
        : (e.loai === 'nhan' || e.loai === 'nghiemthu' || e.loai === 'xong' || e.loai === 'duyetdoi' ? 'la' : '');
      const bieu = {
        tao: '🔴', nhan: '🔵', vuong: '⏸', xong: '✅', nghiemthu: '🏁', traLai: '↩', doingay: '📅', huy: '✕',
        /* luồng xin dời hạn chờ duyệt (28/09) */
        xindoi: '⏳', duyetdoi: '✓', tuchoidoi: '✕', rutxin: '↩'
      }[e.loai] || '•';
      /* Mốc trạng thái kèm ĐỦ ngày + giờ:phút — "nhận lúc nào, xong lúc nào" là thứ hay
         cãi nhau nhất, và dòng này hay bị chụp màn hình cắt riêng gửi Zalo làm bằng chứng,
         thiếu ngày là cãi tiếp. Tin nhắn thường vẫn chỉ giờ (đã có vạch chia ngày). */
      h += '<div class="heThong ' + kieu + '">' + bieu + ' <b>' + esc(e.ten || '') + '</b> ' + esc(e.text) +
        '<i class="luc">' + dd(e.t) + ' ' + gio(e.t) + '</i></div>';
      /* mốc "báo xong" kéo theo thẻ kết quả: người sửa, ngày, chi phí, ảnh SAU */
      if (e.loai === 'xong') h += theKetQua(p);
    }
  });
  return h + bongDangGui(p) + dangGoHtml(p, db, tenToi);
}

/* ============================================================
   ẢNH ĐANG GỬI HIỆN NGAY TRONG KHUNG TRAO ĐỔI (Trường chốt 07/09, kiểu
   WhatsApp). Trước đây ảnh đang gửi nằm ở ô nhỏ TRÊN ô nhắn, nên nhìn vào
   khung chat không biết có ảnh đang chạy — Trường: "nên chạy những ảnh đang
   gửi giống kiểu zalo để còn hiểu là ảnh còn đang chạy".
   Kiểu 2 (WhatsApp) Trường chọn: ảnh VẪN RÕ để thợ soi được chỗ hỏng ngay
   trong lúc ảnh đang lên (đây là ảnh bằng chứng), giữa tấm có vòng ✕ để dừng,
   đáy tấm có thanh phần trăm chạy.
   ============================================================ */
function bongDangGui(p) {
  const cho = (TAM.cho || []);
  /* chỉ vẽ khi đang gửi VÀO CHAT của đúng phiếu này */
  if (!cho.length || TAM.dich !== 'chat' || !p || (TAM.phieu && TAM.phieu !== p.id)) return '';
  const n = (D.nguoi || {}).ten || '';
  const mau = mauTho(n) !== '#64748B' ? mauTho(n) : '#BE185D';
  const o = (c, i) => '<div class="dgAnh' + (c.laVid ? ' laVid' : '') + '">' +
    (c.xem ? '<img src="' + c.xem + '" alt="">' : '<span class="dgTron"></span>') +
    '<button class="dgStop" data-bocho="' + i + '" title="Dừng gửi tấm này">✕</button>' +
    '<div class="dgThanh"><i style="width:' + Math.max(4, Math.min(100, c.pt || 0)) + '%"></i></div>' +
    '</div>';
  return '<div class="bb toi coAnh dangGuiBB">' + veAv(n, mau, anhCua(n)) +
    '<div class="noi"><div class="ten">Tôi · ' + esc(n) + '</div>' +
    '<div class="bong bongGui"><div class="dgLuoiGui' + (cho.length === 1 ? ' mot' : '') + '">' +
    cho.map(o).join('') + '</div></div>' +
    '<div class="gio"><span class="ttG">🕓</span>đang gửi ' + cho.length +
    (cho.length > 1 ? ' tấm' : '') + (cho.length > 1 ? ' · <button class="dgStopHet" data-dunghet="1">dừng tất cả</button>' : '') +
    '</div></div></div>';
}
/* ============================================================
   TRẢ LỜI / TRÍCH TIN (Trường xin 30/08, kiểu Zalo).
   Kho không có cột riêng nên phần trích nhét vào ĐẦU chữ tin nhắn theo dạng
   [[TL:id gốc|tên|trích ngắn]] — máy cũ chưa cập nhật vẫn đọc được chữ,
   máy mới vẽ thành khối trích đẹp, bấm vào là cuộn về tin gốc.
   ============================================================ */
/* ============================================================
   GHIM TIN (Trường chốt 31/08, tham khảo Zalo). Kho không có cột riêng nên
   lệnh ghim là MỘT TIN NHẮN thường mang đầu [[GHIM:id]] / [[BOGHIM:id]] —
   máy cũ chưa cập nhật vẫn đọc ra chữ "📌 Đã ghim…", máy mới gom thành khung
   vàng đầu khung chat. Nhờ vậy ghim tự ghi vết ai ghim lúc nào, và tự bắn
   thông báo như tin nhắn thường.
   ============================================================ */
const GHIM_MO = {};   // phiếu nào đang bung khung ghim (chỉ nhớ trong phiên)
function capGhim(text) {
  const m = String(text || '').match(/^\[\[(GHIM|BOGHIM):([^\]]*)\]\]\n?([\s\S]*)$/);
  return m ? { lenh: m[1], id: m[2], conLai: m[3] } : null;
}
/* danh sách tin ĐANG ghim: duyệt lệnh ghim/bỏ ghim theo thứ tự thời gian.
   BẪY id tạm: ghim ngay tin VỪA gửi thì lệnh ôm id tạm 'tam…', máy chủ xác nhận
   xong cấp id thật là trỏ hụt — nên không thấy id thì dò lại tin gốc theo
   TÊN NGƯỜI + CHỮ TRÍCH nằm sẵn trong lệnh ghim. */
const canonGhim = s => boDau(String(s || '')).toLowerCase().replace(/[^a-z0-9]+/g, '');
function dsGhim(p) {
  const dang = {};
  const db = (D.dienBien[(p || {}).id] || []).slice().sort((a, b) => a.t - b.t);
  const daThu = dsThuHoi(db);        /* tin thu hồi thì cũng rời khung ghim (01/09) */
  const tins = db.filter(x => x.loai === 'chat' && !capGhim(x.text) && !capThuHoi(x.text) && !daThu[String(x.id)]);
  db.forEach(e => {
    if (e.loai !== 'chat') return;
    const g = capGhim(e.text); if (!g) return;
    const m = g.conLai.match(/tin của (.+?): “([\s\S]*)”/);
    let goc = tins.find(x => String(x.id) === String(g.id));
    if (!goc && m) {
      const bd = canonGhim(m[2]).slice(0, 30);
      goc = tins.find(x => {
        if (x.ten !== m[1]) return false;
        const tl = capTraLoi(x.text);
        const chu = (tl ? tl.conLai : x.text) || (x.anh && x.anh.length ? '📷 ảnh' : '');
        return bd && canonGhim(chu).startsWith(bd);
      });
    }
    const khoa = goc ? String(goc.id) : String(g.id);
    if (daThu[khoa] || daThu[String(g.id)]) { delete dang[khoa]; return; }
    if (g.lenh === 'BOGHIM') { delete dang[khoa]; return; }
    const tl = goc ? capTraLoi(goc.text) : null;
    const chu = goc ? ((tl ? tl.conLai : goc.text) || (goc.anh && goc.anh.length ? '📷 ảnh' : ''))
      : (m ? m[2] : '(tin đã cũ)');
    dang[khoa] = { id: khoa, ten: goc ? goc.ten : (m ? m[1] : ''), ai: e.ten,
      trich: String(chu).replace(/\n/g, ' ').slice(0, 90) };
  });
  return Object.keys(dang).map(k => dang[k]);
}
/* khung vàng đầu khung chat — mặc định THU GỌN 1 dòng, không ghim gì thì không hiện */
function khungGhim(p) {
  const ds = dsGhim(p);
  if (!ds.length) return '';
  if (!GHIM_MO[p.id]) return '<button class="gomGhim" data-gomghim="1">📌<b>' + ds.length + ' tin ghim</b>' +
    '<span>' + esc(ds[ds.length - 1].trich) + '</span><i>▾</i></button>';
  return '<div class="gomGhim mo"><button class="gDau" data-gomghim="1">📌 <b>TIN QUAN TRỌNG · ' +
    ds.length + ' tin ghim</b><i>thu gọn ▴</i></button>' +
    ds.map(g => '<div class="gDong"><button class="gChu" data-cuontin="' + esc(g.id) + '" title="Bấm là cuộn về tin gốc">' +
      (g.ten ? '<b>' + esc(g.ten) + ':</b> ' : '') + esc(g.trich) + '<i>' + esc(g.ai) + ' ghim</i></button>' +
      '<button class="gBo" data-boghim="' + esc(g.id) + '" title="Bỏ ghim">✕</button></div>').join('') + '</div>';
}
async function ghimTin(idTin, bo) {
  const e = (D.dienBien[(PH || {}).id] || []).find(x => String(x.id) === String(idTin));
  if (!e || !PH) return;
  const tl = capTraLoi(e.text);
  /* trích bỏ @ kẻo lệnh ghim nhắc nhầm người, bỏ [|] kẻo vỡ khuôn [[GHIM:]] */
  const chu = String((tl ? tl.conLai : e.text) || (e.anh && e.anh.length ? '📷 ảnh' : ''))
    .replace(/[\[\]|@]/g, ' ').replace(/\n/g, ' ').slice(0, 60).trim();
  const pid = PH.id;
  try {
    await nhanTin(PH, '[[' + (bo ? 'BOGHIM' : 'GHIM') + ':' + String(e.id) + ']]\n📌 ' +
      (bo ? 'Đã bỏ ghim' : 'Đã ghim') + ' tin của ' + (e.ten || '?') + ': “' + chu + '”', []);
    if (PH && PH.id === pid) { if (!bo) GHIM_MO[pid] = false; veNgan(true); }
    nhac(bo ? 'Đã bỏ ghim' : 'Đã ghim — tin nằm ở đầu khung chat', 'la');
  } catch (er) { hongLuu(er, '', ''); }
}

/* ============================================================
   THU HỒI TIN (Trường chốt 01/09, kiểu Zalo): tin CỦA MÌNH trong 5 PHÚT.
   Lệnh là tin thường mang đầu [[HUYTIN:id]] — bản gốc KHÔNG bị xoá khỏi kho
   (đúng luật không xoá dữ liệu): người thường thấy "🚫 Đã thu hồi",
   riêng admin vẫn đọc được bản gốc chữ mờ bên dưới.
   ============================================================ */
function capThuHoi(text) {
  const m = String(text || '').match(/^\[\[HUYTIN:([^\]]*)\]\]\n?([\s\S]*)$/);
  return m ? { id: m[1], conLai: m[2] } : null;
}
/* danh sách id tin đã bị thu hồi trong một phiếu */
function dsThuHoi(db) {
  const ra = {};
  db.forEach(e => {
    if (e.loai !== 'chat') return;
    const t = capThuHoi(e.text);
    if (t && t.id) ra[String(t.id)] = e.ten;
  });
  return ra;
}
/* ============================================================
   MENU ⋯ TRÊN TIN (Trường chốt 04/09 — kiểu Zalo): Sao chép · Trả lời ·
   Ghim/Bỏ ghim · Thu hồi (tin mình, còn hạn thì ghi rõ còn mấy phút).
   Bấm ra ngoài là đóng. Menu là con của body nên nhịp vẽ lại chat không đụng.
   ============================================================ */
function moMenuTin(idTin, nut) {
  dongMenuTin();
  if (!PH) return;
  const e = (D.dienBien[PH.id] || []).find(x => String(x.id) === String(idTin));
  if (!e) return;
  const toi = e.ten === (D.nguoi || {}).ten;
  const dangGhim = dsGhim(PH).some(g => String(g.id) === String(idTin));
  const conMs = 15 * 60000 - (Date.now() - e.t);   /* hạn thu hồi 15 phút (Trường nới 04/09) */
  const chuTin = String(e.text || '').replace(/^\[\[(?:TL|GHIM|BOGHIM|HUYTIN):[^\]]*\]\]\n?/, '');
  const m = document.createElement('div');
  m.id = 'menuTin';
  m.innerHTML =
    '<button data-mtin="chep">📋 Sao chép</button>' +
    '<button data-mtin="traloi">↩ Trả lời</button>' +
    '<button data-mtin="ghim">📌 ' + (dangGhim ? 'Bỏ ghim' : 'Ghim') + '</button>' +
    (toi && conMs > 0 && String(e.id).indexOf('tam') !== 0
      ? '<button data-mtin="thuhoi" class="do">🚫 Thu hồi <i>còn ' + Math.max(1, Math.ceil(conMs / 60000)) + ' phút</i></button>' : '');
  document.body.appendChild(m);
  /* đặt menu cạnh nút ⋯, kẹp trong màn; gần đáy thì lật lên trên */
  const r = nut.getBoundingClientRect(), mw = 180;
  let x = toi ? r.right - mw : r.left;
  x = Math.max(8, Math.min(x, window.innerWidth - mw - 8));
  m.style.left = x + 'px';
  if (r.bottom + 200 > window.innerHeight) m.style.bottom = (window.innerHeight - r.top + 6) + 'px';
  else m.style.top = (r.bottom + 6) + 'px';
  m.onclick = ev => {
    const b = ev.target.closest('[data-mtin]'); if (!b) return;
    const k = b.dataset.mtin;
    dongMenuTin();
    if (k === 'chep') {
      const chu = chuTin || (e.anh && e.anh.length ? '' : '');
      if (!chu) return nhac('Tin này không có chữ để sao chép', 'canh');
      if (navigator.clipboard) navigator.clipboard.writeText(chu)
        .then(() => nhac('Đã sao chép tin', 'la'), () => nhac('Không sao chép được', 'do'));
      return;
    }
    if (k === 'traloi') return batTraLoi(idTin);
    if (k === 'ghim') return ghimTin(idTin, dangGhim);
    if (k === 'thuhoi') return thuHoiTin(idTin);
  };
  setTimeout(() => document.addEventListener('click', dongMenuTinNgoai, true), 0);
}
function dongMenuTinNgoai(ev) {
  const m = document.getElementById('menuTin');
  if (m && !m.contains(ev.target)) dongMenuTin();
}
function dongMenuTin() {
  const m = document.getElementById('menuTin'); if (m) m.remove();
  document.removeEventListener('click', dongMenuTinNgoai, true);
}

async function thuHoiTin(idTin) {
  const e = (D.dienBien[(PH || {}).id] || []).find(x => String(x.id) === String(idTin));
  if (!e || !PH) return;
  if (e.ten !== (D.nguoi || {}).ten) return nhac('Chỉ thu hồi được tin của mình', 'do');
  if (Date.now() - e.t > 15 * 60000) return nhac('Quá 15 phút rồi — không thu hồi được nữa', 'do');
  if (!confirm('Thu hồi tin này? Mọi người sẽ thấy "Đã thu hồi".')) return;
  const pid = PH.id;
  try {
    await nhanTin(PH, '[[HUYTIN:' + String(e.id) + ']]\n🚫 Đã thu hồi một tin nhắn', []);
    if (PH && PH.id === pid) veNgan(true);
  } catch (er) { hongLuu(er, '', ''); }
}

let TRA_LOI = null;   // { id, ten, trich } — đang soạn trả lời tin nào
function capTraLoi(text) {
  const m = String(text || '').match(/^\[\[TL:([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]\n?([\s\S]*)$/);
  return m ? { id: m[1], ten: m[2], trich: m[3], conLai: m[4] } : null;
}
function batTraLoi(idTin) {
  const e = (D.dienBien[(PH || {}).id] || []).find(x => String(x.id) === String(idTin));
  if (!e) return;
  const tl = capTraLoi(e.text);
  const chu = (tl ? tl.conLai : e.text) || (e.anh && e.anh.length ? '📷 ảnh' : '');
  TRA_LOI = { id: String(e.id), ten: e.ten, trich: String(chu).replace(/\n/g, ' ').slice(0, 70) };
  veThanhTraLoi();
  const o = document.getElementById('oTin'); if (o) o.focus();
}
function veThanhTraLoi() {
  const cu = document.getElementById('tlThanh'); if (cu) cu.remove();
  if (!TRA_LOI) return;
  const oN = document.querySelector('.oNhan'); if (!oN) return;
  const t = document.createElement('div');
  t.id = 'tlThanh'; t.className = 'tlThanh';
  t.innerHTML = '↩ Đang trả lời <b>' + esc(TRA_LOI.ten) + '</b>: ' + esc(TRA_LOI.trich) +
    '<button data-botraloi="1" title="Thôi không trả lời">✕</button>';
  oN.parentElement.insertBefore(t, oN);
}
/* Một dòng như Zalo: ＋ mở khay · ô nhắn · 🎤 (trống) ↔ ➤ (có chữ).
   Trước đây mic và gửi đứng cạnh nhau suốt, ăn mất chỗ mà 1 lúc chỉ dùng 1 cái. */
function oNhanTin() {
  return '<div class="oNhan"><button class="ic" data-khay="1" title="Ảnh, video, câu nhắn sẵn">＋</button>' +
    '<textarea id="oTin" rows="1" placeholder="Nhắn tin…"></textarea>' +
    '<button class="ic" id="nutThoai" data-thoai="1" title="Tin thoại"><img width="22" height="22" class="spIc" src="ic/kg-ghiam.webp" alt="" loading="lazy"></button>' +
    '<button class="gui an" id="nutGui" data-guitin="1">➤</button></div>';
}
/* gõ chữ → hiện ➤ ẩn 🎤; xoá hết chữ → ngược lại */
function doiMicGui() {
  const o = document.getElementById('oTin'), t = document.getElementById('nutThoai'), g = document.getElementById('nutGui');
  if (!o || !t || !g) return;
  const co = !!o.value.trim();
  t.classList.toggle('an', co);
  g.classList.toggle('an', !co);
}

/* ============================================================
   KHAY NÚT ＋ (07/09, kiểu Zalo/Messenger): ảnh · video · tin thoại · vị trí
   và 4 câu nhắn sẵn — trước đây 4 chip đó chiếm một tầng thường trực dưới chat.
   ============================================================ */
/* ============================================================
   KHAY ＋ GÁNH LUÔN MENU ⋯ (03/10 — Trường chốt "gom nội dung ⋯ vào ＋").
   Trước có hai cửa: ⋯ trên đầu phiếu cho việc với phiếu (sửa, giao người, dời
   hạn, huỷ…), ＋ dưới ô nhắn cho gửi ảnh/video. Hai nút ở hai đầu màn hình cho
   cùng một phiếu — phải nhớ cái nào ở đâu.
   Giờ gộp vào ＋: phần GỬI đứng trước (việc làm nhiều nhất), phần VIỆC VỚI
   PHIẾU xuống dưới. Nút ⋯ bỏ khỏi đầu phiếu, lấy lại chỗ cho phần Trao đổi.
   Giữ nguyên hàm moMenuPhieu và mọi data-ld cũ — chỉ đổi chỗ đứng.
   ============================================================ */
function formKhay() {
  const p = PH; if (!p) return;
  const o = (k, ic, chu) => '<button class="khO" data-chon="' + k + '"><i>' + ic + '</i>' + chu + '</button>';
  const ds = (typeof vieckPhu === 'function' ? vieckPhu(p) : []);
  const goi = (typeof nutGoi === 'function' ? nutGoi(p) : '');
  moSheet(khungSheet('Phiếu ' + esc(p.id), esc(p.noiDung),
    '<div class="khNhan">GỬI VÀO PHIẾU</div>' +
    '<div class="khLuoi">' +
    o('chup', '📷', 'Chụp ảnh') + o('album', '🖼', 'Chọn ảnh') +
    o('quaymay', '🎥', 'Quay video') + o('video', '📹', 'Video có sẵn') +
    '</div>' +
    '<div class="khLuoi khHai">' +
    '<button class="khO" data-thoaic="1"><i>🎤</i>Tin thoại</button>' +
    '<button class="khO" data-vitri="1"><i>📍</i>Gửi vị trí</button>' +
    '</div>' +
    /* phần cũ của nút ⋯ */
    (ds.length ? '<div class="khNhan">VIỆC VỚI PHIẾU</div><div class="vpLuoi">' + ds.map(x =>
      '<button class="vpO' + (x.kieu === 'do' ? ' do' : '') + '" data-ld="' + x.ld + '">' +
      '<i>' + x.ic + '</i>' + esc(x.chu) + '</button>').join('') + '</div>' : '') +
    '<div class="vpLuoi vpPhu">' +
    (goi ? goi.replace(/class="btn v"/g, 'class="vpO"') : '') +
    '<button class="vpO" data-chiase="1"><i>↗</i>Chia sẻ · copy Zalo</button>' +
    (p.gianHangId ? '<button class="vpO" data-lylich="' + esc(p.gianHangId) + '"><i>📖</i>Lý lịch gian hàng</button>' : '') +
    '</div>' +
    '<div class="khNhan">CÂU NHẮN SẴN — bấm là gửi luôn</div>' + chipNhanh(),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   GỢI Ý @TÊN (Trường bắt 30/08: "gõ @ đâu có ra gì") — gõ @ trong ô nhắn là
   bật danh sách người liên quan phiếu để CHỌN như Zalo, khỏi gõ tay đúng tên:
   kỹ thuật cả team + CHT của cơ sở phiếu này + admin, người ĐANG LÀM nổi lên đầu.
   Gõ tiếp sau @ là lọc dần (không dấu cũng ăn). Bấm tên / Enter = chèn.
   ============================================================ */
function goiYTen() {
  const o = document.getElementById('oTin'); if (!o || !PH) return;
  const vt = o.selectionStart == null ? o.value.length : o.selectionStart;
  const m = o.value.slice(0, vt).match(/@([^@\s][^@]*)?$/);
  const cu = document.getElementById('goiY');
  if (!m) { if (cu) cu.remove(); return; }
  const k = boDau(m[1] || '');
  const daNhan = (PH.nguoiSua && PH.nguoiSua.length ? PH.nguoiSua : [PH.nguoiNhanKt]).filter(Boolean);
  let ds = D.ai.filter(a => a.id !== (D.nguoi || {}).id &&
    (a.vai === 'tho' || a.vai === 'quanly' || (a.vai === 'coso' && a.coSoId === PH.coSoId)));
  if (k) ds = ds.filter(a => boDau(a.ten).includes(k));
  ds.sort((a, b) => (daNhan.includes(b.ten) ? 1 : 0) - (daNhan.includes(a.ten) ? 1 : 0));
  ds = ds.slice(0, 6);
  if (!ds.length) { if (cu) cu.remove(); return; }
  let h = cu;
  if (!h) {
    h = document.createElement('div'); h.id = 'goiY'; h.className = 'goiY';
    const oN = o.closest('.oNhan'); (oN || o.parentElement).appendChild(h);
  }
  const VAI_G = { tho: 'kỹ thuật', coso: 'CHT', quanly: 'admin' };
  h.innerHTML = ds.map(a =>
    '<button data-goiy="' + esc(a.ten) + '"><span class="av" style="background:' + esc(a.mau || '#0E7490') + '">' +
    esc((a.ten || '?').trim().slice(0, 1).toUpperCase()) + '</span>' +
    '<b>' + esc(a.ten) + '</b><i>' + (VAI_G[a.vai] || '') +
    (daNhan.includes(a.ten) ? ' · đang làm việc này' : '') + '</i></button>').join('');
}
function chonGoiY(ten) {
  const o = document.getElementById('oTin'); if (!o) return;
  const vt = o.selectionStart == null ? o.value.length : o.selectionStart;
  const dau = o.value.slice(0, vt).replace(/@[^@]*$/, '@' + ten + ' ');
  o.value = dau + o.value.slice(vt);
  const h = document.getElementById('goiY'); if (h) h.remove();
  o.focus();
  try { o.setSelectionRange(dau.length, dau.length); } catch (e) { }
}
async function guiTin() {
  const el = document.getElementById('oTin');
  /* PH phải còn: ngăn phiếu đóng chỉ bị ẨN chứ không xoá khỏi DOM,
     nên kiểm tra el chưa đủ — gửi với PH null là nổ TypeError */
  if (!el || !PH) return;
  let t = (el.value || '').trim();
  if (!t && !TAM.anh.length) return;
  /* đang trả lời tin nào thì gắn phần trích vào đầu chữ (30/08) */
  const tlLuu = TRA_LOI;
  if (TRA_LOI && t) {
    t = '[[TL:' + TRA_LOI.id + '|' + TRA_LOI.ten + '|' + TRA_LOI.trich.replace(/[\[\]|]/g, ' ') + ']]\n' + t;
    TRA_LOI = null; veThanhTraLoi();
  }
  const anh = TAM.anh.slice();
  el.value = '';
  if (typeof doiMicGui === 'function') doiMicGui();   /* ô trống lại → ➤ nhường chỗ cho 🎤 */
  TAM.anh = [];
  const pid = PH.id;
  nongChat();                  // đang trò chuyện → siết nhịp hỏi xuống 1,5 giây
  try {
    /* Tin của MÌNH phải hiện ngay lúc bấm, không đứng đợi máy chủ trả lời.
       themDienBien() đã cắm tin vào danh sách trước khi gọi mạng, nên chỉ cần
       vẽ ngay ở đây; vẽ lại lần nữa sau khi máy chủ xác nhận. */
    const hua = nhanTin(PH, t, anh);
    veNgan(true);
    await hua;
    if (PH && PH.id === pid) veNgan(true);
  } catch (e) {
    const tl2 = capTraLoi(t);
    /* PHẢI LẤY LẠI Ô NHẮN (vá 08/09): veNgan(true) ở trên đã vẽ lại ngăn nên
       biến el trỏ tới ô nhắn CŨ đã rời khỏi trang — gán chữ vào đó thì người
       dùng thấy tin bay mất. Kho chặn vì vượt hạn mức là lúc cần giữ chữ nhất. */
    const oNay = document.getElementById('oTin') || el;
    oNay.value = tl2 ? tl2.conLai : t;   /* trả lại chữ đã gõ, đừng để mất tin */
    if (typeof doiMicGui === 'function') doiMicGui();
    TRA_LOI = tlLuu; veThanhTraLoi();
    TAM.anh = anh;
    hongLuu(e, '', '');
  }
}

/* ---------- nút hành động theo vai ---------- */
function nutHanhDong(p) {
  const n = D.nguoi || {}, ten = esc(n.ten || '');
  const nut = (l, k, ph) => '<button class="btn ' + k + '" data-ld="' + l + '">' + ph + '</button>';
  const phu = (typeof nutGoi === 'function' ? nutGoi(p) : '') +
    '<button class="btn v" data-chiase="1" title="Chia sẻ / copy sang Zalo">↗</button>';
  if (p.trangThai === 'huy') return '<div style="font-size:12.5px;color:#64748B;padding:4px">Phiếu đã huỷ.</div>';

  if (laTho()) {
    /* ③ nhận việc một chạm — gộp "tiếp nhận" và "ngày dự kiến xong" vào một nút.
       Hầu hết việc xong trong hôm nay hoặc mai; việc dài thì bấm "Ngày khác" mở lịch như cũ. */
    if (p.trangThai === 'moi') {
      const giaoToi = duocGiao(p) && giaoChoToi(p);
      const nhom = (p.nguoiGiao || []);
      return '<div class="nnLb">' + (giaoToi
        ? (nhom.length > 1
          /* giao cho cả nhóm: nói rõ ai cũng nhận được, ai bấm trước thì cầm việc (11/09) */
          ? '📌 QUẢN LÝ GIAO CHO ' + nhom.length + ' NGƯỜI — AI NHẬN TRƯỚC THÌ CẦM VIỆC'
          : '📌 QUẢN LÝ GIAO ĐÍCH DANH CHO BẠN — CHỌN NGÀY XONG')
        : (duocGiao(p)
          ? '📌 ĐÃ GIAO CHO ' + esc(String(nhom.length > 1 ? nhom.length + ' NGƯỜI' : (p.nguoiNhanKt || nhom[0] || '')).toUpperCase()) + ' — bạn vẫn nhận thay được'
          : 'NHẬN VIỆC — CHỌN LUÔN NGÀY XONG · ' + ten)) + '</div>' +
        /* ============================================================
           MỘT Ô NGÀY THAY CHO BA NÚT (21/09 — Trường: "bỏ 2 ô nhận xong hôm
           nay và xong ngày mai đi, tốn diện tích, thay vào đó là chọn ngày dự
           kiến sửa xong").
           Ba nút cũ chiếm nguyên một hàng trên đầu khung chat, mà hai trong ba
           chỉ là lối tắt cho hai ngày cụ thể. Giờ gộp thành ô ngày + một nút:
           mở ra đã điền sẵn ngày hợp lý (cơ sở mong xong, hoặc ngày mai nếu
           ngày đó đã qua), sửa được ngay tại chỗ, bấm Nhận là xong.
           Vẫn chặn không cho chọn ngày đã qua như màn Tiếp nhận.
           ============================================================ */
        (function () {
          const mai = HOM_NAY() + NGAY;
          const macDinh = Math.max(p.mongMuon || 0, mai);
          return '<div class="nnNgay">' +
            '<label>Hẹn xong<input class="ip" type="date" id="nn_ngay" min="' + ngayISO(HOM_NAY()) +
            '" value="' + ngayISO(macDinh) + '"></label>' +
            '<button class="btn pri" data-nhanngay="1">Nhận việc</button>' +
            (giaoToi ? '<button class="btn v" data-ld="traviec" title="Trả việc lại team">↩</button>' : '') +
            '</div>';
        })();
    }
    if (p.trangThai === 'tiepnhan') {
      const cuaToi = p.nguoiNhanKt === (D.nguoi || {}).ten;
      return nut('baoxong', 'la', '✓ Báo đã sửa xong<span class="tenNut">với tư cách ' + ten + '</span>') + nut('doingay', 'v', '📅') + nut('vuong', 'v', '⏸') +
        (cuaToi ? nut('traviec', 'v', '↩') : '');
    }
    if (p.trangThai === 'hoanthanh') return '<div style="font-size:12.5px;color:#B45309;padding:4px 6px;font-weight:700">⏳ Đã báo xong — chờ CHT ' + esc(tenCoSo(p.coSoId)) + ' nghiệm thu</div>';
    return '<div style="font-size:12.5px;color:#15803D;padding:4px 6px;font-weight:700">✓ Đã nghiệm thu ĐẠT — xong việc</div>';
  }
  if (laCoSo() || laQuanLy()) {
    if (p.trangThai === 'hoanthanh') return nut('dat', 'la', '✓ Xác nhận ĐẠT<span class="tenNut">với tư cách ' + ten + '</span>') + nut('chuadat', 'do', '✕ Chưa đạt');
    if (p.trangThai === 'nghiemthu') return '<div style="font-size:12.5px;color:#15803D;padding:4px 6px;font-weight:700">✓ Đã nghiệm thu ĐẠT — ' + esc(p.chtNguoi) + ' · ' + ddyy(p.chtLuc) + '</div>';
    /* CHT/admin xem phiếu đang chạy: KHÔNG có việc chính nào phải bấm — mọi nút
       (Sửa/Đổi người/Dời ngày/Huỷ) là việc PHỤ, đã dời lên menu ⋯ ở header
       (Trường chốt 07/09). Đáy chỉ còn một dòng cho biết ai đang làm. */
    return '';
  }
  return '';
}

/* ============================================================
   MENU ⋯ TRÊN HEADER PHIẾU (Trường chốt 07/09 — học Jira / Linear / Zendesk).
   Việc PHỤ của phiếu không nằm dưới khung chat nữa: chat là chat, sửa phiếu là
   sửa phiếu. Đáy khung chat nhờ vậy còn đúng một dòng như Zalo.
   Việc CHÍNH theo trạng thái (Nhận việc / Báo xong / Xác nhận ĐẠT) vẫn ở đáy.
   ============================================================ */
function vieckPhu(p) {
  const ds = [];
  const them = (l, ic, chu, kieu) => ds.push({ ld: l, ic: ic, chu: chu, kieu: kieu || '' });
  if (p.trangThai === 'huy') return ds;
  const cuaToi = p.nguoiNhanKt === (D.nguoi || {}).ten;
  if (laTho()) {
    if (p.trangThai === 'tiepnhan') {
      /* 28/09: kỹ thuật không tự dời nữa, phải xin — chữ trên nút nói đúng việc
         sắp xảy ra, đang treo lời xin rồi thì chuyển thành nút rút */
      if (dangXinDoi(p)) them('rutxin', '↩', 'Rút lời xin dời hạn');
      else them('doingay', '📅', 'Xin dời ngày hẹn');
      them('vuong', '⏸', 'Báo đang vướng');
      if (cuaToi) them('traviec', '↩', 'Trả việc lại team');
    }
    if (p.trangThai === 'moi' && duocGiao(p) && cuaToi) them('traviec', '↩', 'Trả việc lại team');
  } else {
    /* CHT + admin: sửa phiếu khi kỹ thuật chưa báo xong (luật 30/08) */
    if (['moi', 'tiepnhan'].includes(p.trangThai)) them('suaphieu', '✎', 'Sửa phiếu');
    if (laQuanLy() && ['moi', 'tiepnhan'].includes(p.trangThai))
      them('giaocho', '👤', p.nguoiNhanKt ? 'Đổi người nhận' : 'Giao cho…');
    /* THU HỒI (14/09 — Trường: "trượt tay giao nhầm việc thì admin phải thu hồi
       lại"). Chỉ hiện khi việc ĐANG có người giữ: chưa giao cho ai thì không có
       gì để thu. Việc đã báo xong / đã nghiệm thu thì thôi, thu hồi lúc đó là
       xoá công người ta đã làm. */
    if (laQuanLy() && ['moi', 'tiepnhan'].includes(p.trangThai) &&
      (p.nguoiNhanKt || (p.nguoiGiao || []).length))
      them('thuhoigiao', '↩', 'Thu hồi việc đã giao', 'do');
    /* đổi nhóm lỗi khi AI đoán sai (20/09) — chỉ admin, vì nhóm lỗi chỉ dùng
       cho thống kê chứ không đổi cách xử lý việc */
    if (laQuanLy()) them('doinhom', '🏷', 'Đổi nhóm lỗi');
    if (laQuanLy() && dangXinDoi(p)) them('duyetdoi', '⏳', 'Duyệt lời xin dời hạn', 'la');
    if (laQuanLy() && p.trangThai !== 'nghiemthu') them('doingay', '📅', 'Dời ngày hẹn');
    if (laQuanLy() && p.trangThai !== 'nghiemthu') them('huy', '✕', 'Huỷ phiếu', 'do');
    /* XOÁ HẲN (25/09 — Trường chốt). Ngược với Huỷ: huỷ chỉ đánh dấu, xoá là
       mất luôn cả phiếu lẫn ảnh, không lấy lại được. Nên chỉ mở cho phiếu ĐÃ
       XONG — việc đang chạy mà xoá thì cơ sở mất chỗ theo dõi giữa chừng. */
    if (laQuanLy() && ['nghiemthu', 'hoanthanh'].includes(p.trangThai))
      them('xoaphieu', '🗑', 'Xoá hẳn phiếu', 'do');
  }
  return ds;
}
function moMenuPhieu() {
  if (!PH) return;
  /* rung khẽ 12ms khi bảng thao tác bật ra (21/10) — chỉ đủ để ngón tay biết
     máy đã nhận, không đủ để thành phiền */
  if (typeof rung === 'function') rung('cham');
  const p = PH;
  const ds = vieckPhu(p);
  const goi = (typeof nutGoi === 'function' ? nutGoi(p) : '');
  moSheet(khungSheet('Việc với phiếu ' + esc(p.id), esc(p.noiDung),
    (ds.length ? '<div class="vpLuoi">' + ds.map(x =>
      '<button class="vpO' + (x.kieu === 'do' ? ' do' : '') + '" data-ld="' + x.ld + '">' +
      '<i>' + x.ic + '</i>' + esc(x.chu) + '</button>').join('') + '</div>'
      : '<div class="rong">Phiếu này chưa có việc gì để sửa.</div>') +
    '<div class="vpLuoi vpPhu">' +
    (goi ? goi.replace(/class="btn v"/g, 'class="vpO"') : '') +
    '<button class="vpO" data-chiase="1"><i>↗</i>Chia sẻ · copy Zalo</button>' +
    (p.gianHangId ? '<button class="vpO" data-lylich="' + esc(p.gianHangId) + '"><i>📖</i>Lý lịch gian hàng</button>' : '') +
    '</div>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ================= TẤM TRƯỢT ================= */
/* Máy tính: mấy màn số liệu (Hiệu suất · Báo cáo họp · Phân chia công việc) mở
   RỘNG hẳn ra thay vì bó trong 560px như form (Trường chốt 08/09: "phóng to ra").
   Điện thoại không đổi — class này chỉ có tác dụng từ 1100px trở lên. */
/* hai cỡ phải LOẠI TRỪ nhau: mở Trang cá nhân (cỡ vừa) rồi mở thẳng Lịch
   (cỡ to) thì lớp 'vua' còn sót, đè lên 'to' và lịch vẫn hẹp — bắt được khi
   chạy thử 03/10 */
function sheetTo() { const s = document.getElementById('sheet'); if (s) { s.classList.remove('vua'); s.classList.add('to'); } }
/* ============================================================
   CỠ VỪA — 2/3 của cỡ to (03/10 — Trường chốt cho Trang cá nhân).
   Màn nào chỉ có vài dòng cài đặt thì khung 1180px rộng mênh mông, chữ dạt
   hết sang hai mép. Cỡ này 790px, vừa đủ cho ba ô số liệu nằm ngang.
   KHÔNG sửa .sheet.to vì Hiệu suất, Radar, Tổng kết đang cần đúng bề ngang
   đó để chứa bảng và biểu đồ.
   ============================================================ */
function sheetVua() { const s = document.getElementById('sheet'); if (s) { s.classList.remove('to'); s.classList.add('vua'); } }
function moSheet(html) {
  document.getElementById('nenSheet').classList.remove('an');
  const s = document.getElementById('sheet');
  s.classList.remove('an');
  s.innerHTML = html;
}
/* dongSheet CHỈ đóng tấm trượt, KHÔNG được xoá ảnh đang chờ.
   Trước đây nó xoá TAM.anh, nên mọi đường phải đóng tấm giữa dòng —
   quay video trực tiếp, ghi âm, mở tấm khác — đều làm bay hết ảnh đã tải lên.
   Muốn xoá thì gọi xoaTam() cho rõ ràng, đúng chỗ việc đã kết thúc. */
function dongSheet() {
  document.getElementById('nenSheet').classList.add('an');
  document.getElementById('sheet').classList.remove('to');
  document.getElementById('sheet').classList.remove('vua');
  document.getElementById('sheet').classList.add('an');
}
function xoaTam() { TAM.anh = []; TAM.cho = []; TAM.hua = []; TAM.tho = []; TAM.dich = ''; }
const khungSheet = (tieu, phu, noi, chan) =>
  '<div class="sheetDau"><div class="keo"></div>' +
  '<div style="display:flex;align-items:flex-start;gap:10px"><div style="flex:1"><h3>' + tieu + '</h3>' +
  (phu ? '<div class="p">' + phu + '</div>' : '') + '</div>' +
  '<button data-dongsheet="1" style="font-size:20px;color:#94A3B8;line-height:1;padding:2px 4px">✕</button></div></div>' +
  '<div class="sheetNoi">' + noi + '</div><div class="sheetChan">' + chan + '</div>';

function oAnh(ds, sua) {
  /* mỗi ô đang tải có nút ✕ DỪNG riêng (#45 Trường chốt 04/09) — chọn nhầm
     không phải ngồi chờ nó gửi hết; ≥2 ô thì thêm nút Dừng tất cả */
  /* Ảnh gửi vào TRAO ĐỔI giờ hiện thành bong bóng trong khung chat (07/09) nên
     không vẽ lại ở đây nữa — hai chỗ cùng báo thì rối và dễ tưởng gửi hai lần.
     Ô ảnh nhỏ vẫn dùng cho form Báo lỗi / Báo xong / Chưa đạt như cũ. */
  const choOAnh = TAM.dich === 'chat' ? [] : (TAM.cho || []);
  const dangTai = choOAnh.map((c, i) =>
    '<div class="anhO dangtai" style="background-image:url(' + c.xem + ')">' +
    '<span class="vongTai"></span><span class="ptram">' + (c.mat === 'luu' ? 'đang lưu…' : (c.pt || 0) + '%') + '</span>' +
    '<button class="boTai" data-bocho="' + i + '" title="Dừng gửi tấm này">✕</button></div>').join('') +
    (choOAnh.length > 1
      ? '<button class="anhO dungHet" data-dunghet="1">✕<i>Dừng tất cả</i></button>' : '');
  /* ============================================================
     NÚT ✎ NGAY TRÊN Ô ẢNH (Trường chốt 10/09: "nhiều khi chụp ảnh không thể
     hiện được chính xác vị trí lỗi và vẫn phải khoanh vùng và viết chữ").
     Bộ khoanh vẽ vốn đã có, nhưng chỉ hiện ở màn duyệt ngay lúc chọn ảnh —
     gợi ý là dấu ✎ mờ trên góc ô nên gần như không ai thấy. Giờ mỗi ô ảnh
     trong form Báo lỗi / Báo xong / Chưa đạt có nút ✎ rõ ràng: bấm là mở màn
     khoanh vẽ ghi chữ, lưu xong thay đúng tấm đó.
     ============================================================ */
  return '<div class="anhHang">' +
    ds.map((u, i) => laVideo(u)
      ? '<div class="anhO vid"><video src="' + esc(u) + '#t=0.2" muted preload="metadata"></video><span class="pl">▶</span>' +
        (sua ? '<button class="x" data-boanh="' + i + '">✕</button>' : '') + '</div>'
      : '<div class="anhO" style="background-image:url(' + esc(anhNho(u)) + ')">' +
        (sua ? '<button class="x" data-boanh="' + i + '">✕</button>' +
               '<button class="suaO" data-suatam="' + i + '" title="Khoanh vùng · ghi chữ lên ảnh">✎ Khoanh</button>' : '') +
        '</div>').join('') +
    dangTai + (sua ? '<button class="anhO them" data-themanh="1">＋</button>' : '') + '</div>';
}

/* ============================================================
   SỬA MỘT TẤM ĐÃ NẰM TRONG KHAY FORM (10/09).
   Ảnh trong khay là ảnh ĐÃ lên kho, nên phải: lấy bản gốc về → mở màn khoanh
   vẽ → gửi bản đã vẽ lên thành tấm mới → thay đúng vị trí cũ trong khay.
   Ảnh máy này vừa gửi thì bản nét còn nằm trong máy (ANH_TAM) nên không phải
   tải gì; ảnh của phiếu cũ thì tải về một lượt.
   Tấm cũ KHÔNG xoá khỏi kho — phiếu cũ có thể đang trỏ vào nó, và luật của
   Trường là không xoá lẻ. Nó chỉ rời khỏi khay của form đang gõ.
   ============================================================ */
async function suaAnhTam(i) {
  const u = (TAM.anh || [])[i];
  if (!u) return;
  if (laVideo(u)) { nhac('Video thì chưa vẽ lên được — chỉ ảnh mới khoanh được', 'canh'); return; }
  let file = null;
  try {
    /* ưu tiên bản nét còn trong máy (ảnh mình vừa gửi) — khỏi tải lại */
    const trongMay = typeof anhTamCua === 'function' ? anhTamCua(u) : '';
    const r = await fetch(trongMay || u, trongMay ? undefined : { cache: 'force-cache' });
    if (!r.ok) throw new Error('không lấy được ảnh (' + r.status + ')');
    const bl = await r.blob();
    file = new File([bl], 'sua-' + Date.now() + '.jpg', { type: bl.type || 'image/jpeg' });
  } catch (e) {
    nhac('Chưa mở được ảnh để khoanh — ' + (e.message || 'thử lại sau'), 'do');
    return;
  }
  moSuaAnhGoi(file, 1, 1, async (kq) => {
    if (kq === 'HUY' || !kq) return;                 /* thôi không sửa, giữ ảnh cũ */
    const b = document.getElementById('g_gui') || document.getElementById('x_gui');
    try {
      nhac('Đang gửi tấm vừa khoanh…', 'canh');
      const moi = await taiAnh(kq, TAM.phieu || (PH ? PH.id : 'moi'), null, null);
      if (!moi) throw new Error('gửi không được');
      const vt = (TAM.anh || []).indexOf(u);
      if (vt >= 0) TAM.anh[vt] = moi; else TAM.anh.push(moi);
      veLaiOAnh();
      nhac('✓ Đã thay bằng tấm có khoanh vẽ', 'la');
    } catch (e) {
      nhac('Tấm vừa khoanh chưa gửi được — ảnh cũ vẫn còn trong phiếu', 'do');
    }
    if (b) b.disabled = false;
  }, true);
}

/* ============================================================
   Máy chủ từ chối thì: bật lại nút, GIỮ form và ảnh, nói rõ lý do.
   Không được đóng form và không được coi như đã lưu.
   ============================================================ */
function hongLuu(e, nutId, chuNut) {
  const b = document.getElementById(nutId);
  if (b) { b.disabled = false; b.textContent = chuNut; }
  const m = String((e && e.message) || e || '');
  if (/restricted|quota|exceed_egress|upgrade their plan/i.test(m))
    nhac('CHƯA LƯU ĐƯỢC — máy chủ đang chặn vì vượt hạn mức. Báo quản lý, đừng làm tiếp.', 'do');
  else nhac('CHƯA LƯU ĐƯỢC — ' + m.slice(0, 110), 'do');
  console.error('[form] hỏng lưu:', e);
}

/* ---------- CHỌN THÁNG (đối chiếu lại lỗi cũ) ---------- */
function formChonThang() {
  const ds = dsThang();
  moSheet(khungSheet('Xem lỗi tháng nào', 'Web giữ 6 tháng gần nhất — đủ để đối chiếu lại',
    '<div class="mucChon">' + ds.map(t => {
      const dem = D.phieu.filter(p => {
        const cu = L.thang; L.thang = t[0]; const ok = trongThang(p); L.thang = cu; return ok;
      }).filter(p => !laCoSo() || p.coSoId === D.nguoi.coSoId).length;
      return '<button class="mn ' + (L.thang === t[0] ? 'on' : '') + '" data-chonthang="' + t[0] + '">' +
        '<b>' + tenThangDai(t[0]) + '</b><i>' + dem + ' việc</i></button>';
    }).join('') + '</div>',
    '<button class="btn v" data-dongsheet="1">Đóng</button>'));
}
function chonThang(k) {
  L.thang = k; L.the = ''; L.trang = 1;
  dongSheet(); veHet();
  nhac('Đang xem ' + tenThangDai(k), 'la');
}

/* ---------- ① GIAO VIỆC ---------- */
function formGiaoViec() {
  if (!MO_LAI) TAM.anh = [];        /* dựng lại sau khi chọn ảnh thì giữ ảnh đã có */
  const csHTML = laCoSo()
    ? '<input class="ip" value="' + esc(tenCoSo(D.nguoi.coSoId)) + '" disabled><input type="hidden" id="g_cs" value="' + esc(D.nguoi.coSoId) + '">'
    : '<select class="ip" id="g_cs">' + D.cosos.map(c => '<option value="' + esc(c.id) + '">' + esc(c.ten) + '</option>').join('') + '</select>';
  /* tiêu đề theo vai (Trường chốt 30/08) — form là một, chữ đúng miệng người dùng */
  moSheet(khungSheet(
    laCoSo() ? 'Báo lỗi cho kỹ thuật' : (laTho() ? 'Ghi việc tự phát hiện' : 'Báo lỗi'),
    'Việc sẽ vào hàng đợi chung của cả team kỹ thuật — không chỉ định ai',
    '<div class="f"><label>NỘI DUNG LỖI <i>*</i></label><input class="ip" id="g_nd" placeholder="VD: Dán lại thảm sàn khu bập bênh"></div>' +
    '<div class="hai"><div class="f"><label>CƠ SỞ <i>*</i></label>' + csHTML + '</div>' +
    '<div class="f"><label>GIAN HÀNG <i>*</i></label><select class="ip" id="g_gh"></select>' +
    '<div class="hint">' + (laQuanLy()
      ? 'Không thấy gian hàng? Chọn <b>＋ Thêm gian hàng mới</b> ở cuối danh sách.'
      : 'Chỉ chọn trong danh sách. Thiếu gian hàng thì nhắn quản lý thêm giúp.') + '</div></div></div>' +
    /* Ô NHÓM LỖI đã bỏ (Trường chốt 04/09 — "rườm rà"): máy tự đoán từ nội dung
       (doanNhomLoi), đoán sai thì admin chỉnh trong ✎ Sửa phiếu. */
    '<div class="f"><label>MỨC ĐỘ <i>*</i></label><div class="mucdo3" id="g_muc">' +
    Object.keys(MUC_DO).map(k => '<button data-muc="' + k + '" class="' + (k === 'binhthuong' ? 'on' : '') + '" style="' + (k === 'binhthuong' ? 'color:' + MUC_DO[k].chu + ';background:' + MUC_DO[k].nen : '') + '">' + MUC_DO[k].ten + '</button>').join('') + '</div></div>' +
    '<div class="f"><label>MONG MUỐN SỬA XONG TRƯỚC NGÀY <i>*</i></label><input class="ip" type="date" id="g_mong" value="' + ngayISO(Date.now() + 3 * NGAY) + '">' +
    '<div class="hint">Cơ sở tự điền. Nếu kỹ thuật chưa hẹn ngày, máy lấy ngày này làm hạn.</div></div>' +
    '<div class="f"><label>ẢNH HIỆN TRƯỜNG</label><div id="g_anh">' + oAnh(TAM.anh, true) + '</div></div>' +
    '<div class="f"><label>MÔ TẢ THÊM</label><textarea class="ip" id="g_mota" placeholder="Mô tả rõ hơn nếu cần…"></textarea></div>',
    '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn pri" id="g_gui">Gửi cho kỹ thuật</button>'));
  napGianHang();
  const cs = document.getElementById('g_cs');
  if (cs && cs.tagName === 'SELECT') cs.onchange = napGianHang;
}
function napGianHang() {
  const csId = (document.getElementById('g_cs') || {}).value;
  const gh = D.gianhangs.filter(g => g.coSoId === csId);
  const el = document.getElementById('g_gh');
  if (!el) return;
  /* ＋ Thêm gian hàng mới CHỈ dành cho vai quản lý (Trường chốt 02/09):
     cơ sở và kỹ thuật chỉ chọn từ danh sách có sẵn — thêm/sửa/xoá là việc admin
     (màn Cơ sở · gian hàng · người), kẻo mỗi người tự gõ một kiểu là loạn tên. */
  el.innerHTML = (gh.length ? '' : '<option value="">— cơ sở này chưa khai gian hàng —</option>') +
    gh.map(g => '<option value="' + esc(g.id) + '">' + esc(g.ten) + '</option>').join('') +
    (laQuanLy() ? '<option value="__moi">＋ Thêm gian hàng mới…</option>' : '');
  el.onchange = async () => {
    if (el.value !== '__moi') return;
    if (!laQuanLy()) { el.value = gh.length ? gh[0].id : ''; return; }
    const ten = (prompt('Tên gian hàng mới (VD: Máy gắp gấu, Khu bóng, Funzone tầng 2):') || '').trim();
    if (!ten) { el.value = gh.length ? gh[0].id : ''; return; }
    const id = csId + '-' + String(D.gianhangs.filter(g => g.coSoId === csId).length + 1).padStart(2, '0');
    await ghi('gian_hang', 'insert', { id: id, co_so_id: csId, ten: ten });
    D.gianhangs.push({ id: id, coSoId: csId, ten: ten });
    luuCache();
    napGianHang();
    el.value = id;
    nhac('Đã thêm gian hàng ' + ten, 'la');
  };
}
async function luuGiaoViec() {
  const nd = (document.getElementById('g_nd').value || '').trim();
  if (!nd) { nhac('Chưa điền nội dung lỗi', 'do'); return; }
  const gh = document.getElementById('g_gh').value;
  if (!gh || gh === '__moi') { nhac('Chưa chọn gian hàng', 'do'); return; }
  const mong = document.getElementById('g_mong').value;
  if (!mong) { nhac('Chưa chọn ngày mong muốn xong', 'do'); return; }
  const muc = (document.querySelector('#g_muc .on') || {}).dataset ? document.querySelector('#g_muc .on').dataset.muc : 'binhthuong';
  const b = document.getElementById('g_gui'); b.disabled = true; b.textContent = 'Đang gửi…';
  const conAnh = TAM.cho.length;
  try {
    const id = await giaoViec({
      coSoId: document.getElementById('g_cs').value,
      gianHangId: document.getElementById('g_gh').value || null,
      noiDung: nd, moTa: (document.getElementById('g_mota').value || '').trim(),
      nhomLoi: doanNhomLoi(nd + ' ' + (document.getElementById('g_mota').value || '')), mucDo: muc,
      mongMuon: mong, anh: TAM.anh.slice()
    });
    ganAnhMuon(id, 'anh_truoc');
    FORM = null; xoaTam(); dongSheet(); veHet();
    /* việc lớn → dấu ✓ giữa màn (12/10). Phần "ảnh đang gửi nền" xuống dòng
       phụ cho câu chính gọn, đọc một nhịp là hiểu. */
    xongViec('Đã gửi phiếu ' + id,
      conAnh ? conAnh + ' ảnh đang gửi nền, tự gắn vào sau' : 'kỹ thuật sẽ nhận việc');
  } catch (e) { return hongLuu(e, 'g_gui', 'Gửi cho kỹ thuật'); }
}

/* ---------- ①b SỬA PHIẾU (Trường chốt 30/08) ----------
   Người gửi (CHT cơ sở mình) + admin. Chỉ khi phiếu CHƯA được báo xong.
   Mọi thay đổi ghi vào Trao đổi để kỹ thuật biết (và nhận thông báo như tin nhắn). */
function formSuaPhieu() {
  const p = PH; if (!p) return;
  if (!(laQuanLy() || (laCoSo() && p.coSoId === (D.nguoi || {}).coSoId))) return;
  if (p.trangThai !== 'moi' && p.trangThai !== 'tiepnhan') {
    nhac('Kỹ thuật đã báo xong — không sửa khai báo nữa, cần gì gửi vào Trao đổi', 'canh'); return;
  }
  /* nạp ảnh hiện có vào khay để thêm/bớt; MO_LAI = quay về sau khi đi chọn ảnh, giữ nguyên khay */
  if (!MO_LAI) { xoaTam(); TAM.anh = (p.anhTruoc || []).slice(); TAM.dich = 'form'; }
  const dsGh = D.gianhangs.filter(g => g.coSoId === p.coSoId);
  moSheet(khungSheet('Sửa phiếu ' + esc(p.id), 'Thay đổi sẽ ghi vào Trao đổi — kỹ thuật được báo, không sửa chui được',
    '<div class="f"><label>NỘI DUNG LỖI <i>*</i></label><input class="ip" id="s_nd" value="' + esc(p.noiDung) + '"></div>' +
    '<div class="hai"><div class="f"><label>GIAN HÀNG</label><select class="ip" id="s_gh">' +
    dsGh.map(g => '<option value="' + esc(g.id) + '"' + (g.id === p.gianHangId ? ' selected' : '') + '>' + esc(g.ten) + '</option>').join('') + '</select></div>' +
    '<div class="f"><label>NHÓM LỖI</label><select class="ip" id="s_nhom">' +
    Object.keys(NHOM_LOI).map(k => '<option value="' + k + '"' + (k === p.nhomLoi ? ' selected' : '') + '>' + NHOM_LOI[k] + '</option>').join('') + '</select></div></div>' +
    '<div class="f"><label>MỨC ĐỘ</label><div class="mucdo3" id="g_muc">' +
    Object.keys(MUC_DO).map(k => '<button data-muc="' + k + '" class="' + (k === p.mucDo ? 'on' : '') + '" style="' + (k === p.mucDo ? 'color:' + MUC_DO[k].chu + ';background:' + MUC_DO[k].nen : '') + '">' + MUC_DO[k].ten + '</button>').join('') + '</div></div>' +
    '<div class="f"><label>MONG MUỐN SỬA XONG TRƯỚC NGÀY</label><input class="ip" type="date" id="s_mong" value="' + (p.mongMuon ? ngayISO(p.mongMuon) : '') + '"></div>' +
    '<div class="f"><label>ẢNH HIỆN TRƯỜNG — bấm ✕ để bỏ ảnh gửi nhầm, ＋ để thêm</label><div id="g_anh">' + oAnh(TAM.anh, true) + '</div>' +
    '<div class="hint">Ảnh bỏ đi chỉ rời khỏi phiếu, không mất hẳn. Muốn khoanh vẽ lên ảnh: mở ảnh rồi bấm ✎ Sửa.</div></div>' +
    '<div class="f"><label>MÔ TẢ THÊM</label><textarea class="ip" id="s_mota">' + esc(p.moTa || '') + '</textarea></div>',
    '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn pri" id="s_luu">Lưu thay đổi</button>'));
}

async function luuSuaPhieu() {
  const p = PH; if (!p) return;
  const nd = (document.getElementById('s_nd').value || '').trim();
  if (!nd) { nhac('Nội dung lỗi không được để trống', 'do'); return; }
  const mota = (document.getElementById('s_mota').value || '').trim();
  const gh = document.getElementById('s_gh').value;
  const nhom = document.getElementById('s_nhom').value;
  const mong = document.getElementById('s_mong').value;
  const muc = (document.querySelector('#g_muc .on') || { dataset: {} }).dataset.muc || p.mucDo;
  const anhMoi = TAM.anh.slice();
  const cu = p.anhTruoc || [];
  /* tóm tắt ĐỔI GÌ — để ghi vào Trao đổi cho minh bạch */
  const doi = [];
  if (nd !== p.noiDung) doi.push('nội dung');
  if (mota !== (p.moTa || '')) doi.push('mô tả');
  if (gh !== p.gianHangId) doi.push('gian hàng → ' + tenGianHang(gh));
  if (nhom !== p.nhomLoi) doi.push('nhóm lỗi');
  if (muc !== p.mucDo) doi.push('mức độ → ' + (MUC_DO[muc] || {}).ten);
  if (mong && (!p.mongMuon || ngayISO(p.mongMuon) !== mong)) doi.push('mong muốn xong → ' + dd(ms(mong + 'T00:00:00')));
  const them = anhMoi.filter(u => cu.indexOf(u) < 0).length;
  const bot = cu.filter(u => anhMoi.indexOf(u) < 0).length;
  if (them) doi.push('thêm ' + them + ' ảnh');
  if (bot) doi.push('bỏ ' + bot + ' ảnh');
  if (!doi.length && !TAM.cho.length) { nhac('Chưa thay đổi gì', 'canh'); return; }
  const b = document.getElementById('s_luu'); b.disabled = true; b.textContent = 'Đang lưu…';
  try {
    await ghi('phieu_loi', 'update', {
      thiet_bi: nd, mo_ta: mota, gian_hang_id: gh, loai_loi: nhom,
      muc_do: muc, mong_muon: mong || null, anh_truoc: anhMoi
    }, p.id);
    p.noiDung = nd; p.moTa = mota; p.gianHangId = gh; p.nhomLoi = nhom; p.mucDo = muc;
    p.mongMuon = mong ? ms(mong + 'T00:00:00') : 0; p.anhTruoc = anhMoi;
    luuCache();
    /* ghi vào Trao đổi + thông báo đi đúng đường tin nhắn (người đã nhận, chưa ai nhận thì cả team) */
    await nhanTin(p, '✏️ Đã sửa phiếu: ' + doi.join(' · '), []);
    veVet(p.id, 'sua_phieu', { doi: doi.length });
    ganAnhMuon(p.id, 'anh_truoc');            // ảnh mới còn đang lên thì tự gắn nốt
    FORM = null; xoaTam(); dongSheet(); veNgan(); veHet();
    nhac('Đã lưu sửa đổi ' + p.id, 'la');
  } catch (e) { return hongLuu(e, 's_luu', 'Lưu thay đổi'); }
}

/* ---------- ② TIẾP NHẬN ---------- */
function formTiepNhan() {
  const p = PH;
  moSheet(khungSheet('Tiếp nhận việc này', 'Bắt buộc hẹn ngày dự kiến xong',
    '<div class="kh" style="margin-bottom:12px"><div class="kb">' +
    '<div style="font-size:14px;font-weight:700">' + esc(p.noiDung) + '</div>' +
    '<div style="font-size:11.5px;color:#64748B;margin-top:3px">' + esc(tenCoSo(p.coSoId)) + ' · ' + esc((MUC_DO[p.mucDo] || {}).ten) +
    ' · cơ sở mong muốn xong <b>' + (p.mongMuon ? ddyy(p.mongMuon) : 'chưa đặt') + '</b></div></div></div>' +
    '<div class="f"><label>NGƯỜI TIẾP NHẬN</label><input class="ip" value="' + esc((D.nguoi || {}).ten) + '" disabled></div>' +
    /* ============================================================
       NGÀY MẶC ĐỊNH KHÔNG ĐƯỢC NẰM TRONG QUÁ KHỨ (19/09).
       Trước đây ô này lấy thẳng ngày cơ sở mong muốn. Nhận việc muộn hơn ngày
       đó — chuyện thường xuyên — mà bấm Tiếp nhận không sửa thì thành "hẹn
       xong 13/09" trong khi 14/09 mới nhận: việc bị đánh QUÁ HẠN ngay giây đầu.
       Soát kho 19/09: 9 trên 13 phiếu đã nhận đều dính lỗi này.
       Giờ mặc định lấy ngày MUỘN HƠN giữa (mong muốn) và (ngày mai), và chặn
       luôn không cho chọn ngày đã qua. Quá hạn phải là lỗi làm chậm thật, chứ
       không phải lỗi của ô mặc định.
       ============================================================ */
    (function () {
      const mai = HOM_NAY() + NGAY;
      const macDinh = Math.max(p.mongMuon || 0, mai);
      const treHon = p.mongMuon && p.mongMuon < mai;
      return '<div class="f"><label>NGÀY DỰ KIẾN SỬA XONG <i>*</i> — BẮT BUỘC</label>' +
        '<input class="ip bb2" type="date" id="n_du" min="' + ngayISO(HOM_NAY()) + '" value="' + ngayISO(macDinh) + '">' +
        (treHon
          ? '<div class="hint do">⚠ Cơ sở mong xong <b>' + ddyy(p.mongMuon) + '</b> — ngày đó đã qua rồi. ' +
            'Máy để tạm ngày mai, mày hẹn được ngày nào thì sửa lại ngày đó.</div>'
          : '<div class="hint do">Quá ngày này mà chưa xong thì việc bị đánh QUÁ HẠN.</div>') + '</div>';
    })() +
    '<div class="f"><label>GHI CHÚ (nếu cần)</label><textarea class="ip" id="n_ghi" placeholder="VD: chờ mượn máy đi chỉ bên Long Biên…"></textarea></div>',
    '<button class="btn v" data-dongsheet="1">Để sau</button><button class="btn pri" id="n_ok">Tiếp nhận việc này</button>'));
}
/* nhận việc bằng ô ngày ngay trên khung chat (21/09) — thay ba nút cũ */
async function nhanTheoNgay() {
  const p = PH; if (!p) return;
  const o = document.getElementById('nn_ngay');
  const ngay = o && o.value;
  if (!ngay) { nhac('Chọn ngày dự kiến sửa xong đã', 'do'); return; }
  if (ngay < ngayISO(HOM_NAY())) { nhac('Không hẹn được ngày đã qua', 'do'); return; }
  const nut = [].slice.call(document.querySelectorAll('[data-nhanngay]'));
  nut.forEach(b => { b.disabled = true; b.textContent = 'Đang nhận…'; });
  try {
    await tiepNhan(p, ngay, '');
    veNgan(); veHet();
    xongViec('Đã nhận việc', 'hẹn xong ' + ddyy(p.duKien));
  } catch (e) {
    nut.forEach(b => { b.disabled = false; b.textContent = 'Nhận việc'; });
    hongLuu(e, '', '');
  }
}

async function luuTiepNhan() {
  const du = document.getElementById('n_du').value;
  if (!du) { nhac('Chưa chọn ngày dự kiến xong', 'do'); return; }
  const b = document.getElementById('n_ok'); b.disabled = true; b.textContent = 'Đang lưu…';
  try {
    await tiepNhan(PH, du, (document.getElementById('n_ghi').value || '').trim());
    dongSheet(); veNgan(); veHet();
    nhac('Đã tiếp nhận — hẹn xong ' + ddyy(PH.duKien), 'la');
  } catch (e) { return hongLuu(e, 'n_ok', 'Tiếp nhận việc này'); }
}

/* ---------- ③ BÁO XONG ---------- */
function formBaoXong() {
  const p = PH;
  if (!MO_LAI) TAM.anh = (p.anhSau || []).slice();
  if (!MO_LAI) TAM.tho = [(D.nguoi || {}).ten];
  const tre = soNgayTre(p);
  moSheet(khungSheet('Báo đã sửa xong', 'Tick tất cả ai có làm — nhiều người thì nhiều tên',
    '<div class="kh" style="margin-bottom:12px"><div class="kb">' +
    '<div style="font-size:14px;font-weight:700">' + esc(p.noiDung) + '</div>' +
    '<div style="font-size:11.5px;color:#64748B;margin-top:3px">Tiếp nhận: ' + esc(p.nguoiNhanKt || '—') + ' · hẹn ' + (p.duKien ? ddyy(p.duKien) : '—') +
    (tre ? ' · <b style="color:#B91C1C">QUÁ HẠN ' + tre + ' NGÀY</b>' : '') + '</div></div></div>' +
    '<div class="f"><label>NGƯỜI SỬA <i>*</i> — tick ai có làm</label><div class="chonHang" id="x_tho">' +
    dsTho().map(t => '<button data-tho="' + esc(t.ten) + '" class="' + (TAM.tho.includes(t.ten) ? 'on' : '') + '">' + esc(t.ten) + '</button>').join('') + '</div></div>' +
    '<div class="hai"><div class="f"><label>NGÀY SỬA XONG <i>*</i></label><input class="ip" type="date" id="x_ngay" value="' + ngayISO(Date.now()) + '"></div>' +
    /* ============================================================
       CHI PHÍ LẦN NÀY, KHÔNG PHẢI TỔNG (28/09 — Trường chốt).
       Phiếu bị chấm chưa đạt thì sửa tiếp, và trước đây ô này mở ra trống rồi
       GHI ĐÈ — tiền lần đầu bay mất khỏi kho. Giờ ô chỉ nhận phần phát sinh
       thêm, máy cộng vào số cũ. Lần sửa đầu thì không có gì cũ nên nhãn và
       dòng nhắc giữ nguyên như trước, người dùng không thấy khác gì.
       ============================================================ */
    '<div class="f"><label>CHI PHÍ' + (Number(p.chiPhi) ? ' LẦN NÀY' : '') + ' (₫)</label>' +
    '<input class="ip" id="x_chi" inputmode="numeric" placeholder="0"></div></div>' +
    (Number(p.chiPhi)
      ? '<div class="hint" style="margin:-4px 0 4px">Lần trước đã tốn <b style="color:#B45309">' + tien(p.chiPhi) +
        '₫</b>. Chỉ điền phần phát sinh thêm — máy tự cộng vào tổng. Không tốn thêm thì để trống.</div>'
      : '') +
    '<div class="f"><label>ẢNH SAU KHI SỬA <i>*</i></label><div id="x_anh">' + oAnh(TAM.anh, true) + '</div>' +
    '<div class="hint">Ảnh nén ngay trên máy rồi mới gửi — đỡ tốn 4G.</div></div>' +
    '<div class="f"><label>ĐÃ XỬ LÝ NHƯ THẾ NÀO</label><textarea class="ip" id="x_ghi" placeholder="VD: đi lại keo mép thảm, thay 1,2m nẹp nhôm">' + esc(p.xuLyGhi || '') + '</textarea></div>' +
    /* ============================================================
       QUÁ NGÀY ĐÃ HẸN THÌ PHẢI GHI VÌ SAO (19/09 — Trường chốt).
       Trước đây xong muộn hay xong đúng hẹn đều bấm một nút như nhau, không
       để lại dấu vết gì ngoài con số % trong màn Hiệu suất. Giờ trễ là bắt
       gõ một dòng — họp mới phân biệt được thợ chậm với chờ hàng, chờ nhà thầu.
       Ô này chỉ hiện khi THẬT SỰ trễ so với ngày CHÍNH THỢ tự hẹn.
       ============================================================ */
    (tre ? '<div class="f"><label style="color:#B91C1C">VÌ SAO XONG MUỘN ' + tre + ' NGÀY <i>*</i> — BẮT BUỘC</label>' +
      '<div class="chonHang" id="x_ly">' +
      ['Chờ vật tư / hàng về', 'Chờ nhà thầu ngoài', 'Cơ sở bận, không vào được', 'Việc khác gấp hơn', 'Tự tao làm chậm']
        .map(x => '<button data-lytre="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
      '<textarea class="ip" id="x_lyghi" placeholder="Nói rõ thêm nếu cần" style="margin-top:7px"></textarea>' +
      '<div class="hint do">Bấm một lý do ở trên, hoặc tự gõ vào ô này.</div></div>' : ''),
    '<button class="btn v" data-ld="vuong">⏸ Vướng</button><button class="btn la" id="x_ok">Báo đã sửa xong</button>'));
}
async function luuBaoXong() {
  const tho = [].map.call(document.querySelectorAll('#x_tho .on'), b => b.dataset.tho);
  if (!tho.length) { nhac('Phải tick tên người sửa', 'do'); return; }
  if (!TAM.anh.length && !TAM.cho.length) { nhac('Phải có ít nhất 1 ảnh sau khi sửa', 'do'); return; }
  const ngay = document.getElementById('x_ngay').value;
  if (!ngay) { nhac('Chưa chọn ngày sửa xong', 'do'); return; }
  /* trễ thì bắt buộc có lý do — chọn chip hoặc tự gõ, một trong hai (19/09) */
  const oLy = document.getElementById('x_ly');
  let lyTre = '';
  if (oLy) {
    const chip = [].map.call(oLy.querySelectorAll('.on'), x => x.dataset.lytre);
    const go = (document.getElementById('x_lyghi').value || '').trim();
    lyTre = [chip.join(' · '), go].filter(Boolean).join(' — ');
    if (!lyTre) { nhac('Xong muộn thì phải ghi vì sao — bấm một lý do hoặc gõ vào ô', 'do'); return; }
  }
  /* ============================================================
     Ô TIỀN ĐỂ TRỐNG THÌ HỎI LẠI MỘT CÂU (28/09 — Trường chốt).
     Có lỗi sửa xong chẳng tốn đồng nào, có lỗi phải mua đồ. Trước đây để trống
     là gửi thẳng, nên không phân biệt được "thật sự 0₫" với "quên không điền" —
     mà cột chi phí trong báo cáo tháng lại đọc đúng ô đó.
     Điền số rồi thì gửi thẳng, không cản. Chỉ hỏi khi trống.
     ============================================================ */
  const oChi = document.getElementById('x_chi');
  const soTien = Number(String((oChi || {}).value || '').replace(/\D/g, '')) || 0;
  if (!soTien && !XAC_NHAN_0D) { return hoiChiPhi0(); }
  XAC_NHAN_0D = false;
  const b = document.getElementById('x_ok'); b.disabled = true; b.textContent = 'Đang lưu…';
  try {
    await baoXong(PH, {
      nguoiSua: tho, ngayXong: ngay,
      chiPhi: soTien,
      xuLyGhi: (document.getElementById('x_ghi').value || '').trim(), anh: TAM.anh.slice(),
      lyDoTre: lyTre
    });
    ganAnhMuon(PH.id, 'anh_sau');
    FORM = null; xoaTam(); dongSheet(); veNgan(); veHet();
    xongViec('Đã báo xong', 'chờ CHT ' + tenCoSo(PH.coSoId) + ' nghiệm thu');
  } catch (e) { return hongLuu(e, 'x_ok', 'Báo đã sửa xong'); }
}

/* ============================================================
   HỘP HỎI LẠI KHI Ô TIỀN TRỐNG (28/09). Không dựng sheet mới đè lên form báo
   xong — làm vậy là mất sạch ảnh đang chờ và mấy ô vừa gõ. Chỉ phủ một lớp
   hỏi lên trên, bấm xong gỡ ra, form bên dưới còn nguyên.
   ============================================================ */
let XAC_NHAN_0D = false;
function hoiChiPhi0() {
  const cu = document.getElementById('hoiCp0'); if (cu) cu.remove();
  const o = document.createElement('div');
  o.id = 'hoiCp0';
  o.setAttribute('style', 'position:fixed;inset:0;z-index:90;background:rgba(15,23,42,.55);' +
    'display:grid;place-items:center;padding:22px');
  /* dùng đúng tên biến trong kt.css (--card / --chu) — gõ sai tên thì nền tối
     sẽ ra hộp trắng chữ trắng, không đọc được gì */
  o.innerHTML = '<div style="background:var(--card,#fff);color:var(--chu,#0F2A44);border-radius:15px;' +
    'padding:20px 18px;max-width:330px;width:100%;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.3)">' +
    '<div style="font-size:30px;margin-bottom:8px">💰</div>' +
    '<div style="font-size:15.5px;font-weight:700;margin-bottom:6px">Lần này không tốn đồng nào?</div>' +
    '<div style="font-size:12.5px;opacity:.7;line-height:1.55;margin-bottom:15px">Ô chi phí đang để trống. ' +
    'Xác nhận là việc này không mua đồ, không thuê ngoài, không phát sinh gì thêm.</div>' +
    '<div style="display:flex;gap:9px">' +
    '<button class="btn v" style="flex:1" id="cp0_khong">Để tôi điền</button>' +
    '<button class="btn pri" style="flex:1" id="cp0_ok">Đúng, 0₫</button></div></div>';
  document.body.appendChild(o);
  o.addEventListener('click', e => {
    if (e.target.id === 'cp0_ok') { XAC_NHAN_0D = true; o.remove(); luuBaoXong(); return; }
    if (e.target.id === 'cp0_khong' || e.target === o) {
      o.remove();
      const i = document.getElementById('x_chi'); if (i) { i.focus(); i.select && i.select(); }
    }
  });
}

/* ---------- ④ NGHIỆM THU ---------- */
function formNghiemThu(dat) {
  const p = PH;
  const anh = (ds, nhan, mau) => '<div><div style="font-size:10px;font-weight:800;color:' + mau + ';margin-bottom:4px">' + nhan + '</div>' +
    (ds && ds.length ? '<button class="anhO" style="width:100%;height:104px;background-image:url(' + esc(ds[0]) + ')" data-xem="' + esc(ds[0]) + '"></button>'
      : '<div class="anhO" style="width:100%;height:104px;background:#F1F5F9;color:#94A3B8;font-size:11px">chưa có</div>') + '</div>';
  if (dat) {
    moSheet(khungSheet('Xác nhận ĐẠT', 'Phiếu sẽ đóng và tính vào tỉ lệ hoàn thành',
      '<div class="kh" style="margin-bottom:12px"><div class="kb">' +
      '<div style="font-size:14px;font-weight:700">' + esc(p.noiDung) + '</div>' +
      '<div style="font-size:11.5px;color:#64748B;margin-top:3px">Người sửa: <b>' + esc((p.nguoiSua || []).join(', ')) + '</b> · xong ' + ddyy(p.ngayXong) +
      (p.chiPhi ? ' · ' + tien(p.chiPhi) + '₫' : '') + '</div>' +
      (p.xuLyGhi ? '<div style="font-size:12px;color:#334155;margin-top:6px">' + esc(p.xuLyGhi) + '</div>' : '') + '</div></div>' +
      '<div class="f"><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">' +
      anh(p.anhTruoc, 'TRƯỚC KHI SỬA', '#0E7490') + anh(p.anhSau, 'SAU KHI SỬA', '#16A34A') + '</div></div>',
      '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn la" id="d_ok">✓ Xác nhận ĐẠT</button>'));
  } else {
    moSheet(khungSheet('Chưa đạt — trả lại kỹ thuật', 'Ghi rõ chỗ nào chưa được, kỹ thuật sẽ làm lại',
      '<div class="f"><label>LÝ DO CHƯA ĐẠT <i>*</i></label><textarea class="ip" id="d_ly" placeholder="VD: mép thảm cạnh cửa vẫn bong, trẻ còn vấp"></textarea></div>' +
      '<div class="f"><label>ẢNH CHỖ CHƯA ĐẠT</label><div id="d_anh">' + oAnh(TAM.anh, true) + '</div></div>',
      '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn do" id="d_khong">Trả lại kỹ thuật</button>'));
  }
}
async function luuNghiemThu(dat) {
  if (dat) {
    const b = document.getElementById('d_ok'); b.disabled = true; b.textContent = 'Đang lưu…';
  try {
      await nghiemThu(PH, true, '');
      xoaTam(); dongSheet(); veNgan(); veHet(); xongViec('Đã nghiệm thu ĐẠT', 'phiếu đóng lại');
  } catch (e) { return hongLuu(e, 'd_ok', '✓ Xác nhận ĐẠT'); }
  } else {
    const ly = (document.getElementById('d_ly').value || '').trim();
    if (!ly) { nhac('Phải ghi lý do chưa đạt', 'do'); return; }
    const b = document.getElementById('d_khong'); b.disabled = true; b.textContent = 'Đang lưu…';
  try {
      if (TAM.anh.length) await nhanTin(PH, 'Ảnh chỗ chưa đạt', TAM.anh.slice());
      await nghiemThu(PH, false, ly);
      xoaTam(); dongSheet(); veNgan(); veHet(); nhac('Đã trả lại kỹ thuật', 'canh');
  } catch (e) { return hongLuu(e, 'd_khong', 'Trả lại kỹ thuật'); }
  }
}

/* ---------- vướng / dời ngày / huỷ ---------- */
function formVuong() {
  const p = PH;
  moSheet(khungSheet('Đang vướng gì?', 'Ghi rõ để cơ sở và quản lý biết vì sao chậm',
    '<div class="f"><label>CHỌN TÌNH TRẠNG</label>' +
    Object.keys(VUONG).map(k => '<button class="mn ' + (p.dangVuong === k ? 'on' : '') + '" data-vuong="' + k + '">' +
      '<div class="ic" style="background:' + VUONG[k].nen + ';color:' + VUONG[k].chu + '">⏸</div><div><b>' + VUONG[k].ten + '</b></div><span class="mui">›</span></button>').join('') +
    '<button class="mn" data-vuong=""><div class="ic" style="background:#DCFCE7;color:#15803D">▶</div><div><b>Hết vướng, làm tiếp</b></div><span class="mui">›</span></button></div>' +
    '<div class="f"><label>GHI CHÚ</label><textarea class="ip" id="v_ghi" placeholder="VD: đã đặt hàng, hẹn giao 19/08">' + esc(p.vuongGhi || '') + '</textarea></div>',
    '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn pri" id="v_ok">Lưu</button>'));
}
/* ============================================================
   DỜI HẠN (sửa 28/09 — Trường chốt quy trình mới).
   · ADMIN bấm là đổi luôn, như cũ — không ai duyệt admin.
   · KỸ THUẬT chỉ XIN: ghi ngày mong muốn + lý do bắt buộc, hạn cũ giữ nguyên
     tới khi admin duyệt. Cùng một form, khác chữ và khác nút, để kỹ thuật
     không tưởng mình vừa dời xong rồi yên tâm về nhà.
   ============================================================ */
function formDoiNgay() {
  const p = PH;
  const xin = !laQuanLy();                 /* kỹ thuật → xin; admin → đổi thẳng */
  if (xin && dangXinDoi(p)) {              /* đang treo lời xin thì không xin chồng */
    nhac('Đang có lời xin chờ quản lý duyệt — rút lời xin cũ trước đã', 'canh'); return;
  }
  moSheet(khungSheet(
    xin ? 'Xin dời ngày dự kiến' : 'Dời ngày dự kiến',
    xin
      ? 'Đang hẹn ' + (p.duKien ? ddyy(p.duKien) : 'chưa có hạn') + ' — quản lý duyệt xong ngày mới mới có hiệu lực'
      : 'Ngày cũ: ' + (p.duKien ? ddyy(p.duKien) : 'chưa có') + ' — mọi lần dời đều ghi vào diễn biến',
    '<div class="f"><label>NGÀY DỰ KIẾN MỚI <i>*</i></label><input class="ip bb2" type="date" id="dn_ngay" value="' + ngayISO(p.duKien || Date.now()) + '"></div>' +
    '<div class="f"><label>VÌ SAO DỜI <i>*</i></label><textarea class="ip" id="dn_ly" placeholder="VD: nhà thầu báo chậm hàng 3 ngày"></textarea>' +
    (xin ? '<div class="hint">Quản lý đọc đúng dòng này để quyết. Ghi rõ giúp duyệt nhanh.</div>' : '') + '</div>' +
    (xin ? '<div class="hint" style="padding:9px 11px;background:#FEF3C7;color:#92400E;border-radius:9px;line-height:1.5">' +
      'Trong lúc chờ duyệt bạn vẫn báo sửa xong bình thường. Xong trước hạn thì lời xin tự huỷ.</div>' : ''),
    '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn pri" id="dn_ok">' +
    (xin ? 'Gửi quản lý duyệt' : 'Lưu ngày mới') + '</button>'));
}

/* ============================================================
   MÀN DUYỆT CỦA ADMIN (28/09). Vào từ dải vàng trong phiếu, hoặc từ mục
   "Duyệt dời hạn" trong Cài đặt khi có lời xin đang chờ.
   ============================================================ */
function formDuyetDoi() {
  const p = PH; if (!p || !dangXinDoi(p)) { nhac('Lời xin này không còn nữa', 'canh'); return; }
  const cho = Math.floor((Date.now() - (p.doiXinLuc || Date.now())) / 3600000);
  moSheet(khungSheet('Duyệt dời hạn', 'Đọc lý do rồi quyết — kỹ thuật và cơ sở đều được báo kết quả',
    '<div class="card" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:11px;padding:12px">' +
    '<div style="font-size:11px;color:#64748B">' + esc(p.id) + ' · ' + esc(tenCoSo(p.coSoId)) +
    (p.gianHangId ? ' ▸ ' + esc(tenGianHang(p.gianHangId)) : '') + '</div>' +
    '<div style="font-size:14px;font-weight:700;margin:3px 0 8px">' + esc(p.noiDung) + '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid #E2E8F0"><span style="color:#64748B">Người xin</span><b>' + esc(p.doiXinNguoi || '—') + '</b></div>' +
    '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid #E2E8F0"><span style="color:#64748B">Hạn</span><b><s style="color:#94A3B8">' + (p.duKien ? ddyy(p.duKien) : '—') +
    '</s> → <span style="color:#B45309">' + ddyy(p.doiXinNgay) + '</span></b></div>' +
    '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid #E2E8F0"><span style="color:#64748B">Cơ sở mong muốn</span><b>' + (p.mongMuon ? ddyy(p.mongMuon) : '—') + '</b></div>' +
    '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid #E2E8F0"><span style="color:#64748B">Xin lúc</span><b>' + ddGio(p.doiXinLuc) + (cho >= 24 ? ' · đã chờ ' + Math.floor(cho / 24) + ' ngày' : '') + '</b></div>' +
    '<div style="background:#fff;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:9px 11px;font-size:13px;line-height:1.55;margin-top:9px">' +
    esc(p.doiXinLy || 'không ghi lý do') + '</div></div>' +
    '<div class="f" id="dd_khungly" style="display:none"><label>VÌ SAO KHÔNG DUYỆT <i>*</i></label>' +
    '<textarea class="ip" id="dd_ly" placeholder="VD: hàng đã về kho từ hôm qua, không có lý do lùi"></textarea>' +
    '<div class="hint">Kỹ thuật và cơ sở đều đọc được dòng này.</div></div>',
    '<button class="btn do" id="dd_khong">✕ Không duyệt</button><button class="btn la" id="dd_ok">✓ Duyệt</button>'));
}
/* trả việc lại team (04/09) — bắt ghi lý do để team biết kẹt gì mà nhận tiếp */
function formTraViec() {
  moSheet(khungSheet('↩ Trả việc lại team', 'Việc về trạng thái CHƯA AI NHẬN — cả team và quản lý được báo kèm lý do',
    '<div class="f"><label>VÌ SAO TRẢ LẠI <i>*</i></label><textarea class="ip" id="tv_ly" placeholder="VD: đang kẹt ở Royal City hết tuần / cần đồ nghề chuyên"></textarea></div>',
    '<button class="btn v" data-dongsheet="1">Thôi, giữ việc</button><button class="btn do" data-traok="1">↩ Trả lại team</button>'));
  setTimeout(() => { const o = document.getElementById('tv_ly'); if (o) o.focus(); }, 250);
}

/* ============================================================
   MÀN THU HỒI (14/09). Trường chốt: thợ đã bấm nhận rồi VẪN thu hồi được,
   nhưng phải hỏi lại một lần — nói rõ nó nhận lúc nào, hẹn xong ngày nào, để
   mày biết mình đang rút việc khỏi tay người đang làm dở hay chỉ sửa một cú
   trượt tay. Lý do không bắt buộc: trượt tay thì làm gì có lý do để ghi.
   ============================================================ */
function formThuHoi() {
  if (!PH) return;
  const p = PH;
  const ai = p.nguoiNhanKt ? [p.nguoiNhanKt] : (p.nguoiGiao || []);
  const daNhan = p.trangThai === 'tiepnhan';
  const canh = daNhan
    ? '<div class="canhTH">⚠️ <b>' + esc(ai.join(', ')) + '</b> đã bấm nhận việc này' +
      (p.nhanLuc ? ' lúc ' + ddyyGio(p.nhanLuc) : '') +
      (p.duKien ? ' và hẹn xong ' + ddyy(p.duKien) : '') +
      '.<br>Thu hồi là rút việc khỏi tay người đang làm dở — chắc chưa?</div>'
    : '<div class="canhTH nhe">' + esc(ai.join(', ')) + ' chưa bấm nhận — thu hồi lúc này không ảnh hưởng gì.</div>';
  moSheet(khungSheet('↩ Thu hồi việc đã giao',
    'Việc quay về CHƯA AI NHẬN · ' + esc(ai.join(', ')) + ' được báo ngay · một dòng ghi vào phiếu',
    canh + '<div class="f"><label>LÝ DO <i>(không bắt buộc)</i></label>' +
    '<input class="ip" id="th_ly" placeholder="VD: giao nhầm, để anh Hiến làm"></div>',
    '<button class="btn v" data-dongsheet="1">Thôi, giữ nguyên</button>' +
    '<button class="btn do" id="th_ok">↩ Thu hồi</button>'));
}

/* ============================================================
   ĐỔI NHÓM LỖI (20/09). Nhóm do AI đọc nội dung mà đoán ra; đoán sai thì
   admin bấm một cái là đổi. Nhóm hiện tại được tô sẵn, kèm dòng cho biết
   nhóm đó do AI hay do bộ dò từ khoá cũ gán.
   ============================================================ */
function formDoiNhom() {
  if (!PH) return;
  const p = PH;
  moSheet(khungSheet('🏷 Đổi nhóm lỗi', esc(p.noiDung),
    '<div class="f"><label>NHÓM ĐANG GHI</label>' +
    '<div class="nlHien">' + esc(NHOM_LOI[p.nhomLoi] || 'Khác') + '</div>' +
    '<div class="hint">Nhóm lỗi chỉ dùng cho thống kê và biểu đồ — đổi ở đây không ảnh hưởng ai đang sửa việc.</div></div>' +
    '<div class="f"><label>CHỌN NHÓM ĐÚNG</label><div class="nlLuoi">' +
    Object.keys(NHOM_LOI).map(k =>
      '<button class="nlO' + (k === p.nhomLoi ? ' on' : '') + '" data-chonnhom="' + esc(k) + '">' +
      esc(NHOM_LOI[k]) + '</button>').join('') + '</div></div>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

function formHuy() {
  moSheet(khungSheet('Huỷ phiếu', 'Phiếu không bị xoá, chỉ đánh dấu huỷ kèm lý do',
    '<div class="f"><label>LÝ DO HUỶ <i>*</i></label><textarea class="ip" id="h_ly" placeholder="VD: trùng với phiếu KT-0081"></textarea></div>',
    '<button class="btn v" data-dongsheet="1">Không huỷ</button><button class="btn do" id="h_ok">Huỷ phiếu</button>'));
}

/* ============================================================
   XOÁ HẲN PHIẾU (25/09 — Trường chốt: "xoá hẳn, mất luôn cả ảnh và video",
   cửa chặn là gõ chữ XOA).

   Màn này phải nói THẬT to cái giá phải trả, vì bấm xong là hết đường lui:
   đếm đúng số ảnh/video sẽ mất, nhắc rõ không khôi phục được, và bắt gõ tay
   chữ XOA — gõ được thì chắc chắn là cố ý, không phải trượt ngón.
   ============================================================ */
function demFilePhieu(p) {
  let n = (p.anhTruoc || []).length + (p.anhSau || []).length;
  (D.dienBien[p.id] || []).forEach(x => { n += ((x.anh || []).length); });
  return n;
}
function formXoaPhieu() {
  if (!PH) return;
  const p = PH;
  const soF = demFilePhieu(p);
  moSheet(khungSheet('🗑 Xoá hẳn phiếu ' + esc(p.id),
    'Xoá xong KHÔNG lấy lại được — kể cả tao cũng không',
    '<div class="hop-canh" style="background:#FEE2E2;border-color:#DC2626;color:#7F1D1D">' +
    '<b>' + esc(p.noiDung) + '</b><br>' +
    esc(tenCoSo(p.coSoId)) + (p.gianHangId ? ' ▸ ' + esc(tenGianHang(p.gianHangId)) : '') +
    ' · ' + esc(((TT[p.trangThai] || {}).ten || '').toLowerCase()) +
    '<br><br>Sẽ mất vĩnh viễn:<br>' +
    '· Phiếu và toàn bộ nội dung trao đổi<br>' +
    '· <b>' + soF + ' ảnh / video</b> trong kho' +
    (p.chtKetQua ? '<br>· Dấu nghiệm thu của cửa hàng trưởng' : '') +
    '</div>' +
    '<div class="f"><label>GÕ CHỮ <b>XOA</b> ĐỂ XÁC NHẬN <i>*</i></label>' +
    '<input class="ip" id="xp_xn" placeholder="XOA" autocapitalize="characters" autocomplete="off"></div>' +
    '<div class="qlNhac">Nếu chỉ muốn phiếu khỏi hiện trong danh sách mà vẫn giữ được ' +
    'để tra lại sau, hãy dùng <b>Huỷ phiếu</b> thay vì xoá.</div>',
    '<button class="btn v" data-dongsheet="1">Thôi, giữ lại</button>' +
    '<button class="btn do" id="xp_ok">Xoá hẳn</button>'));
}

/* ---------- thêm ảnh / video ---------- */
function formThemAnh(dich) {
  TAM.dich = dich || 'form';
  /* Ô ＋ trong TRAO ĐỔI: lưới tính năng kiểu Zalo (Trường chốt 30/08) —
     thêm Gửi vị trí (thợ báo "tôi đang ở đây") và 👍 Đã rõ (tay bẩn bấm một phát) */
  const luoiChat = dich === 'chat' && PH
    ? '<div class="luoiCn">' +
      '<button class="cn" data-vitri="1"><em style="background:#FEE2E2;color:#B91C1C"><img width="22" height="22" class="kgIc" src="ic/kg-vitri.webp" alt="" loading="lazy"></em>Gửi vị trí</button>' +
      '<button class="cn" data-daro="1"><em style="background:#DCFCE7;color:#15803D"><img width="22" height="22" class="kgIc" src="ic/nghiem-thu.webp" alt="" loading="lazy"></em>Đã rõ</button>' +
      '<button class="cn" data-thoaic="1"><em style="background:#EDE9FE;color:#6D28D9"><img width="22" height="22" class="kgIc" src="ic/kg-ghiam.webp" alt="" loading="lazy"></em>Tin thoại</button>' +
      '</div>' : '';
  moSheet(khungSheet('Thêm ảnh / video', 'Tối đa 10 ảnh · video tối đa 60 giây · muốn nét thì quay bằng app Camera',
    luoiChat +
    '<button class="mn" data-chon="chup"><div class="ic" style="background:#E0F2FE;color:#0369A1"><img width="22" height="22" class="mnIc" src="ic/kg-chupanh.webp" alt="" loading="lazy"></div><div><b>Chụp ảnh</b><div class="s">mở camera, chụp xong dùng luôn</div></div><span class="mui">›</span></button>' +
    '<button class="mn" data-chon="album"><div class="ic" style="background:#DCFCE7;color:#15803D"><img width="22" height="22" class="mnIc" src="ic/kg-thuvien.webp" alt="" loading="lazy"></div><div><b>Chọn ảnh từ album</b><div class="s">chọn nhiều ảnh một lần</div></div><span class="mui">›</span></button>' +
    /* THỨ TỰ ĐẢO LẠI (Trường chốt 29/08: "phần quay video cho nét hơn được không").
       Cách nét đứng TRƯỚC, cách tiện đứng sau và nói thẳng là mờ.
       Lý do: bấm quay ngay trong web thì iPhone mở camera ở chế độ dành cho web,
       Apple khoá quanh 720p — web KHÔNG có lệnh nào ép lên 1080p/4K. Còn quay bằng
       app Camera của máy thì theo đúng cài đặt máy (1080p, 4K), nét gấp mấy lần. */
    '<button class="mn" data-chon="video"><div class="ic" style="background:#DCFCE7;color:#15803D"><img width="22" height="22" class="mnIc" src="ic/kg-video.webp" alt="" loading="lazy"></div><div><b>Chọn video có sẵn — NÉT NHẤT</b><div class="s">Quay bằng app Camera của máy trước, rồi vào đây chọn</div></div><span class="mui">›</span></button>' +
    '<button class="mn" data-chon="quaymay"><div class="ic" style="background:#FEF3C7;color:#B45309"><img width="22" height="22" class="mnIc" src="ic/kg-video.webp" alt="" loading="lazy"></div><div><b>Quay nhanh trong web — mờ hơn</b><div class="s">Tiện nhưng iPhone khoá ~720p, chỉ dùng khi cần gấp</div></div><span class="mui">›</span></button>' +
    /* Hai việc phụ chuyển từ đáy màn vào đây — đáy chỉ để nút chính, cho gọn.
       Ảnh KT-24 đã chốt cũng chỉ có 3 nút Nhận việc và ô nhắn. */
    (PH && laTho() && PH.trangThai !== 'nghiemthu' && PH.trangThai !== 'huy'
      ? '<button class="mn" data-ld="vuong"><div class="ic" style="background:#FEF3C7;color:#B45309">⏸</div><div><b>Báo đang vướng</b><div class="s">chờ vật tư, chờ nhà thầu, cần làm đêm…</div></div><span class="mui">›</span></button>' : '') +
    (PH ? '<button class="mn" data-chiase="1"><div class="ic" style="background:#F1F5F9;color:#475569"><img width="22" height="22" class="mnIc" src="ic/kg-gui.webp" alt="" loading="lazy"></div><div><b>Chia sẻ phiếu</b><div class="s">copy sang Zalo, gửi cho người khác</div></div><span class="mui">›</span></button>' : ''),
    /* lối thoát nói thẳng (#45): hết nhu cầu chụp/chọn thì bấm là ra, không gửi gì */
    '<button class="btn v" style="flex:1" data-dongsheet="1">✕ Thôi — không gửi gì</button>'));
}
/* 📍 GỬI VỊ TRÍ (Trường chốt 30/08, tham khảo Zalo): thợ bấm một phát là CHT
   biết đang ở đâu — gửi link Google Maps vào trao đổi, đi kèm thông báo tin nhắn. */
function guiViTri() {
  if (!PH) return;
  if (!navigator.geolocation) { nhac('Máy này không lấy được vị trí', 'do'); return; }
  dongSheet();
  nhac('Đang lấy vị trí…', 'canh');
  const pid = PH.id;
  navigator.geolocation.getCurrentPosition(async v => {
    try {
      const u = 'https://maps.google.com/?q=' + v.coords.latitude.toFixed(6) + ',' + v.coords.longitude.toFixed(6);
      await nhanTin(phieu(pid), '📍 Tôi đang ở đây: ' + u, []);
      if (PH && PH.id === pid) veNgan(true);
      nhac('Đã gửi vị trí', 'la');
    } catch (e) { nhac('Gửi vị trí không được — thử lại', 'do'); }
  }, () => nhac('Không lấy được vị trí — bật quyền Vị trí cho trình duyệt rồi thử lại', 'do'),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
}
/* 👍 ĐÃ RÕ — xác nhận một chạm, khỏi gõ (30/08) */
async function guiDaRo() {
  if (!PH) return;
  dongSheet();
  const pid = PH.id;
  await nhanTin(phieu(pid), '👍 Đã rõ', []);
  if (PH && PH.id === pid) veNgan(true);
}

/* ============================================================
   Ô CHỌN FILE — PHẢI SỐNG DAI (Trường quay video 07/09: chọn 18 ảnh, bấm ✓ mà
   web không hiện gì; 9 ảnh thì bình thường).
   Nguyên nhân: ô chọn file trước đây được tạo tạm rồi bỏ, KHÔNG gắn vào trang.
   iPhone chọn 18 ảnh HEIC thì phải chuẩn bị (chuyển sang JPEG) mất hàng chục
   giây; trong lúc đó hệ thống thu hồi cái ô tạm kia, nên đến lúc máy gửi ảnh
   sang thì KHÔNG CÒN AI NHẬN — web đứng im, người dùng tưởng hỏng.
   Chữa: dùng MỘT ô chọn duy nhất gắn sẵn trong trang (không bao giờ bị thu
   hồi), và trong lúc chờ máy chuẩn bị ảnh thì hiện dải "⏳ Đang lấy ảnh…" để
   biết web vẫn đang đợi, không phải chết.
   ============================================================ */
let O_CHON = null, CHON_CHO = null;
function oChonFile() {
  if (O_CHON) return O_CHON;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.id = 'oChonFile';
  /* nằm trong trang nhưng không ai thấy — quan trọng là KHÔNG bị thu hồi */
  inp.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0';
  inp.addEventListener('change', () => {
    const c = CHON_CHO; CHON_CHO = null;
    boDaiLayAnh();
    const fs = [].slice.call(inp.files || []);
    try { inp.value = ''; } catch (e) { }       /* để lần sau chọn ĐÚNG ảnh đó vẫn bắn */
    if (c) c(fs);
  });
  /* người dùng bấm Huỷ trong màn chọn ảnh (máy mới có sự kiện này) */
  inp.addEventListener('cancel', () => {
    const c = CHON_CHO; CHON_CHO = null;
    boDaiLayAnh();
    if (c) c([]);
  });
  document.body.appendChild(inp);
  O_CHON = inp;
  return inp;
}
/* dải "đang lấy ảnh từ máy" — để người dùng biết web đang chờ, không phải treo */
function veDaiLayAnh(laVid) {
  boDaiLayAnh();
  const el = document.createElement('div');
  el.id = 'daiLayAnh'; el.className = 'daiLayAnh';
  el.innerHTML = '<i></i><b>Đang lấy ' + (laVid ? 'video' : 'ảnh') + ' từ máy…</b>' +
    '<span>chọn nhiều ảnh thì máy chuẩn bị hơi lâu, cứ chờ</span>';
  document.body.appendChild(el);
  /* quá lâu thì nói thật + gợi ý cách làm được ngay */
  CHON_HET = setTimeout(() => {
    boDaiLayAnh();
    if (CHON_CHO) { CHON_CHO = null; nhacNut('Máy chưa gửi ảnh sang được — thử chọn ít hơn (8-10 tấm một lượt)', 'do', 'Chọn lại', () => chonFile('album'), 15); }
  }, 90000);
}
let CHON_HET = 0;
function boDaiLayAnh() {
  clearTimeout(CHON_HET);
  const e = document.getElementById('daiLayAnh'); if (e) e.remove();
}

function chonFile(kieu) {                 // 'chup' | 'album' | 'video' | 'quaymay'
  const laVid = kieu === 'video' || kieu === 'quaymay';
  const inp = oChonFile();
  inp.accept = laVid ? 'video/*' : 'image/*';
  inp.multiple = kieu === 'album';
  /* capture = giao cho app Camera của máy mở luôn, không phải chọn từ album.
     Đây là cách quay video duy nhất chắc chắn chạy trên iPhone. */
  if (kieu === 'chup' || kieu === 'quaymay') { inp.capture = 'environment'; inp.setAttribute('capture', 'environment'); }
  else { inp.removeAttribute('capture'); }

  /* GHIM NGAY bối cảnh lúc chọn: gửi nền có thể xong sau vài phút, lúc đó người dùng
     đã đóng phiếu hoặc đổi sang tài khoản khác — không được dựa vào PH/D.nguoi lúc xong */
  const dichLuc = TAM.dich, phieuLuc = PH ? PH.id : null;
  const tenLuc = (D.nguoi || {}).ten || '';

  CHON_CHO = fs => {
    /* QUAY LẠI ĐÚNG FORM ĐANG GÕ — không để phiếu biến mất.
       Chỉ đóng khay/menu SAU KHI đã có ảnh, chứ không đóng lúc còn đang chờ */
    if (!moLaiForm()) dongSheet();
    if (!fs.length) return;
    if (laVid) { guiCacFile(fs, true, dichLuc, phieuLuc, tenLuc); return; }
    /* ẢNH: màn DUYỆT cả loạt (Trường chốt 29/08) — trước đây ép sửa lần lượt
       từng tấm; giờ hiện hết, bấm tấm nào sửa tấm đó, cuối cùng MỘT nút Gửi */
    duyetTruocGui(fs).then(kq => {
      if (!kq) { nhac('Đã huỷ, không gửi ảnh nào', 'canh'); return; }
      guiCacFile(kq, false, dichLuc, phieuLuc, tenLuc);
    });
  };
  veDaiLayAnh(laVid);
  inp.click();
}

/* gửi các file lên kho + gắn vào đúng chỗ — tách riêng để màn sửa-trước-gửi chen vào được */
function guiCacFile(fs, laVid, dichLuc, phieuLuc, tenLuc) {
  {
    /* hiện ngay ảnh trong máy kèm %; việc gửi chạy NỀN, mày cứ gõ tiếp và bấm Gửi.
       laVid + TAM.phieu để bong bóng trong khung chat vẽ đúng (07/09) */
    const chos = fs.map(f => ({ xem: URL.createObjectURL(f), pt: 0, ten: f.name, laVid: !!laVid }));
    TAM.cho = (TAM.cho || []).concat(chos);
    TAM.dich = dichLuc; TAM.phieu = phieuLuc;
    veLaiOAnh();
    const mb = Math.round(fs.reduce((s, f) => s + f.size, 0) / 1048576 * 10) / 10;
    nhac(fs.length + (laVid ? ' video (' + mb + 'MB)' : ' ảnh') + ' đang gửi nền — cứ làm tiếp, nhưng ĐỪNG ĐÓNG WEB tới khi báo xong', 'canh');

    /* gửi tất cả cùng lúc, không nối đuôi.
       Mỗi file VÀO HỘP CHỜ trước khi gửi (01/09): web bị đóng giữa chừng thì
       mở lại vẫn còn file, gửi tiếp được — xoá khỏi hộp khi đã nằm trên kho. */
    const dsHua = fs.map((f, i) => {
      const c = chos[i];
      /* ẢNH: để taiAnh tự cất BẢN ĐÃ NÉN vào hộp (09/09) — hộp nhẹ đi ~80% và
         gửi bù không phải nén lại. VIDEO: cất nguyên file, video không nén được. */
      const duHop = { laVid: laVid, phieuId: phieuLuc, ten: tenLuc };
      const hopId = laVid ? hopThem(f, duHop)
        : new Promise(nha => { duHop.khiVaoHop = nha; setTimeout(() => nha(null), 120000); });
      /* PHẦN TRĂM THẬT (08/09): đếm theo byte đã đẩy đi. Byte đi hết thì hiện
         "đang lưu…" rồi nhích 97→99 để người dùng biết máy còn đang làm, chứ
         không đứng ở 94% như trước. */
      let nhich = 0;
      const tien = (pt, mat) => {
        c.pt = pt; c.mat = mat;
        if (mat === 'luu' && !nhich) {
          nhich = setInterval(() => { c.pt = Math.min(99, (c.pt || 97) + 1); veLaiOAnh(); }, 700);
        }
        if (mat !== 'luu' && nhich) { clearInterval(nhich); nhich = 0; }
        veLaiOAnh();
      };
      return (laVid ? taiVideo(f, phieuLuc || 'moi', tien) : taiAnh(f, phieuLuc || 'moi', tien, duHop))
        .catch(e => {
          if (c.huy) return null;                       /* người dùng đã bấm dừng — im lặng */
          nhac(e.message || 'Một file gửi không được', 'do');
          /* file bị LOẠI hẳn (quá trần, quá dài) thì gửi lại cũng thế — bỏ khỏi hộp luôn */
          if (/tối đa|Quay lại đoạn/.test(e.message || '')) hopId.then(hopXoa);
          return null;
        })
        .then(u => {
          if (nhich) clearInterval(nhich);
          TAM.cho = TAM.cho.filter(x => x !== c);
          try { URL.revokeObjectURL(c.xem); } catch (x) { }
          veLaiOAnh();
          /* ĐÃ BẤM DỪNG (#45): không gắn đi đâu + rời hộp chờ — dừng là dừng hẳn */
          if (c.huy) { hopId.then(hopXoa); return null; }
          if (u) hopId.then(hopXoa);          /* đã lên kho — khỏi giữ trong hộp */
          if (typeof veHopCho === 'function') hopId.then(() => veHopCho());
          return u;
        });
    });

    if (dichLuc === 'chat' && phieuLuc) {
      /* TRAO ĐỔI: gửi thẳng vào phiếu ĐÃ GHIM ngay khi tải xong — không đi qua ô nhắn.
         Đường cũ chờ guiTin() của màn đang mở; rời phiếu hay đổi người trước khi tải xong
         là ảnh/video đã nằm trên kho mà không phiếu nào biết — mất lặng lẽ. Lỗi Trường
         báo 20/08: "nó ghi là chạy nền, đợi 1 lúc đăng nhập kỹ thuật thì có thấy đâu". */
      Promise.all(dsHua).then(async ds => {
        const soHuy = chos.filter(c => c.huy).length;   /* dừng tay không tính là hỏng (#45) */
        const moi = ds.filter(Boolean), hong = ds.length - moi.length - soHuy;
        if (moi.length) {
          await themDienBien(phieuLuc, 'chat', '', moi, tenLuc);
          veVet(phieuLuc, 'chat', { anh: moi.length });
          if (PH && PH.id === phieuLuc) veNgan();
          /* bắn thông báo "📷 Gửi N ảnh" — trước đây ảnh không kèm chữ là câm (30/08) */
          const pAnh = phieu(phieuLuc);
          if (pAnh && typeof dayAnhChat === 'function') dayAnhChat(pAnh, moi.length, laVid, tenLuc);
        }
        /* HỎNG TẤM NÀO: toast đỏ kèm nút GỬI LẠI NGAY (#48 Trường chốt 04/09) —
           file hỏng vẫn nằm nguyên trong hộp chờ, bấm 1 phát là gửi bù, khỏi
           phải mở album mò lại "đúng 3 tấm đó" */
        if (hong) nhacNut('⚠ ' + hong + '/' + ds.length + (laVid ? ' video' : ' ảnh') +
          ' chưa lên được — vẫn giữ an toàn trong máy, không mất', 'do',
          '↻ Gửi lại ngay', () => guiBuHopCho(), 15);
        else if (moi.length) nhac('✓ Đã lên đủ ' + moi.length + '/' + ds.length + (laVid ? ' video' : ' ảnh') + ' vào trao đổi ' + phieuLuc, 'la');
      });
      return;
    }
    /* FORM: giữ đường cũ — URL vào TAM.anh, bấm Gửi là dính; gửi muộn có ganAnhMuon lo */
    dsHua.forEach(h => TAM.hua.push(h.then(u => { if (u) { TAM.anh.push(u); veLaiOAnh(); } return u; })));
    /* TỔNG KẾT loạt gửi — hỏng tấm nào phải NÓI TO kèm số (Trường bắt 30/08:
       "chọn rất nhiều ảnh nhưng chỉ có 2" — trước đây từng tấm hỏng chỉ nháy
       toast 3 giây, dễ trôi mất, người dùng tưởng đủ) */
    Promise.all(dsHua).then(ds => {
      const soHuy = chos.filter(c => c.huy).length;     /* dừng tay không tính là hỏng (#45) */
      const hong = ds.filter(x => !x).length - soHuy;
      if (hong > 0) nhacNut('⚠ ' + hong + '/' + (ds.length - soHuy) + (laVid ? ' video' : ' ảnh') +
        ' chưa lên được — vẫn giữ an toàn trong máy, không mất', 'do',
        '↻ Gửi lại ngay', () => guiBuHopCho(), 15);
      else if (ds.length - soHuy > 1) nhac('✓ Đã lên đủ ' + (ds.length - soHuy) + '/' + (ds.length - soHuy) + (laVid ? ' video' : ' ảnh'), 'la');
    });
  }
}

/* ============================================================
   PIN VAI QUẢN LÝ (Trường chốt 01/09): nhập MỘT lần trên mỗi máy — máy giữ VÉ,
   lần sau vào thẳng như thường. Thợ và CHT không phải đụng gì.
   Huỷ ở màn nhập = quay về màn chọn người (kẻ lạ cầm link admin hết cửa).
   ============================================================ */
const KHOA_VE = 'kt_ve_v1';
function veQuanLy() { try { return localStorage.getItem(KHOA_VE) || ''; } catch (e) { return ''; } }
async function goiPin(than) {
  const r = await fetch('/api/pin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(than) });
  const kq = await r.json().catch(() => ({}));
  if (!r.ok || kq.loi) throw new Error(kq.loi || ('máy chủ trả lỗi ' + r.status));
  return kq;
}
async function kiemPinQuanLy() {
  if (!laQuanLy() || veQuanLy()) return;
  let co;
  try { co = (await goiPin({ viec: 'co' })).co; }
  catch (e) { return; }   /* mất mạng / máy chủ chưa lên bản mới: cho vào, lần sau hỏi lại */
  formPin(co ? 'kiem' : 'dat');
}
function formPin(che) {
  const dau = che === 'dat' ? 'Đặt mã PIN quản lý' : (che === 'doi' ? 'Đổi mã PIN quản lý' : 'Nhập mã PIN quản lý');
  const oPin = (id, nhan, cach) => '<input id="' + id + '" class="ip" inputmode="numeric" pattern="[0-9]*" ' +
    'maxlength="8" type="password" placeholder="' + nhan + '" autocomplete="off"' +
    (cach ? ' style="margin-top:8px"' : '') + '>';
  moSheet('<div class="sheetDau"><div class="keo"></div><h3>🔒 ' + dau + '</h3>' +
    '<div class="p">' + (che === 'kiem' ? 'Máy này chưa mở khoá vai quản lý. Chỉ phải nhập MỘT lần.'
      : 'Vai quản lý xem được mọi thứ nên cần khoá riêng — 4–8 chữ số.') + '</div></div>' +
    '<div style="padding:6px 16px 18px">' +
    (che === 'doi' ? oPin('pin0', 'PIN hiện tại') : '') +
    oPin('pin1', che === 'kiem' ? 'Mã PIN' : 'PIN mới (4–8 số)', che === 'doi') +
    (che !== 'kiem' ? oPin('pin2', 'Nhập lại PIN mới', true) : '') +
    '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button class="btn pri" data-pinok="' + che + '" style="flex:1">Xác nhận</button>' +
    (che === 'doi' ? '<button class="btn v" data-dongsheet="1">Thôi</button>'
      : '<button class="btn v" data-pinthoat="1">Đổi người</button>') +
    '</div></div>');
  setTimeout(() => { const o = document.getElementById(che === 'doi' ? 'pin0' : 'pin1'); if (o) o.focus(); }, 250);
}
async function pinOk(che) {
  const l = id => ((document.getElementById(id) || {}).value || '').trim();
  const p1 = l('pin1');
  if (!/^\d{4,8}$/.test(p1)) return nhac('PIN phải là 4–8 chữ số', 'do');
  if (che !== 'kiem' && p1 !== l('pin2')) return nhac('Hai lần nhập không khớp', 'do');
  try {
    const kq = che === 'kiem' ? await goiPin({ viec: 'kiem', pin: p1 })
      : await goiPin({ viec: 'dat', pin: p1, pinCu: l('pin0') });
    try { localStorage.setItem(KHOA_VE, kq.ve || '1'); } catch (e) { }
    dongSheet();
    nhac('Xong — máy này khỏi phải nhập PIN lại', 'la');
  } catch (e) { nhac(e.message || 'Không kiểm được PIN', 'do'); }
}

/* ============================================================
   BANNER HỘP CHỜ (01/09): mở web mà hộp còn file chưa gửi xong thì hiện
   thanh vàng trên đầu — Gửi tiếp một nút, hoặc Bỏ. Không hộp thì không thấy gì.
   ============================================================ */
/* ============================================================
   HỘP CHỜ — Trường bắt 07/09: "ấn Gửi tiếp chẳng thấy khác mẹ gì".
   Trước đây hộp chỉ có một câu tĩnh, gửi nền không hiện tiến trình, hỏng cũng
   không nói vì sao, nên bấm mấy lần cũng y nguyên. Giờ hộp có 3 mặt:
     · đứng chờ  → "3 ảnh chưa gửi xong (4MB)" + Gửi tiếp / Bỏ
     · đang gửi  → thanh % + "Đang gửi 2/3"
     · vừa hỏng  → nói rõ LÝ DO + đã thử mấy lượt + Thử lại / Bỏ
   ============================================================ */
let HOP_TRANG = null;      /* {dang:'gui'|'hong', xong, tong, pt, ly} */
async function veHopCho() {
  const cu = document.getElementById('hopCho');
  let k = { so: 0 };
  try { await hopDonCu(); k = await hopDem(); } catch (e) { }
  if (!k.so && !(HOP_TRANG && HOP_TRANG.dang === 'gui')) {
    HOP_TRANG = null; if (cu) cu.remove(); return;
  }
  let h = cu;
  if (!h) {
    h = document.createElement('div'); h.id = 'hopCho'; h.className = 'hopCho';
    const than = document.getElementById('than');
    if (than) than.insertBefore(h, than.firstChild); else return;
  }
  const t = HOP_TRANG;
  /* ĐANG GỬI: thanh % chạy, không cho bấm gì kẻo gửi hai lần */
  if (t && t.dang === 'gui') {
    /* NÓI RÕ ĐANG NHANH HAY CHẬM (09/09 — Trường: "5G mà hơn 1 phút chưa xong,
       lag vcl"). Trước đây băng chỉ có % nên không ai biết là mạng chậm hay web
       treo. Giờ hiện tốc độ ĐO ĐƯỢC và còn khoảng bao lâu — chậm thì thấy ngay
       là do đường truyền, không phải web chết. */
    let phu = (t.pt || 0) + '% · xong ' + t.xong + '/' + t.tong;
    const kbs = (typeof tocDoCon === 'function' ? tocDoCon() : 0);
    if (kbs) {
      const conB = (k.byte || 0) * (1 - Math.min(0.95, (t.pt || 0) / 100));
      const giay = conB ? Math.round(conB / 1024 / kbs) : 0;
      phu += ' · ' + Math.round(kbs) + ' KB/s';
      if (giay > 3) phu += ' · còn ~' + (giay >= 90 ? Math.round(giay / 60) + ' phút' : giay + ' giây');
      if (kbs < 90) phu += ' · mạng đang yếu, web đã tự hạ xuống gửi từng tấm';
    }
    h.className = 'hopCho dangGui';
    h.innerHTML = '⏳ <b>Đang gửi ' + Math.min(t.xong + 1, t.tong) + '/' + t.tong + '</b> — đừng đóng web' +
      '<div class="hcThanh"><i style="width:' + Math.max(3, Math.min(100, t.pt || 0)) + '%"></i></div>' +
      '<div class="hcPhu">' + phu + '</div>';
    return;
  }
  const soV = k.vid, soA = k.so - k.vid;
  const mb = Math.round(k.byte / 1048576 * 10) / 10;
  const dem = (soA ? soA + ' ảnh' : '') + (soA && soV ? ' + ' : '') + (soV ? soV + ' video' : '');
  /* VỪA HỎNG: nói thẳng lý do + số lượt đã thử */
  if (t && t.dang === 'hong') {
    const nhieu = (k.thu || 0) >= 3;
    h.className = 'hopCho hcHong';
    h.innerHTML = '⚠ <b>' + dem + ' chưa lên được</b>' +
      '<div class="hcLy">' + esc(t.ly || 'không rõ lý do') + '</div>' +
      '<div class="hcPhu">đã thử ' + (k.thu || 1) + ' lượt · ảnh vẫn nằm an toàn trong máy' +
      (nhieu ? ' — mạng yếu quá thì để lát nữa, hoặc bấm Bỏ rồi chụp lại' : '') + '</div>' +
      '<span class="nutH"><button class="gt" data-hopgui="1">↻ Thử lại</button>' +
      '<button class="bo" data-hopbo="1">Bỏ</button></span>';
    return;
  }
  h.className = 'hopCho';
  h.innerHTML = '📦 <b>' + dem + ' chưa gửi xong</b> từ lần trước' + (mb >= 0.1 ? ' (' + mb + 'MB)' : '') +
    ' — web bị đóng giữa chừng' +
    '<span class="nutH"><button class="gt" data-hopgui="1">Gửi tiếp</button>' +
    '<button class="bo" data-hopbo="1">Bỏ</button></span>';
}
let HOP_DANG_GUI = false;
async function guiBuHopCho() {
  if (HOP_DANG_GUI) { nhac('Đang gửi rồi — chờ thanh chạy xong đã', 'canh'); return; }
  const ds = await hopDoc();
  if (!ds.length) { HOP_TRANG = null; return veHopCho(); }
  await hopThemLanThu();                       /* đếm lượt thử để hộp nói được "đã thử 3 lượt" */
  HOP_DANG_GUI = true;
  HOP_TRANG = { dang: 'gui', xong: 0, tong: ds.length, pt: 2 };
  veHopCho();
  /* thanh % nhích đều cho biết máy còn sống; số xong mới là thật */
  const nhich = setInterval(() => {
    if (!HOP_TRANG || HOP_TRANG.dang !== 'gui') return;
    const tran = Math.round((HOP_TRANG.xong + 0.9) / HOP_TRANG.tong * 100);
    HOP_TRANG.pt = Math.min(tran, (HOP_TRANG.pt || 0) + 2);
    veHopCho();
  }, 700);

  /* gom theo phiếu đích; phiếu không còn thì đổ vào form Báo lỗi mới */
  const nhom = {};
  ds.forEach(x => { (nhom[x.phieuId || ''] = nhom[x.phieuId || ''] || []).push(x); });
  let daMoForm = false, ok = 0, hong = 0, lyCuoi = '', daNet = 0;
  for (const pid of Object.keys(nhom)) {
    const cac = nhom[pid];
    const coPhieu = pid && phieu(pid);
    if (!coPhieu && !daMoForm) { daMoForm = true; if (typeof formGiaoViec === 'function') formGiaoViec(); }
    for (const x of cac) {
      const f = new File([x.blob], x.tenFile || (x.laVid ? 'video.mp4' : 'anh.jpg'),
        { type: x.kieu || (x.laVid ? 'video/mp4' : 'image/jpeg') });
      try {
        /* gửi TỪNG file và ĐỢI kết quả — mới biết được xong mấy, hỏng vì sao */
        const u = x.laVid ? await taiVideo(f, coPhieu ? pid : 'moi', null, 2)
          : (x.daNen ? await guiAnhDaNen(f, coPhieu ? pid : 'moi', null, x.tenKho)  /* đúng tên khoá cũ */
            : await taiAnh(f, coPhieu ? pid : 'moi'));                  /* ảnh gốc còn tồn từ bản cũ */
        if (!u) throw new Error('kho không trả về địa chỉ ảnh');
        await hopXoa(x.id);
        ok++;
        /* ẢNH ĐÃ GẮN VÀO PHIẾU từ lượt trước: lượt này chỉ là đẩy bản NÉT lên
           đúng chỗ cũ. Thêm tin nữa là phiếu có hai lần cùng một ảnh.
           Cách "nhỏ trước — nét sau" đã bỏ 10/09 nên KHÔNG còn chỗ nào ghi cờ
           này nữa. Vẫn phải ĐỌC vì hộp chờ trên máy người dùng có thể còn ảnh
           tồn từ bản cũ mang cờ đó — bỏ đi là ảnh cũ bị gắn vào phiếu lần hai. */
        if (x.daGan) { daNet++; continue; }
        if (coPhieu) {
          await themDienBien(pid, 'chat', '', [u], x.nguoi || (D.nguoi || {}).ten);
          const pA = phieu(pid);
          if (pA && typeof dayAnhChat === 'function') dayAnhChat(pA, 1, x.laVid, x.nguoi || (D.nguoi || {}).ten);
          if (PH && PH.id === pid) veNgan(true);
        } else { TAM.anh.push(u); veLaiOAnh(); }
      } catch (e) {
        hong++;
        lyCuoi = (e && e.message) || 'gửi không được';
        /* ghi vào sổ lỗi để Cài đặt → Lỗi gần nhất tra được (07/09) */
        try { LOI_CUOI = { luc: Date.now(), bang: 'tải ảnh', kieu: x.laVid ? 'video' : 'ảnh', loi: lyCuoi }; } catch (x2) { }
        /* file bị LOẠI hẳn (quá trần, quá dài) thì gửi lại cũng thế — bỏ khỏi hộp */
        if (/tối đa|Quay lại đoạn/.test(lyCuoi)) await hopXoa(x.id);
      }
      HOP_TRANG.xong = ok + hong;
      HOP_TRANG.pt = Math.round((ok + hong) / ds.length * 100);
      veHopCho();
    }
  }
  clearInterval(nhich);
  HOP_DANG_GUI = false;
  /* CÓ TẤM NÀO LÊN ĐƯỢC = đường truyền đang thông → đếm lại từ 0, đừng bỏ
     cuộc sau 6 lượt (24/09). Xem ghi chú ở hopXoaLanThu trong kt-data.js. */
  if (ok && typeof hopXoaLanThu === 'function') { try { await hopXoaLanThu(); } catch (e) { } }
  if (hong) {
    HOP_TRANG = { dang: 'hong', ly: lyCuoi };
    nhacNut('⚠ ' + hong + '/' + ds.length + ' file chưa lên: ' + lyCuoi, 'do', '↻ Thử lại', () => guiBuHopCho(), 16);
  } else {
    HOP_TRANG = null;
    nhac('✓ Đã gửi xong ' + ok + ' file còn tồn' +
      (daNet ? ' — ' + daNet + ' ảnh đã nét lên bản đầy đủ' : '') +
      (daMoForm ? ' — ảnh đã đổ vào phiếu đang khai' : ''), 'la');
  }
  veHopCho();
}

/* Sau khi phiếu đã lưu, ảnh nào gửi xong muộn thì tự gắn thêm vào phiếu */
function ganAnhMuon(phieuId, cot) {
  const hua = TAM.hua.slice();
  if (!hua.length) return;
  TAM.hua = [];
  Promise.all(hua).then(async ds => {
    const moi = ds.filter(Boolean);
    if (!moi.length) return;
    const p = phieu(phieuId); if (!p) return;
    const cu = (cot === 'anh_sau' ? p.anhSau : p.anhTruoc) || [];
    const tat = cu.concat(moi.filter(u => cu.indexOf(u) < 0));
    await ghi('phieu_loi', 'update', { [cot]: tat }, phieuId);
    if (cot === 'anh_sau') p.anhSau = tat; else p.anhTruoc = tat;
    luuCache();
    if (PH && PH.id === phieuId) veNgan();
    nhac('Đã gắn thêm ' + moi.length + ' ảnh vào ' + phieuId, 'la');
  });
}
/* ============================================================
   NHÍCH % MÀ ĐỪNG DỰNG LẠI CẢ KHAY (10/09).
   Mỗi lượt gửi bắn hàng chục mốc tiến trình; gửi 12 ảnh là khay bị dựng lại
   85 lần (đo thật) — mỗi lần trình duyệt phải giải mã lại 12 ô ảnh xem trước,
   đúng lúc 4 luồng nén đang cần CPU. Giờ: số ô không đổi thì chỉ sửa đúng mấy
   chữ "%" / "đang lưu…"; dựng lại DOM chỉ khi thêm hoặc bớt ô.
   ============================================================ */
function nhichPtram() {
  const cho = TAM.dich === 'chat' ? [] : (TAM.cho || []);
  /* KHÔNG có tấm nào đang gửi thì phải dựng lại khay như thường — bỏ dòng này
     là khay không bao giờ được vẽ và ảnh trong form biến mất (bug tao tự tạo
     lúc gộp nhịp vẽ 10/09, bắt được nhờ bài kiểm nút ✎ Khoanh). */
  if (!cho.length) return false;
  let xong = false;
  ['g_anh', 'x_anh', 'd_anh'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const o = el.querySelectorAll('.anhO.dangtai');
    if (o.length !== cho.length) return;                  /* số ô đổi → phải dựng lại */
    cho.forEach((c, i) => {
      const s = o[i] && o[i].querySelector('.ptram'); if (!s) return;
      const chu = c.mat === 'luu' ? 'đang lưu…' : (c.pt || 0) + '%';
      if (s.textContent !== chu) s.textContent = chu;
    });
    xong = true;
  });
  return xong;
}
function veLaiOAnh() {
  if (nhichPtram()) { capNhatBongGui(); return; }
  ['g_anh', 'x_anh', 'd_anh'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = oAnh(TAM.anh, true); });
  /* Đường chat KHÔNG còn đi qua đây: ảnh trao đổi giờ tự gửi thẳng vào phiếu đã ghim
     trong chonFile — cách cũ (chờ guiTin của màn đang mở) làm mất ảnh khi rời phiếu.
     Nhưng BONG BÓNG ẢNH ĐANG GỬI trong khung chat thì phải nhích theo % (07/09):
     cập nhật ĐÚNG mấy cái thanh, không vẽ lại cả khung cho khỏi giật và khỏi mất
     chữ đang gõ. */
  capNhatBongGui();
}
/* nhích thanh % của bong bóng ảnh đang gửi; số tấm đổi thì mới dựng lại khung */
function capNhatBongGui() {
  const bb = document.querySelector('.dangGuiBB');
  const cho = (TAM.cho || []);
  const dungPhieu = TAM.dich === 'chat' && PH && (!TAM.phieu || TAM.phieu === PH.id);
  if (!bb) {
    /* chưa có bong bóng mà đã có ảnh đang gửi → dựng khung chat một lần */
    if (cho.length && dungPhieu && typeof veNgan === 'function') veNgan(true);
    return;
  }
  const o = bb.querySelectorAll('.dgAnh');
  if (!cho.length || o.length !== cho.length) {
    /* xong hết hoặc vừa dừng bớt tấm → dựng lại khung cho khớp */
    if (typeof veNgan === 'function') veNgan(true);
    return;
  }
  cho.forEach((c, i) => {
    const th = o[i] && o[i].querySelector('.dgThanh i');
    if (th) th.style.width = Math.max(4, Math.min(100, c.pt || 0)) + '%';
  });
}

/* ---------- xem ảnh: đã chuyển sang kt-anh.js ---------- */

/* Máy chủ từ chối lần gần nhất — để đọc được lỗi thật ngay trên điện thoại,
   không phải cắm dây vào máy tính mới xem được console. */
function dongLoiCuoi() {
  let cho = 0;
  try { cho = (JSON.parse(localStorage.getItem(KHOA_HANG) || '[]') || []).length; } catch (e) { }
  if (!LOI_CUOI && !cho) return '';
  return '<button class="mn" data-loicuoi="1"><div class="ic" style="background:#FEE2E2;color:#B91C1C"><img width="22" height="22" class="mnIc" src="ic/qua-han.webp" alt="" loading="lazy"></div>' +
    '<div><b>Lỗi gần nhất' + (cho ? ' · ' + cho + ' việc đang chờ gửi' : '') + '</b>' +
    '<div class="s">' + (LOI_CUOI ? esc(LOI_CUOI.bang + ' — ' + LOI_CUOI.loi) : 'chưa có lỗi máy chủ') + '</div></div>' +
    '<span class="mui">›</span></button>';
}
/* ============================================================
   MÀN KIỂM TRA ĐƯỜNG TRUYỀN (09/09). Ba số, một câu kết luận bằng tiếng người.
   Có nút Sao chép để gửi thẳng cho người làm web. ============================================================ */
let DANG_DO_DUONG = false;
async function manDoDuong() {
  moSheet(khungSheet('🚦 Kiểm tra đường truyền',
    'Sóng 5G đầy vạch là nói về đường TẢI VỀ. Gửi ảnh đi đường TẢI LÊN — hai đường khác nhau.',
    '<div id="ddNoi"><div class="ddCho"><span class="vong"></span>Đang đo…</div></div>', ''));
  if (DANG_DO_DUONG) return;
  DANG_DO_DUONG = true;
  const ve = h => { const o = document.getElementById('ddNoi'); if (o) o.innerHTML = h; };
  try {
    const d = await doDuong(s => ve('<div class="ddCho"><span class="vong"></span>' + esc(s) + '</div>'));
    const l = lyDuong(d);
    const o = (ten, so, dv, ghi) => '<div class="ddO"><b>' + so + (so ? ' <i>' + dv + '</i>' : '') + '</b>' +
      '<span>' + ten + '</span><em>' + ghi + '</em></div>';
    DO_CUOI = d;
    ve('<div class="ddBa">' +
      o('Máy chủ trả lời', d.ping || '—', 'ms', d.ping < 300 ? 'nhanh' : 'hơi lâu') +
      o('Đường LÊN (gửi ảnh)', d.len || '—', 'KB/s', d.len ? (d.len < 60 ? 'rất chậm' : (d.len < 200 ? 'tầm tầm' : 'tốt')) : 'không đo được') +
      o('Đường XUỐNG (xem ảnh)', d.xuong || '—', 'KB/s', d.xuong && d.xuong > 400 ? 'tốt' : 'chậm') +
      '</div>' +
      '<div class="ddKl ' + l.mau + '">' + esc(l.chu) + '</div>' +
      '<div class="hangD"><button class="btn v" data-doduong="1">↻ Đo lại</button>' +
      '<button class="btn pri" data-docopy="1">Sao chép kết quả</button></div>');
  } catch (e) { ve('<div class="ddKl do">Đo không được: ' + esc((e && e.message) || '') + '</div>'); }
  DANG_DO_DUONG = false;
}
let DO_CUOI = null;
function chepDoDuong() {
  const d = DO_CUOI || {};
  const chu = 'Đo đường truyền ' + new Date().toLocaleString('vi-VN') +
    ' · máy chủ ' + (d.ping || '?') + 'ms · lên ' + (d.len || '?') + ' KB/s · xuống ' + (d.xuong || '?') +
    ' KB/s · máy: ' + navigator.userAgent.slice(0, 90);
  try { navigator.clipboard.writeText(chu); nhac('Đã sao chép — dán vào tin nhắn gửi người làm web', 'la'); }
  catch (e) { nhac(chu, 'canh'); }
}
function xemLoiCuoi() {
  let h = [];
  try { h = JSON.parse(localStorage.getItem(KHOA_HANG) || '[]') || []; } catch (e) { }
  moSheet(khungSheet('Lỗi gần nhất', 'Chụp màn hình này gửi cho người làm web là đủ để sửa',
    (LOI_CUOI
      ? '<div class="kh"><div class="kt">MÁY CHỦ TỪ CHỐI</div><div class="kb">' +
      '<div class="d"><span>Lúc</span><b>' + ddyy(LOI_CUOI.luc) + ' ' + gio(LOI_CUOI.luc) + '</b></div>' +
      '<div class="d"><span>Bảng</span><b>' + esc(LOI_CUOI.bang) + ' · ' + esc(LOI_CUOI.kieu) + '</b></div>' +
      '<div class="d"><span>Lý do</span><b style="font-weight:400;word-break:break-word">' + esc(LOI_CUOI.loi) + '</b></div>' +
      '</div></div>'
      : '<div class="rong">Chưa có lỗi máy chủ nào trong lần dùng này.</div>') +
    '<div class="kh" style="margin-top:12px"><div class="kt">VIỆC ĐANG CHỜ GỬI (' + h.length + ')</div><div class="kb">' +
    (h.length ? h.slice(0, 10).map(v => '<div class="d"><span>' + esc(v.bang) + ' · ' + esc(v.kieu) + '</span><b>' +
      (v.lan ? 'đã thử ' + v.lan + ' lần' : 'chờ có sóng') + '</b></div>').join('')
      : '<div class="trong">Không có việc nào đang chờ — mọi thứ đã lưu xong.</div>') +
    '</div></div>',
    '<button class="btn v" data-dongsheet="1">Đóng</button>' +
    (h.length ? '<button class="btn do" data-xoahang="1">Bỏ ' + h.length + ' việc đang chờ</button>' : '')));
}

/* ---------- cài đặt ---------- */
/* ============================================================
   AI ĐÃ BẬT THÔNG BÁO — bảng theo dõi cho Admin (Trường xin 26/08)
   Nhìn phát biết ai chưa bật để gọi nhắc. Máy chủ chỉ trả về SỐ MÁY và
   lần bật gần nhất, không bao giờ trả khoá gửi thông báo ra ngoài.
   ============================================================ */
async function formAiDaBat() {
  moSheet(khungSheet('Ai đã bật thông báo', 'Đang hỏi máy chủ…',
    /* khung xám thay chữ "Đang tải…" (21/10) */
    (typeof khungXam === 'function' ? khungXam(4) : '<div class="dangTai"><span class="vong"></span> Đang tải…</div>'),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  let ds = [], maCu = null;
  try {
    ds = (await goiAPI('ai-da-bat')).ds || [];
    /* máy đăng ký dưới mã người không còn tồn tại (20/10) — hỏi luôn ở đây
       cho khỏi thêm một màn nữa */
    maCu = await fetch('/api/day-don-ma-cu').then(r => r.json()).catch(() => null);
  }
  catch (e) {
    moSheet(khungSheet('Ai đã bật thông báo', '',
      '<div class="rong"><b>Không hỏi được máy chủ</b>' + esc(e.message || '') + '</div>',
      '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
    return;
  }
  const theo = {}; ds.forEach(x => theo[x.nguoi_id] = x);
  const nguoi = (D.ai || []).slice().sort((a, b) => (a.thuTu || 99) - (b.thuTu || 99));
  const daBat = nguoi.filter(a => (theo[a.id] || {}).so_may > 0);
  const chua = nguoi.filter(a => !((theo[a.id] || {}).so_may > 0));
  const VAI = { coso: 'CHT', tho: 'Kỹ thuật', quanly: 'Admin' };

  const dong = (a, bat) => {
    const t = theo[a.id] || {};
    return '<div class="qlDong" style="border-left:4px solid ' + (bat ? '#16A34A' : '#DC2626') + '">' +
      '<b>' + esc(a.ten) + '</b>' +
      '<div class="s">' + (VAI[a.vai] || '') + (a.coSoId ? ' · ' + esc(tenCoSo(a.coSoId)) : '') +
      ' · ' + (bat ? t.so_may + ' máy đã bật' + (t.lan_cuoi ? ' · bật ' + ddyy(ms(t.lan_cuoi)) : '')
                   : '<b style="color:#DC2626">CHƯA BẬT — máy không kêu khi có việc</b>') + '</div></div>';
  };

  moSheet(khungSheet('Ai đã bật thông báo',
    daBat.length + '/' + nguoi.length + ' người đã bật' + (chua.length ? ' · còn ' + chua.length + ' người chưa' : ' · đủ cả đội'),
    (chua.length
      ? '<div class="dangLoc" style="background:#FEE2E2;border-color:#FECACA"><b style="color:#B91C1C">' +
        chua.length + ' người chưa bật</b><span>gọi nhắc họ mở web bật một lần</span></div>' +
        chua.map(a => dong(a, false)).join('')
      : '<div class="dangLoc" style="background:#DCFCE7;border-color:#BBF7D0"><b style="color:#15803D">Cả đội đã bật đủ</b><span>mọi máy đều nhận được việc mới</span></div>') +
    (daBat.length ? '<div style="font-size:11px;font-weight:800;color:#94A3B8;letter-spacing:.4px;padding:12px 2px 6px">ĐÃ BẬT</div>' +
      daBat.map(a => dong(a, true)).join('') : '') +
    /* ============================================================
       MÁY TREO DƯỚI MÃ CŨ (20/10) — tệ hơn cả chưa bật: người ta đã bấm bật
       rồi, tưởng máy sẽ kêu, mà web gửi theo mã mới nên tin không tới.
       Đo được 3 máy: tho_tuan 2 máy, cs_CS02 1 máy.
       ============================================================ */
    (maCu && maCu.moCoi && maCu.moCoi.length
      ? '<div style="font-size:11px;font-weight:800;color:#94A3B8;letter-spacing:.4px;padding:14px 2px 6px">MÁY TREO DƯỚI MÃ CŨ</div>' +
        '<div class="dangLoc" style="background:#FEF3C7;border-color:#FDE68A"><b style="color:#B45309">' +
        maCu.tongMay + ' máy đang nằm dưới mã người không còn tồn tại</b>' +
        '<span>người đó đã đổi mã — máy cũ vẫn trong sổ nhưng tin gửi theo mã mới nên không bao giờ tới</span></div>' +
        maCu.moCoi.map(x => '<div class="qlDong" style="border-left:4px solid #B45309">' +
          '<b>' + esc(x.ten || x.ma) + '</b><div class="s">mã cũ <code>' + esc(x.ma) + '</code> · ' +
          x.soMay + ' máy · không ai nhận được tin</div></div>').join('') +
        '<button class="btn v" data-donmacu="1" style="width:100%;margin-top:7px;color:#B45309;border-color:#FCD34D">' +
        '🧹 Dọn ' + maCu.tongMay + ' máy mã cũ khỏi sổ</button>'
      : '') +
    '<div style="font-size:11.5px;color:#94A3B8;line-height:1.6;padding:12px 4px 2px">' +
    'Bật theo TỪNG MÁY, không theo tài khoản: ai dùng cả điện thoại lẫn máy tính thì phải bật ở cả hai.<br>' +
    'iPhone phải thêm web vào màn hình chính rồi mở từ icon đó mới bật được.</div>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   A · LINK RIÊNG TỪNG NGƯỜI — ĐÃ BỎ (Trường chốt 10/09: "tao cần 1 link
   chung thôi, không cần mỗi người link nữa").
   Cả đội dùng MỘT link chung, vào là màn "Bạn là ai?" → bấm tên mình một lần,
   máy nhớ luôn. Máy dùng chung thì bật công tắc "Máy dùng chung" để hỏi lại.
   Web VẪN HIỂU đuôi ?ai=... (apLinkAi trong kt-chay.js) để những link đã gửi
   trước đây không gãy — chỉ bỏ màn lấy link, không bỏ đường vào.
   ============================================================ */

/* ============================================================
   THÂN CÀI ĐẶT tách riêng (10/09 — Trường: "cái gì cho lồng vào được hoặc bỏ
   bớt từ cài đặt ra thì cho"). Trang cá nhân lồng thẳng phần này vào, khỏi
   phải bấm hai lớp. Tham số khongDauNguoi = bỏ khối avatar ở đầu, vì Trang cá
   nhân đã có khối avatar to hơn ở trên rồi.
   ============================================================ */
function KHOI_NGUOI_CD() {
  const n = D.nguoi || {};
  /* khối người dùng thu nhỏ: 52→40px, padding 15→11 (Trường 29/08 xin gọn lại).
     LƯU Ý: chuỗi phải nằm NGAY SAU return trên cùng dòng — để xuống dòng là
     JavaScript tự chèn dấu chấm phẩy, hàm trả về rỗng và mất cả khối (bug tao
     tự tạo lúc tách hàm 10/09, bắt được nhờ bài test màn Cài đặt cũ). */
  return '' +
    '<div style="background:linear-gradient(150deg,#0E7490,#0B4A5C);color:#fff;border-radius:13px;padding:11px 12px;display:flex;gap:10px;align-items:center;margin-bottom:8px">' +
    '<span style="width:40px;height:40px;border-radius:99px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:16px;font-weight:800;flex:none">' + esc((n.ten || '?').slice(0, 1)) + '</span>' +
    '<div style="min-width:0"><b style="font-size:15px;display:block;line-height:1.25">' + esc(n.ten) + '</b><div style="font-size:11px;opacity:.88">' + ({ coso: 'Cơ sở', tho: 'Kỹ thuật', quanly: 'Quản lý' }[n.vai] || '') + '</div></div>' +
    '<button class="btn v" style="margin-left:auto;flex:none;padding:7px 11px;font-size:12px;background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.3);color:#fff" title="Mẹo: giữ avatar góc phải 1 giây là ra thẳng đây" data-doinguoi="1">Đổi người</button></div>';
}
function PHAN_CON_CD() {
  const n = D.nguoi || {};
  return '<div class="nhomCd">THÔNG BÁO</div>' +
    (typeof dongDay === 'function' ? dongDay() : '') +
    dongLoiCuoi() +
    /* CHẾ ĐỘ TỐI BỎ 03/10 (Trường chốt khi đổi sang nền ảnh): nền ảnh sáng mà
       khối chuyển tối thì chỏi, phải nuôi hai bộ màu cho một web ít người dùng
       ban đêm. Chỉ còn giao diện sáng. */
    '<div class="nhomCd">MÁY NÀY</div>' +
    /* "Kiểm tra đường truyền" bỏ khỏi đây 03/10 (Trường chốt) — đã chuyển sang
       cột trái, cùng chỗ với Lịch anh em kỹ thuật */
    (typeof dongCaiApp === 'function' ? dongCaiApp() : '') +
    '<button class="mn ' + (mayChung() ? 'on' : '') + '" data-maychung="1"><div class="ic" style="background:#FEF3C7;color:#B45309"><img width="22" height="22" class="mnIc" src="ic/av-nhom.webp" alt="" loading="lazy"></div>' +
    '<div><b>Máy dùng chung</b><div class="s">Mở lên là hỏi lại "Bạn là ai?"</div></div>' +
    '<span class="ctac' + (mayChung() ? ' on' : '') + '"><i></i></span>' +
    '<span class="ctacLb">' + (mayChung() ? 'Bật' : 'Tắt') + '</span></button>' +

    /* "Lịch bận của tôi" gỡ 20/10 (Trường chốt) — hai tháng không ai báo */

    (laQuanLy() ? '<div class="nhomCd">QUẢN LÝ</div>' : '') +
    /* "Lịch anh em kỹ thuật" chuyển sang cột trái 03/10 (Trường chốt) — nó là
       màn làm việc hàng ngày của admin, không phải mục cài đặt.
       Ngược lại "Xuất Excel" từ cột trái chuyển VÀO đây: xuất file là việc
       thỉnh thoảng mới làm, để ngoài cột trái chiếm chỗ của màn dùng mỗi ngày.
       Dùng lại đúng id nutExcel nên đường xử lý không phải sửa. */
    (laQuanLy() ? '<button class="mn chiPC" id="nutExcel"><div class="ic" style="background:#DCFCE7;color:#15803D"><img width="22" height="22" class="mnIc" src="ic/av-excel.webp" alt="" loading="lazy"></div>' +
      '<div><b>Xuất Excel</b><div class="s">tải danh sách việc đang xem ra file, mở bằng Excel</div></div>' +
      '<span class="mui">›</span></button>' : '') +
    (laQuanLy() ? '<button class="mn" data-aidabat="1"><div class="ic" style="background:#FEE2E2;color:#B91C1C"><img width="22" height="22" class="mnIc" src="ic/av-chuong.webp" alt="" loading="lazy"></div>' +
      '<div><b>Ai đã bật thông báo</b><div class="s" id="soChuaBat">xem ai chưa bật để gọi nhắc</div></div><span class="mui">›</span></button>' : '') +
    (laQuanLy() ? '<button class="mn" data-quanly="1"><div class="ic" style="background:#EDE9FE;color:#6D28D9"><img width="22" height="22" class="mnIc" src="ic/av-thumuc.webp" alt="" loading="lazy"></div>' +
      '<div><b>Cơ sở · gian hàng · người</b><div class="s">Thêm cơ sở, gian hàng, kỹ thuật, CHT</div></div><span class="mui">›</span></button>' : '') +
    /* ============================================================
       GỘP "Kho ảnh & video" VÀO "Dọn dữ liệu" (20/10 — Trường chốt).
       Trước là hai mục đứng cạnh nhau: một cái chỉ để XEM dung lượng, một cái
       mới xoá được. Trường nhớ nhầm, tưởng vào mục xem là chọn được ngày xoá —
       mà nhầm thế là đúng, vì tên hai mục không hề gợi ra khác nhau chỗ nào.
       Giờ một mục duy nhất: dung lượng hiện luôn ở dòng mô tả, bấm vào là vừa
       thấy còn bao nhiêu chỗ vừa chọn ngày xoá được.
       Giữ nguyên id soKho để veTop() cập nhật số như cũ, khỏi sửa chỗ khác.
       ============================================================ */
    (laQuanLy() ? '<button class="mn" data-donkho="1"><div class="ic" style="background:#FEF3C7;color:#B45309"><img width="22" height="22" class="mnIc" src="ic/av-don.webp" alt="" loading="lazy"></div>' +
      '<div><b>Kho ảnh &amp; dọn dữ liệu</b><div class="s" id="soKho">xem dung lượng · chọn khoảng ngày để xoá</div></div><span class="mui">›</span></button>' +
      '<button class="mn" data-doipin="1"><div class="ic" style="background:#FCE7F3;color:#BE185D"><img width="22" height="22" class="mnIc" src="ic/av-khoa.webp" alt="" loading="lazy"></div>' +
      '<div><b>Mã PIN quản lý</b><div class="s">đổi PIN — mỗi máy chỉ phải nhập một lần</div></div><span class="mui">›</span></button>' : '') +
    '<button class="mn" data-taillai="1"><div class="ic" style="background:#E0F2FE;color:#0369A1"><img width="22" height="22" class="mnIc" src="ic/dang-xu-ly.webp" alt="" loading="lazy"></div><div><b>Tải lại dữ liệu</b><div class="s">' + (D.phieu.length ? D.phieu.length + ' việc đang có trong máy' : 'chưa có dữ liệu') + '</div></div><span class="mui">›</span></button>' +

    '<div style="font-size:10px;color:#94A3B8;text-align:center;padding:8px 4px 0;line-height:1.5">' +
    'Phiên bản v' + (typeof BAN_HIEN !== 'undefined' ? BAN_HIEN : '?') + ' · ' +
    'mọi thao tác đều ghi tên người bấm · phiếu không bị xoá, chỉ đánh dấu huỷ</div>';
}
function thanCaiDat(khongDauNguoi) {
  const n = D.nguoi || {};
  return (khongDauNguoi ? '' : KHOI_NGUOI_CD()) + PHAN_CON_CD();
}
function formCaiDat() {
  moSheet(khungSheet('Cài đặt', '', thanCaiDat(false),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}
