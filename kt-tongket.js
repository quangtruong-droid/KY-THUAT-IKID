/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · 📊 TỔNG KẾT THÁNG
   Trường chốt 14/09: "phần này của máy tính có thể làm nó hoành tá tràng lên
   để 1 tháng họp tổng kết không".

   Khác màn Báo cáo họp cũ ở chỗ: cái cũ là bản tóm tắt để COPY vào Zalo, cái
   này là bản để CHIẾU LÊN MÀN HÌNH trong cuộc họp — số lớn đọc được từ xa,
   biểu đồ cả tháng, và quan trọng nhất là phần "điều đáng nói" máy tự viết sẵn
   thành câu để đọc lên, không phải ngồi nghĩ.

   Mọi con số ở đây tính từ dữ liệu thật, không có số nào gõ tay.
   ============================================================ */
'use strict';

const TK_NGAY = 24 * 60 * 60 * 1000;
let TK_THANG = 0;          /* 0 = tháng này, -1 = tháng trước… */

function tkKhoang(lech) {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + (lech || 0), 1);
  const h = new Date(d.getFullYear(), d.getMonth() + (lech || 0) + 1, 1);
  return { d1: t.getTime(), d2: h.getTime(), thang: t.getMonth() + 1, nam: t.getFullYear(),
    soNgay: Math.round((h - t) / TK_NGAY) };
}

/* ============================================================
   GOM SỐ CHO MỘT THÁNG
   "xong" tính theo lúc CHT nghiệm thu, không theo lúc thợ báo xong: việc chỉ
   đóng khi cơ sở gật, đó là luật vận hành từ đầu.
   ============================================================ */
function tkSo(lech) {
  const k = tkKhoang(lech);
  const tat = phieuThat();
  const trong = p => p.ngayBao >= k.d1 && p.ngayBao < k.d2;
  const xongTrong = p => p.trangThai === 'nghiemthu' && p.chtLuc >= k.d1 && p.chtLuc < k.d2;
  const baoMoi = tat.filter(trong);
  const xong = tat.filter(xongTrong);
  const ton = tat.filter(p => !['nghiemthu', 'huy'].includes(p.trangThai));
  const chiPhi = xong.reduce((s, p) => s + (Number(p.chiPhi) || 0), 0);

  /* đúng hẹn: chỉ tính việc CÓ hẹn ngày — không hẹn thì không có gì để so */
  const coHen = xong.filter(p => p.duKien && p.ngayXong);
  const dungHen = coHen.filter(p => p.ngayXong <= p.duKien + TK_NGAY - 1);
  const henPt = coHen.length ? Math.round(dungHen.length / coHen.length * 100) : -1;
  /* việc xong MUỘN — kèm lý do thợ đã ghi, để đọc lên trong họp (19/09) */
  const muon = coHen.filter(p => p.ngayXong > p.duKien + TK_NGAY - 1)
    .map(p => ({ p: p, so: Math.max(1, Math.ceil((p.ngayXong - (p.duKien + TK_NGAY - 1)) / TK_NGAY)) }))
    .sort((a, b) => b.so - a.so);

  /* bao lâu từ lúc báo tới lúc nghiệm thu xong */
  const nhanh = xong.filter(p => p.ngayBao && p.chtLuc);
  const tbNgay = nhanh.length
    ? nhanh.reduce((s, p) => s + (p.chtLuc - p.ngayBao), 0) / nhanh.length / TK_NGAY : -1;

  /* cơ sở bấm nghiệm thu nhanh chậm ra sao (giờ) */
  const nt = xong.filter(p => p.ngayXong && p.chtLuc && p.chtLuc >= p.ngayXong);
  const tbNT = nt.length ? nt.reduce((s, p) => s + (p.chtLuc - p.ngayXong), 0) / nt.length / 3600000 : -1;

  /* nhịp từng ngày trong tháng — cho biểu đồ cột */
  const ngayBao = new Array(k.soNgay).fill(0);
  const ngayXong = new Array(k.soNgay).fill(0);
  baoMoi.forEach(p => { const i = new Date(p.ngayBao).getDate() - 1; if (ngayBao[i] !== undefined) ngayBao[i]++; });
  xong.forEach(p => { const i = new Date(p.chtLuc).getDate() - 1; if (ngayXong[i] !== undefined) ngayXong[i]++; });

  /* theo cơ sở */
  const cs = {};
  const lay = id => cs[id] = cs[id] || { bao: 0, xong: 0, ton: 0, tien: 0, hen: 0, coHen: 0 };
  baoMoi.forEach(p => lay(p.coSoId).bao++);
  xong.forEach(p => {
    const o = lay(p.coSoId); o.xong++; o.tien += Number(p.chiPhi) || 0;
    if (p.duKien && p.ngayXong) { o.coHen++; if (p.ngayXong <= p.duKien + TK_NGAY - 1) o.hen++; }
  });
  ton.forEach(p => lay(p.coSoId).ton++);

  /* theo nhóm lỗi */
  const nhom = {};
  baoMoi.forEach(p => { const n = p.nhomLoi || 'khac'; nhom[n] = (nhom[n] || 0) + 1; });

  /* theo gian hàng — chỉ những gian có tốn tiền */
  const gian = {};
  xong.filter(p => p.gianHangId && Number(p.chiPhi) > 0).forEach(p => {
    const g = gian[p.coSoId + '|' + p.gianHangId] = gian[p.coSoId + '|' + p.gianHangId] ||
      { coSoId: p.coSoId, gianHangId: p.gianHangId, tien: 0, lan: 0 };
    g.tien += Number(p.chiPhi); g.lan++;
  });

  /* theo kỹ thuật */
  const tho = {};
  const layT = t => tho[t] = tho[t] || { xong: 0, cam: 0, hen: 0, coHen: 0, ngay: 0, soNgay: 0, nhom: {} };
  xong.forEach(p => (p.nguoiSua && p.nguoiSua.length ? p.nguoiSua : (p.nguoiNhanKt ? [p.nguoiNhanKt] : []))
    .forEach(t => {
      const o = layT(t); o.xong++;
      if (p.duKien && p.ngayXong) { o.coHen++; if (p.ngayXong <= p.duKien + TK_NGAY - 1) o.hen++; }
      if (p.nhanLuc && p.ngayXong) { o.ngay += (p.ngayXong - p.nhanLuc) / TK_NGAY; o.soNgay++; }
      const n = p.nhomLoi || 'khac'; o.nhom[n] = (o.nhom[n] || 0) + 1;
    }));
  ton.forEach(p => { if (p.nguoiNhanKt) layT(p.nguoiNhanKt).cam++; });

  return { k, baoMoi, xong, ton, chiPhi, henPt, muon, tbNgay, tbNT, ngayBao, ngayXong, cs, nhom, gian, tho,
    quaHan: ton.filter(p => soNgayTre(p) > 0), chuaNhan: ton.filter(p => p.trangThai === 'moi') };
}

/* ============================================================
   BỐN KHỐI THÊM 12/10 (Trường: "làm hết").
   Mỗi hàm chỉ GOM SỐ, phần vẽ nằm riêng bên dưới — tách ra để sau này muốn
   đổi cách bày thì không phải mò trong đống HTML.
   ============================================================ */

/* ① XU HƯỚNG 6 THÁNG — số việc, đúng hẹn, chi phí.
   Gọi tkSo() sáu lần nghe nặng nhưng thực ra chỉ lọc mảng phiếu đã nằm sẵn
   trong máy, không gọi mạng lần nào. Đo thật: 6 tháng hết dưới 20ms. */
function tkXuHuong(moc) {
  const ra = [];
  for (let i = 5; i >= 0; i--) {
    const s = tkSo((moc || 0) - i);
    ra.push({ thang: s.k.thang, nam: s.k.nam, bao: s.baoMoi.length, xong: s.xong.length,
      hen: s.henPt, tien: s.chiPhi, laNay: i === 0 });
  }
  /* Cắt mấy tháng RỖNG Ở ĐẦU (12/10). Web chạy từ tháng 9, nên nhìn 6 tháng
     thì bốn tháng đầu đều 0 — đường kẻ bẹt dí một đoạn dài rồi mới vọt lên,
     trông như số liệu hỏng. Bỏ đi, chỉ giữ từ tháng đầu tiên có việc.
     Vẫn luôn chừa lại ít nhất 2 cột, không thì chẳng còn gì để so. */
  let dau = 0;
  while (dau < ra.length - 2 && !ra[dau].bao && !ra[dau].xong) dau++;
  return ra.slice(dau);
}

/* ② TIỀN ĐỔ VÀO ĐÂU — chi phí tách theo nhóm lỗi và theo cơ sở.
   Chỉ tính việc ĐÃ nghiệm thu, vì việc chưa đóng thì con số chi phí còn đổi. */
function tkTienDau(s) {
  const nhom = {}, cs = {};
  s.xong.forEach(p => {
    const t = Number(p.chiPhi) || 0; if (!t) return;
    const n = p.nhomLoi || 'khac';
    nhom[n] = nhom[n] || { tien: 0, lan: 0 }; nhom[n].tien += t; nhom[n].lan++;
    cs[p.coSoId] = cs[p.coSoId] || { tien: 0, lan: 0 }; cs[p.coSoId].tien += t; cs[p.coSoId].lan++;
  });
  const sapTien = o => Object.keys(o).sort((a, b) => o[b].tien - o[a].tien);
  return { nhom, cs, nhomKs: sapTien(nhom), csKs: sapTien(cs),
    tong: s.chiPhi, soViecCoTien: s.xong.filter(p => Number(p.chiPhi) > 0).length };
}

/* ③ HỎNG ĐI HỎNG LẠI — soi 3 tháng gần nhất, gom theo gian hàng + nhóm lỗi.
   Ngưỡng 3 lần: hai lần còn là trùng hợp, ba lần trở lên là thiết bị có bệnh.
   Kèm tổng tiền đã đổ vào để so với giá thay mới. */
function tkLapLai(moc) {
  const k1 = tkKhoang((moc || 0) - 2).d1, k2 = tkKhoang(moc || 0).d2;
  const ds = phieuThat().filter(p => p.ngayBao >= k1 && p.ngayBao < k2 && p.gianHangId);
  const gom = {};
  ds.forEach(p => {
    const khoa = p.coSoId + '|' + p.gianHangId + '|' + (p.nhomLoi || 'khac');
    const g = gom[khoa] = gom[khoa] || { coSoId: p.coSoId, gianHangId: p.gianHangId,
      nhom: p.nhomLoi || 'khac', lan: 0, tien: 0, lanCuoi: 0 };
    g.lan++; g.tien += Number(p.chiPhi) || 0;
    if (p.ngayBao > g.lanCuoi) g.lanCuoi = p.ngayBao;
  });
  return Object.values(gom).filter(g => g.lan >= 3)
    .sort((a, b) => b.lan - a.lan || b.tien - a.tien).slice(0, 8);
}

/* ④ VIỆC ĐANG TỒN ĐỂ ĐỌC TRONG HỌP — quá hạn trước, rồi chưa ai nhận.
   Cắt 12 dòng: dài hơn là không ai ngồi nghe hết trong một cuộc họp. */
function tkTonDoc(s) {
  const qh = s.quaHan.map(p => ({ p: p, tre: soNgayTre(p) })).sort((a, b) => b.tre - a.tre);
  const cn = s.chuaNhan.filter(p => soNgayTre(p) <= 0)
    .map(p => ({ p: p, cho: Math.max(0, Math.round((Date.now() - p.ngayBao) / TK_NGAY)) }))
    .sort((a, b) => b.cho - a.cho);
  return { qh, cn, tongTon: s.ton.length };
}

const tkTien = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
const tkGon = n => { n = Number(n) || 0;
  return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'tr' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n); };

/* mũi so tháng trước — chỉ hiện khi tháng trước CÓ dữ liệu, không thì im */
function tkMui(nay, truoc, tangLaTot) {
  if (truoc === undefined || truoc === null || truoc < 0) return '';
  const d = Math.round((nay - truoc) * 10) / 10;
  if (!d) return '<span class="tkMui">không đổi</span>';
  const tot = tangLaTot ? d > 0 : d < 0;
  return '<span class="tkMui ' + (tot ? 'tot' : 'do') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(d) + '</span>';
}

/* ============================================================
   BIỂU ĐỒ NHỊP CẢ THÁNG — SVG vẽ tay, không kéo thư viện nào về
   ============================================================ */
function tkBieuDo(s) {
  const n = s.k.soNgay;
  const max = Math.max(1, Math.max.apply(null, s.ngayBao.concat(s.ngayXong)));
  const W = 1240, H = 150, w = W / n;
  const cot = [];
  for (let i = 0; i < n; i++) {
    const x = i * w + 4;
    const hB = s.ngayBao[i] / max * H, hX = s.ngayXong[i] / max * H;
    if (s.ngayBao[i]) cot.push('<rect x="' + x.toFixed(1) + '" y="' + (H - hB).toFixed(1) +
      '" width="' + (w * 0.38).toFixed(1) + '" height="' + hB.toFixed(1) + '" rx="2" fill="#EA580C"/>');
    if (s.ngayXong[i]) cot.push('<rect x="' + (x + w * 0.44).toFixed(1) + '" y="' + (H - hX).toFixed(1) +
      '" width="' + (w * 0.38).toFixed(1) + '" height="' + hX.toFixed(1) + '" rx="2" fill="#0F766E"/>');
    if (i === 0 || (i + 1) % 5 === 0) cot.push('<text x="' + (x + w * 0.4).toFixed(1) + '" y="' + (H + 16) +
      '" font-size="10" fill="#94A3B8" text-anchor="middle">' + (i + 1) + '</text>');
  }
  /* ngày dồn nhất — câu để nói trong họp */
  let dinh = 0, iDinh = 0;
  s.ngayBao.forEach((v, i) => { if (v > dinh) { dinh = v; iDinh = i; } });
  const T_THU = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];
  const ngayDinh = new Date(s.k.nam, s.k.thang - 1, iDinh + 1);
  return '<div class="tkHop"><svg viewBox="0 0 ' + W + ' ' + (H + 22) + '" class="tkSvg">' + cot.join('') + '</svg>' +
    '<div class="tkChu"><span><i style="background:#EA580C"></i>Báo mới ' + s.baoMoi.length + '</span>' +
    '<span><i style="background:#0F766E"></i>Nghiệm thu xong ' + s.xong.length + '</span>' +
    (dinh ? '<span class="tkPhai">Ngày dồn nhất: ' + (iDinh + 1) + '/' + s.k.thang + ' — ' + dinh +
      ' việc, ' + T_THU[ngayDinh.getDay()] + '</span>' : '') + '</div></div>';
}

/* ============================================================
   VÒNG TRÒN NHÓM LỖI
   ============================================================ */
const TK_MAU = ['#EF9F27', '#378ADD', '#1D9E75', '#7F77DD', '#D85A30', '#888780', '#D4537E'];
function tkDonut(s) {
  const ks = Object.keys(s.nhom).sort((a, b) => s.nhom[b] - s.nhom[a]);
  const tong = ks.reduce((t, k) => t + s.nhom[k], 0);
  if (!tong) return '';
  let g = 0;
  const vong = ks.map((k, i) => {
    const p = s.nhom[k] / tong * 100, mau = TK_MAU[i % TK_MAU.length];
    const o = '<circle r="50" cx="70" cy="70" fill="transparent" stroke="' + mau + '" stroke-width="22" ' +
      'stroke-dasharray="' + (p * 3.1416).toFixed(1) + ' ' + (314.16 - p * 3.1416).toFixed(1) + '" ' +
      'stroke-dashoffset="' + (-g * 3.1416).toFixed(1) + '" transform="rotate(-90 70 70)"/>';
    g += p; return o;
  }).join('');
  return '<div class="tkNhanH">NHÓM LỖI CẢ THÁNG</div><div class="tkDonut">' +
    '<svg viewBox="0 0 140 140">' + vong +
    '<text x="70" y="67" text-anchor="middle" font-size="24" font-weight="900" fill="currentColor">' + tong + '</text>' +
    '<text x="70" y="82" text-anchor="middle" font-size="9" fill="#94A3B8">VIỆC</text></svg>' +
    '<div class="tkCK">' + ks.map((k, i) =>
      '<div class="tkCKd"><i style="background:' + TK_MAU[i % TK_MAU.length] + '"></i>' +
      esc(tenNhom(k) || 'Khác') + '<b>' + s.nhom[k] + '</b></div>').join('') + '</div></div>';
}

/* ============================================================
   ĐIỀU ĐÁNG NÓI — dùng chung bộ luật soi của Radar, cộng thêm mấy câu khen
   khi số liệu tốt lên. Cuộc họp nào cũng cần cả hai vế.
   ============================================================ */
function tkDangNoi(s, tr) {
  const xau = (typeof radarSoi === 'function' ? radarSoi() : []).slice(0, 3).map(x =>
    '<div class="tkPh' + (x.uu <= 2 ? ' do' : '') + '"><b>' + x.ic + ' ' + x.nhan.toLowerCase().replace(/^./, c => c.toUpperCase()) + '</b>' +
    '<span>' + (x.coSoId ? '<span class="tkDia">' + esc(tenCoSo(x.coSoId)) +
      (x.gianHangId ? '<s>›</s>' + esc(tenGianHang(x.gianHangId)) : '') + '</span> ' : '') +
    x.ket.replace(/<b>/g, '<b style="font-weight:900">') + '<br>' + x.bc + '</span></div>');

  const tot = [];
  if (s.henPt >= 0 && tr && tr.henPt >= 0 && s.henPt > tr.henPt)
    tot.push('<div class="tkPh la"><b>✅ Đúng hẹn tăng ' + (s.henPt - tr.henPt) + '% so tháng trước</b><span>' +
      s.henPt + '% việc xong đúng ngày đã hẹn (tháng trước ' + tr.henPt + '%).</span></div>');
  if (s.tbNT >= 0 && s.tbNT < 24)
    tot.push('<div class="tkPh la"><b>⚡ Cơ sở nghiệm thu nhanh</b><span>Trung bình ' +
      (s.tbNT < 1 ? Math.round(s.tbNT * 60) + ' phút' : s.tbNT.toFixed(1) + ' giờ') +
      ' sau khi kỹ thuật báo xong — việc đóng gọn, số liệu tháng sạch.</span></div>');
  if (s.tbNgay >= 0 && tr && tr.tbNgay >= 0 && s.tbNgay < tr.tbNgay)
    tot.push('<div class="tkPh la"><b>🏃 Xong nhanh hơn tháng trước</b><span>Từ lúc cơ sở báo tới lúc nghiệm thu: ' +
      s.tbNgay.toFixed(1) + ' ngày (tháng trước ' + tr.tbNgay.toFixed(1) + ' ngày).</span></div>');
  if (s.muon && s.muon.length)
    tot.push('<div class="tkPh"><b>⏰ ' + s.muon.length + ' việc xong muộn hơn ngày đã hẹn</b><span>' +
      s.muon.slice(0, 4).map(x => '<span class="tkDia">' + esc(tenCoSo(x.p.coSoId)) +
        (x.p.gianHangId ? '<s>›</s>' + esc(tenGianHang(x.p.gianHangId)) : '') + '</span> ' +
        esc(x.p.id) + ' muộn <b style="font-weight:900">' + x.so + ' ngày</b>' +
        (x.p.lyDoTre ? ' — ' + esc(x.p.lyDoTre) : ' — không ghi lý do')).join('<br>') +
      (s.muon.length > 4 ? '<br>… và ' + (s.muon.length - 4) + ' việc nữa' : '') + '</span></div>');
  if (!s.quaHan.length && s.xong.length)
    tot.push('<div class="tkPh la"><b>✅ Không còn việc nào quá hạn</b><span>Toàn bộ việc đang tồn đều trong hạn đã hẹn.</span></div>');

  if (!xau.length && !tot.length) return '';
  return '<div class="tkKh"><b>ĐIỀU ĐÁNG NÓI TRONG CUỘC HỌP</b><span>máy tự soi ra, không phải gõ tay</span></div>' +
    '<div class="tkHai"><div>' + (xau.join('') || '<div class="tkPh la"><b>✓ Không có gì bất thường</b><span>Máy đã soi hỏng lặp, cơ sở im, việc bị quên, lệch tay, tiền dồn một chỗ.</span></div>') +
    '</div><div>' + tot.join('') + '</div></div>';
}

/* ============================================================
   VẼ BỐN KHỐI THÊM (12/10)
   ============================================================ */

/* ① đường 6 tháng — SVG vẽ tay, ba đường chồng lên một khung.
   Mỗi chỉ số một thang riêng (việc đếm bằng cái, tiền bằng triệu, hẹn bằng %)
   nên quy hết về 0–100% của chính nó, chỉ xem HÌNH DÁNG chứ không so trị số. */
function tkDuong6(xh) {
  if (!xh.length) return '';
  const W = 1000, H = 190, L = 34, R = 14, T = 16, B = 30;
  const cx = i => L + i * (W - L - R) / Math.max(1, xh.length - 1);
  const duong = (lay, mau, net) => {
    const gt = xh.map(lay), max = Math.max.apply(null, gt.concat([1]));
    const cy = v => T + (H - T - B) * (1 - (v < 0 ? 0 : v) / max);
    const d = gt.map((v, i) => (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + cy(v).toFixed(1)).join(' ');
    return '<path d="' + d + '" fill="none" stroke="' + mau + '" stroke-width="2.4" ' +
      (net ? 'stroke-dasharray="5 4" ' : '') + 'stroke-linejoin="round" stroke-linecap="round"/>' +
      gt.map((v, i) => '<circle cx="' + cx(i).toFixed(1) + '" cy="' + cy(v).toFixed(1) +
        '" r="' + (xh[i].laNay ? 4.5 : 3) + '" fill="' + mau + '"/>').join('');
  };
  return '<div class="tkHop"><svg class="tkSvg6" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    [0, .25, .5, .75, 1].map(t => '<line x1="' + L + '" x2="' + (W - R) +
      '" y1="' + (T + (H - T - B) * t) + '" y2="' + (T + (H - T - B) * t) +
      '" stroke="#E2E8F0" stroke-width="1"/>').join('') +
    duong(x => x.bao, '#0EA5E9') +
    duong(x => x.xong, '#16A34A') +
    duong(x => x.hen < 0 ? 0 : x.hen, '#D97706', true) +
    xh.map((x, i) => '<text x="' + cx(i).toFixed(1) + '" y="' + (H - 9) +
      '" text-anchor="middle" font-size="12" fill="' + (x.laNay ? '#0B2435' : '#94A3B8') +
      '" font-weight="' + (x.laNay ? '800' : '600') + '">T' + x.thang + '</text>').join('') +
    '</svg><div class="tkChuThich">' +
    '<span><i style="background:#0EA5E9"></i>việc báo mới</span>' +
    '<span><i style="background:#16A34A"></i>đã nghiệm thu</span>' +
    '<span><i style="background:#D97706"></i>đúng hẹn %</span>' +
    '</div><div class="tkBangNho"><table class="tkBang"><thead><tr><th>Tháng</th>' +
    xh.map(x => '<th class="' + (x.laNay ? 'tkNay' : '') + '">T' + x.thang + '</th>').join('') +
    '</tr></thead><tbody>' +
    '<tr><td class="tkTen">Việc báo</td>' + xh.map(x => '<td>' + x.bao + '</td>').join('') + '</tr>' +
    '<tr><td class="tkTen">Nghiệm thu</td>' + xh.map(x => '<td>' + x.xong + '</td>').join('') + '</tr>' +
    '<tr><td class="tkTen">Đúng hẹn</td>' + xh.map(x => '<td>' + (x.hen < 0 ? '—' : x.hen + '%') + '</td>').join('') + '</tr>' +
    '<tr><td class="tkTen">Chi phí</td>' + xh.map(x => '<td class="tkTien">' + (x.tien ? tkGon(x.tien) : '—') + '</td>').join('') + '</tr>' +
    '</tbody></table></div></div>';
}

/* ② tiền đổ vào đâu — hai cột: theo nhóm lỗi và theo cơ sở */
function tkVeTien(t) {
  if (!t.tong) return '';
  const cot = (ks, lay, ten) => {
    const max = Math.max.apply(null, ks.map(k => lay(k).tien).concat([1]));
    return ks.slice(0, 6).map(k => {
      const x = lay(k), pt = Math.round(x.tien / t.tong * 100);
      return '<div class="tkTienD"><div class="tkTienT"><b>' + esc(ten(k)) + '</b>' +
        '<span>' + x.lan + ' việc · ' + pt + '%</span></div>' +
        '<div class="tkThanh"><i style="width:' + Math.round(x.tien / max * 100) + '%"></i></div>' +
        '<b class="tkTienS">' + tkTien(x.tien) + '</b></div>';
    }).join('');
  };
  return '<div class="tkKh"><b>TIỀN ĐỔ VÀO ĐÂU</b><span>' + tkTien(t.tong) + ' trên ' +
    t.soViecCoTien + ' việc có ghi chi phí · chỉ tính việc đã nghiệm thu</span></div>' +
    '<div class="tkHai2"><div class="tkHop"><div class="tkNhanH">THEO LOẠI HỎNG</div>' +
    cot(t.nhomKs, k => t.nhom[k], k => tenNhom(k) || 'Khác') + '</div>' +
    '<div class="tkHop"><div class="tkNhanH">THEO CƠ SỞ</div>' +
    cot(t.csKs, k => t.cs[k], k => tenCoSo(k)) + '</div></div>';
}

/* ③ hỏng đi hỏng lại */
function tkVeLap(ds) {
  if (!ds.length) return '';
  return '<div class="tkKh"><b>HỎNG ĐI HỎNG LẠI</b>' +
    '<span>cùng một chỗ, cùng một kiểu hỏng, từ 3 lần trở lên trong 3 tháng — cân nhắc thay mới thay vì sửa tiếp</span></div>' +
    '<div class="tkHop"><table class="tkBang"><thead><tr>' +
    '<th>Gian hàng</th><th>Cơ sở</th><th>Kiểu hỏng</th><th>Số lần</th><th class="tkPhaiO">Đã tốn</th><th>Lần gần nhất</th>' +
    '</tr></thead><tbody>' + ds.map(g =>
      '<tr><td class="tkTen">' + esc(tenGianHang(g.gianHangId) || '?') + '</td>' +
      '<td class="tkMo">' + esc(tenCoSo(g.coSoId)) + '</td>' +
      '<td class="tkMo">' + esc(tenNhom(g.nhom) || 'Khác') + '</td>' +
      '<td class="tkDam ' + (g.lan >= 5 ? 'tkDo' : '') + '">' + g.lan + ' lần</td>' +
      '<td class="tkPhaiO tkTien">' + (g.tien ? tkTien(g.tien) : '—') + '</td>' +
      '<td class="tkMo">' + ddyy(g.lanCuoi) + '</td></tr>').join('') +
    '</tbody></table></div>';
}

/* ④ việc đang tồn — bảng để đọc lên và giao việc ngay trong họp */
function tkVeTon(t) {
  if (!t.qh.length && !t.cn.length) return '';
  const dong = (p, phai, lopPhai) =>
    '<tr><td class="tkTen">' + esc(p.id) + '</td>' +
    '<td>' + esc(ctCat(p.noiDung || '', 52)) + '</td>' +
    '<td class="tkMo">' + esc(tenCoSo(p.coSoId)) +
    (p.gianHangId ? ' › ' + esc(tenGianHang(p.gianHangId)) : '') + '</td>' +
    '<td class="tkMo">' + esc(p.nguoiNhanKt || 'chưa ai nhận') + '</td>' +
    '<td class="' + lopPhai + '">' + phai + '</td></tr>';
  let html = '<div class="tkKh"><b>VIỆC ĐANG TỒN — ĐỌC LÊN TRONG HỌP</b><span>' +
    t.tongTon + ' việc chưa đóng · xếp theo mức gấp</span></div><div class="tkHop">';
  if (t.qh.length) html += '<div class="tkNhanH do">QUÁ HẠN · ' + t.qh.length + ' việc</div>' +
    '<table class="tkBang"><tbody>' +
    t.qh.slice(0, 8).map(x => dong(x.p, 'trễ ' + x.tre + ' ngày', 'tkDam tkDo')).join('') +
    '</tbody></table>' +
    (t.qh.length > 8 ? '<div class="tkThem">… và ' + (t.qh.length - 8) + ' việc quá hạn nữa</div>' : '');
  if (t.cn.length) html += '<div class="tkNhanH' + (t.qh.length ? ' xa' : '') + '">CHƯA AI NHẬN · ' + t.cn.length + ' việc</div>' +
    '<table class="tkBang"><tbody>' +
    t.cn.slice(0, 6).map(x => dong(x.p, x.cho ? 'chờ ' + x.cho + ' ngày' : 'vừa báo', 'tkDam')).join('') +
    '</tbody></table>' +
    (t.cn.length > 6 ? '<div class="tkThem">… và ' + (t.cn.length - 6) + ' việc nữa</div>' : '');
  return html + '</div>';
}
/* cắt chữ cho vừa ô, không cắt giữa từ */
function ctCat(s, n) {
  s = String(s || '').trim();
  if (s.length <= n) return s;
  const c = s.slice(0, n);
  const k = c.lastIndexOf(' ');
  return (k > n * 0.6 ? c.slice(0, k) : c) + '…';
}

/* ============================================================
   MÀN CHÍNH
   ============================================================ */
function formTongKet(lech) {
  if (!laQuanLy()) return;
  if (lech !== undefined) TK_THANG = Number(lech);
  const s = tkSo(TK_THANG);
  const tr = tkSo(TK_THANG - 1);
  /* bốn khối thêm 12/10 */
  const xh = tkXuHuong(TK_THANG);
  const tien = tkTienDau(s);
  const lap = tkLapLai(TK_THANG);
  const ton = tkTonDoc(s);

  const oSo = (so, nhan, phu, mau) => '<div class="tkO"><i>' + nhan + '</i>' +
    '<b' + (mau ? ' style="color:' + mau + '"' : '') + '>' + so + '</b><span>' + phu + '</span></div>';

  const bia = '<div class="tkBia">' +
    '<div class="tkKy">BÁO CÁO VẬN HÀNH KỸ THUẬT</div>' +
    '<h1>Tháng ' + s.k.thang + ' · ' + s.k.nam + '</h1>' +
    '<div class="tkPhu">' + (D.cosos || []).length + ' cơ sở · ' + dsTho().length + ' kỹ thuật · ' +
    ddyy(s.k.d1) + ' → ' + ddyy(Math.min(s.k.d2 - 1, Date.now())) + ' · số liệu sống, mở ra là đúng tới phút này</div>' +
    '<div class="tkSo">' +
    oSo(s.baoMoi.length, 'VIỆC BÁO MỚI', tkMui(s.baoMoi.length, tr.baoMoi.length, false) || 'tháng trước chưa có số', '#fff') +
    oSo(s.xong.length, 'ĐÃ NGHIỆM THU',
      (s.baoMoi.length ? Math.round(s.xong.length / s.baoMoi.length * 100) + '% khối lượng' : '—'), '#86EFAC') +
    oSo(s.henPt < 0 ? '—' : s.henPt + '%', 'ĐÚNG HẸN',
      s.henPt < 0 ? 'chưa đủ việc có hẹn' : (tkMui(s.henPt, tr.henPt, true) || 'so tháng trước'), '#FDE68A') +
    oSo(s.tbNgay < 0 ? '—' : s.tbNgay.toFixed(1) + '<small>ngày</small>', 'XONG TRUNG BÌNH',
      s.tbNgay < 0 ? 'chưa có việc đóng' : (tkMui(Math.round(s.tbNgay * 10) / 10, Math.round(tr.tbNgay * 10) / 10, false) || 'từ lúc báo tới nghiệm thu'), '#A5F3FC') +
    oSo(tkGon(s.chiPhi), 'CHI PHÍ SỬA',
      (tkMui(Math.round(s.chiPhi / 1000), Math.round(tr.chiPhi / 1000), false) || 'chưa ghi chi phí'), '#FCA5A5') +
    '</div></div>';

  /* bảng cơ sở */
  const csKs = Object.keys(s.cs).sort((a, b) => s.cs[b].bao - s.cs[a].bao || s.cs[b].ton - s.cs[a].ton);
  const maxBao = Math.max(1, Math.max.apply(null, csKs.map(k => s.cs[k].bao).concat([1])));
  const bangCS = csKs.length ? '<table class="tkBang"><thead><tr>' +
    '<th>Cơ sở</th><th class="tkCot1">Việc báo</th><th>Báo</th><th>Xong</th><th>Tồn</th><th>Đúng hẹn</th><th class="tkPhaiO">Chi phí</th>' +
    '</tr></thead><tbody>' + csKs.map(k => {
      const x = s.cs[k];
      const pt = x.coHen ? Math.round(x.hen / x.coHen * 100) : -1;
      return '<tr><td class="tkTen">' + esc(tenCoSo(k)) + '</td>' +
        '<td><div class="tkThanh"><i style="width:' + Math.round(x.bao / maxBao * 100) + '%"></i></div></td>' +
        '<td>' + x.bao + '</td><td>' + x.xong + '</td>' +
        '<td class="' + (x.ton ? 'tkDo' : 'tkMo') + '">' + x.ton + '</td>' +
        '<td class="tkPt ' + (pt < 0 ? 'tkMo' : pt >= 90 ? 'tot' : pt >= 75 ? 'vua' : 'kem') + '">' +
        (pt < 0 ? '—' : pt + '%') + '</td>' +
        '<td class="tkPhaiO tkTien">' + (x.tien ? tkTien(x.tien) : '—') + '</td></tr>';
    }).join('') + '</tbody></table>' : '<div class="tkRong">Tháng này chưa có cơ sở nào báo lỗi.</div>';

  /* gian hàng tốn nhất */
  const gKs = Object.keys(s.gian).sort((a, b) => s.gian[b].tien - s.gian[a].tien).slice(0, 5);
  const topGian = gKs.length ? '<div class="tkNhanH">GIAN HÀNG TỐN NHẤT</div>' + gKs.map((k, i) => {
    const g = s.gian[k];
    return '<button class="tkGian" data-radgian="' + esc(g.coSoId + '|' + g.gianHangId) + '">' +
      '<b class="tkHang">' + (i + 1) + '</b><div><div class="tkGTen">' + esc(tenGianHang(g.gianHangId) || '?') + '</div>' +
      '<div class="tkGPh">' + esc(tenCoSo(g.coSoId)) + ' · ' + g.lan + ' lần sửa</div></div>' +
      '<b class="tkGTien">' + tkTien(g.tien) + '</b></button>';
  }).join('') : '';

  /* bảng team */
  const tKs = Object.keys(s.tho).sort((a, b) => s.tho[b].xong - s.tho[a].xong);
  const bangTho = tKs.length ? '<table class="tkBang"><thead><tr>' +
    '<th>Kỹ thuật</th><th>Việc xong</th><th class="tkCot2">Đúng hẹn</th><th>Xong sau</th><th>Đang cầm</th><th>Giỏi nhất nhóm</th>' +
    '</tr></thead><tbody>' + tKs.map(t => {
      const x = s.tho[t];
      const pt = x.coHen ? Math.round(x.hen / x.coHen * 100) : -1;
      const gioi = Object.keys(x.nhom).sort((a, b) => x.nhom[b] - x.nhom[a])[0];
      return '<tr><td class="tkTen">' + esc(t) + '</td><td class="tkDam">' + x.xong + '</td>' +
        '<td><div class="tkHen"><div class="tkThanh"><i style="width:' + (pt < 0 ? 0 : pt) + '%;background:' +
        (pt >= 90 ? '#15803D' : pt >= 75 ? '#D97706' : '#DC2626') + '"></i></div>' +
        '<b class="tkPt ' + (pt < 0 ? 'tkMo' : pt >= 90 ? 'tot' : pt >= 75 ? 'vua' : 'kem') + '">' +
        (pt < 0 ? '—' : pt + '%') + '</b></div></td>' +
        '<td>' + (x.soNgay ? (x.ngay / x.soNgay).toFixed(1) + ' ngày' : '—') + '</td>' +
        '<td>' + x.cam + '</td><td class="tkMo">' + esc(gioi ? (tenNhom(gioi) || 'Khác') : '—') + '</td></tr>';
    }).join('') + '</tbody></table>' : '';

  const chonThang = [0, -1, -2].map(l => {
    const k = tkKhoang(l);
    return '<button class="btn ' + (TK_THANG === l ? 'pri' : 'v') + '" data-tkthang="' + l + '">Tháng ' + k.thang + '</button>';
  }).join('');

  moSheet(khungSheet('📊 Tổng kết tháng', 'Bản để chiếu lên màn hình trong cuộc họp · mọi số tính từ dữ liệu thật',
    '<div class="tkTrang">' +
    '<div class="tkChon">' + chonThang + '</div>' +
    bia +
    '<div class="tkKh"><b>NHỊP CẢ THÁNG</b><span>cột cam = báo mới · cột xanh = nghiệm thu xong · theo từng ngày</span></div>' +
    tkBieuDo(s) +
    tkDangNoi(s, tr) +
    /* việc tồn đặt NGAY SAU "điều đáng nói": hai phần này đi với nhau —
       một bên nói có chuyện gì, một bên nói chuyện đó nằm ở phiếu nào (12/10) */
    tkVeTon(ton) +
    '<div class="tkKh"><b>XU HƯỚNG 6 THÁNG</b><span>ba đường quy về cùng khung để xem hình dáng — bảng số bên dưới mới là trị số thật</span></div>' +
    tkDuong6(xh) +
    '<div class="tkKh"><b>TỪNG CƠ SỞ</b><span>' + csKs.length + ' cơ sở · xếp theo số việc báo trong tháng</span></div>' +
    '<div class="tkHai2"><div class="tkHop">' + bangCS + '</div>' +
    '<div class="tkHop">' + tkDonut(s) + topGian + '</div></div>' +
    tkVeTien(tien) +
    tkVeLap(lap) +
    (bangTho ? '<div class="tkKh"><b>TEAM KỸ THUẬT</b><span>' + tKs.length +
      ' người · tính trên việc đã nghiệm thu trong tháng</span></div><div class="tkHop">' + bangTho + '</div>' : '') +
    '</div>',
    '<button class="btn v" data-dongsheet="1">Đóng</button>' +
    '<button class="btn v" data-tkchieu="1" id="nutChieu">⛶ Chiếu</button>' +
    '<button class="btn v" data-tkcopy="1">📋 Copy chữ</button>' +
    /* 19/10: nhãn hai bản. Trên điện thoại câu dài "In / lưu PDF để trình chiếu"
       bị bóp còn 70px rồi xếp dọc bốn dòng, kéo cả dải chân lên 171px — gần
       một phần tư màn hình. Chữ ngắn thì bốn nút vừa đúng một hàng. */
    /* 20/10 — Trường: "trên điện thoại thì bỏ luôn mấy cái in và xuất đi, thừa
       thãi vô cùng". Đúng: in ra giấy hay mở PDF để chiếu họp là việc ngồi máy
       tính, cầm điện thoại không ai làm. Lớp chiPC ẩn nút trên điện thoại. */
    '<button class="btn pri tkIn chiPC" data-tkin="1">🖨 <span class="nhDai">In / lưu PDF để trình chiếu</span>' +
    '<span class="nhGon">In / PDF</span></button>'));
  sheetTo();
}

/* ============================================================
   CHẾ ĐỘ CHIẾU (16/10 — Trường: "dùng để chiếu slide mà bé tí thế này k ổn").
   Hai việc cùng lúc:
     ① hộp trượt phủ kín màn, bỏ viền bỏ góc bo — không phí một milimet nào
     ② gọi toàn màn hình thật của máy, mất luôn thanh địa chỉ và thanh tác vụ
   Cỡ chữ KHÔNG đặt cứng mà co theo bề ngang màn (clamp trong CSS): phòng họp
   mỗi nơi một máy chiếu, đặt cứng 18px thì màn to thành bé lại, màn bé lại
   tràn. Máy 1707px ra 18px, máy chiếu 1920px tự lên 20px.
   Esc là phím của trình duyệt, không web nào chặn được — nên phải có NÚT
   THOÁT rõ ràng trên màn, không bắt ai nhớ phím.
   Nghe fullscreenchange để người ta bấm Esc thì lớp .tkChieu cũng tự rơi ra,
   không thì thoát toàn màn hình rồi mà hộp vẫn phủ kín, nhìn như treo.
   ============================================================ */
function tkChieu() {
  const b = document.body;
  if (b.classList.contains('tkChieu')) return tkThoatChieu();
  b.classList.add('tkChieu');
  const el = document.documentElement;
  const xin = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (xin) { try { xin.call(el); } catch (e) { } }
  tkDoiNutChieu();
}
function tkThoatChieu() {
  document.body.classList.remove('tkChieu');
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    const thoat = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (thoat) { try { thoat.call(document); } catch (e) { } }
  }
  tkDoiNutChieu();
}
function tkDoiNutChieu() {
  const n = document.getElementById('nutChieu');
  if (n) n.textContent = document.body.classList.contains('tkChieu') ? '✕ Thoát chiếu' : '⛶ Chiếu';
}
/* bấm Esc → trình duyệt tự thoát toàn màn hình, mình phải gỡ lớp theo */
['fullscreenchange', 'webkitfullscreenchange'].forEach(t =>
  document.addEventListener(t, () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement &&
        document.body.classList.contains('tkChieu')) {
      document.body.classList.remove('tkChieu');
      tkDoiNutChieu();
    }
  }));

/* ============================================================
   IN RA GIẤY / LƯU PDF
   Mở cửa sổ mới chỉ chứa đúng bản báo cáo — in thẳng từ app thì dính cả thanh
   dưới, nút bấm, nền mờ. Cửa sổ mới thì trang in sạch, khổ ngang.
   ============================================================ */
function inTongKet() {
  const el = document.querySelector('.tkTrang');
  if (!el) return;
  const s = tkSo(TK_THANG);
  const w = window.open('', '_blank');
  if (!w) { nhac('Trình duyệt chặn cửa sổ mới — cho phép rồi bấm lại', 'do'); return; }
  const css = [...document.styleSheets].map(x => { try { return [...x.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
  w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
    '<title>Tong-ket-thang-' + s.k.thang + '-' + s.k.nam + '</title><style>' + css +
    '\nbody{margin:0;background:#fff;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '\n.tkTrang{max-width:1340px;margin:0 auto;padding:12px}' +
    '\n.tkChon,.tkGian{display:none}' +
    '\n@page{size:A4 landscape;margin:10mm}' +
    '\n@media print{.tkKh{break-after:avoid}.tkHop,.tkPh{break-inside:avoid}}' +
    '</style></head><body>' + el.outerHTML + '</body></html>');
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 600);
}

/* chữ thuần để dán vào Zalo — bản tháng, dài hơn bản tuần */
function chuTongKet() {
  const s = tkSo(TK_THANG);
  const d = ['📊 TỔNG KẾT KỸ THUẬT — THÁNG ' + s.k.thang + '/' + s.k.nam, ''];
  d.push('• Báo mới: ' + s.baoMoi.length + ' việc');
  d.push('• Nghiệm thu xong: ' + s.xong.length + ' việc');
  if (s.henPt >= 0) d.push('• Đúng hẹn: ' + s.henPt + '%' + (s.muon && s.muon.length ? ' (' + s.muon.length + ' việc xong muộn)' : ''));
  if (s.tbNgay >= 0) d.push('• Từ lúc báo tới lúc xong: ' + s.tbNgay.toFixed(1) + ' ngày');
  d.push('• Chi phí sửa: ' + tkTien(s.chiPhi));
  d.push('• Đang tồn: ' + s.ton.length + ' việc (' + s.chuaNhan.length + ' chưa ai nhận, ' + s.quaHan.length + ' quá hạn)');
  const csKs = Object.keys(s.cs).sort((a, b) => s.cs[b].bao - s.cs[a].bao);
  if (csKs.length) {
    d.push('', 'TỪNG CƠ SỞ (báo / xong / tồn / chi phí):');
    csKs.forEach(k => { const x = s.cs[k];
      d.push('· ' + tenCoSo(k) + ': ' + x.bao + ' / ' + x.xong + ' / ' + x.ton + (x.tien ? ' / ' + tkTien(x.tien) : '')); });
  }
  const tKs = Object.keys(s.tho).sort((a, b) => s.tho[b].xong - s.tho[a].xong);
  if (tKs.length) {
    d.push('', 'TEAM KỸ THUẬT (xong / đúng hẹn / đang cầm):');
    tKs.forEach(t => { const x = s.tho[t]; const pt = x.coHen ? Math.round(x.hen / x.coHen * 100) + '%' : '—';
      d.push('· ' + t + ': ' + x.xong + ' / ' + pt + ' / ' + x.cam); });
  }
  const gKs = Object.keys(s.gian).sort((a, b) => s.gian[b].tien - s.gian[a].tien).slice(0, 5);
  if (gKs.length) {
    d.push('', 'GIAN HÀNG TỐN NHẤT:');
    gKs.forEach((k, i) => { const g = s.gian[k];
      d.push((i + 1) + '. ' + tenCoSo(g.coSoId) + ' › ' + tenGianHang(g.gianHangId) + ': ' + tkTien(g.tien) + ' (' + g.lan + ' lần)'); });
  }
  const soi = (typeof radarSoi === 'function' ? radarSoi() : []).slice(0, 3);
  if (soi.length) {
    d.push('', '⚠ ĐIỀU ĐÁNG NÓI:');
    soi.forEach(x => d.push('· ' + x.nhan + (x.coSoId ? ' — ' + tenCoSo(x.coSoId) +
      (x.gianHangId ? ' › ' + tenGianHang(x.gianHangId) : '') : '') + ': ' +
      String(x.ket).replace(/<[^>]+>/g, '')));
  }
  return d.join('\n');
}
