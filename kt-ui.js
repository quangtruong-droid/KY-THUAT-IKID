/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Vẽ giao diện
   ============================================================ */
'use strict';

const L = {                      // trạng thái lọc
  thang: 'nay',                  // 'nay' | '2026-07' | 'het'
  the: '',                       // thẻ đang bấm
  coSo: '', mucDo: '', tho: '', tt: '', vuong: '', nhom: '',
  gian: '',                      // lọc theo MỘT gian hàng (radar 14/09)
  ma: null,                      // lọc theo đúng danh sách mã radar chỉ ra
  tim: '', chip: 'tatca',
  trang: 1, moiTrang: 40,
  /* kiểu sắp xếp — máy nhớ theo từng máy (Trường chốt 09/09: "đa dạng kiểu sắp xếp") */
  sap: (() => { try { return localStorage.getItem('kt_sap_v1') || 'gap'; } catch (e) { return 'gap'; } })()
};

/* ============================================================
   SẮP XẾP DANH SÁCH PHIẾU (Trường chốt 09/09)
   Trước đây chỉ có "mới báo trước", nên việc quá hạn 5 ngày nằm dưới việc vừa
   báo 10 phút — đúng chỗ dễ bỏ sót nhất. Giờ mặc định GẤP TRƯỚC, và đổi được
   sang 4 kiểu khác khi cần tra lại.
   ============================================================ */
/* ============================================================
   ICON THẺ KPI (09/10 — Trường gửi tài liệu "Bộ icon mẫu mới").
   Khoá trùng mã thẻ trong mảng T, giá trị là tên file trong thư mục ic/.
   Trước đây là emoji, mỗi cái một phong cách của một hãng khác nhau.
   Bộ mới cắt từ ảnh concept Trường gửi, tách nền trong suốt, mỗi icon một
   file .webp riêng — tài liệu cấm dùng nguyên ảnh concept làm icon.
   10 icon cộng lại 30,5KB. Để .png là khoảng 95KB.
   ============================================================ */
const IC_THE = {
  '': 'tong-loi', chuanhantre: 'qua-han', trehen: 'tre-hen', chuanhan: 'chua-nhan',
  daduyet: 'nghiem-thu', dangxuly: 'dang-xu-ly', sap: 'sap-han', chocht: 'cho-duyet',
  tgtb: 'tb-xu-ly', chiphi: 'chi-phi'
};
/* dựng thẻ <img> cho một icon trong thư mục ic/ */
function icAnh(ten, lop) {
  return '<img width="22" height="22" class="' + (lop || 'ctIc') + '" src="ic/' + ten + '.webp" alt="" loading="lazy">';
}

const KIEU_SAP = {
  gap:   { ten: 'Gấp trước',        phu: 'quá hạn → khẩn cấp → sắp hạn → chưa ai nhận', ic: '🔥' },
  /* THÊM 09/09 (Trường xin): xếp theo ĐỘNG TĨNH, không phải theo ngày báo.
     Hoạt động = lần cuối có người làm gì với phiếu: nhắn tin, nhận việc,
     báo xong, CHT nghiệm thu. Hai chiều dùng cho hai việc khác nhau:
       · dong = đang nóng chỗ nào, ai vừa nhắn gì → nhảy vào trả lời ngay
       · im   = phiếu bị bỏ quên, cả tuần không ai nhắc → đây là cái hay mất việc */
  vao:   { ten: 'Lần hoạt động gần nhất', phu: 'phiếu mày vừa vào xem nằm trên', ic: '👣' },
  lauvao:{ ten: 'Lâu chưa vào lại nhất',  phu: 'phiếu lâu rồi mày chưa mở lại — chiều ngược lại', ic: '🕳' },
  dong:  { ten: 'Vừa có người làm gì',    phu: 'ai vừa nhắn, vừa nhận, vừa báo xong nằm trên', ic: '💬' },
  im:    { ten: 'Bị bỏ quên lâu nhất',    phu: 'việc chưa xong mà lâu rồi không ai nhắc tới', ic: '🔇' },
  /* THÊM 24/09 (Trường xin: "phần trao đổi phải tự sắp xếp, tin nhắn mới
     trước giống messenger"). Khác 'dong' ở chỗ: 'dong' tính mọi động tĩnh
     (nhận việc, báo xong, nghiệm thu), còn cái này CHỈ tính tin nhắn — và
     đẩy phiếu CHƯA ĐỌC lên trên phiếu đã đọc, vì đọc rồi thì không còn việc
     phải làm với nó nữa. */
  tinmoi:{ ten: 'Tin nhắn mới nhất', phu: 'phiếu vừa có người nhắn nằm trên, chưa đọc lên trước', ic: '💬' },
  moi:   { ten: 'Mới báo trước',    phu: 'việc vừa báo nằm trên', ic: '🆕' },
  cu:    { ten: 'Cũ nhất trước',    phu: 'để dọn việc tồn lâu', ic: '🕰' },
  han:   { ten: 'Hạn gần nhất',     phu: 'ngày phải xong đến trước thì nằm trên', ic: '⏱' },
  tien:  { ten: 'Chi phí cao nhất', phu: 'việc tốn tiền nhất nằm trên', ic: '💰' },
  coso:  { ten: 'Theo cơ sở A→Z',   phu: 'gom từng cơ sở lại, xem cho gọn mắt', ic: '🏬' }
};
/* lần cuối phiếu có ĐỘNG TĨNH — mốc tin cuối do máy chủ đếm sẵn (D.soChat),
   cộng các mốc đời phiếu; không cần mở phiếu mới biết */
function lucHoatDong(p) {
  const t = [ms(p.ngayBao) || 0];
  const c = (D.soChat || {})[p.id];
  if (c && c.cuoi) t.push(c.cuoi);
  ['nhanLuc', 'ngayXong', 'chtLuc'].forEach(k => { const v = ms(p[k]); if (v) t.push(v); });
  return Math.max.apply(null, t);
}
/* điểm gấp: số nhỏ = phải làm trước */
function diemGap(p) {
  if (p.trangThai === 'nghiemthu') return 90;          /* xong rồi, đẩy xuống cuối */
  if (soNgayTre(p) > 0) return 0;                      /* quá hạn — gấp nhất */
  if (p.mucDo === 'khancap') return 1;
  if (sapTre(p) >= 0) return 2;                        /* hết hạn hôm nay hoặc mai */
  if (chuaAiNhan(p)) return 3;
  if (p.trangThai === 'tiepnhan') return 4;            /* đang sửa */
  if (p.trangThai === 'hoanthanh') return 5;           /* chờ CHT nghiệm thu */
  return 6;
}
function sapDs(ds) {
  const k = L.sap || 'gap';
  const ra = ds.slice();
  if (k === 'moi') ra.sort((a, b) => (b.ngayBao || 0) - (a.ngayBao || 0));
  else if (k === 'cu') ra.sort((a, b) => (a.ngayBao || 0) - (b.ngayBao || 0));
  else if (k === 'han') ra.sort((a, b) => {
    const h = p => p.duKien || p.mongMuon || 8640000000000;   /* chưa có hạn thì xuống cuối */
    return h(a) - h(b);
  });
  else if (k === 'tien') ra.sort((a, b) => (Number(b.chiPhi) || 0) - (Number(a.chiPhi) || 0));
  else if (k === 'dong') ra.sort((a, b) => lucHoatDong(b) - lucHoatDong(a));
  /* TIN NHẮN MỚI NHẤT — ba tầng: có tin chưa đọc lên trước, rồi ai nhắn sau
     cùng, rồi phiếu không có tin nào xuống cuối (mốc 0 tự đẩy xuống). */
  else if (k === 'tinmoi') {
    const luc = p => { const c = (D.soChat || {})[p.id]; return (c && c.cuoi) || 0; };
    ra.sort((a, b) =>
      ((tinChuaDoc(b.id) ? 1 : 0) - (tinChuaDoc(a.id) ? 1 : 0)) ||
      (luc(b) - luc(a)) ||
      (diemGap(a) - diemGap(b)));
  }
  /* MÌNH VỪA VÀO: mốc của chính máy này. Phiếu chưa vào bao giờ thì lùi về mốc
     hoạt động của phiếu (chia 1e6 để nó luôn xuống dưới nhóm đã từng vào,
     nhưng trong nhóm đó vẫn xếp có thứ tự chứ không đổ lộn xộn). */
  else if (k === 'vao' || k === 'lauvao') {
    const m = (typeof mocVao === 'function') ? mocVao() : {};
    const v = p => m[p.id] || 0;
    if (k === 'vao') ra.sort((a, b) => (v(b) - v(a)) || (lucHoatDong(b) - lucHoatDong(a)));
    else ra.sort((a, b) => {
      const va = v(a), vb = v(b);
      if (va && vb) return va - vb;                 /* cả hai đã vào: lâu nhất lên trước */
      if (!va && !vb) return lucHoatDong(a) - lucHoatDong(b);
      return va ? 1 : -1;                           /* CHƯA vào bao giờ = lâu nhất, lên đầu */
    });
  }
  else if (k === 'im') {
    /* việc CHƯA XONG lên trước (xong rồi thì im là chuyện đương nhiên),
       trong đó phiếu lâu nhất không ai nhắc nằm trên cùng */
    const xong = p => ['nghiemthu', 'huy'].includes(p.trangThai) ? 1 : 0;
    ra.sort((a, b) => (xong(a) - xong(b)) || (lucHoatDong(a) - lucHoatDong(b)));
  }
  else if (k === 'coso') ra.sort((a, b) =>
    String(tenCoSo(a.coSoId) || '').localeCompare(String(tenCoSo(b.coSoId) || ''), 'vi') ||
    String(tenGianHang(a.gianHangId) || '').localeCompare(String(tenGianHang(b.gianHangId) || ''), 'vi') ||
    (diemGap(a) - diemGap(b)));
  else ra.sort((a, b) => (diemGap(a) - diemGap(b)) || (soNgayTre(b) - soNgayTre(a)) ||
    ((a.duKien || a.mongMuon || 8640000000000) - (b.duKien || b.mongMuon || 8640000000000)));
  return ra;
}
function datSap(k) {
  if (!KIEU_SAP[k]) return;
  L.sap = k; L.trang = 1;
  try { localStorage.setItem('kt_sap_v1', k); } catch (e) { }
  veHet();
  nhac('Đã sắp theo: ' + KIEU_SAP[k].ten, 'la');
}
function formSapXep() {
  moSheet(khungSheet('⇅ Sắp xếp danh sách', 'Máy nhớ lựa chọn này cho lần sau',
    Object.keys(KIEU_SAP).map(k => {
      const x = KIEU_SAP[k], on = (L.sap || 'gap') === k;
      return '<button class="mn' + (on ? ' on' : '') + '" data-sap="' + k + '">' +
        '<div class="ic" style="background:' + (on ? '#CFFAFE;color:#0E7490' : '#F1F5F9;color:#64748B') + '">' + x.ic + '</div>' +
        '<div><b>' + x.ten + '</b><div class="s">' + x.phu + '</div></div>' +
        '<span class="mui">' + (on ? '✓' : '›') + '</span></button>';
    }).join(''),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ---------- lọc ---------- */
/* ============================================================
   VIỆC ĐANG MỞ KHÔNG THUỘC THÁNG NÀO CẢ (01/10 — Trường bắt được).
   Bộ lọc tháng lọc theo NGÀY BÁO. Nên sáng mùng 1, mọi phiếu báo từ tháng
   trước mà còn đang sửa dở đều biến mất khỏi màn hình: đo lúc 01/10/2026 có
   16 việc đang chạy thì 15 việc rơi mất, cả đội mở app ra thấy đúng 1 dòng.
   Dữ liệu không mất, nhưng không ai nhìn thấy để làm — mà việc chưa xong thì
   đâu có vì sang tháng mà hết phải sửa.
   Giờ: màn "tháng này" = việc báo trong tháng + MỌI VIỆC CÒN ĐANG CHẠY, dù
   báo từ tháng nào. Chọn đích danh một tháng cũ thì vẫn lọc đúng tháng đó —
   lúc ấy người dùng đang tra cứu quá khứ, không phải đang làm việc.
   Thống kê và báo cáo tháng KHÔNG đụng tới (Trường chốt): "tháng 9 báo bao
   nhiêu lỗi" vẫn phải đếm theo ngày báo, nếu không thì mọi con số đã chốt
   trong các cuộc họp cũ đều lệch đi.
   ============================================================ */
function dangChay(p) {
  const t = (p || {}).trangThai;
  return t !== 'nghiemthu' && t !== 'huy';
}
/* LỌC THUẦN THEO NGÀY BÁO — dành riêng cho thống kê và báo cáo tháng.
   "Tháng 9 báo bao nhiêu lỗi" phải ra đúng con số đã chốt trong họp, không
   được vì việc tồn mà đội thêm vào (Trường chốt 01/10). */
function trongThangBao(p) {
  if (L.thang === 'het') return true;
  const d = new Date(p.ngayBao || Date.now());
  if (L.thang === 'nay') { const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }
  const [y, m] = L.thang.split('-').map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}
function trongThang(p) {
  if (L.thang === 'het') return true;
  const d = new Date(p.ngayBao || Date.now());
  if (L.thang === 'nay') {
    const n = new Date();
    if (d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()) return true;
    return dangChay(p);              /* việc cũ còn dở — vẫn là việc của hôm nay */
  }
  const [y, m] = L.thang.split('-').map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}
/* đang có bộ lọc nào bật không — dùng cho nút Back và dải "Đang lọc" (21/09) */
function dangLocGi() {
  return !!(L.the || L.coSo || L.gian || L.nhom || L.mucDo || L.tho || L.tt || L.vuong ||
    L.tim || (L.ma && L.ma.length) || (L.chip && L.chip !== 'tatca'));
}

function loc() {
  /* ============================================================
     LỌC THEO ĐÚNG MẤY PHIẾU RADAR CHỈ RA (14/09).
     Radar soi 60–90 ngày nên phiếu nó nhắc tới thường NẰM NGOÀI tháng đang xem —
     vì vậy đường này bỏ qua cả bộ lọc tháng lẫn mọi lọc khác, trả đúng danh
     sách mã đó và thôi. Bấm ✕ Bỏ lọc là về bình thường.
     ============================================================ */
  if (L.ma && L.ma.length) {
    const m = L.ma;
    let r = D.phieu.filter(p => m.indexOf(p.id) >= 0);
    if (laCoSo()) r = r.filter(p => p.coSoId === D.nguoi.coSoId);
    return r.sort((a, b) => b.ngayBao - a.ngayBao);
  }
  let ds = D.phieu.filter(trongThang);
  if (L.gian) ds = ds.filter(p => p.gianHangId === L.gian);
  /* PHIẾU ĐÃ HUỶ ra khỏi danh sách việc (Trường chốt 22/08): huỷ là "báo nhầm, bỏ đi"
     nên để lẫn trong danh sách và cộng vào tổng là số nói dối. Dữ liệu vẫn còn nguyên —
     muốn xem lại thì bấm ô "Đã huỷ" hoặc lọc Trạng thái = Đã huỷ. */
  if (L.the !== 'dahuy' && L.tt !== 'huy') ds = ds.filter(p => p.trangThai !== 'huy');
  if (laCoSo()) ds = ds.filter(p => p.coSoId === D.nguoi.coSoId);
  if (L.coSo) ds = ds.filter(p => p.coSoId === L.coSo);
  if (L.mucDo) ds = ds.filter(p => p.mucDo === L.mucDo);
  if (L.tho) ds = ds.filter(p => p.nguoiNhanKt === L.tho || (p.nguoiSua || []).includes(L.tho));
  if (L.tt) ds = ds.filter(p => p.trangThai === L.tt);
  if (L.vuong) ds = ds.filter(p => p.dangVuong === L.vuong);
  if (L.nhom) ds = ds.filter(p => p.nhomLoi === L.nhom);
  if (L.chip === 'toi' && laTho()) ds = ds.filter(p => p.nguoiNhanKt === D.nguoi.ten || (p.nguoiSua || []).includes(D.nguoi.ten));
  if (L.tim) {
    /* TÌM KHÔNG DẤU (22/08): gõ "hue" phải ra "Huế", "may gap" ra "Máy gắp".
       Trên điện thoại hầu như không ai gõ đủ dấu — trước đây bỏ dấu là không ra gì. */
    const k = boDau(L.tim);
    ds = ds.filter(p => boDau(p.noiDung + ' ' + p.moTa + ' ' + tenCoSo(p.coSoId) + ' ' +
      tenGianHang(p.gianHangId) + ' ' + p.nguoiNhanKt + ' ' + (p.nguoiSua || []).join(' ') + ' ' + p.id).includes(k));
  }
  switch (L.the) {
    case 'xong': ds = ds.filter(p => p.trangThai === 'hoanthanh' || p.trangThai === 'nghiemthu'); break;
    case 'dangxuly': ds = ds.filter(p => p.trangThai === 'tiepnhan'); break;
    /* phiếu đang có trao đổi — tin chưa đọc dồn lên trước (Trường xin 30/08) */
    case 'traodoi': ds = ds.filter(p => soTinChat(p.id) > 0)
      .sort((a, b) => tinChuaDoc(b.id) - tinChuaDoc(a.id)); break;
    case 'sap': ds = ds.filter(p => sapTre(p) >= 0); break;
    case 'quahan': ds = ds.filter(p => soNgayTre(p) > 0).sort((a, b) => soNgayTre(b) - soNgayTre(a)); break;
    /* TÁCH 2 LOẠI QUÁ HẠN (Trường chốt 21/08): trễ LỜI HẸN kỹ thuật ≠ chưa-ai-nhận quá mong muốn */
    case 'trehen': ds = ds.filter(p => !chuaAiNhan(p) && soNgayTre(p) > 0).sort((a, b) => soNgayTre(b) - soNgayTre(a)); break;
    case 'toitre': ds = ds.filter(p => soNgayTre(p) > 0 && (p.nguoiNhanKt === D.nguoi.ten || (p.nguoiSua || []).includes(D.nguoi.ten))).sort((a, b) => soNgayTre(b) - soNgayTre(a)); break;
    /* "Của tôi đang làm" = việc TÔI nhận VÀ chưa báo xong. Trước dùng chung chip 'toi'
       (mọi việc của tôi, kể cả đã xong) nên thẻ ghi 6 mà bấm vào ra 11 — số nói dối. */
    case 'toidanglam': ds = ds.filter(p => p.trangThai === 'tiepnhan' &&
      (p.nguoiNhanKt === D.nguoi.ten || (p.nguoiSua || []).includes(D.nguoi.ten))); break;
    /* "đang mở" = chưa nghiệm thu xong. Thẻ kỹ thuật ghi "Tổng lỗi đang mở" mà lại
       đếm cả việc đã xong thì tên nói dối — thêm khoá lọc đúng nghĩa (27/08). */
    case 'dangmo': ds = ds.filter(p => p.trangThai !== 'nghiemthu'); break;
    /* thẻ "Tổng lỗi các cơ sở đã báo" (02/09): mọi phiếu trong tháng, trừ huỷ */
    case 'tongbao': ds = ds.filter(p => p.trangThai !== 'huy'); break;
    case 'chuanhan': ds = ds.filter(chuaAiNhan); break;
    /* ============================================================
       QUÁ HẠN MÀ CHƯA AI NHẬN (19/09 — Trường chốt sau khi soát web thấy 8
       việc khẩn của MM Đà Nẵng treo 6 ngày trong khi thẻ "Kỹ thuật trễ hẹn"
       vẫn hiện 0 kèm chữ "không có gì cháy 👌").
       Hai loại quá hạn khác hẳn nhau và trước đây chỉ loại thứ hai có thẻ:
        · chưa ai nhận, quá ngày CƠ SỞ MONG  → nhóm này, nguy hiểm nhất
        · đã nhận, quá ngày THỢ TỰ HẸN       → thẻ "Kỹ thuật trễ hẹn"
       Xếp việc chờ lâu nhất lên đầu.
       ============================================================ */
    case 'chuanhantre': ds = ds.filter(p => chuaAiNhan(p) && soNgayTre(p) > 0)
      .sort((a, b) => soNgayTre(b) - soNgayTre(a)); break;
    case 'chocht': ds = ds.filter(choCHT); break;
    /* CHT: "Đã nghiệm thu xong" chỉ tính việc CHÍNH MÌNH đã bấm Đạt — phải có khoá
       lọc riêng, không dùng chung 'xong' (gồm cả việc kỹ thuật vừa báo chưa ai duyệt),
       nếu không thẻ ghi một đằng bấm vào ra một nẻo. */
    case 'daduyet': ds = ds.filter(p => p.trangThai === 'nghiemthu'); break;
    case 'dahuy': ds = ds.filter(p => p.trangThai === 'huy'); break;
    case 'chiphi': ds = ds.filter(p => p.chiPhi > 0).sort((a, b) => b.chiPhi - a.chiPhi); break;
    case 'tgtb': ds = ds.filter(p => p.ngayXong && p.nhanLuc); break;
  }
  return ds;
}
/* MỘT CỬA cho mọi phép đếm: phiếu đã huỷ KHÔNG bao giờ được tính (Trường chốt 22/08).
   Dùng hàm này ở mọi chỗ đếm, đừng gọi D.phieu trực tiếp — bài nghiệm thu bắt được
   "Tất cả 4" mà danh sách chỉ 3 dòng đúng vì có chỗ đếm riêng bỏ sót. */
/* __anTam: phiếu vừa bấm huỷ, đang trong 5 giây chờ hoàn tác (21/10).
   Giấu bằng cờ tạm chứ KHÔNG đổi trangThai — đổi rồi lùi lại là trong 5 giây
   đó mọi màn khác đọc ra trạng thái sai, mà người khác mở web cùng lúc còn
   thấy phiếu huỷ rồi tự sống lại. */
const phieuThat = () => D.phieu.filter(p => p.trangThai !== 'huy' && !p.__anTam);

/* đếm phiếu đã huỷ trong tháng đang xem, theo đúng quyền của người đang đăng nhập */
const soDaHuy = () => D.phieu.filter(trongThang)
  .filter(p => p.trangThai === 'huy')
  .filter(p => !laCoSo() || p.coSoId === D.nguoi.coSoId)
  .filter(p => !L.coSo || p.coSoId === L.coSo).length;

const soLieu = () => {
  /* mọi con số trên thẻ đều KHÔNG tính phiếu đã huỷ — xem ghi chú trong loc() */
  let ds = phieuThat().filter(trongThang);
  if (laCoSo()) ds = ds.filter(p => p.coSoId === D.nguoi.coSoId);
  /* Đang lọc 1 cơ sở thì MỌI con số trên màn phải nói về cơ sở đó —
     bấm Long Biên mà thẻ vẫn đếm cả 12 cơ sở là số nói dối (Trường bắt 21/08) */
  if (L.coSo) ds = ds.filter(p => p.coSoId === L.coSo);
  const xongDs = ds.filter(p => p.trangThai === 'hoanthanh' || p.trangThai === 'nghiemthu');
  const tre = ds.filter(p => soNgayTre(p) > 0);
  const tgs = ds.filter(p => p.ngayXong && p.nhanLuc).map(p => (p.ngayXong - p.nhanLuc) / NGAY);
  return {
    tong: ds.length,
    xong: xongDs.length,
    tyLe: ds.length ? Math.round(xongDs.length / ds.length * 100) : 0,
    dangXuLy: ds.filter(p => p.trangThai === 'tiepnhan').length,
    sap: ds.filter(p => sapTre(p) >= 0).length,
    tre: tre.length,
    treNhat: tre.length ? Math.max.apply(null, tre.map(soNgayTre)) : 0,
    chuaNhan: ds.filter(chuaAiNhan).length,
    chuaNhanTre: ds.filter(p => chuaAiNhan(p) && soNgayTre(p) > 0).length,
    chuaNhanTreNhat: (function () { const t = ds.filter(p => chuaAiNhan(p) && soNgayTre(p) > 0);
      return t.length ? Math.max.apply(null, t.map(soNgayTre)) : 0; })(),
    /* trễ LỜI HẸN: việc ĐÃ có kỹ thuật nhận mà quá ngày dự kiến */
    treHen: ds.filter(p => !chuaAiNhan(p) && soNgayTre(p) > 0).length,
    treHenNhat: (function () { const t = ds.filter(p => !chuaAiNhan(p) && soNgayTre(p) > 0); return t.length ? Math.max.apply(null, t.map(soNgayTre)) : 0; })(),
    choCht: ds.filter(choCHT).length,
    /* xong THẬT = CHT đã bấm Đạt. Khác 'xong' ở trên (gồm cả việc kỹ thuật vừa báo
       xong mà chưa ai duyệt) — với CHT thì việc chỉ trọn khi chính mình xác nhận. */
    nghiemThu: ds.filter(p => p.trangThai === 'nghiemthu').length,
    tyLeNghiemThu: ds.length ? Math.round(ds.filter(p => p.trangThai === 'nghiemthu').length / ds.length * 100) : 0,
    tgtb: tgs.length ? (tgs.reduce((a, b) => a + b, 0) / tgs.length) : 0,
    chiPhi: ds.reduce((s, p) => s + (p.chiPhi || 0), 0)
  };
};

/* ---------- vẽ tất cả ---------- */
function veHet() {
  veTop(); veThe(); veCoSo(); veBieuDo(); veCanhBao(); veLoc(); veDanhSach(); veChuong();
  apTabChinh();
}

/* ============================================================
   TAB 📊 THỐNG KÊ RIÊNG cho quản lý (Trường chốt 04/09):
   bấm Thống kê → màn CHỈ còn 3 biểu đồ + hiệu suất KT + chia việc;
   bấm Danh sách → chỉ danh sách. Hai màn không chen nhau nữa.
   ============================================================ */
let TAB_CHINH = 'ds';
/* ============================================================
   KHỐI HIỆN DẦN KHI ĐỔI MÀN (12/10 — gói hiệu ứng Trường gửi).
   Gọi ở doiTabChinh() chứ KHÔNG gọi trong veHet(): veHet chạy lại sau mỗi
   lần lưu, nhận việc, có tin mới — chạy hiệu ứng ở đó thì màn hình nhấp nháy
   cả ngày. Chỉ khi người ta thật sự đổi màn mới cho khối trượt lên.
   ============================================================ */
function hieuUngVaoMan() {
  if (typeof HieuUng === 'undefined' || !HieuUng.vaoMan) return;
  const than = document.getElementById('than');
  if (than) HieuUng.vaoMan(than);
}
function doiTabChinh(tab) {
  TAB_CHINH = tab;
  apTabChinh();
  hieuUngVaoMan();
}
function apTabChinh() {
  if (!laQuanLy()) return;                 /* CHT & kỹ thuật giữ màn cũ y nguyên */
  /* Máy tính: biểu đồ phơi luôn trong tab Danh sách (như mấy bản đầu) nên KHÔNG
     có màn Thống kê riêng nữa. Điện thoại giữ nguyên tab 📊 như đội đang dùng. */
  const pcRong = matchMedia('(min-width:901px)').matches;
  const tk = TAB_CHINH === 'tk' && !pcRong;
  ['theHang', 'hangNut', 'csHang', 'cbHang', 'locHang', 'dsHang'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.toggle('an', tk);
  });
  const bd = document.getElementById('bdHang');
  if (bd) bd.classList.toggle('an', !(tk || pcRong));
}

/* ============================================================
   THANH CƠ SỞ ĐANG CÓ LỖI
   Vừa là nút lọc vừa là báo cáo: nhìn 1 giây biết cơ sở nào đang cháy.
   Một hàng cuộn ngang, cơ sở nặng nhất nằm trước, cơ sở sạch dồn xuống cuối.
   Cơ sở chỉ thấy lỗi của mình nên không cần thanh này.
   ============================================================ */
/* tên ngắn cho chip — 6/12 cơ sở đều bắt đầu bằng "Aeon Mall", bỏ đi cho chip khỏi dài */
function tenNgan(t) { return String(t || '').replace(/^Aeon\s*Mall\s+/i, '').trim() || '—'; }

function demTheoCoSo() {
  const m = {};
  D.cosos.forEach(c => { m[c.id] = { id: c.id, ten: c.ten, dem: 0, tre: 0, cam: 0 }; });
  phieuThat().filter(trongThang).forEach(p => {
    const k = m[p.coSoId] || (m[p.coSoId] = { id: p.coSoId, ten: tenCoSo(p.coSoId), dem: 0, tre: 0, cam: 0 });
    k.dem++;
    if (soNgayTre(p) > 0) k.tre++;
    else if (sapTre(p) >= 0 || chuaAiNhan(p)) k.cam++;
  });
  /* nặng nhất lên trước: quá hạn → sắp hạn/chưa nhận → tổng lỗi → hết lỗi xuống cuối */
  return Object.keys(m).map(k => m[k]).sort((a, b) =>
    (b.tre - a.tre) || (b.cam - a.cam) || (b.dem - a.dem) || String(a.ten).localeCompare(String(b.ten), 'vi'));
}

function veCoSo() {
  const el = document.getElementById('csHang');
  if (!el) return;
  /* ============================================================
     BỎ THANH CHIP CƠ SỞ (03/10 — Trường chốt).
     Nó tràn ngang hết màn hình mà việc nó làm — lọc theo cơ sở — giờ đã có
     phễu lọc ngay trên cột "Gian hàng" trong bảng. Hai chỗ cùng một việc thì
     bỏ chỗ chiếm nhiều diện tích hơn.
     Giữ lại hàm và ô chứa: nhiều chỗ khác còn gọi tới, mà bảng lọc theo L.coSo
     vẫn chạy y nguyên — chỉ thôi không VẼ nữa.
     ============================================================ */
  el.innerHTML = ''; el.classList.add('an');
  return;
  /* eslint-disable no-unreachable */
  if (laCoSo()) { el.innerHTML = ''; el.classList.add('an'); return; }   // luật: cơ sở chỉ thấy cơ sở mình
  el.classList.remove('an');

  const hang = demTheoCoSo();
  const coLoi = hang.filter(x => x.dem).length;
  const chon = L.coSo ? hang.find(x => x.id === L.coSo) : null;

  el.innerHTML =
    '<div class="csTieu"><b>CƠ SỞ ĐANG CÓ LỖI</b><span>' +
    (chon ? 'đang xem 1 cơ sở' : coLoi + '/' + hang.length + ' cơ sở · bấm để lọc') + '</span></div>' +
    '<div class="csKeo">' + hang.map(x => {
      const mau = !x.dem ? ' tot' : (x.tre ? ' do' : (x.cam ? ' cam' : ''));
      return '<button class="csO' + (L.coSo === x.id ? ' on' : mau) + '" data-coso="' + esc(x.id) + '"' +
        ' title="' + esc(x.ten) + '">' + esc(tenNgan(x.ten)) + ' <em>' + x.dem + '</em></button>';
    }).join('') + '</div>' +
    /* tên ngắn + không viết hoa hết: "AEON MALL LONG BIÊN" làm dải này tràn 2 dòng trên 390px */
    (chon ? '<div class="dangCs"><b>' + esc(tenNgan(chon.ten)) + '</b><span>' + chon.dem + ' việc</span>' +
      '<button class="x" data-bocs="1">✕ Bỏ lọc</button></div>' : '');
}

/* NHẬN DIỆN VAI (Trường chốt 21/08): 3 vai màn la lá nhau, phải nhìn phát biết đang là ai.
   Tên + vai đứng ĐẦU dòng phụ, tô màu vai; header gạch viền dưới cùng màu. */
const VAI_TEN = { coso: 'CHT', tho: 'Kỹ thuật', quanly: 'Admin' };
const VAI_MAU = { coso: '#BE185D', tho: '#2563EB', quanly: '#0E7490' };
function veTop() {
  const n = D.nguoi || {};
  const now = new Date();
  const soViec = phieuThat().filter(trongThang).filter(p => !laCoSo() || p.coSoId === D.nguoi.coSoId).filter(p => !L.coSo || p.coSoId === L.coSo).length;
  const tenThang = L.thang === 'het' ? 'Tất cả 6 tháng' : (L.thang === 'nay'
    ? 'Tháng ' + (now.getMonth() + 1) + '/' + now.getFullYear()
    : 'Tháng ' + Number(L.thang.split('-')[1]) + '/' + L.thang.split('-')[0]);
  const mauVai = VAI_MAU[n.vai] || '#0E7490';
  /* dòng "Tất cả 6 tháng · 71 việc" bỏ 03/10 (Trường chốt) — ô chọn tháng ngay
     bên cạnh đã nói rõ đang xem kỳ nào, mà số việc thì hàng thẻ KPI có sẵn */
  void tenThang; void soViec;
  document.getElementById('topPhu').innerHTML =
    /* 20/10 — Trường chốt ảnh b: trên điện thoại chỉ hiện TÊN, bỏ phần vai.
       Vai bọc riêng trong .vaiPhu để CSS ẩn được mà không phải dựng lại chuỗi.
       Lý do bỏ: ô tên bên trái rộng 116px, mà "Nguyễn Anh Tú · Cơ sở" cần
       146px nên luôn bị cắt thành "Nguyễn Anh Tú …" — mất đúng cái phần định
       khoe. Vai vốn đã được báo bằng dải màu dưới chân thanh trên, và một
       người chỉ mang một vai suốt thời gian dùng web nên không cần nhắc.
       Máy tính vẫn hiện đủ "Tên · Vai" như cũ. */
    '<b class="vaiNhan" style="color:' + mauVai + '">' + esc((n.ten || '').split('(')[0].trim()) +
    '<i class="vaiPhu"> · ' + (VAI_TEN[n.vai] || '') + '</i></b>';
  const dau = document.querySelector('header') || document.getElementById('topPhu').closest('.top');
  if (dau) dau.style.boxShadow = 'inset 0 -3px 0 ' + mauVai;
  const av = document.getElementById('avTop');
  /* có ảnh đại diện thì đeo mặt thật (04/09), không thì chữ cái + màu như cũ */
  if (n.anh) {
    av.textContent = '';
    av.style.background = 'url(' + n.anh + ') center/cover';
  } else {
    av.textContent = (n.ten || '?').trim().slice(0, 1).toUpperCase();
    av.style.background = n.mau || '#0E7490';
  }
  av.style.boxShadow = '0 0 0 2px #fff, 0 0 0 4px ' + mauVai;
  av.title = 'Trang cá nhân · giữ 1 giây để đổi người';
  /* tên + vai cạnh avatar (16/10 — Trường: "làm khối nền chữ bên dưới cho
     phần này"). Tên cắt phần trong ngoặc: "Nguyễn Anh Tú ( Aeon Mall Hải
     Dương )" dài gấp đôi chỗ có, mà cơ sở đã ghi ở dòng dưới logo rồi. */
  const ai = document.getElementById('topAi');
  if (ai) {
    ai.querySelector('b').textContent = (n.ten || '').split('(')[0].trim();
    ai.querySelector('i').textContent = VAI_TEN[n.vai] || '';
    ai.querySelector('i').style.color = mauVai;
  }
  /* ============================================================
     DÃY THÁNG GỌN LẠI (03/10 — Trường chốt).
     Trước: 7 nút T10 T9 T8 T7 T6 T5 "Tất cả" nằm ngang, ăn gần nửa thanh trên.
     Giờ: ‹ T10/2026 › — hai mũi tên lùi/tiến, kèm một nút "Tất cả" riêng.
     Mũi tên › tắt khi đang ở tháng này (không có tương lai để xem), ‹ tắt khi
     tới mốc 6 tháng — web chỉ giữ 180 ngày, lùi xa hơn là rỗng.
     Đường lọc giữ nguyên data-thang nên bộ bắt sự kiện không phải sửa.
     ============================================================ */
  const dsT = dsThang().filter(x => x[0] !== 'het');     /* 6 mốc tháng, bỏ "Tất cả" ra riêng */
  const viTri = L.thang === 'het' ? -1 : Math.max(0, dsT.findIndex(x => x[0] === L.thang));
  const nhanT = L.thang === 'het' ? 'Tất cả 6 tháng'
    : (L.thang === 'nay' ? 'T' + (now.getMonth() + 1) + '/' + now.getFullYear()
      : 'T' + Number(L.thang.split('-')[1]) + '/' + L.thang.split('-')[0]);
  /* mảng xếp từ mới → cũ, nên "lùi" là tiến chỉ số, "tiến" là giảm chỉ số */
  const cu = viTri >= 0 && viTri < dsT.length - 1 ? dsT[viTri + 1][0] : '';
  const moi = viTri > 0 ? dsT[viTri - 1][0] : '';
  document.getElementById('thangChon').innerHTML =
    '<div class="thangNav">' +
    '<button class="tNut" data-thang="' + esc(cu) + '"' + (cu ? '' : ' disabled') + ' title="Tháng trước">‹</button>' +
    '<b class="tNhan">' + esc(nhanT) + '</b>' +
    '<button class="tNut" data-thang="' + esc(moi) + '"' + (moi ? '' : ' disabled') + ' title="Tháng sau">›</button>' +
    '</div>' +
    /* bấm lần nữa vào "Tất cả" thì bỏ chọn, về tháng này (03/10 — Trường chốt).
       Đang bật mà bấm lại thì data-thang trỏ về 'nay' chứ không phải 'het'. */
    '<button class="tHet' + (L.thang === 'het' ? ' on' : '') + '" data-thang="' +
    (L.thang === 'het' ? 'nay' : 'het') + '"' +
    (L.thang === 'het' ? ' title="Bấm lần nữa để về tháng này"' : '') + '>Tất cả</button>';
  veTabDay();
  capNhatBadgeApp();
}

/* 6 mốc thời gian để đối chiếu lại — web chỉ giữ 180 ngày nên "Tất cả" là 6 tháng */
function dsThang() {
  const now = new Date();
  const ds = [['nay', 'T' + (now.getMonth() + 1)]];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ds.push([d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), 'T' + (d.getMonth() + 1)]);
  }
  ds.push(['het', 'Tất cả']);
  return ds;
}
function tenThangDai(k) {
  if (k === 'het') return 'Tất cả 6 tháng gần đây';
  const now = new Date();
  if (k === 'nay') return 'Tháng ' + (now.getMonth() + 1) + '/' + now.getFullYear() + ' — tháng này';
  const [y, m] = k.split('-');
  return 'Tháng ' + Number(m) + '/' + y;
}

/* ============================================================
   THANH DƯỚI THEO VAI (Trường chốt 30/08) — mỗi vai một bộ tab:
   CHT:      Danh sách · ✅ Nghiệm thu(chấm đỏ) · ＋BÁO LỖI · 💬 Trao đổi · Cài đặt
   Kỹ thuật: Danh sách · 🔧 Của tôi(chấm đỏ)   · ＋GHI VIỆC · 💬 Trao đổi · Cài đặt
   Admin:    Danh sách · 📊 Thống kê           · ＋GIAO VIỆC · 💬 Trao đổi · Cài đặt
   Ô 📅 chọn tháng cũ dời lên header: bấm dòng "Tháng 8 · 15 việc" là ra.
   ============================================================ */
function veTabDay() {
  const el = document.getElementById('tabDay'); if (!el) return;
  const dangOn = ((el.querySelector('.tabI.on') || {}).dataset || {}).tab || 'ds';
  const ds = phieuThat().filter(trongThang).filter(p => !laCoSo() || p.coSoId === (D.nguoi || {}).coSoId);
  const cham = n => n ? '<b class="chamTab">' + (n > 9 ? '9+' : n) + '</b>' : '';
  const soTraoDoi = ds.reduce((s, p) => s + (tinChuaDoc(p.id) ? 1 : 0), 0);
  let giua, nhanFab;
  if (laCoSo()) {
    /* 14/10: thanh tab dưới đổi sang bộ icon 3D. Cơ sở không có icon "nghiệm
       thu" riêng trong bộ nên mượn tab-danhsach — vẫn là bảng kẹp hồ sơ, hợp
       nghĩa "danh sách việc chờ mình gật". */
    giua = '<button class="tabI" data-tab="nghiemthu"><em>' + icAnh('tab-danhsach', 'tabIc') + '</em>Nghiệm thu' + cham(ds.filter(choCHT).length) + '</button>';
    nhanFab = 'BÁO LỖI';
  } else if (laTho()) {
    const toi = ds.filter(p => (p.trangThai === 'tiepnhan' &&
      (p.nguoiNhanKt === D.nguoi.ten || (p.nguoiSua || []).includes(D.nguoi.ten))) ||
      (duocGiao(p) && giaoChoToi(p))).length;
    giua = '<button class="tabI" data-tab="toi"><em>' + icAnh('dang-xu-ly', 'tabIc') + '</em>Của tôi' + cham(toi) + '</button>';
    /* 08/09: bỏ luôn nút nổi ⚡ — nó chỉ cuộn tới dải đầu danh sách, trùng cả
       Danh sách lẫn 🔔 Cần chú ý. Dải ⚡ CẦN LÀM NGAY trong danh sách vẫn giữ. */
    nhanFab = '';
  } else {
    giua = '<button class="tabI" data-tab="tk"><em>' + icAnh('tab-thongke', 'tabIc') + '</em>Thống kê</button>';
    /* nút ＋ báo lỗi cho kỹ thuật quay lại thanh dưới (Trường chốt 04/09 lần 2)
       nhưng cỡ NHỎ như nút ⚡ của thợ — không to đùng nữa */
    nhanFab = 'GIAO VIỆC';
  }
  /* ============================================================
     Trường chốt 08/09: bỏ tab 💬 Trao đổi (chỉ là bộ lọc, trùng Danh sách) và
     bỏ nút nổi ⚡ của kỹ thuật (cũng chỉ cuộn tới dải đầu danh sách). Thay bằng
     🔔 Cần chú ý — chỗ DUY NHẤT gom tin mới + việc quá hạn + việc chờ mình.
     ============================================================ */
  /* ============================================================
     SỐ TRÊN CHUÔNG PHẢI KHỚP VỚI THỨ MỞ RA (14/09).
     Vai quản lý giờ bấm vào là ra màn 🔎 Radar, nên số phải đếm ĐÚNG cái Radar
     hiện. Đếm kiểu cũ (gồm cả 9 việc chưa ai nhận) thì chuông báo 14 mà mở ra
     chỉ thấy 5 thẻ — số nói dối.

     BỎ CỘNG TIN CHƯA ĐỌC (24/09 — Trường: "số cứ tụt, lúc 31 lúc 29 lúc 26").
     Số cũ gộp hai thứ khác hẳn nhau: điều MÁY SOI RA (ổn định, đổi theo ngày)
     và số phiếu CÓ TIN CHƯA ĐỌC (tụt mỗi lần mở một phiếu). Cộng vào nhau thì
     nhìn như số chạy loạn, mà thực ra chẳng nói lên điều gì.
     Tin chưa đọc đã có chỗ đếm riêng rồi: tab 💬 Trao đổi mang số của nó, và
     mỗi phiếu có chấm đỏ trên thẻ. Không cần đếm lần hai ở đây.
     ============================================================ */
  const soChuY = laQuanLy() && typeof radarSoi === 'function'
    ? radarSoi().length
    : (typeof dsThongBao === 'function' ? dsThongBao().length : 0);
  /* ============================================================
     THANH DƯỚI 5 Ô ĐỀU (Trường chốt 08/09): bỏ tab ⚙ Cài đặt vì trùng đường
     avatar → Trang cá nhân → Cài đặt. Ô cuối là mục riêng của từng vai. Nút ＋
     báo lỗi thành bong bóng NHỎ nổi ở góc, không chiếm ô nào nữa.
     ============================================================ */
  const rieng = laCoSo() ? '<button class="tabI" data-tab="csToi"><em>' + icAnh('tab-thongke', 'tabIc') + '</em>Cơ sở tôi</button>'
    : (laTho() ? '<button class="tabI" data-tab="thangToi"><em>' + icAnh('hieu-suat', 'tabIc') + '</em>Tháng này</button>'
      : '<button class="tabI" data-tab="chiaviec"><em>' + icAnh('tab-chiaviec', 'tabIc') + '</em>Chia việc</button>');
  el.innerHTML =
    '<button class="tabI" data-tab="ds"><em>' + icAnh('tab-danhsach', 'tabIc') + '</em>Danh sách</button>' + giua +
    '<button class="tabI" data-tab="traodoi"><em>' + icAnh('tab-traodoi', 'tabIc') + '</em>Trao đổi' + cham(soTraoDoi) + '</button>' +
    /* vai quản lý: ô này mở màn 🔎 Radar (14/09) nên đổi luôn tên và biểu tượng,
       chứ gọi "Chú ý" mà ra màn khác thì lừa mắt.
       Kỹ thuật và cơ sở ra màn "Chú ý" — bộ icon có đúng cái chuông nên dùng
       av-chuong, hết cảnh 🔔 emoji đứng lạc giữa hàng icon 3D (14/10). */
    (laQuanLy()
      ? '<button class="tabI" data-tab="chuy"><em>' + icAnh('tab-radar', 'tabIc') + '</em>Radar' + cham(soChuY) + '</button>'
      : '<button class="tabI" data-tab="chuy"><em>' + icAnh('av-chuong', 'tabIc') + '</em>Chú ý' + cham(soChuY) + '</button>') +
    rieng;
  const on = el.querySelector('.tabI[data-tab="' + dangOn + '"]') || el.querySelector('.tabI[data-tab="ds"]');
  on.classList.add('on');
  el.classList.add('bon');                   /* 5 ô lúc nào cũng chia đều */
  const f = document.getElementById('fab');
  if (f) {
    f.title = { 'BÁO LỖI': 'Báo lỗi cho kỹ thuật', 'GIAO VIỆC': 'Giao việc cho kỹ thuật' }[nhanFab] || '';
    f.textContent = '＋';
    /* chữ đi kèm nằm ở data-chu, CSS vẽ ra — bong bóng nhỏ mà vẫn rõ nghĩa */
    f.dataset.chu = laCoSo() ? 'Báo lỗi' : (laQuanLy() ? 'Báo lỗi' : '');
    f.classList.remove('nho');               /* cỡ do CSS bong bóng nhỏ lo (08/09) */
    f.classList.toggle('nho2', laQuanLy());
    f.style.display = nhanFab ? '' : 'none';
  }
}

/* CHẤM SỐ TRÊN ICON APP ngoài màn hình chính (như Zalo) — iPhone từ iOS 16.4 và
   Chrome máy tính hỗ trợ; máy không hỗ trợ thì hàm này im lặng, không hại gì.
   Số = phiếu có tin chưa đọc + việc đang chờ đúng vai mình (CHT: chờ nghiệm thu,
   kỹ thuật: chưa ai nhận). Không lọc theo tháng — việc tồn là việc tồn. */
function capNhatBadgeApp() {
  try {
    if (!('setAppBadge' in navigator)) return;
    const ds = phieuThat().filter(p => !laCoSo() || p.coSoId === (D.nguoi || {}).coSoId);
    let n = ds.reduce((s, p) => s + (tinChuaDoc(p.id) ? 1 : 0), 0);
    if (laCoSo()) n += ds.filter(choCHT).length;
    if (laTho()) n += ds.filter(p => chuaAiNhan(p) || (duocGiao(p) && giaoChoToi(p))).length;
    if (n) navigator.setAppBadge(n); else navigator.clearAppBadge();
  } catch (e) { }
}

/* ============================================================
   THE_DANG = danh sách khoá thẻ đang hiện ở hàng trên cùng (10/09).
   Trường soi đúng: hàng chip lọc bên dưới lặp lại gần hết hàng thẻ —
     vai kỹ thuật: thẻ "Chưa ai tiếp nhận 1" ↔ chip "Chưa nhận"
                   thẻ "Chờ CHT nghiệm thu"  ↔ chip "Chờ CHT"
                   thẻ "Tổng lỗi đã báo 7"   ↔ chip "Tất cả 7"
                   thẻ "Của tôi đang làm 0"  ↔ chip "Của tôi 0" (và cả tab dưới)
   Bấm thẻ cũng lọc y như bấm chip, nên hai hàng làm đúng một việc.
   Giữ hàng thẻ (Trường yêu cầu), bỏ chip nào đã có thẻ tương ứng. Chip nào
   KHÔNG có thẻ (Trao đổi, Xong, Đã huỷ, Lọc thêm) thì giữ nguyên.
   ============================================================ */
let THE_DANG = [];
function veThe() {
  const s = soLieu();

  /* Cơ sở và kỹ thuật chỉ cần 4 con số đúng việc của mình — 9 thẻ kia là để Quản lý làm báo cáo.
     Thẻ "Của tôi" dùng data-chip vì nó lọc theo người, không phải theo trạng thái. */
  /* 5 THẺ ĐI ĐÚNG DÒNG ĐỜI PHIẾU (Trường chốt 27/08: "tên thẻ của cơ sở chưa ổn").
     Báo lên → kỹ thuật nhận chưa → đang sửa → chờ TÔI duyệt → xong hẳn.
     Trước đây thiếu hẳn ô "kỹ thuật đã nhận chưa" — thứ CHT sốt ruột nhất; còn
     "Đã xong" thì đếm cả việc kỹ thuật vừa báo mà chưa ai duyệt nên số hơi ảo. */
  /* Thứ tự CHT (Trường chốt 02/09): việc CHT phải LÀM là nghiệm thu →
     thẻ CHỜ TÔI NGHIỆM THU lên vị trí 2, khỏi vuốt mới thấy. */
  if (laCoSo()) return veTheGon([
    ['the', '', 'Tổng lỗi đã báo', s.tong, 'cơ sở tôi · tháng này', '#0E7490',
      'mọi phiếu cơ sở tôi báo trong tháng, trừ phiếu huỷ'],
    ['the', 'chocht', 'CHỜ TÔI NGHIỆM THU', s.choCht,
      s.choCht ? 'kỹ thuật báo xong — vào bấm Đạt/Chưa đạt' : 'không có việc chờ tôi', '#7C3AED',
      'kỹ thuật báo xong, tôi chưa bấm Đạt hay Chưa đạt'],
    ['the', 'chuanhan', 'Kỹ thuật chưa nhận', s.chuaNhan,
      s.chuaNhanTre ? '⚠ ' + s.chuaNhanTre + ' việc đã quá ngày tôi mong muốn' : 'chờ kỹ thuật nhận việc', '#EA580C',
      'chưa kỹ thuật nào bấm nhận việc'],
    ['the', 'dangxuly', 'Đang sửa', s.dangXuLy,
      s.treHen ? '⚠ ' + s.treHen + ' việc kỹ thuật đã trễ hẹn' : (s.dangXuLy ? 'kỹ thuật đã nhận, đang làm' : 'không có việc đang sửa'), '#2563EB',
      'đã có người nhận, chưa báo xong'],
    ['the', 'daduyet', 'Đã nghiệm thu xong', s.nghiemThu,
      'tỉ lệ ' + s.tyLeNghiemThu + '%' + (s.xong > s.nghiemThu ? ' · ' + (s.xong - s.nghiemThu) + ' việc chờ tôi duyệt' : ''), '#16A34A',
      'tôi đã bấm Đạt — việc đóng hẳn']
  ]);

  if (laTho()) {
    const cuaViec = phieuThat().filter(trongThang).filter(p => !L.coSo || p.coSoId === L.coSo).filter(p =>
      p.nguoiNhanKt === D.nguoi.ten || (p.nguoiSua || []).includes(D.nguoi.ten));
    const cuaToi = cuaViec.filter(p => p.trangThai === 'tiepnhan').length;
    /* số to = TÔI trễ lời hẹn; team trễ bao nhiêu nói ở dòng phụ — trách nhiệm cá nhân
       nhưng vẫn thấy tình hình chung (Trường chốt qua ảnh KT-34) */
    const toiTre = cuaViec.filter(p => soNgayTre(p) > 0).length;
    /* 5 thẻ, TỔNG lên đầu (Trường chốt 27/08: "bây giờ xem tổng lỗi ở đâu").
       Trước đây kỹ thuật không có ô tổng nào — chỉ có con số bé ở góc trái trên. */
    /* Thẻ đầu (Trường đổi 02/09): "Tổng lỗi các cơ sở đã báo" — đếm MỌI phiếu
       đã báo trong tháng (kể cả đã xong), trừ phiếu huỷ. Trước là "đang mở". */
    const tongBao = phieuThat().filter(trongThang).filter(p => !L.coSo || p.coSoId === L.coSo)
      .filter(p => p.trangThai !== 'huy').length;
    return veTheGon([
      ['the', 'tongbao', 'Tổng lỗi các cơ sở đã báo', tongBao, 'cả 12 cơ sở · tháng này', '#0E7490',
        'mọi phiếu đã báo trong tháng, kể cả đã xong — trừ phiếu huỷ'],
      ['the', 'chuanhan', 'Chưa ai tiếp nhận', s.chuaNhan, s.chuaNhanTre ? '⚠ ' + s.chuaNhanTre + ' việc đã quá mong muốn của cơ sở' : 'chờ kỹ thuật nhận', '#EA580C',
        'chưa ai trong team bấm nhận việc'],
      ['the', 'toidanglam', 'Của tôi đang làm', cuaToi, 'đã nhận, chưa báo xong', '#2563EB',
        'việc tôi nhận hoặc tôi sửa, chưa báo xong'],
      ['the', 'toitre', 'Việc của tôi quá hạn', toiTre,
        s.treHen > toiTre ? '⚠ cả team đang trễ ' + s.treHen : (toiTre ? '⚠ vào hẹn lại ngày' : 'tôi không trễ việc nào'), '#DC2626',
        'quá ngày chính tôi tự hẹn mà chưa báo xong'],
      ['the', 'chocht', 'Chờ CHT nghiệm thu', s.choCht, 'đã báo xong, chờ xác nhận', '#D97706',
        'đã báo xong, CHT chưa bấm Đạt']
    ]);
  }

  /* Thời gian xử lý: dưới 1 ngày mà ghi "0,0 ngày" là số vô nghĩa (Trường bắt 27/08).
     Xong trong buổi thì nói bằng GIỜ, dưới 1 giờ thì nói bằng PHÚT. */
  const tgXuLy = (function () {
    if (!s.tgtb) return ['—', 'Chưa có việc nào hoàn thành'];
    const gio = s.tgtb * 24;
    if (gio < 1) return [Math.max(1, Math.round(gio * 60)) + ' phút', 'Tính từ lúc nhận đến lúc báo xong'];
    if (gio < 24) return [Math.round(gio) + ' giờ', 'Tính từ lúc nhận đến lúc báo xong'];
    return [s.tgtb.toFixed(1).replace('.', ',') + ' ngày', 'Tính từ lúc nhận đến lúc báo xong'];
  })();

  /* Thứ tự ADMIN (Trường chốt 02/09): 2 con số NÓNG (trễ hẹn, chưa nhận) lên
     ngay sau Tổng — mở app là biết có gì đang cháy, khỏi vuốt. */
  /* ============================================================
     MƯỜI THẺ SỐ (viết lại câu chữ 20/09 — Trường: "chữ cái đầu phải viết hoa,
     câu từ chuyên nghiệp dễ hiểu").
     Luật viết cho dòng phụ: một câu, hoa đầu câu, không dấu chấm cuối, nói
     ĐIỀU CẦN LÀM hoặc CÁCH TÍNH — không cảm thán, không emoji trừ khi báo
     tình trạng tốt. Dòng thứ tư (cách tính) chỉ hiện trên máy tính rộng.
     ============================================================ */
  const T = [
    /* tên rút ngắn thêm 03/10: có ô icon chiếm chỗ nên phần chữ còn hẹp, tên
       dài bị cắt thành "Tổng lỗi t…" — thà gọn mà đọc được */
    ['', 'Tổng lỗi tháng', s.tong, 'Toàn bộ ' + (D.cosos || []).length + ' cơ sở', '#0E7490',
      'Mọi phiếu báo trong tháng, không tính phiếu đã huỷ'],
    /* đứng thứ HAI, trước cả "Kỹ thuật trễ hẹn": cơ sở đang chờ, không ai cầm,
       và đã quá ngày — không có nhóm nào gấp hơn (19/09) */
    /* tên thẻ rút ngắn 03/10: xếp 10 thẻ một hàng thì mỗi ô chỉ còn ~140px,
       tên dài bị cắt thành "Quá hạn, chưa ai nh…" — thà gọn mà đọc được */
    ['chuanhantre', 'Quá hạn, chưa nhận', s.chuaNhanTre,
      s.chuaNhanTre ? 'Chờ lâu nhất ' + s.chuaNhanTreNhat + ' ngày — cần giao ngay' : 'Không còn việc nào bị bỏ quên',
      s.chuaNhanTre ? '#B91C1C' : '#16A34A',
      'Đã quá ngày cơ sở mong muốn mà chưa kỹ thuật nào bấm nhận'],
    ['trehen', 'Kỹ thuật trễ hẹn', s.treHen,
      s.treHen ? 'Trễ lâu nhất ' + (s.treHenNhat || 1) + ' ngày — cần nhắc'
        : (s.chuaNhanTre ? 'Việc đã nhận đều trong hạn' : 'Không có việc nào trễ hẹn'),
      s.treHen ? '#DC2626' : '#16A34A', 'Đã qua ngày kỹ thuật tự hẹn mà chưa báo xong'],
    ['chuanhan', 'Chưa ai nhận', s.chuaNhan,
      s.chuaNhanTre ? 'Trong đó ' + (s.chuaNhan - s.chuaNhanTre) + ' việc còn trong hạn' : 'Đang chờ kỹ thuật nhận việc',
      '#EA580C', 'Tổng việc chưa ai bấm nhận, gồm cả số ở thẻ Quá hạn'],
    ['daduyet', 'Đã nghiệm thu', s.nghiemThu,
      'Đạt ' + s.tyLeNghiemThu + '% khối lượng tháng' + (s.xong > s.nghiemThu ? ' — ' + (s.xong - s.nghiemThu) + ' việc chờ duyệt' : ''),
      '#16A34A', 'CHT đã bấm Đạt, việc đóng hẳn'],
    ['dangxuly', 'Đang xử lý', s.dangXuLy,
      s.dangXuLy ? 'Kỹ thuật đã nhận, đang làm' : 'Không có việc nào đang làm',
      '#2563EB', 'Đã tiếp nhận nhưng chưa báo xong'],
    ['sap', 'Sắp đến hạn', s.sap,
      s.sap ? 'Hết hạn hôm nay hoặc ngày mai' : 'Chưa việc nào tới hạn',
      '#F59E0B', 'Hạn là ngày kỹ thuật tự hẹn; chưa ai nhận thì lấy ngày cơ sở mong'],
    ['chocht', 'Chờ CHT duyệt', s.choCht,
      s.choCht ? 'Kỹ thuật đã báo xong, chờ cơ sở duyệt' : 'Không có việc nào chờ duyệt',
      '#D97706', 'Kỹ thuật báo xong nhưng CHT chưa bấm Đạt'],
    ['tgtb', 'Xử lý trung bình', tgXuLy[0], tgXuLy[1], '#0891B2',
      'Trung bình từ lúc nhận việc tới lúc báo xong'],
    ['chiphi', 'Chi phí tháng', s.chiPhi ? tien(s.chiPhi) + '₫' : '—',
      s.chiPhi ? 'Linh kiện và công thợ' : 'Chưa việc nào khai chi phí', '#7C3AED',
      'Cộng chi phí kỹ thuật khai khi báo xong']
  ];
  THE_DANG = T.map(x => x[0]).filter(Boolean);
  /* ============================================================
     GIỮ 9 THẺ TO MỘT HÀNG CUỘN NGANG (Trường chốt lại 10/09: "thôi quay lại
     10 thẻ ngang vuốt sang đi").
     Đã thử 2 tầng × 5 ô — gọn thật, hết vuốt, nhưng tên thẻ phải rút ngắn
     ("Tổng tháng", "Nghiệm thu") và mất dòng phụ lẫn dòng cách tính. Trường
     xem xong chọn quay về kiểu cũ: thẻ to, đọc đủ chữ, vuốt sang xem tiếp.
     Cái GIỮ LẠI từ bản 2 tầng: ô ⚙ LỌC thành thẻ thứ 10 ở cuối hàng, nên hàng
     chip lọc vẫn bỏ được — mọi đường lọc nằm gọn trong bảng của ô đó.
     ============================================================ */
  const soLocBat = ['coSo', 'mucDo', 'tho', 'tt', 'vuong', 'nhom'].filter(k => L[k]).length;
  document.getElementById('theHang').innerHTML = T.map(t => {
    const nho = String(t[2]).length > 6;
    /* dòng cách tính ẩn trên máy tính (CSS) nên gắn luôn vào tooltip — di chuột
       vào thẻ là đọc được, không tốn một dòng chiều cao (20/09) */
    /* ============================================================
       DẤU ⓘ CHÚ GIẢI (20/09 — Trường: "thêm chú giải ở thẻ").
       Trên máy tính thẻ đã bóp thấp nên dòng cách tính bị ẩn; thay bằng dấu ⓘ
       mờ ở góc — rê chuột vào là bung hộp chú giải ngay dưới thẻ, không đẩy
       thẻ cao thêm chút nào. Trên điện thoại dòng đó vẫn hiện như cũ nên dấu ⓘ
       tự ẩn đi.
       ============================================================ */
    return '<button class="the ' + (L.the === t[0] && t[0] ? 'on' : '') + '" data-the="' + t[0] + '"' +
      ' style="border-left-color:' + t[4] + ';color:' + t[4] + '">' +
      (t[5] ? '<span class="ico" data-ct="' + esc(t[5]) + '">ⓘ</span>' : '') +
      /* ô icon màu bên trái (03/10 — Trường chốt theo ảnh mẫu): nhìn hình bắt
         nhanh hơn đọc chữ, nhất là khi 10 thẻ xếp sát nhau */
      /* nền ô icon giữ nguyên màu nghiệp vụ của thẻ (t[4] + '1f' = màu đó pha
         loãng 12%), đúng yêu cầu "giữ nguyên màu nghiệp vụ, icon chỉ bổ trợ" */
      '<em class="theIc" style="background:' + t[4] + '1f">' + icAnh(IC_THE[t[0]] || 'tong-loi', 'theIcAnh') + '</em>' +
      '<div class="n">' + t[1] + '</div>' +
      /* data-hu-dem: số chạy từ 0 lên trong 0,6 giây (12/10). HieuUng.gan()
         tự bắt mọi ô mang thuộc tính này, kể cả ô vẽ lại sau — không phải
         gọi tay sau mỗi lần cập nhật. Hiểu cả "952.000₫" và "2,7 ngày". */
      '<div class="s" data-hu-dem style="color:' + t[4] + ';font-size:' + (nho ? '15px' : '21px') + '">' + t[2] + '</div>' +
      '<div class="p">' + esc(t[3]) + '</div>' +
      (t[5] ? '<div class="gt">' + esc(t[5]) + '</div>' : '') + '</button>';
  }).join('') +
    /* ============================================================
       THẺ ⚙ "LỌC DANH SÁCH" — BỎ TRÊN MÁY TÍNH (03/10 — Trường chốt).
       Trên máy tính giờ mỗi cột bảng có phễu lọc riêng, nên ô này thừa và còn
       chiếm một chỗ trong hàng thẻ số liệu.
       ĐIỆN THOẠI VẪN GIỮ: màn hẹp không hiện bảng (chỉ hiện thẻ phiếu), không
       có cột nào để gắn phễu — bỏ nốt là cả đội mất đường lọc trên điện thoại.
       ============================================================ */
    (matchMedia('(min-width:901px)').matches ? '' :
      '<button class="the oLoc' + (soLocBat ? ' on' : '') + '" data-locthem="1"' +
      ' style="border-left-color:#475569;color:#475569">' +
      '<span class="ico" data-ct="Gộp 4 chip lọc và 6 ô chọn chi tiết vào một bảng">ⓘ</span>' +
      '<div class="n">Lọc danh sách</div>' +
      '<div class="s" style="font-size:15px;color:#475569">' + (soLocBat ? soLocBat + ' bộ lọc' : '⚙') + '</div>' +
      '<div class="p">' + (soLocBat ? 'Bấm để xem đang lọc theo gì' : 'Quá hạn · Trao đổi · Xong · Cơ sở') + '</div>' +
      '<div class="gt">Gộp 4 chip lọc và 6 ô chọn chi tiết</div>' +
      '</button>');
}

/* ============================================================
   BẢNG LỌC GỘP — mở từ ô ⚙ LỌC ở tầng thẻ (10/09).
   Hàng chip lọc trên điện thoại đã bỏ, nên mọi đường lọc phải có đủ ở đây:
   lọc nhanh (quá hạn · trao đổi · xong · đã huỷ) + 6 ô chọn + Xuất Excel.
   Dùng đúng data-the / data-loc / nutExcel như hàng chip cũ nên không phải
   viết thêm chỗ xử lý bấm nào.
   ============================================================ */
function formLoc() {
  const chuaHuy = phieuThat().filter(trongThang);
  const soTraoDoi = chuaHuy.filter(p => (!L.coSo || p.coSoId === L.coSo) && soTinChat(p.id) > 0).length;
  const nhanh = [
    ['quahan', '⚠ Quá hạn cả team'],
    soTraoDoi ? ['traodoi', '💬 Đang trao đổi (' + soTraoDoi + ')'] : null,
    ['xong', '✓ Đã xong'],
    soDaHuy() ? ['dahuy', '✕ Đã huỷ (' + soDaHuy() + ')'] : null
  ].filter(Boolean);
  const sel = (id, ten, ds, gt) => '<label class="locO"><span>' + ten + '</span>' +
    '<select data-loc="' + id + '"><option value="">tất cả</option>' +
    ds.map(x => '<option value="' + esc(x[0]) + '"' + (gt === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') +
    '</select></label>';
  const soBat = ['coSo', 'mucDo', 'tho', 'tt', 'vuong', 'nhom'].filter(k => L[k]).length + (L.the ? 1 : 0);
  moSheet(khungSheet('⚙ Lọc danh sách',
    soBat ? soBat + ' bộ lọc đang bật · ' + loc().length + ' việc' : 'Đang xem tất cả · ' + loc().length + ' việc',
    '<div class="nhomCd">LỌC NHANH</div>' +
    '<div class="chipLoc" style="padding:0 0 4px">' + nhanh.map(x =>
      '<button data-the="' + x[0] + '" class="' + (L.the === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="nhomCd">CHỌN CHI TIẾT</div>' +
    '<div class="locLuoi">' +
    (laCoSo() ? '' : sel('coSo', 'Cơ sở', D.cosos.map(c => [c.id, c.ten]), L.coSo)) +
    sel('mucDo', 'Mức độ', Object.keys(MUC_DO).map(k => [k, MUC_DO[k].ten]), L.mucDo) +
    sel('tho', 'Kỹ thuật', dsTho().map(t => [t.ten, t.ten]), L.tho) +
    sel('tt', 'Trạng thái', Object.keys(TT).map(k => [k, TT[k].ten]), L.tt) +
    sel('vuong', 'Đang vướng', Object.keys(VUONG).map(k => [k, VUONG[k].ten]), L.vuong) +
    sel('nhom', 'Nhóm lỗi', Object.keys(NHOM_LOI).map(k => [k, NHOM_LOI[k]]), L.nhom) +
    '</div>' +
    '<button class="mn chiPC" id="nutExcel" style="width:100%;margin-top:10px">' +
    '<div class="ic" style="background:#DCFCE7;color:#15803D"><img width="22" height="22" class="mnIc" src="ic/av-excel.webp" alt="" loading="lazy"></div>' +
    '<div><b>Xuất Excel</b><div class="s">đúng khoảng đang lọc</div></div><span class="mui">›</span></button>',
    (soBat ? '<button class="btn v" data-boloc="1">✕ Bỏ hết lọc</button>' : '') +
    '<button class="btn pri" style="flex:1" data-dongsheet="1">Xem ' + loc().length + ' việc</button>'));
}

/* ============================================================
   ICON CHO THẺ GỌN (09/10 — soát lại ba vai mới thấy thiếu).
   Khoá thẻ của kỹ thuật và cơ sở KHÁC với khoá thẻ của quản lý, nên bảng
   IC_THE ở đầu file không khớp cái nào — hai vai này ra thẻ trần không icon.
   Bảng dưới ánh xạ nốt. Mấy khoá trùng tên (chuanhan, chocht, dangxuly,
   daduyet) để ở IC_THE rồi, chỉ cần thêm khoá riêng của hai vai.
   ============================================================ */
const IC_THE_GON = {
  tongbao: 'tong-loi', toidanglam: 'dang-xu-ly', toitre: 'tre-hen',
  chuanhan: 'chua-nhan', chocht: 'cho-duyet', dangxuly: 'dang-xu-ly',
  daduyet: 'nghiem-thu', quahan: 'qua-han', trehen: 'tre-hen'
};
/* 4 thẻ gọn cho cơ sở / kỹ thuật — [kiểu, khoá, tên, số, phụ, màu] */
function veTheGon(T) {
  THE_DANG = T.map(x => x[1]).filter(Boolean);
  document.getElementById('theHang').innerHTML = '<div class="theGon">' + T.map(t => {
    const dang = t[0] === 'chip' ? (L.chip === t[1]) : (t[1] && L.the === t[1]);
    /* thẻ tổng không có khoá riêng (t[1] rỗng) nên lấy icon tổng lỗi */
    const ten = IC_THE_GON[t[1]] || IC_THE[t[1]] || 'tong-loi';
    return '<button class="the g ' + (dang ? 'on' : '') + '" data-' + t[0] + '="' + t[1] + '"' +
      ' style="border-left-color:' + t[5] + ';color:' + t[5] + '">' +
      '<em class="theIc" style="background:' + t[5] + '1f">' + icAnh(ten, 'theIcAnh') + '</em>' +
      '<div class="n">' + t[2] + '</div>' +
      '<div class="s" data-hu-dem style="color:' + t[5] + '">' + t[3] + '</div>' +
      /* thẻ 1 dòng (02/09): ghi chú thường ẩn, ghi chú bắt đầu bằng ⚠ là CẢNH BÁO
         thì nở thêm dòng đỏ — thẻ yên ổn gọn, thẻ có chuyện tự to mồm */
      '<div class="p' + (/^⚠/.test(String(t[4])) ? ' canh' : '') + '">' + esc(t[4]) + '</div>' +
      (t[6] ? '<div class="gt">' + esc(t[6]) + '</div>' : '') + '</button>';
  }).join('') + '</div>';
}

function veBieuDo() {
  /* Cơ sở và kỹ thuật KHÔNG xem biểu đồ — màn điện thoại để dành cho danh sách lỗi.
     Chỉ vai Quản lý mới cần thống kê để làm báo cáo. */
  const el0 = document.getElementById('bdHang');
  if (!laQuanLy()) { el0.innerHTML = ''; el0.classList.add('an'); return; }
  el0.classList.remove('an');
  const now = new Date();
  /* 1. 6 tháng */
  const thangs = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dem = phieuThat().filter(p => { const x = new Date(p.ngayBao); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear() && (!laCoSo() || p.coSoId === D.nguoi.coSoId); }).length;
    thangs.push({ ten: 'T' + (d.getMonth() + 1), key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), dem: dem, nay: i === 0 });
  }
  const maxT = Math.max.apply(null, thangs.map(t => t.dem).concat([1]));
  /* cột cao nhất: ĐT 56px (khung 104px trừ số + tên tháng — 88px từng ĐÈ TIÊU ĐỀ, Trường bắt 04/09);
     PC ≥920px khung 210px nên cột được vươn 160px (Trường chốt 07/09 — hết co cụm một góc) */
  const CAO = matchMedia('(min-width:920px)').matches ? 118 : 56;
  const bd1 = '<div class="bd"><div class="h">SỐ LỖI 6 THÁNG GẦN NHẤT<span>bấm cột để xem tháng đó</span></div><div class="cotBd">' +
    thangs.map(t => '<button class="c" data-thang="' + (t.nay ? 'nay' : t.key) + '"><b>' + t.dem + '</b><i style="height:' + Math.max(3, Math.round(t.dem / maxT * CAO)) + 'px;background:' + (t.nay ? '#0891B2' : (t.dem === maxT ? '#DC2626' : '#0E7490')) + '"></i><small>' + t.ten + '</small></button>').join('') +
    '</div></div>';

  /* ============================================================
     2. CƠ SỞ NHIỀU LỖI — ĐI THEO THẺ KPI ĐANG BẤM (03/10 — Trường chốt).
     Trước đây bấm thẻ "Quá hạn, chưa nhận" thì danh sách lọc còn 3 dòng mà
     biểu đồ vẫn vẽ cả tháng — nhìn hai thứ cạnh nhau không khớp, phải tự nhẩm.
     Giờ bấm thẻ nào thì biểu đồ trả lời đúng câu hỏi đó: "quá hạn thì cơ sở
     nào nhiều nhất", "chờ CHT thì đọng ở đâu".
     CHỈ nghe theo THẺ (L.the), cố tình bỏ qua lọc theo cơ sở — đang xem riêng
     một cơ sở mà biểu đồ "cơ sở nhiều lỗi nhất" chỉ còn đúng một cột thì vô
     nghĩa. Hai biểu đồ kia giữ nguyên: chúng nhìn 3–6 tháng, lọc vào là rỗng.
     ============================================================ */
  const theCu = L.coSo, gianCu = L.gian, timCu = L.tim, maCu = L.ma;
  L.coSo = ''; L.gian = ''; L.tim = ''; L.ma = null;
  const ds = loc();
  L.coSo = theCu; L.gian = gianCu; L.tim = timCu; L.ma = maCu;
  const theoCS = {};
  ds.forEach(p => { const k = p.coSoId || '—'; (theoCS[k] = theoCS[k] || { dem: 0, tre: 0 }); theoCS[k].dem++; if (soNgayTre(p) > 0) theoCS[k].tre++; });
  const csTop = Object.keys(theoCS).map(k => ({ k, ...theoCS[k] })).sort((a, b) => b.dem - a.dem).slice(0, 6);
  const maxCS = Math.max.apply(null, csTop.map(x => x.dem).concat([1]));
  const mauCS = ['#DC2626', '#EA580C', '#F59E0B', '#0891B2', '#0891B2', '#94A3B8'];
  const nhanBd2 = L.the && typeof TEN_THE_BD === 'function' ? TEN_THE_BD(L.the) : '';
  const bd2 = '<div class="bd"><div class="h">CƠ SỞ NHIỀU LỖI NHẤT<span>' +
    (nhanBd2 ? esc(nhanBd2) : 'số lỗi · số quá hạn') + '</span></div>' +
    (csTop.length ? '<div class="hangBd">' + csTop.map((x, i) =>
      /* tên ngắn (bỏ "Aeon Mall") — để nguyên thì "Aeon Mall Hải Dương" bị cắt
         thành "Aeon Mall Hải D…", mà 6/13 cơ sở đều bắt đầu bằng hai chữ đó */
      '<button class="r" data-coso="' + esc(x.k) + '"><span class="tt" title="' + esc(tenCoSo(x.k)) + '">' +
      esc(tenNgan(tenCoSo(x.k))) + '</span>' +
      '<span class="th"><i style="width:' + Math.round(x.dem / maxCS * 100) + '%;background:' + mauCS[i] + '"></i></span>' +
      '<b>' + x.dem + (x.tre ? ' <em>· ' + x.tre + ' trễ</em>' : '') + '</b></button>').join('') + '</div>'
      : '<div class="trongBd">' + (L.the ? 'Không cơ sở nào thuộc nhóm này' : 'Chưa có lỗi trong kỳ này') + '</div>') + '</div>';

  /* 3. lỗi hay lặp lại — 3 tháng */
  const moc = Date.now() - 92 * NGAY;
  const theoNhom = {};
  phieuThat().filter(p => p.ngayBao >= moc && (!laCoSo() || p.coSoId === D.nguoi.coSoId))
    .forEach(p => { const k = p.nhomLoi || 'khac'; theoNhom[k] = (theoNhom[k] || 0) + 1; });
  const nhTop = Object.keys(theoNhom).map(k => ({ k, dem: theoNhom[k] })).sort((a, b) => b.dem - a.dem).slice(0, 6);
  const maxNH = Math.max.apply(null, nhTop.map(x => x.dem).concat([1]));
  const mauNH = ['#7C3AED', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'];
  const bd3 = '<div class="bd"><div class="h">LỖI HAY LẶP LẠI<span>3 tháng gần đây</span></div>' +
    (nhTop.length ? '<div class="hangBd">' + nhTop.map((x, i) =>
      '<button class="r" data-nhom="' + esc(x.k) + '"><span class="tt">' + esc(NHOM_LOI[x.k] || x.k) + '</span>' +
      '<span class="th"><i style="width:' + Math.round(x.dem / maxNH * 100) + '%;background:' + mauNH[i] + '"></i></span>' +
      '<b>' + x.dem + ' lần</b></button>').join('') + '</div>'
      : '<div class="trongBd">Chưa đủ dữ liệu</div>') + '</div>';

  /* nút BÁO CÁO HỌP (KT-38, 01/09) — số liệu sống, copy dán Zalo họp
     + HIỆU SUẤT KT + CHIA VIỆC (Trường chốt 04/09) */
  /* đếm ĐÚNG số việc màn Chia việc sẽ gợi ý: phiếu chưa ai bấm nhận VÀ chưa
     mang tên ai. Phiếu đã có người phụ trách không nằm trong đây (11/09). */
  const soCho = phieuThat().filter(p => chuaAiNhan(p) && !p.nguoiNhanKt).length;
  const bd0 = '<div class="bd bcNut">' +
    '<button data-chiaviec="1">🧠 <b>Chia việc</b>' +
    '<i>' + (soCho ? soCho + ' việc chưa ai nhận — máy gợi ý, bấm là giao' : 'không còn việc chờ 👌') + '</i><span class="mui">›</span></button>' +
    '<button data-hieusuat="1">👷 <b>Hiệu suất kỹ thuật</b>' +
    '<i>xong · đúng hẹn % · tốc độ · bị trả lại — theo từng người</i><span class="mui">›</span></button>' +
    /* "Báo cáo nhanh" bỏ 03/10 (Trường chốt) — Tổng kết tháng gánh luôn việc
       của nó, khỏi hai màn số liệu na ná nhau */
    /* bản tháng để CHIẾU trong họp (14/09 — Trường: "làm nó hoành tá tràng lên
       để 1 tháng họp tổng kết"). Khác bản nhanh ở trên: cái kia để copy chữ,
       cái này để mở máy chiếu. */
    '<button data-aiquet="1">🤖 <b>AI đọc lại nhóm lỗi</b>' +
    '<i>quét hết phiếu cũ, xem bảng đối chiếu rồi mới lưu</i><span class="mui">›</span></button>' +
    '<button data-tongket="1">📊 <b>Tổng kết tháng</b>' +
    '<i>bản đầy đủ để chiếu họp — biểu đồ, xếp hạng, in ra PDF</i><span class="mui">›</span></button>' +
    /* "Lịch anh em" gỡ 20/10 (Trường chốt) — 0 bản ghi sau hai tháng */
    '</div>';
  /* PC ≥920px: bảng hiệu suất PHƠI SẴN full chiều ngang dưới biểu đồ (Trường chốt 07/09) —
     ĐT vẫn bấm nút mở ngăn như cũ (CSS .hsPhoi ẩn dưới 920px), bấm tên vẫn ra chi tiết */
  const bd4 = '<div class="bd hsPhoi"><div class="h">👷 HIỆU SUẤT KỸ THUẬT — ' +
    (typeof tenThangDai === 'function' ? tenThangDai(L.thang).split(' — ')[0].toUpperCase() : 'THÁNG NÀY') +
    '<span>bấm tên xem chi tiết</span></div>' +
    (typeof hsBangHtml === 'function' ? hsBangHtml() : '') +
    '<div class="hsChu">' + (typeof HS_CHU !== 'undefined' ? HS_CHU : '') + '</div></div>';
  document.getElementById('bdHang').innerHTML = bd0 + bd1 + bd2 + bd3 + bd4;
}

function veCanhBao() {
  /* ============================================================
     BỎ DẢI 4 HỘP CẢNH BÁO (03/10 — Trường chốt).
     Lý do viết từ hồi 19/09 vẫn đúng và giờ đúng cho cả admin: mấy hộp này lặp
     lại đúng mấy con số đã có ở hàng thẻ phía trên, không thêm thông tin gì mà
     ăn hơn 100px chiều cao — chỗ đó để dành cho bảng.
     Giữ hàm và ô chứa vì nhiều nơi còn gọi; chỉ thôi không vẽ.
     ============================================================ */
  const el0 = document.getElementById('cbHang');
  if (el0) { el0.innerHTML = ''; el0.classList.add('an'); }
  return;
  /* eslint-disable no-unreachable */
  if (!laQuanLy()) { el0.innerHTML = ''; el0.classList.add('an'); return; }
  el0.classList.remove('an');
  const s = soLieu();
  const C = [];
  /* nhóm gấp nhất lên đầu dải: quá hạn MÀ KHÔNG AI CẦM (19/09) */
  if (s.chuaNhanTre) C.push(['chuanhantre', '#FEF2F2', '#FCA5A5', '#FEE2E2', '#991B1B', '🔥',
    s.chuaNhanTre + ' việc quá hạn mà CHƯA AI NHẬN',
    (s.chuaNhanTreNhat ? 'lâu nhất ' + s.chuaNhanTreNhat + ' ngày · ' : '') + 'cơ sở đang chờ, không ai cầm']);
  if (s.tre) C.push(['quahan', '#FEF2F2', '#FECACA', '#FEE2E2', '#B91C1C', '⚠', s.tre + ' việc đã quá hạn dự kiến', s.treNhat ? 'lâu nhất ' + s.treNhat + ' ngày' : '']);
  if (s.sap) C.push(['sap', '#FFFBEB', '#FDE68A', '#FEF3C7', '#B45309', '⏱', s.sap + ' việc sắp quá hạn', 'hết hạn trong 24h tới']);
  if (s.chuaNhan) C.push(['chuanhan', '#FFF7ED', '#FED7AA', '#FFEDD5', '#C2410C', '👤', s.chuaNhan + ' việc chưa ai tiếp nhận',
    s.chuaNhanTre ? 'trong đó ' + (s.chuaNhan - s.chuaNhanTre) + ' việc còn trong hạn' : 'kỹ thuật chưa hẹn ngày']);
  if (s.choCht) C.push(['chocht', '#F5F3FF', '#DDD6FE', '#EDE9FE', '#6D28D9', '🔒', s.choCht + ' việc CHT chưa nghiệm thu', 'kỹ thuật đã báo xong, chờ xác nhận']);
  const el = document.getElementById('cbHang');
  if (!C.length) { el.innerHTML = '<div class="cb" style="background:#F0FDF4;border-color:#BBF7D0"><div class="ic" style="background:#DCFCE7;color:#15803D">✓</div><div><b style="color:#15803D">Không có việc nào quá hạn</b><div class="x">mọi thứ đang trong hạn</div></div></div>'; return; }
  el.innerHTML = C.map(c =>
    '<button class="cb" data-the="' + c[0] + '" style="background:' + c[1] + ';border-color:' + c[2] + '">' +
    '<div class="ic" style="background:' + c[3] + ';color:' + c[4] + '">' + c[5] + '</div>' +
    '<div><b style="color:' + c[4] + '">' + esc(c[6]) + '</b><div class="x">' + esc(c[7]) + '</div></div>' +
    '<span class="go" style="color:' + c[4] + '">Xem ngay</span></button>').join('');
}

/* nhãn ngắn của thẻ KPI — dùng cho dòng phụ biểu đồ "Cơ sở nhiều lỗi nhất"
   để người xem biết biểu đồ đang nói về nhóm việc nào (03/10) */
function TEN_THE_BD(k) {
  return ({
    chuanhantre: 'đang lọc: quá hạn, chưa nhận', trehen: 'đang lọc: kỹ thuật trễ hẹn',
    chuanhan: 'đang lọc: chưa ai tiếp nhận', daduyet: 'đang lọc: đã nghiệm thu',
    dangxuly: 'đang lọc: đang xử lý', sap: 'đang lọc: sắp đến hạn',
    chocht: 'đang lọc: chờ CHT nghiệm thu', chiphi: 'đang lọc: có chi phí',
    quahan: 'đang lọc: quá hạn', xong: 'đang lọc: đã xong',
    traodoi: 'đang lọc: đang trao đổi', dahuy: 'đang lọc: đã huỷ'
  })[k] || '';
}

function veLoc() {
  const TEN_THE = {
    xong: 'ĐÃ HOÀN THÀNH', dangxuly: 'ĐANG XỬ LÝ', sap: 'SẮP QUÁ HẠN 24H', quahan: 'QUÁ HẠN',
    traodoi: 'ĐANG CÓ TRAO ĐỔI',
    trehen: 'KỸ THUẬT TRỄ LỜI HẸN', toitre: 'VIỆC CỦA TÔI QUÁ HẠN', toidanglam: 'CỦA TÔI ĐANG LÀM',
    dangmo: 'TẤT CẢ VIỆC ĐANG MỞ',
    chuanhan: 'CHƯA AI TIẾP NHẬN', chuanhantre: 'QUÁ HẠN MÀ CHƯA AI NHẬN', chocht: 'CHT CHƯA XÁC NHẬN', chiphi: 'CÓ CHI PHÍ', tgtb: 'ĐÃ XONG (tính thời gian)',
    daduyet: 'ĐÃ NGHIỆM THU XONG',
    dahuy: 'ĐÃ HUỶ (không tính vào số liệu)'
  };
  const n = loc().length;
  let h = '';
  if (L.the === 'dahuy') h += '<div class="dangLoc" style="background:#F1F5F9;border-color:#CBD5E1">' +
    '<b style="color:#475569">Đang xem PHIẾU ĐÃ HUỶ</b><span>' + n + ' phiếu · không tính vào số liệu</span>' +
    '<button class="bo" data-boloc="1">✕ Về danh sách việc</button></div>';
  /* Dải "Đang lọc" phải kể ĐỦ mọi bộ lọc đang bật, kể cả cái không có nút trên
     màn to (chip "Của tôi" bị ẩn từ 901px trở lên) — nếu không thì người dùng
     nhìn số 9 mà danh sách rỗng, tưởng web hỏng. */
  /* ============================================================
     DẢI "ĐANG LỌC" PHẢI KỂ ĐỦ MỌI ĐƯỜNG LỌC (21/09 — Trường: "bấm vào từng
     dòng để xem thì ấn bỏ lọc kiểu gì... mâu thuẫn cách dùng").
     Bấm một dòng trong biểu đồ "Lỗi hay lặp lại" là đặt L.nhom, nhưng dải này
     trước đây chỉ kể thẻ, chip, cơ sở, gian và mã radar — nên danh sách bị lọc
     mà KHÔNG có dòng nào báo, cũng không có nút thoát. Người dùng tưởng web
     mất phiếu. Giờ mọi đường lọc đều có mặt, và mỗi cái có dấu ✕ riêng để bỏ
     đúng cái đó thay vì phải xoá sạch rồi lọc lại từ đầu.
     ============================================================ */
  const dangBat = [];
  const them = (khoa, chu) => dangBat.push({ khoa: khoa, chu: chu });
  if (L.ma && L.ma.length) them('ma', '🔎 ' + L.ma.length + ' PHIẾU RADAR CHỈ RA (mọi tháng)');
  if (L.gian) them('gian', 'GIAN ' + String(tenGianHang(L.gian) || '').toUpperCase());
  if (L.the && TEN_THE[L.the]) them('the', TEN_THE[L.the]);
  if (L.chip === 'toi' && laTho()) them('chip', 'CHỈ VIỆC CỦA TÔI');
  if (L.coSo) them('coSo', tenCoSo(L.coSo).toUpperCase());
  if (L.nhom) them('nhom', 'NHÓM: ' + String(NHOM_LOI[L.nhom] || L.nhom).toUpperCase());
  if (L.mucDo) them('mucDo', 'MỨC ĐỘ: ' + String((MUC_DO[L.mucDo] || {}).ten || L.mucDo).toUpperCase());
  if (L.tho) them('tho', 'KỸ THUẬT: ' + String(L.tho).toUpperCase());
  if (L.tt) them('tt', 'TRẠNG THÁI: ' + String((TT[L.tt] || {}).ten || L.tt).toUpperCase());
  if (L.vuong) them('vuong', 'ĐANG VƯỚNG: ' + String((VUONG[L.vuong] || {}).ten || L.vuong).toUpperCase());
  if (L.tim) them('tim', 'TÌM: ' + L.tim.toUpperCase());
  if (dangBat.length && L.the !== 'dahuy') {
    h += '<div class="dangLoc"><b>Đang lọc</b>' +
      '<div class="dlChip">' + dangBat.map(x =>
        '<span class="dlO">' + esc(x.chu) +
        '<button data-bo1="' + x.khoa + '" title="Bỏ lọc này">✕</button></span>').join('') + '</div>' +
      '<span>' + n + ' việc</span>' +
      '<button class="bo" data-boloc="1">✕ Bỏ hết lọc</button></div>';
  }
  /* số trên chip cũng phải BỎ phiếu đã huỷ, không thì "Tất cả 4" mà danh sách chỉ 3 dòng */
  const chuaHuy = phieuThat().filter(trongThang);
  /* BỎ CHIP TRÙNG THẺ (10/09). "Tất cả" cũng bỏ: hàng thẻ đã có ô Tổng, và khi
     đang lọc thì có sẵn dải "✕ Bỏ lọc, xem tất cả" — không bị kẹt. Riêng vai
     kỹ thuật, chip "Của tôi" trùng cả tab 🔧 Của tôi ở thanh dưới nên bỏ luôn. */
  const daCoThe = k => THE_DANG.indexOf(k) >= 0;
  /* ============================================================
     QUẢN LÝ TRÊN ĐIỆN THOẠI: KHÔNG VẼ HÀNG CHIP NỮA (10/09 — Trường:
     "tóm phần lọc lên đó luôn, lược bớt mấy phễu lọc khác").
     Mọi thứ trong hàng chip đã gộp vào ô ⚙ LỌC ở tầng thẻ: Quá hạn · 💬 Trao
     đổi · Xong · Đã huỷ + 6 ô chọn + Xuất Excel. Bỏ được cả một tầng, thẻ
     phiếu đầu tiên lên trong màn.
     Máy tính (≥901px) vẫn vẽ như cũ: màn rộng, có chỗ, và quản lý ngồi máy
     tính thì bấm chip nhanh hơn mở bảng.
     ============================================================ */
  const gonDT = laQuanLy() && !matchMedia('(min-width:901px)').matches;
  h += '<div class="chipLoc chiDT' + (gonDT ? ' an' : '') + '">' +
    /* CHỈ bỏ khi TRÙNG ĐÚNG KHOÁ. Thẻ "Việc của tôi quá hạn" (toitre) và thẻ
       "Kỹ thuật trễ hẹn" (trehen) KHÁC nghĩa với chip "Quá hạn" — cái kia chỉ
       việc của mình / theo ngày tự hẹn, cái này là cả danh sách. Nên giữ chip,
       chỉ ghi rõ thêm cho khỏi tưởng trùng. */
    '<button data-the="quahan" class="' + (L.the === 'quahan' ? 'on' : '') + '">Quá hạn' +
      (daCoThe('toitre') || daCoThe('trehen') ? ' cả team' : '') + '</button>' +
    (daCoThe('chuanhan') ? '' :
      '<button data-the="chuanhan" class="' + (L.the === 'chuanhan' ? 'on' : '') + '">Chưa nhận</button>') +
    (daCoThe('chocht') ? '' :
      '<button data-the="chocht" class="' + (L.the === 'chocht' ? 'on' : '') + '">Chờ CHT</button>') +
    /* chip 💬 chỉ hiện khi tháng này có phiếu đang trao đổi thật */
    (function () {
      const co = chuaHuy.filter(p => (!laCoSo() || p.coSoId === D.nguoi.coSoId) && (!L.coSo || p.coSoId === L.coSo) && soTinChat(p.id) > 0).length;
      return co ? '<button data-the="traodoi" class="' + (L.the === 'traodoi' ? 'on' : '') + '">💬 Trao đổi <i>' + co + '</i></button>' : '';
    })() +
    (daCoThe('daduyet') ? '' :
      '<button data-the="xong" class="' + (L.the === 'xong' ? 'on' : '') + '">Xong</button>') +
    /* ô "Đã huỷ" chỉ hiện khi tháng này thật sự có phiếu bị huỷ — không có thì đừng bày ra cho rối */
    (soDaHuy() ? '<button data-the="dahuy" class="' + (L.the === 'dahuy' ? 'on' : '') + '">Đã huỷ <i>' + soDaHuy() + '</i></button>' : '') +
    /* nút nhỏ cạnh dãy ô chọn: bung/gập tại chỗ (đường riêng, 20/09) */
    '<button class="nutLocThem" data-locbung="1">⚙ Lọc thêm' + (['coSo','mucDo','tho','tt','vuong','nhom'].filter(k => L[k]).length ? ' (' + ['coSo','mucDo','tho','tt','vuong','nhom'].filter(k => L[k]).length + ')' : '') + '</button></div>';

  const sel = (id, ten, ds, gt) => '<select data-loc="' + id + '"><option value="">' + ten + ': tất cả</option>' +
    ds.map(x => '<option value="' + esc(x[0]) + '"' + (gt === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>';

  /* coSo KHÔNG tính vào đây: nó đã có thanh chip riêng ở trên, bấm 1 cơ sở mà tự bung
     6 ô dropdown ra thì vừa rối vừa đẩy danh sách xuống dưới màn. */
  const soLocDangBat = ['mucDo', 'tho', 'tt', 'vuong', 'nhom'].filter(k => L[k]).length;
  /* ============================================================
     BỎ HÀNG SẮP XẾP TRÊN MÁY TÍNH (03/10 — Trường chốt).
     "bỏ luôn vì đã có các thanh kpi bên trên rồi, cần gì ấn vào là danh sách
     và biểu đồ tự lọc" — đúng: 10 thẻ KPI đã là đường vào cho mọi nhóm việc
     cần nhìn (quá hạn, chưa nhận, chờ CHT…), bấm thẻ là danh sách lọc ngay.
     Điện thoại GIỮ NGUYÊN: ở đó không có bảng, không có thẻ KPI bấm được đầy
     đủ, nút này là đường duy nhất để đổi thứ tự.
     Hàm sapDs và 8 kiểu sắp giữ nguyên trong mã — L.sap mặc định 'gap'.
     ============================================================ */
  if (!matchMedia('(min-width:901px)').matches)
    h += '<div class="hangSap"><button class="nutSap" data-sapmo="1">⇅ ' +
      (KIEU_SAP[L.sap || 'gap'] || KIEU_SAP.gap).ten + '<i>▾</i></button>' +
      '<span class="sapPhu">' + (KIEU_SAP[L.sap || 'gap'] || KIEU_SAP.gap).phu + '</span></div>';
  /* ============================================================
     BỎ DÃY 6 Ô LỌC VÀ NÚT XUẤT EXCEL KHỎI ĐÂY (03/10 — Trường chốt).
     Sáu ô chọn giờ thành PHỄU LỌC NGAY TRÊN TỪNG CỘT của bảng — lọc đúng chỗ
     đang nhìn, không phải ngước lên dãy ô ở trên rồi dò xem ô nào ứng với cột
     nào. Nút Xuất Excel chuyển sang cột trái, vẫn dùng được.
     Giữ nguyên hàm sel và biến soLocDangBat: phễu cột dùng lại chính mấy khoá
     lọc này (L.coSo, L.mucDo, L.tho, L.tt, L.vuong, L.nhom), không đẻ ra đường
     lọc thứ hai.
     ============================================================ */
  void sel; void soLocDangBat;

  document.getElementById('locHang').outerHTML = '<section class="locHang" id="locHang" style="flex-direction:column;align-items:stretch;gap:9px">' + h + '</section>';
  veHangNut();
}

/* ============================================================
   HÀNG NÚT NGAY DƯỚI 9 THẺ (Trường chốt 08/09: "chuyển mấy cái thẻ ở ảnh 2 lên
   vị trí ở ảnh 3") — nút việc chính + ba nút Chia việc · Hiệu suất · Báo cáo
   đứng ngay trên dòng "CƠ SỞ ĐANG CÓ LỖI", không lẫn với dãy ô lọc nữa.
   Chỉ máy tính; điện thoại vẫn dùng nút ＋ nổi ở góc như cũ.
   ============================================================ */
/* ============================================================
   CỤM DƯỚI CỘT TRÁI (09/10 — Trường: "nó trống nhiều quá").
   Bản đầu em nhét vòng tiến độ, ba ô số và bảng vàng vào đây. Trường xem rồi
   chốt: "bỏ hẳn phần này và phóng to hình AI đấy lên và cả 5 câu bên dưới".
   Nên giờ chỉ còn ảnh robot IKID + 5 dòng, cỡ chữ to hẳn lên.
   Ảnh là hình riêng của IKID (chữ IKID trên ngực, trên cờ-lê, trên biển) chứ
   không mượn nhân vật của ai — dùng thoải mái.
   ikid-robot.jpg: 440px bề ngang, 55KB. Cột nở rộng 214px nên 440 là đúng gấp
   đôi, màn Retina nhìn vẫn nét. loading="lazy" để ảnh không tranh đường truyền
   với mẻ phiếu lúc mới mở web.
   ============================================================ */
function veCumCot() {
  return '<div class="cumDay">' +
    '<div class="ctAnh"><img src="ikid-robot.jpg" alt="" loading="lazy"></div>' +
    '<div class="ctKH">' +
      ['An toàn hơn', 'Ổn định hơn', 'Hiệu quả hơn', 'Luôn tiến bộ']
        .map(t => '<div class="kD"><i class="kV">✓</i><span>' + t + '</span></div>').join('') +
      /* 09/10 — dòng chân đổi lần hai: ban đầu ngôi sao, rồi logo công ty, giờ
         Trường chốt ghi người làm ra web. Bỏ luôn ô tròn, để chữ chạy thẳng
         cho nhẹ mắt. */
      /* VQT nằm NGOÀI thẻ <span> nên không dính luật ẩn khi cột thu gọn —
         thu lại vẫn thấy chữ ký, nở ra mới hiện nốt phần đuôi (09/10). */
      '<div class="kD kLogo"><b>VQT</b><span> · Khởi tạo &amp; phát triển</span></div>' +
    '</div></div>';
}

function veHangNut() {
  const el = document.getElementById('hangNut'); if (!el) return;
  /* nhãn đúng miệng từng vai — trước đây mọi vai đều thấy chữ "Giao việc cho kỹ thuật" */
  const nhan = laTho() ? '＋ Ghi việc tự phát hiện' : '＋ Báo lỗi';
  /* ============================================================
     CHUÔNG RA THANH CÔNG CỤ trên máy tính (14/09 — Trường: "phần chuông này
     trên bản pc thì chuyển nó ra thanh công cụ này cho chuyên nghiệp").
     Cái chuông tròn nhét ở góc header là kiểu điện thoại; trên màn rộng nó nhỏ
     xíu, xa tầm mắt, mà lại là chỗ đáng bấm nhất trong ngày. Giờ nó thành nút
     chữ đứng ĐẦU hàng công cụ, kèm số việc cần chú ý — và chuông tròn ở header
     tự ẩn trên máy tính để không có hai nút cùng một việc.
     ============================================================ */
  const soCY = laQuanLy() && typeof radarSoi === 'function'
    ? radarSoi().length
    : (typeof dsThongBao === 'function' ? dsThongBao().length : 0);
  const nutCY = laQuanLy()
    ? '<button class="nutMan chiPC nutCY' + (soCY ? ' co' : '') + '" data-tab="chuy">🔎 Radar' +
      (soCY ? '<i>' + soCY + '</i>' : '') + '</button>'
    : '<button class="nutMan chiPC nutCY' + (soCY ? ' co' : '') + '" data-tab="chuy">🔔 Cần chú ý' +
      (soCY ? '<i>' + soCY + '</i>' : '') + '</button>';
  /* ============================================================
     DỰNG VÀO CỘT TRÁI (03/10 — Trường chốt).
     Mấy nút này trước nằm thành hàng ngang dưới 9 thẻ. Giờ sang cột trái cho
     giống phần mềm quản lý, và quan trọng hơn: cuộn xuống vẫn bấm được.
     Giữ NGUYÊN data-* cũ (data-tab, data-chiaviec…) nên bộ bắt sự kiện không
     phải sửa một dòng nào — đổi chỗ đứng chứ không đổi cách chạy.
     Máy nào không dựng được cột trái (bản thử XEM-THU) thì quay về hàng ngang.
     ============================================================ */
  const cot = document.getElementById('cotTrai');
  const soCYhtml = soCY ? '<i>' + soCY + '</i>' : '';
  const tenCY = laQuanLy() ? 'Radar' : 'Cần chú ý';
  /* ============================================================
     BỘ ICON 3D KIM LOẠI (09/10 — Trường gửi tài liệu "IKID OMS – Đề xuất bộ
     icon kỹ thuật"). Thay emoji vì mỗi emoji là hình của một hãng, phong cách
     đá nhau: 👷 người 3D mũ vàng, 🧠 não hồng phẳng, 📊 biểu đồ nhiều màu.
     Tài liệu cấm dùng nguyên ảnh bảng concept làm icon, nên em tách từng cái
     ra khỏi nền ô caro rồi xuất riêng, nền trong suốt thật.
     Định dạng .webp: 6 icon cộng lại 17,4KB, nếu để .png là 55KB. Cloudflare
     phục vụ webp bình thường, mọi trình duyệt từ 2020 trở đi đều đọc được.
     Icon dựng bằng <img> chứ không phải nền CSS, để lúc cột thu gọn hay nở
     vẫn là một phần tử, không phải vẽ lại.
     ============================================================ */
  const ic = t => icAnh(t);
  /* 14/10: bộ mới có cái chuông nên kỹ thuật và cơ sở hết phải dùng emoji */
  const icCY = laQuanLy() ? ic('radar') : ic('av-chuong');
  if (cot) {
    el.classList.remove('hienNgang');
    el.innerHTML = '';
    cot.innerHTML =
      '<button class="ctGiao" id="nutGiao"><em>' + ic('bao-loi') + '</em><span>' + esc(nhan.replace('＋ ', '')) + '</span></button>' +
      '<button class="ctN nutCY" data-tab="chuy"><em>' + icCY + '</em><span>' + tenCY + '</span>' + soCYhtml + '</button>' +
      (laQuanLy()
        ? '<div class="ctVach"></div>' +
          '<button class="ctN" data-chiaviec="1"><em>' + ic('phan-chia') + '</em><span>Phân chia công việc</span></button>' +
          '<button class="ctN" data-hieusuat="1"><em>' + ic('hieu-suat') + '</em><span>Hiệu suất kỹ thuật</span></button>' +
          '<button class="ctN" data-tongket="1"><em>' + ic('tong-ket') + '</em><span>Tổng kết tháng</span></button>'
        : '') +
      /* "Lịch anh em" và "Lịch bận của tôi" gỡ 20/10 (Trường chốt) */
      /* "Kiểm tra đường truyền" bỏ hẳn 03/10 (Trường chốt).
         "Xuất Excel" chuyển vào menu ảnh đại diện 03/10 — cột trái để dành cho
         mấy màn mở hàng ngày, xuất file là việc thỉnh thoảng mới làm. */
      veCumCot();
    return;
  }
  el.classList.add('hienNgang');
  el.innerHTML = '<button class="nutChinh" id="nutGiao">' + nhan + '</button>' + nutCY +
    (laQuanLy() ? '<button class="nutMan chiPC" data-chiaviec="1">🧠 Phân chia công việc cho team kỹ thuật</button>' +
      '<button class="nutMan chiPC" data-hieusuat="1">👷 Hiệu suất kỹ thuật</button>' +
      /* "Báo cáo nhanh" bỏ nốt ở đây 12/10 — hàng ngang này chỉ còn chạy trên
         máy nào không dựng được cột trái, nhưng để sót thì vẫn là hai đường
         vào cho cùng một việc. Tổng kết tháng gánh hết. */
      '<button class="nutMan chiPC" data-tongket="1">📊 Tổng kết tháng</button>' : '');
}

/* ---------- bảng + thẻ ---------- */
function oMucDo(p) { const m = MUC_DO[p.mucDo] || MUC_DO.binhthuong; return '<span class="o" style="background:' + m.nen + ';color:' + m.chu + ';border-color:' + m.nen + '">' + m.ten + '</span>'; }
function oTT(p) {
  const t = TT[p.trangThai] || TT.moi;
  const tre = soNgayTre(p), sap = sapTre(p);
  let h = '<span class="o" style="background:' + t.nen + ';color:' + t.chu + ';border-color:' + t.nen + '">' + t.ten + '</span>';
  if (tre) h += '<span class="qhn" style="color:#DC2626">QUÁ HẠN ' + tre + ' NGÀY</span>';
  else if (sap >= 0) h += '<span class="qhn" style="color:#B45309">' + (sap === 0 ? 'HẠN HÔM NAY' : 'CÒN 1 NGÀY') + '</span>';
  else {
    /* XONG MUỘN (19/09 — Trường: "quá hạn rồi sau đó sửa thì tính là gì").
       Việc đã xong thì soNgayTre trả 0 nên hai dòng trên đều im — trước đây
       làm trễ 5 ngày trông y hệt làm đúng hẹn. Nhãn này giữ lại dấu vết, kèm
       lý do thợ đã ghi (di chuột vào xem). */
    const muon = typeof soNgayMuon === 'function' ? soNgayMuon(p) : 0;
    if (muon) h += '<span class="qhn" style="color:#C2410C"' +
      (p.lyDoTre ? ' title="' + esc(p.lyDoTre) + '"' : '') +
      '>XONG MUỘN ' + muon + ' NGÀY</span>';
  }
  return h;
}
function oVuong(p) {
  if (!p.dangVuong) return '<span class="trong">—</span>';
  const v = VUONG[p.dangVuong]; if (!v) return '<span class="trong">—</span>';
  return '<span class="o" style="background:' + v.nen + ';color:' + v.chu + ';border-color:' + v.nen + '">' + v.ten + '</span>';
}
function chipTho(ten) { return '<span class="chip" style="background:' + mauTho(ten) + '22;color:' + mauTho(ten) + '">' + esc(ten) + '</span>'; }
/* ============================================================
   MỖI CƠ SỞ MỘT MÀU (21/09 — Trường: "phân loại màu ở cột này").
   Trước đây 13 cơ sở dùng chung một màu hồng nên lướt bảng không phân biệt
   được, phải đọc chữ từng dòng. Màu lấy theo ID cơ sở qua một phép băm nhỏ —
   cùng một cơ sở thì LÚC NÀO CŨNG ra đúng màu đó, kể cả sau khi thêm hay xoá
   cơ sở khác; không lưu gì thêm vào kho.
   Bảng màu chọn loại nhạt-chữ-đậm để đọc vẫn rõ trên nền trắng lẫn nền tối.
   ============================================================ */
const MAU_CS = [
  ['#FCE7F3', '#9D174D'], ['#DBEAFE', '#1E40AF'], ['#DCFCE7', '#15803D'],
  ['#FEF3C7', '#92400E'], ['#EDE9FE', '#5B21B6'], ['#CFFAFE', '#155E75'],
  ['#FFE4E6', '#9F1239'], ['#ECFCCB', '#3F6212'], ['#FFEDD5', '#9A3412'],
  ['#E0E7FF', '#3730A3'], ['#D1FAE5', '#065F46'], ['#FAE8FF', '#86198F'],
  ['#FEE2E2', '#991B1B']
];
function mauCoSo(id) {
  const t = String(id || '');
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return MAU_CS[h % MAU_CS.length];
}
function oCoSo(p) {
  const t = tenCoSo(p.coSoId), g = tenGianHang(p.gianHangId);
  const m = mauCoSo(p.coSoId);
  return '<span class="o" style="background:' + m[0] + ';color:' + m[1] + ';border-color:' + m[0] + '">' + esc(t) + '</span>' +
    (g ? '<div style="font-size:10.5px;color:#94A3B8;margin-top:2px">' + esc(g) + '</div>' : '');
}
/* Thẻ điện thoại: cơ sở ▸ gian hàng đi chung MỘT ô, hai tông màu.
   Trước đây gian hàng bị cắt bỏ khỏi thẻ — kỹ thuật đến cơ sở không biết vào gian nào.
   Để chung một ô vì tách hai ô thì hàng bị tràn xuống dòng, mỗi thẻ cao thêm ~30px. */
function oNoi(p, chiGh) {
  const g = tenGianHang(p.gianHangId);
  const m = mauCoSo(p.coSoId);   /* màu định danh — cùng cơ sở là cùng màu, mắt tự cụm */
  /* Trường bắt 09/09: "tao đang bị loạn phiếu, không biết phiếu nào của cơ sở
     nào". Trước đây thẻ nằm trong nhóm thì BỎ tên cơ sở cho gọn — nhưng cuộn
     xa cái băng nhóm là mất dấu ngay. Giờ thẻ nào cũng ghi đủ CƠ SỞ ▸ GIAN HÀNG,
     trừ vai cơ sở (họ chỉ có một cơ sở, ghi thêm là thừa). */
  if (chiGh && laCoSo()) return '<span class="o noi" style="background:' + m[0] + ';border-color:' + m[0] + '">' +
    (g ? '<i style="color:' + m[1] + '">🏬 ' + esc(g) + '</i>' : '<i class="trongGh">chưa ghi gian hàng</i>') + '</span>';
  return '<span class="o noi" style="background:' + m[0] + ';border-color:' + m[0] + '">' +
    '<b style="color:' + m[1] + '">' + esc(tenNgan(tenCoSo(p.coSoId))) + '</b>' +
    (g ? '<i style="color:' + m[1] + '">▸ ' + esc(g) + '</i>' : '<i class="trongGh">▸ chưa ghi gian hàng</i>') + '</span>';
}

/* ============================================================
   THẺ VIỆC (Trường vẽ lại 30/08: "thông tin phải khoa học hơn,
   gian hàng là ưu tiên số 1" + "thu nhỏ kẻo loạn"). 4 dòng, mỗi dòng một chuyện:
   ① CHIP GIAN HÀNG (màu cơ sở; xem Tất cả thì kèm tên cơ sở) + Mở
   ② tên việc
   ③ ĐANG Ở KHÂU NÀO (một nhãn duy nhất, tên người nằm luôn trong nhãn)
      + khẩn cấp + vướng | bên phải: HẠN TỰ TÍNH ("còn 3 ngày", "TRỄ HẸN 5 NGÀY")
   ④ dòng mờ: mã · ngày báo · mốc hẹn/xong + 💬 📷
   Gộp chỗ trùng để thẻ gọn: bỏ dòng "chờ kỹ thuật nhận" (nhãn nói rồi),
   bỏ avatar tròn (tên trong nhãn), "Bình thường" vẫn ẩn như chốt cũ. */
function oKhau(p) {
  const o = (nen, chu, text) => '<span class="o" style="background:' + nen + ';color:' + chu + ';border-color:' + nen + '">' + text + '</span>';
  if (p.trangThai === 'huy') return o('#F1F5F9', '#64748B', 'ĐÃ HUỶ');
  if (p.trangThai === 'nghiemthu') return o('#DCFCE7', '#166534', '✓ ĐÃ NGHIỆM THU');
  if (p.trangThai === 'hoanthanh') return o('#FFEDD5', '#C2410C', '⏳ CHỜ CHT NGHIỆM THU');
  /* ĐÃ CÓ TÊN THÌ NÓI TÊN, XÉT TRƯỚC (vá 11/09).
     Từ bản này chuaAiNhan() gồm cả phiếu đã giao đích danh (chưa ai bấm nhận),
     nên nếu để dòng "CHƯA AI NHẬN" đứng trước thì nó nuốt mất nhãn 📌 —
     phiếu của cơ sở có kỹ thuật phụ trách sẽ không cho biết đã giao cho ai.
     Bài test giao việc bắt được đúng chỗ này. */
  if (duocGiao(p)) {
    const nh = (p.nguoiGiao || []);
    if (nh.length > 1) return o('#E0E7FF', '#4338CA',
      '📌 GIAO CHO ' + nh.length + ' NGƯỜI — CHỜ NHẬN');
    return o('#E0E7FF', '#4338CA', '📌 GIAO CHO ' + esc(String(p.nguoiNhanKt || nh[0] || '').toUpperCase()) + ' — CHỜ NHẬN');
  }
  if (chuaAiNhan(p)) return o('#FEE2E2', '#B91C1C', '⚠ CHƯA AI NHẬN');
  const ai = (p.nguoiSua || []).length ? p.nguoiSua.join(', ') : (p.nguoiNhanKt || '');
  return o('#DBEAFE', '#1D4ED8', '🔧 ' + esc(ai.toUpperCase()) + ' ĐANG SỬA');
}
function oHanThe(p) {
  if (p.trangThai === 'nghiemthu' || p.trangThai === 'huy') return '';
  if (p.trangThai === 'hoanthanh') {
    const d = p.ngayXong ? Math.max(0, Math.floor((HOM_NAY() - p.ngayXong) / NGAY)) : 0;
    return '<span class="hanThe" style="color:#C2410C">' + (d ? 'chờ duyệt ' + d + ' ngày' : 'chờ CHT duyệt') + '</span>';
  }
  const tre = soNgayTre(p), sap = sapTre(p);
  if (tre) return '<span class="hanThe" style="color:#DC2626">⚠ ' + (chuaAiNhan(p) ? 'QUÁ HẠN ' : 'TRỄ HẸN ') + tre + ' NGÀY</span>';
  if (sap >= 0) return '<span class="hanThe" style="color:#B45309">⏱ ' + (sap === 0 ? 'HẠN HÔM NAY' : 'CÒN 1 NGÀY') + '</span>';
  const moc = p.duKien || p.mongMuon;
  if (moc) {
    const d = Math.round((moc - HOM_NAY()) / NGAY);
    if (d > 0) return '<span class="hanThe" style="color:#B45309">⏱ còn ' + d + ' ngày</span>';
  }
  return '';
}
/* "2 phút trước" cho dòng tin mới trong màn Cần chú ý (08/09) */
function truocDay(t) {
  if (!t) return '';
  const ph = Math.round((Date.now() - t) / 60000);
  if (ph < 1) return 'vừa xong';
  if (ph < 60) return ph + ' phút trước';
  if (ph < 1440) return Math.round(ph / 60) + ' giờ trước';
  if (ph < 2880) return 'hôm qua';
  return dd(t);
}
/* "báo 2 giờ trước" cho việc mới trong ngày — tươi hơn con số 30/08 khô khan */
function baoLuc(t) {
  if (!t) return '';
  const ph = Math.round((Date.now() - t) / 60000);
  if (ph < 60) return 'báo ' + Math.max(1, ph) + ' phút trước';
  if (ph < 720) return 'báo ' + Math.round(ph / 60) + ' giờ trước';
  return 'báo ' + dd(t);
}
/* ============================================================
   DẤU HIỆU "MÌNH VỪA VÀO PHIẾU NÀY" (10/09 — Trường: "ấn vào một phiếu rồi
   thoát ra thì làm sao biết mình vừa vào phiếu nào, khá là loạn").
   Cách các bên làm: Jira/Linear/Notion có dải "Recently viewed" ở đầu;
   Gmail phân biệt đã đọc bằng độ đậm. Ở đây làm hai lớp:
     ① dải VỪA XEM ở đầu danh sách — 6 phiếu gần nhất, bấm là mở lại
     ② nhãn 👣 trên từng thẻ đã vào trong 24 giờ, ghi rõ "vừa xem / 12 phút";
        thẻ mới vào gần nhất có viền tím để nhìn một cái là thấy
   ============================================================ */
function vuaXem(id) {
  const t = (typeof lucVao === 'function') ? lucVao(id) : 0;
  if (!t || Date.now() - t > 86400000) return 0;       /* quá 24 giờ thì thôi */
  return t;
}
function idVaoGanNhat() {
  const m = (typeof mocVao === 'function') ? mocVao() : {};
  let id = '', t = 0;
  Object.keys(m).forEach(k => { if (m[k] > t) { t = m[k]; id = k; } });
  return (t && Date.now() - t <= 86400000) ? id : '';
}
function theViec(p, trongNhom) {
  const tre = soNgayTre(p), sap = sapTre(p);
  const tVao = vuaXem(p.id);
  const moiNhat = tVao && p.id === idVaoGanNhat();
  const nhanVao = tVao
    ? '<span class="daVao' + (moiNhat ? ' dv1' : '') + '">👣 ' +
      (moiNhat ? 'vừa mở' : truocDay(tVao).replace('vừa xong', 'vừa xem')) + '</span>' : '';
  const soAnh = (p.anhTruoc || []).length + (p.anhSau || []).length;
  const tinTong = soTinChat(p.id), tinMoi = tinChuaDoc(p.id);
  const oTin = tinMoi ? '<span class="tinmoi">💬 ' + tinMoi + ' tin mới</span>'
    : (tinTong ? '<span class="anhso">💬 ' + tinTong + '</span>' : '');
  /* chip gian hàng LUÔN có mặt — trong nhóm thì chỉ gian hàng, xem trộn thì kèm cơ sở */
  const chip = trongNhom ? oNoi(p, true) : oNoi(p);
  /* cả thẻ đổi dáng khi có tin chưa đọc (24/09) — nhãn 💬 nằm lẫn giữa các
     chip khác nên lướt nhanh dễ trượt mắt; viền trái + chấm đỏ thì không */
  return '<button class="vc ' + (tre ? 'qh' : (sap >= 0 ? 'sap' : '')) +
    (tinMoi ? ' coTin' : '') +
    (tVao ? (moiNhat ? ' vaoMoi' : ' daVaoThe') : '') + '" data-id="' + esc(p.id) + '">' +
    '<div class="r0">' + chip + '<span class="mo">Mở<i>›</i></span></div>' +
    '<div class="r1"><span class="tt">' + esc(p.noiDung) + '</span></div>' +
    '<div class="r2">' + oKhau(p) +
    (p.mucDo && p.mucDo !== 'binhthuong' ? oMucDo(p) : '') +
    oVuong(p).replace('<span class="trong">—</span>', '') + oHanThe(p) + '</div>' +
    '<div class="r3">' + esc(p.id.replace('KT-', '#')) + ' · ' + baoLuc(p.ngayBao) +
    (p.trangThai === 'tiepnhan' && p.duKien ? ' · hẹn ' + dd(p.duKien) : (p.mongMuon ? ' · muốn xong ' + dd(p.mongMuon) : '')) +
    /* VÁ 10/09: thẻ dùng dd() nên mất GIỜ báo xong — trong khi bảng máy tính và
       màn Chú ý đều dùng ddGio(). Bài test "giờ" bắt được. Dữ liệu cũ 00:00 thì
       ddGio tự giấu giờ, nên không sợ hiện "00:00" vô nghĩa. */
    (p.ngayXong ? ' · xong ' + ddGio(p.ngayXong) : '') +
    oTin + (soAnh ? '<span class="anhso">📷 ' + soAnh + '</span>' : '') + nhanVao + '</div></button>';
}

/* Gom việc theo gian hàng — chỉ dùng khi đã biết chắc đang xem 1 cơ sở.
   Gian hàng có việc quá hạn nổi lên trước và tô đỏ. */
function theTheoGianHang(ds) {
  const nh = [], idx = {};
  ds.forEach(p => {
    const k = p.gianHangId || '';
    if (idx[k] === undefined) { idx[k] = nh.length; nh.push({ k: k, ten: tenGianHang(k) || 'Chưa ghi gian hàng', ds: [] }); }
    nh[idx[k]].ds.push(p);
  });
  const demTre = g => g.ds.filter(p => soNgayTre(p) > 0).length;
  /* đang sắp "Gấp trước" thì cơ sở nào cháy nhất lên đầu; các kiểu khác giữ
     đúng thứ tự phiếu đã sắp, khỏi phá ý người dùng (09/09) */
  if ((L.sap || 'gap') === 'gap')
    nh.sort((a, b) => (demTre(b) - demTre(a)) || (b.ds.length - a.ds.length) ||
      String(a.ten).localeCompare(String(b.ten), 'vi'));
  return nh.map(g => {
    const tre = demTre(g);
    return '<div class="nhGh' + (tre ? ' do' : '') + '" data-gh="' + esc(g.k) + '">🏬 ' + esc(g.ten) +
      '<span>' + g.ds.length + ' việc' + (tre ? ' · ' + tre + ' quá hạn' : '') + '</span></div>' +
      g.ds.map(p => theViec(p, true)).join('');
  }).join('');
}

/* ============================================================
   GOM THEO CƠ SỞ (Trường 30/08: "nhìn danh sách rối, khó phân biệt cơ sở").
   Admin/kỹ thuật xem Tất cả là 12 cơ sở trộn lẫn, chip màu lặp trên từng thẻ.
   Gom lại: tên cơ sở hiện MỘT lần làm tiêu đề nhóm (đúng màu định danh),
   thẻ bên trong chỉ còn gian hàng. Cơ sở nhiều việc quá hạn nổi lên đầu.
   Bấm tiêu đề = lọc riêng cơ sở đó (đường lọc data-coso có sẵn).
   ============================================================ */
function theTheoCoSo(ds) {
  const nh = [], idx = {};
  ds.forEach(p => {
    const k = p.coSoId || '';
    if (idx[k] === undefined) { idx[k] = nh.length; nh.push({ k: k, ten: tenCoSo(k), ds: [] }); }
    nh[idx[k]].ds.push(p);
  });
  const demTre = g => g.ds.filter(p => soNgayTre(p) > 0).length;
  /* đang sắp "Gấp trước" thì cơ sở nào cháy nhất lên đầu; các kiểu khác giữ
     đúng thứ tự phiếu đã sắp, khỏi phá ý người dùng (09/09) */
  if ((L.sap || 'gap') === 'gap')
    nh.sort((a, b) => (demTre(b) - demTre(a)) || (b.ds.length - a.ds.length) ||
      String(a.ten).localeCompare(String(b.ten), 'vi'));
  return nh.map(g => {
    const tre = demTre(g), m = mauCoSo(g.k);
    return '<button class="nhCs" data-coso="' + esc(g.k) + '" style="background:' + m[0] + '">' +
      '<b style="color:' + m[1] + '">🏢 ' + esc(tenNgan(g.ten)) + '</b>' +
      '<span>' + g.ds.length + ' việc' + (tre ? ' · <i>' + tre + ' quá hạn</i>' : '') + '</span>' +
      '<em style="color:' + m[1] + '">›</em></button>' +
      g.ds.map(p => theViec(p, 'cs')).join('');
  }).join('');
}

/* ============================================================
   MENU PHỄU LỌC CỦA MỘT CỘT (03/10).
   Thả xuống ngay dưới nút ▾, dùng position:fixed theo toạ độ nút — khung bảng
   có overflow:auto, menu đặt bên trong sẽ bị cắt mất nửa dưới.
   ============================================================ */
const PHE_TEN = { coSo: 'Cơ sở', mucDo: 'Mức độ', tho: 'Người nhận', tt: 'Trạng thái', vuong: 'Đang vướng', nhom: 'Nhóm lỗi' };
function pheChon(k) {
  if (k === 'coSo') return D.cosos.map(c => [c.id, c.ten]);
  if (k === 'mucDo') return Object.keys(MUC_DO).map(x => [x, MUC_DO[x].ten]);
  if (k === 'tho') return dsTho().map(t => [t.ten, t.ten]);
  if (k === 'tt') return Object.keys(TT).map(x => [x, TT[x].ten]);
  if (k === 'vuong') return Object.keys(VUONG).map(x => [x, VUONG[x].ten]);
  if (k === 'nhom') return Object.keys(NHOM_LOI).map(x => [x, NHOM_LOI[x]]);
  return [];
}
function dongPheu() { const o = document.getElementById('pheMenu'); if (o) o.remove(); }
function moPheu(k, nut) {
  dongPheu();
  const r = nut.getBoundingClientRect();
  const ds = pheChon(k);
  /* đếm sẵn mỗi lựa chọn còn bao nhiêu việc — chọn xong ra 0 dòng thì bực */
  const nen = phieuThat().filter(trongThang).filter(p => !laCoSo() || p.coSoId === (D.nguoi || {}).coSoId);
  const demCua = gt => nen.filter(p => {
    if (k === 'coSo') return p.coSoId === gt;
    if (k === 'mucDo') return p.mucDo === gt;
    if (k === 'tho') return p.nguoiNhanKt === gt || (p.nguoiSua || []).includes(gt);
    if (k === 'tt') return p.trangThai === gt;
    if (k === 'vuong') return p.dangVuong === gt;
    if (k === 'nhom') return (p.nhomLoi || 'khac') === gt;
    return false;
  }).length;
  const o = document.createElement('div');
  o.id = 'pheMenu';
  o.className = 'pheMenu';
  o.innerHTML = '<div class="pheDau">' + esc(PHE_TEN[k] || '') + '</div>' +
    '<button class="pheD' + (L[k] ? '' : ' on') + '" data-phechon="' + k + '" data-gt="">Tất cả</button>' +
    ds.map(x => {
      const n = demCua(x[0]);
      return '<button class="pheD' + (L[k] === x[0] ? ' on' : '') + (n ? '' : ' khong') +
        '" data-phechon="' + k + '" data-gt="' + esc(x[0]) + '">' + esc(x[1]) +
        '<i>' + n + '</i></button>';
    }).join('');
  document.body.appendChild(o);
  /* tràn mép phải thì kéo vào trong cho đủ chỗ */
  const rong = 216;
  o.style.left = Math.max(8, Math.min(r.left, window.innerWidth - rong - 10)) + 'px';
  o.style.top = Math.min(r.bottom + 4, window.innerHeight - 40) + 'px';
}
document.addEventListener('click', e => {
  if (!e.target.closest('#pheMenu') && !e.target.closest('.phe')) dongPheu();
}, true);

/* ============================================================
   BẢNG TỰ ĂN HẾT CHỖ CÒN LẠI (03/10 — Trường: "khoảng trống bên dưới vẫn còn
   trống khá nhiều").
   Trước đây chiều cao bảng là một công thức cố định trong CSS: 100vh trừ 210px.
   Nó đúng lúc mới mở trang, nhưng sai ngay khi cuộn xuống — thanh trên, hàng
   thẻ và ba biểu đồ trôi lên khỏi màn, chỗ trống nhiều hơn hẳn mà bảng vẫn
   giữ nguyên chiều cao, để thừa cả một dải trống dưới đáy.
   Giờ đo thật: lấy đáy màn hình trừ đi đỉnh bảng, trừ một chút lề. Gọi lại mỗi
   khi cuộn, đổi cỡ cửa sổ, hoặc vẽ lại danh sách.
   requestAnimationFrame để không tính lại hàng trăm lần trong một cú cuộn.
   ============================================================ */
let CAO_BANG_CHO = 0;
function chinhCaoBang() {
  if (CAO_BANG_CHO) return;
  CAO_BANG_CHO = requestAnimationFrame(() => {
    CAO_BANG_CHO = 0;
    const k = document.querySelector('.soBang');
    if (!k || !matchMedia('(min-width:901px)').matches) return;
    const dinh = k.getBoundingClientRect().top;
    /* 16px chừa cho phần đếm trang nằm ngay dưới bảng */
    const con = Math.round(window.innerHeight - dinh - 16);
    /* phải gỡ min-height của CSS: nó to hơn max-height thì min thắng, bảng
       tràn xuống dưới đáy màn — bắt được lúc chạy thử 03/10 */
    k.style.minHeight = '0';
    /* sàn 240px thôi: lúc chưa cuộn, bảng nằm dưới ba biểu đồ nên chỗ còn ít —
       để sàn cao thì bảng thò xuống dưới đáy màn. Cuộn xuống là nó tự cao lên. */
    k.style.maxHeight = Math.max(240, con) + 'px';
  });
}
/* NGHE CUỘN TRÊN CẢ body LẪN window (03/10): trang này cuộn ở <body> chứ không
   phải ở cửa sổ, mà sự kiện scroll không nổi bọt — chỉ nghe window thì không
   bao giờ nhận được, bảng đứng nguyên chiều cao lúc mới mở. */
window.addEventListener('scroll', chinhCaoBang, { passive: true });
document.addEventListener('scroll', chinhCaoBang, { passive: true, capture: true });
window.addEventListener('resize', chinhCaoBang);

/* ============================================================
   THANH TAB DƯỚI THÒ THỤT THEO CUỘN (19/10 — Trường: "làm sao để nó không
   lúc nào cũng hiện mãi ở đây").
   Cuộn xuống → thụt; vuốt lên hoặc dừng tay 1,4 giây → thò ra.
   Ngưỡng 8px để tay run hay cuộn đà không làm thanh nhấp nháy.
   Dưới 60px tính từ đầu trang thì luôn hiện — chỗ đó vừa mở web ra, ẩn
   thanh đi là người ta tưởng mất nút.
   ĐO VỊ TRÍ CUỘN Ở BA CHỖ rồi lấy số lớn nhất: trang này cuộn ở <body>,
   nhưng máy khác có thể cuộn ở <html> hoặc ở cửa sổ. Đo một chỗ thì có máy
   ra 0 suốt, thanh đứng im — đúng cái bẫy đã dính khi làm bảng tự đo.
   ============================================================ */
let TAB_TRUOC = 0, TAB_HEN = 0;
function tabTheoCuon(e) {
  if (matchMedia('(min-width:901px)').matches) return;   /* máy tính không có thanh này */
  /* Bỏ qua cuộn bên trong ngăn chi tiết / tấm trượt / bảng. Nghe ở tầng capture
     nên mọi hộp con cuộn cũng gọi vào đây — không lọc thì đóng ngăn ra thanh
     tab đang thụt dở, trông như mất nút. */
  if (e && e.target && e.target !== document && e.target !== document.body
      && e.target !== document.documentElement) return;
  const y = Math.max(document.body.scrollTop || 0, document.documentElement.scrollTop || 0,
    (document.scrollingElement && document.scrollingElement.scrollTop) || 0, window.scrollY || 0);
  const b = document.body;
  if (y < 60) b.classList.remove('tabAn');
  else if (y > TAB_TRUOC + 8) b.classList.add('tabAn');
  else if (y < TAB_TRUOC - 8) b.classList.remove('tabAn');
  TAB_TRUOC = y;
  clearTimeout(TAB_HEN);
  TAB_HEN = setTimeout(() => b.classList.remove('tabAn'), 1400);
}
window.addEventListener('scroll', tabTheoCuon, { passive: true });
document.addEventListener('scroll', tabTheoCuon, { passive: true, capture: true });

/* dải VỪA XEM — 6 phiếu mở gần nhất còn trong 24 giờ, bấm là mở lại ngay */
function daiVuaXem() {
  const m = (typeof mocVao === 'function') ? mocVao() : {};
  const nay = Date.now();
  const ds = Object.keys(m)
    .filter(id => nay - m[id] <= 86400000 && phieu(id))
    .sort((a, b) => m[b] - m[a]).slice(0, 6);
  if (ds.length < 2) return '';        /* mới vào 1 phiếu thì chưa cần dải */
  return '<div class="daiVX"><span class="vxNhan">👣 VỪA XEM</span>' +
    ds.map(id => {
      const p = phieu(id);
      return '<button class="vxO" data-id="' + esc(id) + '" title="' + esc(p.noiDung) + '">' +
        '<b>' + esc(id.replace('KT-', '#')) + '</b>' +
        '<span>' + esc(tenNgan(tenCoSo(p.coSoId)) || '') + '</span>' +
        '<i>' + truocDay(m[id]).replace('vừa xong', 'vừa xem') + '</i></button>';
    }).join('') + '</div>';
}
function veDanhSach() {
  let ds = sapDs(loc());
  /* phiếu có tin CHƯA ĐỌC nổi lên đầu (Trường duyệt 30/08) — chỉ khi đang sắp
     "Gấp trước"; các kiểu sắp khác thì giữ đúng thứ tự người dùng chọn */
  if (L.the !== 'traodoi' && (L.sap || 'gap') === 'gap')
    ds.sort((a, b) => (tinChuaDoc(b.id) ? 1 : 0) - (tinChuaDoc(a.id) ? 1 : 0));
  const tong = ds.length;
  const tuTrang = ds.slice((L.trang - 1) * L.moiTrang, L.trang * L.moiTrang);
  const el = document.getElementById('dsHang');

  if (!tong) {
    el.innerHTML = '<div class="rong"><b>Không có việc nào</b>' +
      (L.the || L.coSo || L.tim ? 'Thử bỏ lọc để xem tất cả.' : 'Bấm ＋ để giao việc cho kỹ thuật.') + '</div>';
    return;
  }

  /* bảng máy tính */
  /* ============================================================
     BỀ NGANG TỪNG CỘT (14/09 — Trường: "kéo cột nội dung sửa chữa to ra, phần
     cửa hàng trưởng xác nhận thu nhỏ lại").
     Trước đây không cột nào có width nên trình duyệt tự chia theo chữ dài nhất:
     cột nội dung — thứ người ta đọc đầu tiên — bị bóp còn 3 dòng, trong khi cột
     "CHT xác nhận" chỉ chứa một dấu — lại chiếm chỗ bằng nó.
     table-layout:fixed ở CSS bắt trình duyệt theo đúng các số dưới đây.
     ============================================================ */
  /* ============================================================
     BẢNG VỪA MỘT MÀN HÌNH + PHỄU LỌC TRÊN TỪNG CỘT (03/10 — Trường chốt).
     ① Bề ngang: tổng cũ 1592px trong khi màn thường chỉ 1536px, lúc nào cũng
        phải kéo ngang mới thấy cột Chi phí với CHT. Giờ bóp còn ~1416px —
        cột Nội dung chịu phần lớn (374→320) vì nó cho xuống dòng được, mấy
        cột ngày tháng thì không bóp thêm được nữa (chữ "18/09" đã sát).
     ② Mỗi cột lọc được có nút ▾ ngay trên tiêu đề, thay cho dãy 6 ô lọc đã bỏ.
        Dùng đúng mấy khoá lọc cũ (L.coSo, L.mucDo…) nên không đẻ đường lọc mới.
     ============================================================ */
  const phe = k => '<button class="phe' + (L[k] ? ' on' : '') + '" data-phe="' + k + '" title="Lọc cột này">▾</button>';
  /* cột # phải đủ 36px: bóp còn 30px thì số hai chữ số (10, 11…) bị cắt mất
     nửa chữ — bắt được khi soát 03/10 */
  /* Bề ngang cột tính từ chữ dài nhất có thể gặp, đo thật ở cỡ 11px (03/10):
     "Bình thường" 66px, "Đã nghiệm thu" 77px, "Chờ nhà thầu" 70px — cộng lề
     chip và lề ô ra con số dưới đây. Cột Nội dung nhường 38px cho mấy cột đó,
     vì nó là cột duy nhất xuống dòng thoải mái được. */
  const th = '<tr><th style="width:36px">#</th>' +
    '<th style="width:282px">Nội dung sửa chữa' + phe('nhom') + '</th>' +
    '<th style="width:120px">Gian hàng' + phe('coSo') + '</th>' +
    '<th style="width:92px">Mức độ' + phe('mucDo') + '</th>' +
    '<th style="width:74px">Ngày báo</th><th style="width:86px">Mong xong<small>cơ sở điền</small></th>' +
    '<th style="width:100px">Người nhận' + phe('tho') + '</th>' +
    '<th style="width:86px">Dự kiến xong<small>kỹ thuật điền</small></th>' +
    '<th style="width:104px">Trạng thái' + phe('tt') + '</th>' +
    '<th style="width:96px">Đang vướng' + phe('vuong') + '</th>' +
    '<th style="width:80px">Ngày xong</th><th style="width:100px">Người sửa</th>' +
    '<th style="width:60px">CHT<small>xác nhận</small></th><th style="width:94px">Chi phí</th></tr>';
    /* cột mũi tên › cuối bảng bỏ 03/10 (Trường chốt): bấm chỗ nào trong dòng
       cũng mở được phiếu rồi, nó chỉ là dấu trang trí. 30px thu được chia cho
       cột Người sửa, CHT và Chi phí. */
  const rows = tuTrang.map((p, i) => {
    const tre = soNgayTre(p), sap = sapTre(p);
    const tinMoiH = tinChuaDoc(p.id);
    return '<tr data-id="' + esc(p.id) + '" class="' + (tre ? 'qh' : (sap >= 0 ? 'sap' : '')) +
      (tinMoiH ? ' coTin' : '') + '">' +
      '<td class="stt">' + ((L.trang - 1) * L.moiTrang + i + 1) + '</td>' +
      '<td class="nd">' + esc(p.noiDung) +
      (tinChuaDoc(p.id) ? ' <span class="tinmoi">💬 ' + tinChuaDoc(p.id) + ' mới</span>'
        : (soTinChat(p.id) ? ' <span style="color:#94A3B8;font-weight:400;font-size:11px">💬 ' + soTinChat(p.id) + '</span>' : '')) +
      '<div style="font-size:10.5px;color:#94A3B8;font-weight:400">' + esc(p.id) + ' · ' + esc(NHOM_LOI[p.nhomLoi] || '') + '</div></td>' +
      '<td>' + oCoSo(p) + '</td>' +
      '<td>' + oMucDo(p) + '</td>' +
      '<td class="ngay">' + dd(p.ngayBao) + '</td>' +
      '<td class="ngay">' + (p.mongMuon ? dd(p.mongMuon) : '<span class="trong">—</span>') + '</td>' +
      '<td>' + (p.nguoiNhanKt ? chipTho(p.nguoiNhanKt) : '<span class="o" style="color:#94A3B8;border-style:dashed">chưa ai nhận</span>') + '</td>' +
      '<td class="ngay" style="' + (tre ? 'color:#DC2626;font-weight:800' : (sap >= 0 ? 'color:#B45309;font-weight:800' : '')) + '">' + (p.duKien ? dd(p.duKien) : '<span class="trong">—</span>') + '</td>' +
      '<td>' + oTT(p) + '</td>' +
      '<td>' + oVuong(p) + '</td>' +
      /* ============================================================
         NGÀY XONG XUỐNG HAI DÒNG (20/09 — Trường: "phần thời gian này có thể
         cho nó xuống dòng được mà"). "18/09 11:05" dài 74px, cột 80px trừ lề
         còn 62px nên bị cắt thành "18/09 11:…". Tách ngày lên trên, giờ xuống
         dưới nhỏ và nhạt hơn — đọc được cả hai mà không cần nới cột.
         ============================================================ */
      '<td class="ngay">' + (p.ngayXong
        ? '<b class="nxNgay">' + dd(p.ngayXong) + '</b>' +
          (coGio(p.ngayXong) ? '<i class="nxGio">' + gio(p.ngayXong) + '</i>' : '')
        : '<span class="trong">—</span>') + '</td>' +
      '<td>' + ((p.nguoiSua || []).length ? p.nguoiSua.map(chipTho).join('') : '<span class="trong">—</span>') + '</td>' +
      /* cột này bị bóp còn 76px (Trường 14/09) nên chỉ để tên gọi — "Trần Thùy
         Nhung" thành "Nhung", vẫn đủ biết ai gật, di chuột vào xem tên đầy đủ */
      '<td class="ngay">' + (p.chtKetQua === 'dat' ? '<span class="o oTich" title="' + esc(p.chtNguoi) + ' · ' + ddyyGio(p.chtLuc) + '" style="background:#DCFCE7;color:#166534;border-color:#DCFCE7">✓</span>'
        : (p.trangThai === 'hoanthanh' ? '<span class="o" style="background:#FFEDD5;color:#C2410C;border-color:#FFEDD5">chờ CHT</span>'
          : (p.chtKetQua === 'chua_dat' ? '<span class="o" style="background:#FEE2E2;color:#B91C1C;border-color:#FEE2E2">chưa đạt</span>' : '<span class="trong">—</span>'))) + '</td>' +
      /* chi phí căn GIỮA như mọi cột khác (03/10 — Trường chốt); cột mũi tên ›
         bỏ hẳn, bấm chỗ nào trong dòng cũng mở được phiếu */
      '<td class="ngay">' + (p.chiPhi ? tien(p.chiPhi) + '₫' : '<span class="trong">—</span>') + '</td></tr>';
  }).join('');

  /* DẢI ⚡ CẦN LÀM NGAY cho THỢ (Trường chốt 02/09): đứng hiện trường lướt
     3 giây phải biết việc kế tiếp — khẩn cấp chưa xong + của mình quá hạn +
     chưa ai nhận, ghim đầu danh sách. Chỉ hiện ở màn "Tất cả" không lọc gì. */
  let daiNong = '', trongDai = {};
  if (laTho() && !L.the && L.chip === 'tatca' && !L.coSo && !L.tim && L.trang === 1) {
    const ten = (D.nguoi || {}).ten;
    const nong = tuTrang.filter(p => {
      if (['nghiemthu', 'huy', 'hoanthanh'].includes(p.trangThai)) return false;
      const cuaToi = p.nguoiNhanKt === ten || (p.nguoiSua || []).includes(ten);
      /* việc quản lý giao đích danh cho MÌNH mà chưa nhận → nóng (04/09) */
      return (p.mucDo === 'khancap') || (cuaToi && soNgayTre(p) > 0) || chuaAiNhan(p) ||
        (duocGiao(p) && giaoChoToi(p, ten));
    });
    if (nong.length) {
      nong.forEach(p => trongDai[p.id] = 1);
      daiNong = '<div class="nhCs daiNong">⚡ CẦN LÀM NGAY <i>' + nong.length + ' việc</i></div>' +
        nong.map(p => theViec(p, true)).join('');
    }
  }
  /* thẻ điện thoại — đang xem 1 cơ sở thì gom theo gian hàng để kỹ thuật đi một
     chuyến làm hết; xem TẤT CẢ thì gom theo cơ sở cho đỡ loạn (Trường 30/08) */
  const gomGh = !!(L.coSo || laCoSo());
  const conLai = daiNong ? tuTrang.filter(p => !trongDai[p.id]) : tuTrang;
  const the = daiNong + (gomGh ? theTheoGianHang(conLai) : theTheoCoSo(conLai));

  const soTrang = Math.ceil(tong / L.moiTrang);
  const chan = soTrang > 1 ? '<div class="chanBang">Hiện ' + ((L.trang - 1) * L.moiTrang + 1) + '–' + Math.min(L.trang * L.moiTrang, tong) + ' / ' + tong +
    '<span style="margin-left:auto;display:flex;gap:6px">' +
    '<button class="nut" data-trang="' + Math.max(1, L.trang - 1) + '">‹ Trước</button>' +
    '<button class="nut" data-trang="' + Math.min(soTrang, L.trang + 1) + '">Sau ›</button></span></div>' : '';

  /* dải 👣 VỪA XEM bỏ 03/10 (Trường chốt) — giữ hàm daiVuaXem trong mã phòng
     khi cần lại, chỉ thôi không vẽ. Bỏ nó bảng được cao thêm ~46px. */
  el.innerHTML =
    '<div class="soBang"><table class="so">' + th + rows + '</table></div><div class="dsThe">' + the + '</div>' + chan;
  /* vẽ lại xong thì đo lại chiều cao — số dòng đổi, vị trí bảng cũng đổi */
  chinhCaoBang();
}

/* ============================================================
   CHUÔNG THÔNG BÁO TRONG APP
   Không phải thông báo đẩy (đợt 2) — đây là việc cần chú ý
   tính ngay từ dữ liệu, theo vai đang dùng.
   ============================================================ */
function dsThongBao() {
  const ra = [];
  let ds = phieuThat();
  if (laCoSo()) ds = ds.filter(p => p.coSoId === D.nguoi.coSoId);
  const them = (p, loai, mau, tieu, phu) => ra.push({ p, loai, mau, tieu, phu });

  /* ============================================================
     TIN MỚI đứng đầu (Trường chốt 08/09: bỏ tab Trao đổi vì trùng danh sách —
     cái đội cần là "phiếu nào có tin mới, ai nhắn, nhắn gì", nay gom vào đây).
     ============================================================ */
  ds.forEach(p => {
    const n = tinChuaDoc(p.id);
    if (!n) return;
    const dsTin = (D.dienBien[p.id] || []).filter(t => t.loai === 'chat');
    const cuoi = dsTin[dsTin.length - 1] || {};
    let tomTin = String(cuoi.text || '').trim();
    if (!tomTin) tomTin = (cuoi.anh || []).length
      ? '🖼 ' + cuoi.anh.length + (cuoi.anh.some(u => /\.(mp4|mov|webm|m4v)/i.test(String(u))) ? ' video/ảnh' : ' ảnh')
      : 'gửi tệp';
    if (/^🎤/.test(tomTin)) tomTin = tomTin;
    if (tomTin.length > 60) tomTin = tomTin.slice(0, 60) + '…';
    them(p, 'tinmoi', '#0891B2', n + ' tin mới' + (cuoi.ten ? ' · ' + cuoi.ten : ''),
      tomTin + (cuoi.t ? ' · ' + truocDay(cuoi.t) : ''));
  });

  ds.forEach(p => {
    const tre = soNgayTre(p), sap = sapTre(p);
    const cuaToi = laTho() && (p.nguoiNhanKt === D.nguoi.ten || (p.nguoiSua || []).includes(D.nguoi.ten));

    if (laTho()) {
      if (p.chtKetQua === 'chua_dat' && p.trangThai === 'tiepnhan' && cuaToi)
        them(p, 'tralai', '#DC2626', 'CHT trả lại — chưa đạt', p.chtGhi || 'phải làm lại');
      else if (chuaAiNhan(p))
        them(p, 'chuanhan', p.mucDo === 'khancap' ? '#DC2626' : '#EA580C',
          (p.mucDo === 'khancap' ? 'Việc KHẨN CẤP chưa ai nhận' : 'Việc mới chưa ai nhận'),
          tenCoSo(p.coSoId) + ' · cơ sở mong muốn xong ' + (p.mongMuon ? dd(p.mongMuon) : 'chưa đặt'));
      else if (cuaToi && tre) them(p, 'tre', '#DC2626', 'Việc của tôi quá hạn ' + tre + ' ngày', 'hẹn xong ' + dd(p.duKien));
      else if (cuaToi && sap >= 0) them(p, 'sap', '#D97706', sap === 0 ? 'Việc của tôi hết hạn hôm nay' : 'Việc của tôi còn 1 ngày', 'hẹn xong ' + dd(p.duKien));
    } else if (laCoSo()) {
      if (choCHT(p)) them(p, 'cht', '#7C3AED', 'Chờ tôi nghiệm thu', 'kỹ thuật ' + (p.nguoiSua || []).join(', ') + ' báo xong ' + ddGio(p.ngayXong));
      else if (chuaAiNhan(p) && tre) them(p, 'chuanhan', '#EA580C', 'Kỹ thuật chưa nhận, đã quá ngày mong muốn ' + tre + ' ngày', tenGianHang(p.gianHangId) || '');
      else if (tre) them(p, 'tre', '#DC2626', 'Quá hạn ' + tre + ' ngày', (p.nguoiNhanKt || 'chưa ai nhận') + ' · hẹn ' + dd(p.duKien));
    } else {
      /* 28/09: lời xin dời hạn chờ duyệt đứng TRÊN cả việc quá hạn — kỹ thuật
         đang đứng chờ admin bấm, ngâm một ngày là hỏng kế hoạch của họ */
      if (typeof dangXinDoi === 'function' && dangXinDoi(p))
        them(p, 'xindoi', '#B45309', (p.doiXinNguoi || 'Kỹ thuật') + ' xin dời hạn — chờ tôi duyệt',
          tenCoSo(p.coSoId) + ' · ' + (p.duKien ? dd(p.duKien) : '?') + ' → ' + dd(p.doiXinNgay) +
          (p.doiXinLy ? ' · ' + p.doiXinLy : ''));
      else if (tre) them(p, 'tre', '#DC2626', 'Quá hạn ' + tre + ' ngày', tenCoSo(p.coSoId) + ' · ' + (p.nguoiNhanKt || 'chưa ai nhận'));
      else if (chuaAiNhan(p)) them(p, 'chuanhan', '#EA580C', 'Chưa ai tiếp nhận', tenCoSo(p.coSoId));
      else if (choCHT(p) && (Date.now() - p.ngayXong) > 2 * NGAY)
        them(p, 'cht', '#7C3AED', 'CHT để quá 2 ngày chưa nghiệm thu', tenCoSo(p.coSoId));
    }
  });
  const uu = { tinmoi: -1, xindoi: -0.5, tralai: 0, chuanhan: 1, tre: 2, sap: 3, cht: 4 };
  const sap2 = ra.sort((a, b) => (uu[a.loai] - uu[b.loai]) || (soNgayTre(b.p) - soNgayTre(a.p)));
  const daCo = {};
  return sap2.filter(x => { if (daCo[x.p.id]) return false; daCo[x.p.id] = 1; return true; });
}

function veChuong() {
  /* cùng cách đếm với nút trên thanh công cụ — hai chỗ mà lệch số thì người
     dùng không biết tin cái nào (14/09) */
  const n = laQuanLy() && typeof radarSoi === 'function'
    ? radarSoi().length
    : dsThongBao().length;
  const el = document.getElementById('soChuong');
  if (!el) return;
  el.textContent = n > 99 ? '99+' : n;
  el.classList.toggle('an', n === 0);
}

/* ============================================================
   💬 TRAO ĐỔI — HỘP THƯ (Trường chốt 08/09). Lần trước tab này chỉ là bộ lọc
   danh sách nên trùng hệt màn Danh sách, Trường bắt bỏ. Giờ nó là hộp thư thật:
   phiếu nào vừa có tin nằm trên, thấy ngay AI nhắn GÌ lần cuối, mấy phút trước,
   còn mấy tin chưa đọc. Bấm là mở thẳng khung chat của phiếu đó.
   Khác 🔔 Chú ý: bên đó chỉ việc đang phải làm, bên này là mọi cuộc nói chuyện.
   ============================================================ */
/* ============================================================
   VÁ 24/09 — HỘP THƯ SÓT ĐÚNG THỨ ĐÁNG HIỆN NHẤT.
   Bản cũ chỉ đọc D.dienBien, mà diễn biến CHỈ nạp về máy khi mở phiếu. Nghĩa
   là phiếu có tin nhắn mà mình chưa mở bao giờ thì không hiện trong hộp thư —
   đúng cái cần thấy nhất lại vắng mặt.
   Máy chủ đã gửi sẵn tin cuối của MỌI phiếu trong D.soChat từ bản 14/09 (ai
   nhắn, nhắn gì, lúc nào, mấy ảnh) — chỉ là màn này chưa dùng tới.
   Giờ lấy cả hai nguồn, cái nào mới hơn thì dùng: mở phiếu rồi thì bản trong
   máy đầy đủ hơn, chưa mở thì dùng bản máy chủ.
   ============================================================ */
function dsTraoDoi() {
  let ds = phieuThat();
  if (laCoSo()) ds = ds.filter(p => p.coSoId === (D.nguoi || {}).coSoId);
  return ds.map(p => {
    const tin = (D.dienBien[p.id] || []).filter(t => t.loai === 'chat');
    const sv = (D.soChat || {})[p.id];
    const coSv = !!(sv && sv.so);
    if (!tin.length && !coSv) return null;

    const tMay = tin.length ? (tin[tin.length - 1].t || 0) : 0;
    const tSv = coSv ? (sv.cuoi || 0) : 0;
    let cuoi, t;
    if (tin.length && tMay >= tSv) { cuoi = tin[tin.length - 1]; t = tMay; }
    else {
      /* dựng lại "tin cuối" từ bản máy chủ — đủ để hiện một dòng tóm tắt */
      cuoi = {
        ten: sv.ai || '', text: sv.tin || '',
        anh: sv.soAnh ? new Array(sv.soAnh).fill('') : [], t: tSv
      };
      t = tSv;
    }
    return { p: p, cuoi: cuoi, so: Math.max(tin.length, coSv ? sv.so : 0),
      chuaDoc: tinChuaDoc(p.id), t: t };
  }).filter(Boolean).sort((a, b) => b.t - a.t);
}
function formTraoDoi() {
  const ds = dsTraoDoi();
  const soMoi = ds.filter(x => x.chuaDoc).length;
  const tomTin = c => {
    let t = String(c.text || '').replace(/\[\[TL:[^\]]*\]\]/g, '').trim();
    if (!t) {
      const a = c.anh || [];
      const vid = a.some(u => laVideo && laVideo(u));
      t = a.length ? (vid ? '🎬 ' + a.length + ' video/ảnh' : '🖼 ' + a.length + ' ảnh') : 'gửi tệp';
    }
    return t.length > 64 ? t.slice(0, 64) + '…' : t;
  };
  moSheet(khungSheet('💬 Trao đổi',
    ds.length ? ds.length + ' phiếu đã nói chuyện' + (soMoi ? ' · ' + soMoi + ' phiếu có tin mới' : ' · đã đọc hết') : '',
    (ds.length ? ds.map(x =>
      '<button class="tdO' + (x.chuaDoc ? ' moi' : '') + '" data-tbmo="' + esc(x.p.id) + '">' +
      veAv(x.cuoi.ten || '', (dsTho().find(t => t.ten === x.cuoi.ten) || {}).mau || '#0E7490', anhCua(x.cuoi.ten)) +
      '<div class="tdN"><b>' + esc(x.p.noiDung) + '</b>' +
      '<div class="tdT"><i>' + esc(x.cuoi.ten || '') + ':</i> ' + esc(tomTin(x.cuoi)) + '</div>' +
      '<div class="tdP">' + esc(tenCoSo(x.p.coSoId)) + ' · ' + esc(x.p.id) + ' · ' +
      esc(((TT[x.p.trangThai] || {}).ten || '').toLowerCase()) + '</div></div>' +
      '<div class="tdG">' + truocDay(x.t) + (x.chuaDoc ? '<b class="tdSo">' + (x.chuaDoc > 9 ? '9+' : x.chuaDoc) + '</b>' : '') + '</div>' +
      '</button>').join('')
      : '<div class="rong"><b>Chưa có phiếu nào đang trao đổi</b>Mở một phiếu rồi nhắn tin, nó sẽ hiện ở đây.</div>'),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   📊 CƠ SỞ TÔI (Trường chốt 08/09) — CHT nhìn một màn biết cơ sở mình tháng này
   thế nào: báo mấy việc, xong bao nhiêu, còn tồn mấy, tốn bao nhiêu tiền, hay
   hỏng nhóm gì, gian hàng nào hỏng nhiều nhất (bấm ra lý lịch gian hàng đó).
   ============================================================ */
function formCoSoToi() {
  const cs = (D.nguoi || {}).coSoId;
  /* báo cáo cơ sở theo tháng → đếm theo ngày báo, để "tháng 9 báo mấy lỗi"
     không bị việc tồn của tháng trước cộng vào (01/10) */
  const thang = phieuThat().filter(trongThangBao).filter(p => p.coSoId === cs);
  const xong = thang.filter(p => p.trangThai === 'nghiemthu');
  const ton = thang.filter(p => !['nghiemthu'].includes(p.trangThai));
  const tre = ton.filter(p => soNgayTre(p) > 0).length;
  const tien2 = thang.reduce((s, p) => s + (Number(p.chiPhi) || 0), 0);
  const oSo = (n, ten, mau) => '<div class="csS"><b style="color:' + (mau || 'inherit') + '">' + n + '</b><span>' + ten + '</span></div>';
  const demNhom = {};
  thang.forEach(p => { const k = p.nhomLoi || 'khac'; demNhom[k] = (demNhom[k] || 0) + 1; });
  const nhomTop = Object.keys(demNhom).sort((a, b) => demNhom[b] - demNhom[a]).slice(0, 3)
    .map(k => tenNhom(k) + ' ×' + demNhom[k]).join(' · ');
  /* gian hàng hỏng nhiều nhất — tính cả 6 tháng, không chỉ tháng này */
  const demGh = {};
  phieuThat().filter(p => p.coSoId === cs && p.gianHangId).forEach(p => { demGh[p.gianHangId] = (demGh[p.gianHangId] || 0) + 1; });
  const ghTop = Object.keys(demGh).sort((a, b) => demGh[b] - demGh[a]).slice(0, 3);
  moSheet(khungSheet('📊 ' + esc(tenCoSo(cs)), tenThangDai(L.thang).split(' — ')[0] + ' · tính từ chính phiếu của cơ sở mình',
    '<div class="csSo">' + oSo(thang.length, 'đã báo') + oSo(xong.length, 'đã xong', '#16A34A') +
    oSo(ton.length, 'đang tồn', ton.length ? '#B45309' : '') + '</div>' +
    '<div class="kh"><div class="kb">' +
    '<div class="d"><span>Chi phí tháng này</span><b>' + (tien2 ? tien(tien2) + '₫' : '0₫') + '</b></div>' +
    '<div class="d"><span>Việc đang quá hạn</span><b style="color:' + (tre ? '#DC2626' : '#16A34A') + '">' + tre + '</b></div>' +
    (nhomTop ? '<div class="d"><span>Hay hỏng</span><b>' + esc(nhomTop) + '</b></div>' : '') +
    '</div></div>' +
    (ghTop.length ? '<div class="bcNhan">GIAN HÀNG HỎNG NHIỀU NHẤT — 6 THÁNG</div>' +
      ghTop.map(g => '<button class="mn" data-lylich="' + esc(g) + '">' +
        '<div class="ic" style="background:#FEF3C7;color:#B45309"><img width="22" height="22" class="mnIc" src="ic/av-thumuc.webp" alt="" loading="lazy"></div>' +
        '<div><b>' + esc(tenGianHang(g)) + '</b><div class="s">' + demGh[g] + ' lần hỏng · bấm xem lý lịch</div></div>' +
        '<span class="mui">›</span></button>').join('') : '') +
    (ton.length ? '<div class="bcNhan">ĐANG CHỜ XONG · ' + ton.length + '</div>' +
      /* về lại 📊 Cơ sở tôi, không phải về hộp thư (24/09) */
      ton.slice(0, 6).map(p => '<button class="tbDong" data-csmo="' + esc(p.id) + '" style="border-left-color:' +
        (soNgayTre(p) > 0 ? '#DC2626' : '#0891B2') + '">' +
        '<b style="color:' + (soNgayTre(p) > 0 ? '#DC2626' : '#0891B2') + '">' +
        (soNgayTre(p) > 0 ? 'Quá hạn ' + soNgayTre(p) + ' ngày' : (TT[p.trangThai] || {}).ten || '') + '</b>' +
        '<div class="nd">' + esc(p.noiDung) + '</div>' +
        '<div class="s">' + esc(p.id) + ' · ' + esc(tenGianHang(p.gianHangId) || '') + '</div></button>').join('') : ''),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

function formThongBao() {
  const ds = dsThongBao();
  const s = soLieu();
  const soTin = ds.filter(x => x.loai === 'tinmoi').length;
  const tin = 'Hôm nay: ' + [soTin ? soTin + ' phiếu có tin mới' : '', s.tre ? s.tre + ' việc quá hạn' : '',
    s.chuaNhan ? s.chuaNhan + ' việc chưa ai nhận' : '',
    s.choCht ? s.choCht + ' việc chờ nghiệm thu' : ''].filter(Boolean).join(' · ') || 'Hôm nay không có việc nào cần gấp';
  moSheet(khungSheet('Cần chú ý', tin,
    (ds.length ? ds.map(x =>
      '<button class="tbDong" data-cymo="' + esc(x.p.id) + '" style="border-left-color:' + x.mau + '">' +
      '<b style="color:' + x.mau + '">' + esc(x.tieu) + '</b>' +
      '<div class="nd">' + esc(x.p.noiDung) + '</div>' +
      '<div class="s">' + esc(x.p.id) + ' · ' + esc(x.phu || '') + '</div></button>').join('')
      : '<div class="rong"><b>Không có việc nào cần chú ý</b>Mọi thứ đang trong hạn.</div>'),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ---------- xuất Excel (.xlsx THẬT — kt-xlsx.js)
   Bản cũ là CSV dấu chấm phẩy: Excel để chuẩn Mỹ thì nhét cả dòng
   vào một cột A (Trường chửi 21/08). Giờ ra file Excel đúng nghĩa:
   cột tách sẵn, tiêu đề đậm ghim đầu trang, có nút lọc từng cột. ---------- */
/* dsNgoai + tenFile (thêm 09/09): màn Dọn dữ liệu cần xuất ĐÚNG khoảng sắp xoá
   để giữ bản lưu, không phải xuất theo bộ lọc đang xem */
function xuatExcel(dsNgoai, tenFile) {
  const ds = (Array.isArray(dsNgoai) && dsNgoai.length) ? dsNgoai : loc();
  const cot = ['Mã', 'Nội dung', 'Cơ sở', 'Gian hàng', 'Nhóm lỗi', 'Mức độ', 'Ngày báo', 'Mong muốn xong',
    'Người tiếp nhận', 'Dự kiến xong', 'Trạng thái', 'Đang vướng', 'Ngày xong', 'Người sửa',
    'CHT xác nhận', 'Chi phí', 'Số ngày trễ', 'Đã xử lý thế nào'];
  const so = v => { const n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return v != null && v !== '' && isFinite(n) ? n : ''; };
  const dong = ds.map(p => [p.id, p.noiDung, tenCoSo(p.coSoId), tenGianHang(p.gianHangId),
    NHOM_LOI[p.nhomLoi] || '', (MUC_DO[p.mucDo] || {}).ten || '', ddyy(p.ngayBao), ddyy(p.mongMuon),
    p.nguoiNhanKt, ddyy(p.duKien), (TT[p.trangThai] || {}).ten || '', (VUONG[p.dangVuong] || {}).ten || '',
    ddyy(p.ngayXong), (p.nguoiSua || []).join(', '), p.chtKetQua === 'dat' ? p.chtNguoi : '',
    so(p.chiPhi), soNgayTre(p) || '', p.xuLyGhi || '']);
  taiXLSX((tenFile ? String(tenFile) : 'ky-thuat-ikid-' + ngayISO(Date.now())) + '.xlsx',
    'Kỹ thuật IKID', cot, dong);
  nhac('Đã xuất ' + ds.length + ' dòng ra file Excel', 'la');
}

/* ============================================================
   CUỘN NGANG BẢNG BẰNG CON LĂN CHUỘT (14/09 — Trường: "tao đang phải kéo
   xuống cuối cùng mới kéo sang ngang được").
   Bảng 15 cột rộng 1580px, thanh cuộn ngang của nó nằm ngay DƯỚI hàng cuối —
   bảng 40 dòng thì thanh đó ở tít dưới đáy trang, muốn xem cột Chi phí phải
   cuộn xuống hết, kéo ngang, rồi cuộn ngược lên. Ba thao tác cho một việc.
   Ba đường vào, làm cùng lúc:
   ① GIỮ SHIFT + lăn  → cuộn ngang (chuột thường)
   ② lăn ngang        → trackpad và chuột có con lăn nghiêng, chạy sẵn
   ③ THANH CUỘN DÍNH ĐÁY MÀN — thanh giả bám đáy khung nhìn, luôn nhìn thấy
     và kéo được dù đang đứng ở giữa bảng; tự ẩn khi đáy bảng đã lên màn.
   ============================================================ */
(function cuonNgangBang() {
  let bong = null, dong = false;

  const layBang = () => document.querySelector('#dsHang .soBang');

  /* ① + phòng khi chuột không có con lăn ngang: giữ Shift rồi lăn */
  document.addEventListener('wheel', e => {
    const el = e.target.closest ? e.target.closest('.soBang') : null;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (!e.shiftKey) return;                    /* không Shift thì để trang cuộn dọc bình thường */
    e.preventDefault();
    el.scrollLeft += (e.deltaY || e.deltaX);
  }, { passive: false });

  function veBong() {
    const el = layBang();
    if (!el) { if (bong) bong.style.display = 'none'; return; }
    const tran = el.scrollWidth > el.clientWidth + 4;
    /* đáy bảng đã nằm trong khung nhìn → thanh thật đã thấy, khỏi cần thanh giả */
    const r = el.getBoundingClientRect();
    const dayDaThay = r.bottom <= window.innerHeight - 6;
    if (!tran || dayDaThay || !matchMedia('(min-width:901px)').matches) {
      if (bong) bong.style.display = 'none';
      return;
    }
    if (!bong) {
      bong = document.createElement('div');
      bong.className = 'cuonBong';
      bong.innerHTML = '<div></div>';
      document.body.appendChild(bong);
      /* kéo thanh giả → bảng chạy theo */
      bong.addEventListener('scroll', () => {
        if (dong) return; dong = true;
        const b = layBang(); if (b) b.scrollLeft = bong.scrollLeft;
        dong = false;
      });
      /* kéo bảng → thanh giả chạy theo */
      document.addEventListener('scroll', e => {
        const b = e.target;
        if (!b || !b.classList || !b.classList.contains('soBang')) return;
        if (dong || !bong) return; dong = true;
        bong.scrollLeft = b.scrollLeft;
        dong = false;
      }, true);
    }
    bong.style.display = 'block';
    bong.style.left = r.left + 'px';
    bong.style.width = r.width + 'px';
    bong.firstChild.style.width = el.scrollWidth + 'px';
    if (!dong) bong.scrollLeft = el.scrollLeft;
  }

  let hen = 0;
  const nhip = () => { clearTimeout(hen); hen = setTimeout(veBong, 60); };
  window.addEventListener('scroll', nhip, { passive: true });
  window.addEventListener('resize', nhip);
  /* danh sách vẽ lại (đổi lọc, đổi trang) thì đo lại bề ngang */
  const ds = document.getElementById('dsHang');
  if (ds && window.MutationObserver) new MutationObserver(nhip).observe(ds, { childList: true, subtree: true });
  setTimeout(veBong, 800);
})();
