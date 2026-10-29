/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Bộ thay việc đang làm qua Zalo
   1) Tin thoại — giữ nút mic nói một câu, khỏi gõ
   2) Gọi điện thẳng từ phiếu — cho việc gấp
   3) Chia sẻ phiếu — copy gọn nội dung để dán sang Zalo,
      hoặc mở bảng chia sẻ của điện thoại
   4) Dọn kho theo chu kỳ 6 tháng (đếm trước, xoá sau)
   ============================================================ */
'use strict';

/* ================= 1) TIN THOẠI ================= */
const A = { dong: null, ghi: null, mieng: [], batDau: 0, dem: null };
const THOAI_TOI_DA = 60;

async function moGhiAm() {
  if (!navigator.mediaDevices || !window.MediaRecorder) { nhac('Máy này không ghi âm được trong web', 'do'); return; }
  try {
    A.dong = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) { nhac('Không mở được micro — kiểm tra quyền', 'do'); return; }

  let d = document.getElementById('ghiAm');
  if (!d) { d = document.createElement('div'); d.id = 'ghiAm'; d.className = 'ghiAmHop'; document.body.appendChild(d); }
  d.innerHTML =
    '<div class="gaTren"><span class="gaDo"></span><b id="gaDem">0:00 / 0:' + THOAI_TOI_DA + '</b>' +
    '<span class="gaS">Đang ghi — nói xong bấm Gửi</span></div>' +
    '<div class="gaSong" id="gaSong">' + Array.from({ length: 22 }, () => '<i></i>').join('') + '</div>' +
    '<div class="gaChan"><button class="btn v" data-gahuy="1">Xoá</button>' +
    '<button class="btn pri" data-gagui="1">➤ Gửi tin thoại</button></div>';

  const k = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(x => MediaRecorder.isTypeSupported(x)) || '';
  A.ghi = new MediaRecorder(A.dong, Object.assign({ audioBitsPerSecond: 64000 }, k ? { mimeType: k } : {}));
  A.mieng = [];
  A.ghi.ondataavailable = e => { if (e.data && e.data.size) A.mieng.push(e.data); };
  A.ghi.onstop = xongGhiAm;
  A.ghi.start(500);
  A.batDau = Date.now();
  A.dem = setInterval(() => {
    const g = Math.floor((Date.now() - A.batDau) / 1000);
    const el = document.getElementById('gaDem');
    if (el) el.textContent = '0:' + String(g).padStart(2, '0') + ' / 0:' + THOAI_TOI_DA;
    const so = document.getElementById('gaSong');
    if (so) [].forEach.call(so.children, (i, k2) => { i.style.height = (5 + Math.round(Math.random() * 22)) + 'px'; });
    if (g >= THOAI_TOI_DA) dungGhiAm();
  }, 200);
}
function dungGhiAm() { clearInterval(A.dem); if (A.ghi && A.ghi.state !== 'inactive') A.ghi.stop(); }
function huyGhiAm() {
  clearInterval(A.dem);
  A.huy = true;
  if (A.ghi && A.ghi.state !== 'inactive') A.ghi.stop();
  dongGhiAm();
}
function dongGhiAm() {
  clearInterval(A.dem);
  if (A.dong) A.dong.getTracks().forEach(t => t.stop());
  A.dong = null;
  const d = document.getElementById('ghiAm'); if (d) d.remove();
}
async function xongGhiAm() {
  const huy = A.huy; A.huy = false;
  const kieu = (A.ghi && A.ghi.mimeType || 'audio/webm').split(';')[0];
  const blob = new Blob(A.mieng, { type: kieu });
  const giay = Math.round((Date.now() - A.batDau) / 1000);
  A.mieng = []; A.ghi = null;
  dongGhiAm();
  if (huy || !blob.size || giay < 1) return;
  if (!PH) { nhac('Không rõ đang nhắn cho phiếu nào', 'do'); return; }
  batLuu();
  nhac('Đang gửi tin thoại ' + giay + ' giây…', 'canh');
  try {
    const url = await taiLen(blob, PH.id, kieu);
    await nhanTin(PH, '🎤 Tin thoại ' + giay + ' giây', [url]);
    veNgan();
    nhac('Đã gửi tin thoại', 'la');
  } catch (e) { nhac(e.message || 'Gửi tin thoại không được', 'do'); }
  finally { tatLuu(); }
}

/* phát tin thoại trong khung chat */
function oThoai(u) {
  return '<div class="thoaiO"><audio src="' + esc(u) + '" controls preload="none"></audio></div>';
}

/* ================= 2) GỌI ĐIỆN ================= */
/* Số điện thoại lấy từ bảng co_so (cột dien_thoai nếu có) và kt_nguoi.
   Chưa có số thì hiện nút mờ, vào Quản lý điền. */
function soDT(nguoiTen, coSoId) {
  const a = D.ai.find(x => x.ten === nguoiTen);
  if (a && a.dt) return a.dt;
  const c = D.cosos.find(x => x.id === coSoId);
  if (c && c.dt) return c.dt;
  return '';
}
function nutGoi(p) {
  const ds = [];
  if (laTho()) {
    const dt = soDT(p.nguoiTao, p.coSoId);
    ds.push(['Gọi cơ sở', dt, tenCoSo(p.coSoId)]);
  } else {
    const dt = soDT(p.nguoiNhanKt, null);
    if (p.nguoiNhanKt) ds.push(['Gọi ' + p.nguoiNhanKt, dt, 'kỹ thuật']);
  }
  return ds.filter(x => x[1]).map(x =>
    '<a class="btn v" href="tel:' + esc(x[1]) + '">📞 ' + esc(x[0]) + '</a>').join('');
}

/* ================= 3) CHIA SẺ PHIẾU ================= */
function chuPhieu(p) {
  const d = [];
  d.push('【' + p.id + '】 ' + p.noiDung);
  d.push('Cơ sở: ' + tenCoSo(p.coSoId) + (tenGianHang(p.gianHangId) ? ' · ' + tenGianHang(p.gianHangId) : ''));
  d.push('Mức độ: ' + (MUC_DO[p.mucDo] || {}).ten + ' · Nhóm: ' + (NHOM_LOI[p.nhomLoi] || ''));
  d.push('Cơ sở báo: ' + ddyy(p.ngayBao) + (p.mongMuon ? ' · mong muốn xong ' + ddyy(p.mongMuon) : ''));
  if (p.nguoiNhanKt) d.push('Kỹ thuật nhận: ' + p.nguoiNhanKt + (p.duKien ? ' · hẹn xong ' + ddyy(p.duKien) : ''));
  if (p.dangVuong) d.push('Đang vướng: ' + (VUONG[p.dangVuong] || {}).ten + (p.vuongGhi ? ' — ' + p.vuongGhi : ''));
  const tre = soNgayTre(p);
  if (tre) d.push('⚠ QUÁ HẠN ' + tre + ' NGÀY');
  d.push('Trạng thái: ' + (TT[p.trangThai] || {}).ten);
  if ((p.nguoiSua || []).length) d.push('Người sửa: ' + p.nguoiSua.join(', ') + (p.ngayXong ? ' · xong ' + ddyy(p.ngayXong) : ''));
  if (p.chiPhi) d.push('Chi phí: ' + tien(p.chiPhi) + '₫');
  if (p.chtKetQua === 'dat') d.push('CHT xác nhận ĐẠT: ' + p.chtNguoi);
  d.push('');
  d.push('Xem phiếu: ' + location.origin + '/?p=' + p.id);
  return d.join('\n');
}
async function chiaSePhieu() {
  if (!PH) return;
  const chu = chuPhieu(PH);
  if (navigator.share) {
    try { await navigator.share({ title: PH.id + ' · ' + PH.noiDung, text: chu }); return; } catch (e) { }
  }
  if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(chu); nhac('Đã copy nội dung phiếu — dán vào Zalo là xong', 'la'); return; } catch (e) { }
  }
  moSheet(khungSheet('Nội dung phiếu', 'Bấm giữ để copy rồi dán sang Zalo',
    '<textarea class="ip" style="min-height:220px;font-size:12.5px">' + esc(chu) + '</textarea>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   MỞ ĐÚNG PHIẾU KHI VÀO BẰNG LINK ?p=KT-0084

   XOÁ MÃ KHỎI ĐỊA CHỈ NGAY SAU KHI MỞ (28/10 — Trường: "mỗi lần tải lại
   trang là tự hiện cái phiếu này lên"). Link chia sẻ chỉ dùng được MỘT lần,
   đúng lần vào đó; sau đó địa chỉ sạch nên F5 hay mở lại app không còn lôi
   phiếu cũ ra nữa.

   Đây là lớp chặn thứ hai. Lớp thứ nhất nằm ở dongNgan() trong kt-form.js —
   đóng phiếu là gỡ mã. Phải có cả hai: lớp kia lo đường đóng phiếu bình
   thường, lớp này lo mấy địa chỉ đã lỡ dính mã từ trước.
   ============================================================ */
function moTheoLink() {
  const id = new URLSearchParams(location.search).get('p');
  if (!id) return;
  const p = phieu(id);
  if (p) moChiTiet(id);
  else nhac('Không thấy phiếu ' + id + ' — có thể ở tháng khác, bấm "Cả năm"', 'canh');
  if (typeof xoaMaPhieuTrenLink === 'function') setTimeout(xoaMaPhieuTrenLink, 80);
}

/* ============================================================
   BÁO CÁO HỌP (KT-38, Trường chốt 01/09) — vai quản lý.
   Bấm 1 phát ra bảng tuần/tháng: báo – xong – tồn theo cơ sở, thợ gánh việc,
   chi phí, quá hạn. Có nút copy CHỮ để dán thẳng vào Zalo nhóm họp.
   ============================================================ */
let BC_KY = 'tuan';
function bcKhoang(ky) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const thu = (d.getDay() + 6) % 7;               /* 0 = thứ 2 */
  const dauTuan = d.getTime() - thu * 86400000;
  if (ky === 'truoc') return { d1: dauTuan - 7 * 86400000, d2: dauTuan, ten: 'Tuần trước' };
  if (ky === 'thang') return { d1: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), d2: Date.now() + 1, ten: 'Tháng này' };
  return { d1: dauTuan, d2: Date.now() + 1, ten: 'Tuần này' };
}
function bcSo(ky) {
  const k = bcKhoang(ky);
  const tat = phieuThat();
  const trong = p => p.ngayBao >= k.d1 && p.ngayBao < k.d2;
  const xongTrong = p => p.trangThai === 'nghiemthu' && p.chtLuc >= k.d1 && p.chtLuc < k.d2;
  const dangSong = p => !['nghiemthu', 'huy'].includes(p.trangThai);
  const baoMoi = tat.filter(trong);
  const xong = tat.filter(xongTrong);
  const ton = tat.filter(dangSong);
  const quaHan = ton.filter(p => soNgayTre(p) > 0);
  const chuaNhan = ton.filter(p => p.trangThai === 'moi');
  const chiPhi = xong.reduce((s, p) => s + (Number(p.chiPhi) || 0), 0);
  /* 3 thứ Trường chốt thêm 08/09 */
  const lauNhat = quaHan.slice().sort((a, b) => soNgayTre(b) - soNgayTre(a)).slice(0, 3)
    .map(p => ({ id: p.id, coSo: tenCoSo(p.coSoId), noiDung: p.noiDung, tre: soNgayTre(p) }));
  const demNhom = {};
  baoMoi.forEach(p => { const k2 = p.nhomLoi || 'khac'; demNhom[k2] = (demNhom[k2] || 0) + 1; });
  const nhomTop = Object.keys(demNhom).sort((a, b) => demNhom[b] - demNhom[a]).slice(0, 3)
    .map(k2 => ({ ten: tenNhom(k2), so: demNhom[k2] }));
  const theoCS = {};
  baoMoi.forEach(p => { (theoCS[p.coSoId] = theoCS[p.coSoId] || { bao: 0, xong: 0, ton: 0 }).bao++; });
  xong.forEach(p => { (theoCS[p.coSoId] = theoCS[p.coSoId] || { bao: 0, xong: 0, ton: 0 }).xong++; });
  ton.forEach(p => { (theoCS[p.coSoId] = theoCS[p.coSoId] || { bao: 0, xong: 0, ton: 0 }).ton++; });
  const theoTho = {};
  xong.forEach(p => (p.nguoiSua || []).forEach(t => { (theoTho[t] = theoTho[t] || { xong: 0, cam: 0 }).xong++; }));
  ton.forEach(p => {
    (p.nguoiSua && p.nguoiSua.length ? p.nguoiSua : (p.nguoiNhanKt ? [p.nguoiNhanKt] : []))
      .forEach(t => { (theoTho[t] = theoTho[t] || { xong: 0, cam: 0 }).cam++; });
  });
  return { k, baoMoi, xong, ton, quaHan, chuaNhan, chiPhi, theoCS, theoTho, lauNhat, nhomTop };
}
/* kỳ LIỀN TRƯỚC cùng độ dài — để mọi con số có mũi tăng/giảm (Trường chốt 08/09).
   Không có kỳ trước (kho mới) thì trả null, chỗ nào cũng im lặng bỏ mũi. */
function bcSoTruoc(ky) {
  const k = bcKhoang(ky);
  const dai = k.d2 - k.d1;
  const d1 = k.d1 - dai, d2 = k.d1;
  const tat = phieuThat();
  const bao = tat.filter(p => p.ngayBao >= d1 && p.ngayBao < d2).length;
  const xong = tat.filter(p => p.trangThai === 'nghiemthu' && p.chtLuc >= d1 && p.chtLuc < d2);
  return { bao: bao, xong: xong.length, chiPhi: xong.reduce((s, p) => s + (Number(p.chiPhi) || 0), 0) };
}
/* mũi so kỳ trước: nhiều lỗi hơn là ĐỎ, xong nhiều hơn là XANH (tuỳ hướng tốt) */
function bcMui(nay, truoc, tangLaTot) {
  if (truoc === undefined || truoc === null) return '';
  const d = nay - truoc;
  if (!d) return '<em class="bcMui bang">không đổi</em>';
  const tot = tangLaTot ? d > 0 : d < 0;
  return '<em class="bcMui ' + (tot ? 'tot' : 'do') + '">' + (d > 0 ? '▲' : '▼') +
    Math.abs(d) + ' <i>so kỳ trước</i></em>';
}
function chuBaoCao(ky) {
  const s = bcSo(ky);
  const d = ['📋 BÁO CÁO KỸ THUẬT — ' + s.k.ten.toUpperCase() + ' (' + ddyy(s.k.d1) + ' → ' + ddyy(Math.min(s.k.d2, Date.now())) + ')', ''];
  d.push('• Báo mới: ' + s.baoMoi.length + ' việc');
  d.push('• Đã nghiệm thu xong: ' + s.xong.length + ' việc' + (s.chiPhi ? ' · chi phí ' + tien(s.chiPhi) + '₫' : ''));
  d.push('• Đang tồn: ' + s.ton.length + ' việc (' + s.chuaNhan.length + ' chưa ai nhận, ' + s.quaHan.length + ' quá hạn)');
  if (s.nhomTop && s.nhomTop.length) d.push('• Nhóm lỗi hay lặp: ' + s.nhomTop.map(x => x.ten + ' ×' + x.so).join(' · '));
  if (s.lauNhat && s.lauNhat.length) {
    d.push('• Quá hạn lâu nhất:');
    s.lauNhat.forEach(x => d.push('   – ' + x.tre + ' ngày · ' + x.coSo + ' · ' + x.id + ' · ' + x.noiDung));
  }
  const cs = Object.keys(s.theoCS).sort((a, b) => s.theoCS[b].ton - s.theoCS[a].ton);
  if (cs.length) {
    d.push('', 'THEO CƠ SỞ (báo / xong / tồn):');
    cs.forEach(k2 => { const x = s.theoCS[k2]; d.push('· ' + tenCoSo(k2) + ': ' + x.bao + ' / ' + x.xong + ' / ' + x.ton); });
  }
  const tho = Object.keys(s.theoTho).sort((a, b) => s.theoTho[b].cam - s.theoTho[a].cam);
  if (tho.length) {
    d.push('', 'KỸ THUẬT (xong trong kỳ / đang cầm):');
    tho.forEach(t => { const x = s.theoTho[t]; d.push('· ' + t + ': ' + x.xong + ' / ' + x.cam); });
  }
  if (s.quaHan.length) {
    d.push('', '⚠ QUÁ HẠN:');
    s.quaHan.slice(0, 10).forEach(p => d.push('· ' + p.id + ' ' + p.noiDung + ' — ' + tenCoSo(p.coSoId) + ', trễ ' + soNgayTre(p) + ' ngày'));
  }
  return d.join('\n');
}
function formBaoCao(ky) {
  if (!laQuanLy()) return;
  BC_KY = ky || BC_KY;
  const s = bcSo(BC_KY);
  const chip = (k2, ten) => '<button class="btn ' + (BC_KY === k2 ? 'pri' : 'v') + '" data-bck="' + k2 + '" style="flex:1">' + ten + '</button>';
  const dong = (ten, gt, mau) => '<div class="d"><span>' + ten + '</span><b' + (mau ? ' style="color:' + mau + '"' : '') + '>' + gt + '</b></div>';
  const csRows = Object.keys(s.theoCS).sort((a, b) => s.theoCS[b].ton - s.theoCS[a].ton).map(k2 => {
    const x = s.theoCS[k2];
    return dong(tenCoSo(k2), x.bao + ' báo · ' + x.xong + ' xong · <i style="color:' + (x.ton ? '#B45309' : '#16A34A') + '">' + x.ton + ' tồn</i>');
  }).join('');
  const thoRows = Object.keys(s.theoTho).sort((a, b) => s.theoTho[b].cam - s.theoTho[a].cam).map(t => {
    const x = s.theoTho[t];
    return dong(t, x.xong + ' xong · ' + x.cam + ' đang cầm');
  }).join('');
  const tr = bcSoTruoc(BC_KY);
  /* thanh so sánh cho từng cơ sở: cơ sở tồn nhiều nhất dài nhất, nhìn là ra chỗ cháy */
  const tonMax = Math.max.apply(null, Object.keys(s.theoCS).map(k2 => s.theoCS[k2].ton).concat([1]));
  const csRows2 = Object.keys(s.theoCS).sort((a, b) => s.theoCS[b].ton - s.theoCS[a].ton).map(k2 => {
    const x = s.theoCS[k2];
    return '<div class="bcCS"><span>' + esc(tenCoSo(k2)) + '</span>' +
      '<i class="bcThanh"><b style="width:' + Math.round(x.ton / tonMax * 100) + '%;background:' +
      (x.ton ? '#F97316' : '#22C55E') + '"></b></i>' +
      '<u>' + x.bao + ' báo · ' + x.xong + ' xong · <b style="color:' + (x.ton ? '#B45309' : '#16A34A') + '">' + x.ton + ' tồn</b></u></div>';
  }).join('');
  const lauRows = s.lauNhat.map(x =>
    '<button class="bcLau" data-bcphieu="' + esc(x.id) + '"><b>' + x.tre + ' ngày</b>' +
    '<span>' + esc(x.noiDung) + '<i>' + esc(x.coSo) + ' · ' + esc(x.id) + '</i></span><span class="mui">›</span></button>').join('');
  const nhomRows = s.nhomTop.map(x => dong(esc(x.ten), x.so + ' việc')).join('');
  moSheet(khungSheet('Báo cáo họp', ddyy(s.k.d1) + ' → ' + ddyy(Math.min(s.k.d2, Date.now())) + ' · số liệu sống, bấm là có',
    '<div style="display:flex;gap:8px;margin-bottom:12px">' + chip('tuan', 'Tuần này') + chip('truoc', 'Tuần trước') + chip('thang', 'Tháng này') + '</div>' +
    '<div class="bcLuoi">' +
    '<div class="bcCot"><div class="bcNhan">TỔNG QUAN</div><div class="kh"><div class="kb">' +
    dong('Báo mới', s.baoMoi.length + ' việc' + bcMui(s.baoMoi.length, tr.bao, false)) +
    dong('Nghiệm thu xong', s.xong.length + ' việc' + bcMui(s.xong.length, tr.xong, true), '#16A34A') +
    dong('Chi phí kỳ này', (s.chiPhi ? tien(s.chiPhi) + '₫' : '0₫') + bcMui(Math.round(s.chiPhi / 1000), Math.round(tr.chiPhi / 1000), false).replace(/(\u25b2|\u25bc)(\d+)/, '$1$2k')) +
    dong('Đang tồn', s.ton.length + ' việc', s.ton.length ? '#B45309' : '#16A34A') +
    dong('— chưa ai nhận', s.chuaNhan.length, s.chuaNhan.length ? '#DC2626' : '') +
    dong('— quá hạn', s.quaHan.length, s.quaHan.length ? '#DC2626' : '') +
    '</div></div>' +
    (nhomRows ? '<div class="bcNhan">NHÓM LỖI HAY LẶP</div><div class="kh"><div class="kb">' + nhomRows + '</div></div>' : '') +
    '</div>' +
    '<div class="bcCot">' + (csRows2 ? '<div class="bcNhan">THEO CƠ SỞ</div><div class="kh"><div class="kb">' + csRows2 + '</div></div>' : '') + '</div>' +
    '<div class="bcCot">' +
    (thoRows ? '<div class="bcNhan">KỸ THUẬT</div><div class="kh"><div class="kb">' + thoRows + '</div></div>' : '') +
    (lauRows ? '<div class="bcNhan">QUÁ HẠN LÂU NHẤT — LÔI RA HỌP</div><div class="kh"><div class="kb">' + lauRows + '</div></div>' : '') +
    '</div></div>',
    '<button class="btn v" data-dongsheet="1">Đóng</button>' +
    '<button class="btn pri" data-bccopy="1" style="flex:1">📋 Copy chữ — dán vào Zalo họp</button>'));
  sheetTo();
}
async function copyBaoCao() {
  const chu = chuBaoCao(BC_KY);
  if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(chu); nhac('Đã copy báo cáo — dán vào Zalo là xong', 'la'); return; } catch (e) { }
  }
  moSheet(khungSheet('Báo cáo họp', 'Bấm giữ để copy',
    '<textarea class="ip" style="min-height:260px;font-size:12.5px">' + esc(chu) + '</textarea>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   LÝ LỊCH GIAN HÀNG (Trường chốt 01/09): bấm tên gian hàng trong thẻ phiếu →
   thấy 6 tháng qua hỏng mấy lần, ai sửa, tổng tốn bao nhiêu — để quyết
   "sửa tiếp hay thay mới". Bấm dòng nào mở phiếu đó.
   ============================================================ */
function formLyLich(ghId) {
  const gh = (D.gianhangs || []).find(g => g.id === ghId);
  if (!gh) return;
  const ds = phieuThat().filter(p => p.gianHangId === ghId).sort((a, b) => b.ngayBao - a.ngayBao);
  const tien2 = ds.reduce((s, p) => s + (Number(p.chiPhi) || 0), 0);
  const nhom = {};
  ds.forEach(p => { const k = p.nhomLoi || 'khac'; nhom[k] = (nhom[k] || 0) + 1; });
  const nhomTop = Object.keys(nhom).sort((a, b) => nhom[b] - nhom[a]).slice(0, 3)
    .map(k => tenNhom(k) + ' ×' + nhom[k]).join(' · ');
  const TT = { moi: ['Chưa nhận', '#DC2626'], tiepnhan: ['Đang sửa', '#B45309'], hoanthanh: ['Chờ CHT', '#0891B2'], nghiemthu: ['Xong', '#16A34A'], huy: ['Huỷ', '#94A3B8'] };
  moSheet(khungSheet('Lý lịch: ' + esc(gh.ten), esc(tenCoSo(gh.coSoId)) + ' · 6 tháng gần đây',
    '<div class="kh"><div class="kb">' +
    '<div class="d"><span>Số lần hỏng</span><b style="color:' + (ds.length >= 4 ? '#DC2626' : 'inherit') + '">' + ds.length + ' lần' + (ds.length >= 4 ? ' — cân nhắc thay mới' : '') + '</b></div>' +
    '<div class="d"><span>Tổng chi phí</span><b>' + (tien2 ? tien(tien2) + '₫' : '0₫') + '</b></div>' +
    (nhomTop ? '<div class="d"><span>Hay hỏng gì</span><b>' + esc(nhomTop) + '</b></div>' : '') +
    '</div></div>' +
    (ds.length ? '<div class="bcNhan">TỪNG LẦN</div>' + ds.map(p => {
      const t = TT[p.trangThai] || ['?', '#64748B'];
      return '<button class="llDong" data-moll="' + esc(p.id) + '">' +
        '<span class="ng">' + ddyy(p.ngayBao) + '</span>' +
        '<span class="nd">' + esc(p.noiDung) + (p.nguoiSua && p.nguoiSua.length ? '<i>' + esc(p.nguoiSua.join(', ')) + '</i>' : '') + '</span>' +
        '<span class="tt2"><b style="color:' + t[1] + '">' + t[0] + '</b>' + (p.chiPhi ? '<i>' + tien(p.chiPhi) + '₫</i>' : '') + '</span></button>';
    }).join('') : '<div class="rong">Chưa có phiếu nào cho gian hàng này trong 6 tháng.</div>'),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   4) DỌN DỮ LIỆU — TRƯỜNG TỰ CHỌN KHOẢNG (chốt 09/09)
   Trường: "tao muốn tao là người quyết định dọn, khi dọn thì xoá toàn bộ dữ
   liệu bao gồm phiếu và ảnh và video của quãng thời gian đó, phải có đo dung
   lượng iphone đã dùng hết bao nhiêu còn bao nhiêu, khi nào tao thích xoá thì
   tao xoá, xoá trong khoảng thời gian nào thì là việc của tao."
   Nên màn này có:
     · Kho máy chủ dùng bao nhiêu / còn bao nhiêu (R2 cho 10GB)
     · Máy này (web chiếm chỗ trên điện thoại) dùng bao nhiêu / còn bao nhiêu
     · Chọn khoảng NGÀY tự do, kèm nút nhanh (trước 3/6/12 tháng, cả năm cũ)
     · Xem trước: bao nhiêu phiếu, bao nhiêu tin, bao nhiêu ảnh/video, mấy MB
     · Tải bản lưu Excel trước khi xoá (dùng hay không là tuỳ)
     · Gõ XOA + vé PIN mới xoá — và xoá là MẤT HẲN
   ============================================================ */
const TRAN_KHO_MB = 10 * 1024;              /* R2 miễn phí 10GB */
let DK_TU = '', DK_DEN = '', DK_CO = null;
function ngayTruoc(thang) {
  const d = new Date(); d.setMonth(d.getMonth() - thang);
  return d.toISOString().slice(0, 10);
}
function ngayTruocNgay(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
const homNay = () => new Date().toISOString().slice(0, 10);
async function choMayNay() {
  try {
    const e = await navigator.storage.estimate();
    return { dung: e.usage || 0, tong: e.quota || 0 };
  } catch (x) { return null; }
}
function thanhDung(dung, tong, mau) {
  const pt = tong ? Math.min(100, Math.max(1, Math.round(dung / tong * 100))) : 0;
  return '<div class="dlThanh"><i style="width:' + pt + '%;background:' + mau + '"></i></div>';
}
const mbChu = b => b >= 1073741824 ? (Math.round(b / 1073741824 * 10) / 10) + ' GB'
  : (Math.round(b / 1048576 * 10) / 10) + ' MB';

async function formXoaKhoang(tu, den) {
  if (!laQuanLy()) return;
  DK_TU = tu || DK_TU || '2020-01-01';
  DK_DEN = den || DK_DEN || ngayTruoc(6);
  moSheet(khungSheet('🗑 Dọn dữ liệu cũ', 'Đang đếm…', (typeof khungXam === 'function' ? khungXam(3) : '<div class="dangTai">…</div>'),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  const [kho, may, r, coGi, rac, sl] = await Promise.all([
    fetch('/api/kho').then(x => x.json()).catch(() => null),
    choMayNay(),
    fetch('/api/xoa-khoang?tu=' + DK_TU + '&den=' + DK_DEN).then(x => x.json()).catch(() => ({ loi: 'không gọi được máy chủ' })),
    /* toàn bộ dữ liệu đang nằm trong khoảng nào — để khi khoảng chọn trống thì
       chỉ đúng cho Trường biết phải chọn mốc nào (10/09) */
    fetch('/api/xoa-khoang?tu=2020-01-01&den=2035-12-31').then(x => x.json()).catch(() => null),
    /* file mồ côi + danh sách bản sao lưu (20/10) */
    fetch('/api/rac?ngay=7').then(x => x.json()).catch(() => null),
    fetch('/api/sao-luu').then(x => x.json()).catch(() => null)
  ]);
  DK_CO = coGi && !coGi.loi ? coGi : null;
  if (r.loi) {
    moSheet(khungSheet('🗑 Dọn dữ liệu cũ', '', '<div class="rong"><b>' + esc(r.loi) + '</b></div>',
      '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
    return;
  }
  const khoDung = kho ? kho.dungLuong : 0;
  const khoTong = TRAN_KHO_MB * 1048576;
  /* HAI NHÓM MỐC (vá nhãn 10/09 — Trường bấm "3 tháng" tưởng là xoá 3 tháng
     GẦN NHẤT, còn tao làm là xoá cái CŨ HƠN 3 tháng, hai nghĩa ngược nhau nên
     bấm xong thấy phiếu nguyên xi). Giờ tách hẳn hai nhóm và ghi KÈM NGÀY THẬT
     để không thể hiểu sai:
       · DỌN CŨ       → xoá mọi thứ TRƯỚC ngày X
       · XOÁ GẦN ĐÂY  → xoá đúng N ngày vừa rồi (cái Trường đang cần) */
  const MOC = [[3, 'cũ hơn 3 tháng', '#ECFDF5', '#047857'], [6, 'cũ hơn 6 tháng', '#EFF6FF', '#1D4ED8'],
               [12, 'cũ hơn 1 năm', '#FFFBEB', '#B45309'], [24, 'cũ hơn 2 năm', '#FEF2F2', '#B91C1C']];
  const nhanh = MOC.map(m => {
    const moc = ngayTruoc(m[0]);
    const on = DK_TU === '2020-01-01' && DK_DEN === moc;
    return '<button class="dkThe' + (on ? ' on' : '') + '" data-dkmoc="' + m[0] + '"' +
      ' style="background:' + m[2] + '">' +
      '<b style="color:' + m[3] + '">' + m[1] + '</b>' +
      '<span>xoá mọi thứ trước ' + ddyy(new Date(moc).getTime()) + '</span></button>';
  }).join('');
  const GAN = [[7, '7 ngày vừa rồi'], [30, '30 ngày vừa rồi'], [90, '3 tháng vừa rồi'], [0, 'TẤT CẢ dữ liệu']];
  const ganDay = GAN.map(g => {
    const tu = g[0] ? ngayTruocNgay(g[0]) : '2020-01-01';
    const on = DK_TU === tu && DK_DEN === homNay();
    return '<button class="dkThe gan' + (on ? ' on' : '') + (g[0] ? '' : ' het') + '" data-dkgan="' + g[0] + '">' +
      '<b>' + g[1] + '</b><span>' + (g[0] ? 'từ ' + ddyy(new Date(tu).getTime()) + ' đến hôm nay'
        : 'xoá sạch mọi phiếu, mọi ảnh — cẩn thận') + '</span></button>';
  }).join('');
  const o3 = (ic, nen, mau, so, ten, phu) =>
    '<div class="dkKQ" style="background:' + nen + '"><span class="ic" style="color:' + mau + '">' + ic + '</span>' +
    '<b>' + so + '</b><span class="t">' + ten + '</span><em>' + phu + '</em></div>';

  moSheet(khungSheet('🗑 Dọn dữ liệu cũ',
    'Xoá phiếu lỗi, tin trao đổi và ảnh/video đã cũ cho hệ thống gọn nhẹ. Xoá rồi là KHÔNG khôi phục được.',
    /* ---- dung lượng ---- */
    '<div class="dlKhoi"><div class="dlDong"><span>Kho máy chủ (ảnh, video)</span>' +
    '<b>' + mbChu(khoDung) + ' <i>/ 10 GB</i></b></div>' +
    thanhDung(khoDung, khoTong, khoDung / khoTong > 0.8 ? 'var(--do)' : 'var(--pri)') +
    '<div class="dlPhu">' + (kho ? kho.soFile + ' file' : '—') + ' · còn trống ' +
    mbChu(Math.max(0, khoTong - khoDung)) + '</div>' +
    (may ? '<div class="dlDong" style="margin-top:11px"><span>Máy này (web chiếm chỗ)</span>' +
      '<b>' + mbChu(may.dung) + ' <i>/ ' + mbChu(may.tong) + '</i></b></div>' +
      thanhDung(may.dung, may.tong, 'var(--la)') +
      '<div class="dlPhu">còn trống ' + mbChu(Math.max(0, may.tong - may.dung)) +
      ' — chỗ này là ảnh chờ gửi và bản cache, không phải toàn bộ máy</div>' : '') + '</div>' +

    /* ============================================================
       BẢN SAO LƯU (20/10) — đặt NGAY TRÊN phần xoá, cố ý.
       Người ta mở màn này ra là để xoá; thấy ngay "có bản sao lúc nào" trước
       khi bấm thì yên tâm hơn, mà lỡ chưa có bản nào cũng biết đường dừng lại.
       ============================================================ */
    '<div class="dkKhoi"><div class="dkDau"><span class="ic">🛟</span>' +
    '<div><b>Bản sao lưu phần chữ</b><i>phiếu · tin nhắn · người · cơ sở — máy tự cất mỗi đêm</i></div></div>' +
    (sl && sl.ds && sl.ds.length
      ? '<div class="dkHai"><div><span>Bản mới nhất</span><b>' + esc(sl.ds[0].ten) + '</b></div>' +
        '<div><span>Đang giữ</span><b>' + sl.ds.length + ' bản</b></div></div>' +
        '<div class="dlPhu" style="margin:6px 0 9px">' + sl.ds[0].soPhieu + ' phiếu · ' +
        sl.ds[0].soTin + ' tin · ' + sl.ds[0].kb + ' KB — giữ ' + (sl.giu || 30) + ' bản gần nhất</div>' +
        '<button class="btn v" data-sltai="' + esc(sl.ds[0].ten) + '" style="width:100%">⬇ Tải bản ' +
        esc(sl.ds[0].ten) + ' về máy</button>'
      : '<div class="dkCanh"><span>!</span><div><b>Chưa có bản sao nào.</b>' +
        'Máy tự cất lúc 2 giờ sáng. Muốn có ngay thì bấm nút dưới.</div></div>') +
    '<button class="btn v" data-slchay="1" style="width:100%;margin-top:6px">🛟 Sao lưu ngay bây giờ</button>' +
    '</div>' +

    /* ============================================================
       DỌN FILE MỒ CÔI (20/10) — ảnh không phiếu nào dùng tới.
       Tách hẳn khỏi phần xoá theo khoảng ngày vì bản chất khác nhau: cái kia
       xoá phiếu lẫn ảnh, cái này CHỈ xoá file rác, không đụng một chữ nào.
       ============================================================ */
    (rac && !rac.loi && rac.soRac
      ? '<div class="dkKhoi"><div class="dkDau"><span class="ic">🧹</span>' +
        '<div><b>File không phiếu nào dùng</b><i>ảnh của phiếu đã xoá, hoặc gửi lên rồi bỏ</i></div></div>' +
        '<div class="dkHai"><div><span>Dọn được</span><b style="color:#B45309">' + rac.soRac + ' file · ' + rac.mbRac + ' MB</b></div>' +
        '<div><span>Đang dùng thật</span><b>' + rac.soDung + ' file · ' + rac.mbDung + ' MB</b></div></div>' +
        '<div class="dlPhu" style="margin:6px 0 9px">Chỉ xoá file cũ hơn 7 ngày và không có phiếu nào trỏ tới. ' +
        'Phiếu, tin nhắn, ảnh đang dùng — không đụng tới.</div>' +
        /* XEM TRƯỚC (20/10 — Trường hỏi "file rác đó là những file thật à hay
           file nào"). Bày ra ba thứ: rác nằm ngăn nào, tải lên tháng nào, và
           12 cái tên thật. Nhìn được mới bấm xoá được. */
        (rac.theoNgan && rac.theoNgan.length
          ? '<div class="dlPhu" style="margin-bottom:5px"><b>Nằm ở đâu:</b> ' +
            rac.theoNgan.map(x => esc(x.ten) + ' (' + x.so + ')').join(' · ') + '</div>' : '') +
        (rac.theoThang && rac.theoThang.length
          ? '<div class="dlPhu" style="margin-bottom:5px"><b>Tải lên tháng:</b> ' +
            rac.theoThang.map(x => esc(x.ten) + ' (' + x.so + ')').join(' · ') + '</div>' : '') +
        (rac.mau && rac.mau.length
          ? '<details style="margin:7px 0 9px"><summary style="font-size:11.5px;color:var(--pri);font-weight:800;cursor:pointer">' +
            'Xem thử ' + rac.mau.length + ' file đầu tiên</summary>' +
            '<div style="font-size:10.5px;color:var(--mo);line-height:1.7;padding:6px 0 0;word-break:break-all">' +
            rac.mau.map(m => '• ' + esc(m.khoa) + ' — ' + m.kb + ' KB · ' + m.luc +
              (m.laNho ? ' · bản nhỏ' : '')).join('<br>') + '</div></details>'
          : '') +
        '<button class="btn v" data-racxoa="1" style="width:100%;color:#B45309;border-color:#FCD34D">🧹 Dọn ' +
        rac.mbRac + ' MB file rác</button></div>'
      : '') +

    /* ---- chọn khoảng ---- */
    '<div class="dkKhoi"><div class="dkDau"><span class="ic"><img width="22" height="22" class="spIc" src="ic/sap-han.webp" alt="" loading="lazy"></span>' +
    '<div><b>Chọn khoảng thời gian</b><i>Bấm mốc nhanh, hoặc tự nhập ngày</i></div></div>' +
    '<div class="dkNhom">🧹 DỌN CŨ — giữ lại dữ liệu mới</div>' +
    '<div class="dkNhanh">' + nhanh + '</div>' +
    '<div class="dkNhom" style="margin-top:12px">🗑 XOÁ GẦN ĐÂY — xoá đúng mấy ngày vừa rồi</div>' +
    '<div class="dkNhanh">' + ganDay + '</div>' +
    '<div class="dkHoac"><span>HOẶC TỰ CHỌN NGÀY</span></div>' +
    '<div class="dkNgay"><label>Từ ngày<input type="date" class="ip" id="dk_tu" value="' + DK_TU + '"></label>' +
    '<label>Đến ngày<input type="date" class="ip" id="dk_den" value="' + DK_DEN + '"></label></div>' +
    '<button class="btn pri dkXem" data-dkxem="1">🔍 Xem dữ liệu sẽ dọn<i>đếm lại theo khoảng vừa chọn</i></button>' +
    '</div>' +

    /* ---- kết quả ---- */
    '<div class="dkKhoi"><div class="dkDau"><span class="ic"><img width="22" height="22" class="spIc" src="ic/tab-thongke.webp" alt="" loading="lazy"></span>' +
    '<div><b>Trong khoảng đã chọn</b><i>' + ddyy(new Date(DK_TU).getTime()) + ' → ' + ddyy(new Date(DK_DEN).getTime()) + '</i></div></div>' +
    '<div class="dkBa">' +
    o3('📄', '#EFF6FF', '#1D4ED8', r.soPhieu, 'Phiếu lỗi', 'sẽ xoá') +
    o3('💬', '#ECFDF5', '#047857', r.soTin, 'Tin trao đổi', 'sẽ xoá') +
    o3('🖼', '#F5F3FF', '#6D28D9', r.soFile, 'Ảnh &amp; video', r.mb + ' MB') +
    '</div>' +
    '<div class="dkHai"><div><span>Phiếu cũ nhất</span><b>' + (r.cuNhat ? ddyy(ms(r.cuNhat)) : '—') + '</b></div>' +
    '<div><span>Phiếu mới nhất</span><b>' + (r.moiNhat ? ddyy(ms(r.moiNhat)) : '—') + '</b></div></div></div>' +

    (r.soPhieu
      ? '<button class="btn v" data-dkluu="1" style="width:100%;margin-top:4px">📥 Tải bản lưu Excel trước khi xoá</button>' +
        '<div class="f" style="margin-top:11px"><label>GÕ CHỮ <i>XOA</i> ĐỂ XÁC NHẬN</label>' +
        '<input class="ip bb2" id="dk_xn" placeholder="XOA" style="text-transform:uppercase"></div>'
      : '<div class="dkCanh"><span>!</span><div><b>Khoảng này không có phiếu nào.</b>' +
        (DK_CO && DK_CO.soPhieu
          ? 'Dữ liệu của mày đang nằm từ <b>' + ddyy(ms(DK_CO.cuNhat)) + '</b> đến <b>' + ddyy(ms(DK_CO.moiNhat)) +
            '</b> (' + DK_CO.soPhieu + ' phiếu · ' + DK_CO.mb + ' MB). Muốn xoá mấy phiếu đó thì bấm nhóm <b>XOÁ GẦN ĐÂY</b> ở trên.'
          : 'Kho đang trống, chưa có gì để dọn.') + '</div></div>'),
    r.soPhieu
      ? '<button class="btn v" data-dongsheet="1">Huỷ</button>' +
        '<button class="btn do" id="dk_xoa">🗑 Xoá ' + r.soPhieu + ' phiếu<i>không khôi phục được</i></button>'
      : '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}
async function lamXoaKhoang() {
  const xn = (((document.getElementById('dk_xn') || {}).value) || '').trim().toUpperCase();
  if (xn !== 'XOA') { nhac('Gõ đúng chữ XOA để xác nhận', 'do'); return; }
  const b = document.getElementById('dk_xoa'); b.disabled = true; b.textContent = 'Đang xoá…';
  const r = await fetch('/api/xoa-khoang?tu=' + DK_TU + '&den=' + DK_DEN, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') },
    body: JSON.stringify({ xacNhan: 'XOA' })
  }).then(x => x.json()).catch(() => ({ loi: 'lỗi mạng' }));
  dongSheet();
  if (r.loi) return nhac(r.loi, 'do');
  nhac('Đã xoá hẳn ' + r.daXoa + ' phiếu · ' + r.daXoaTin + ' tin · ' + r.daXoaFile + ' file (' + r.mb + ' MB)', 'la');
  if (typeof taiHet === 'function') { await taiHet(); veHet(); }
}
/* ============================================================
   SAO LƯU + DỌN RÁC (20/10) — ba việc nhỏ của màn Dọn dữ liệu.
   ============================================================ */

/* chạy sao lưu ngay, không đợi 2 giờ sáng */
async function chaySaoLuuTay(nut) {
  if (nut) { nut.disabled = true; nut.textContent = 'Đang cất…'; }
  const r = await fetch('/api/sao-luu', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') },
    body: '{}'
  }).then(x => x.json()).catch(() => ({ loi: 'lỗi mạng' }));
  if (r.loi) { if (nut) { nut.disabled = false; nut.textContent = '🛟 Sao lưu ngay bây giờ'; } return nhac(r.loi, 'do'); }
  nhac('Đã cất bản sao: ' + r.soPhieu + ' phiếu · ' + r.soTin + ' tin · ' + r.kb + ' KB', 'la');
  formXoaKhoang(DK_TU, DK_DEN);          /* vẽ lại để thấy bản vừa cất */
}

/* tải một bản sao về máy. Đường này đòi vé nên không mở thẳng bằng thẻ <a>
   được — phải fetch kèm vé rồi tự dựng file. */
async function taiSaoLuu(ngay) {
  nhac('Đang lấy bản ' + ngay + '…', 'canh');
  try {
    const r = await fetch('/api/sao-luu-tai?t=' + encodeURIComponent(ngay), {
      headers: { 'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') }
    });
    if (!r.ok) throw new Error('máy chủ trả ' + r.status);
    const b = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'ikid-sao-luu-' + ngay + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    nhac('Đã tải bản ' + ngay + ' về máy', 'la');
  } catch (e) {
    nhac('Không tải được: ' + (e.message || e), 'do');
  }
}

/* dọn file mồ côi — hỏi lại một câu rồi mới xoá */
async function donRac(nut) {
  const r0 = await fetch('/api/rac?ngay=7').then(x => x.json()).catch(() => null);
  if (!r0 || r0.loi) return nhac((r0 && r0.loi) || 'không gọi được máy chủ', 'do');
  if (!r0.soRac) return nhac('Không còn file rác nào', 'la');
  if (!confirm('Xoá ' + r0.soRac + ' file (' + r0.mbRac + ' MB) không phiếu nào dùng tới?\n\n' +
    'Phiếu, tin nhắn và ảnh đang dùng KHÔNG bị đụng tới.\nXoá rồi là không khôi phục được.')) return;
  if (nut) { nut.disabled = true; nut.textContent = 'Đang dọn…'; }
  const r = await fetch('/api/rac?ngay=7', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') },
    body: JSON.stringify({ xacNhan: 'XOA' })
  }).then(x => x.json()).catch(() => ({ loi: 'lỗi mạng' }));
  if (r.loi) { if (nut) { nut.disabled = false; nut.textContent = '🧹 Dọn file rác'; } return nhac(r.loi, 'do'); }
  nhac('Đã dọn ' + r.daXoaFile + ' file, lấy lại ' + r.mb + ' MB', 'la');
  formXoaKhoang(DK_TU, DK_DEN);
}

/* xuất Excel những phiếu SẮP xoá — bản lưu để giữ lại trước khi mất hẳn */
function luuTruocXoa() {
  if (typeof xuatExcel !== 'function') return nhac('Bản này không có sẵn máy xuất Excel', 'canh');
  const tu = DK_TU + 'T00:00:00.000Z', den = DK_DEN + 'T23:59:59.999Z';
  const ds = (D.phieu || []).filter(p => {
    const t = p.ngayBao || p.ngay_tao || '';
    return t >= tu && t <= den;
  });
  if (!ds.length) return nhac('Máy này chưa tải phiếu của khoảng đó (web chỉ giữ 180 ngày gần nhất)', 'canh');
  xuatExcel(ds, 'ban-luu-' + DK_TU + '_' + DK_DEN);
}

/* ================= 4b) DỌN KHO 6 THÁNG (đường cũ, chỉ xoá file) ================= */
async function formDonKho() {
  if (!laQuanLy()) return;
  moSheet(khungSheet('Dọn kho ảnh &amp; video', 'Đang đếm…', (typeof khungXam === 'function' ? khungXam(3) : '<div class="dangTai">…</div>'),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  const r = await fetch('/api/don-kho?thang=6').then(x => x.json()).catch(() => ({ loi: 'không gọi được' }));
  if (r.loi) { moSheet(khungSheet('Dọn kho', '', '<div class="rong"><b>' + esc(r.loi) + '</b>Bật R2 trước đã.</div>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>')); return; }
  moSheet(khungSheet('Dọn kho ảnh &amp; video', 'Chu kỳ 6 tháng — xoá file cũ hơn 6 tháng',
    '<div class="kh"><div class="kb">' +
    '<div class="d"><span>Sẽ xoá</span><b style="color:#B91C1C">' + r.seXoa + ' file · ' + r.seXoaMb + ' MB</b></div>' +
    '<div class="d"><span>File cũ nhất</span><b>' + (r.cuNhat ? ddyy(ms(r.cuNhat)) : '—') + '</b></div>' +
    '<div class="d"><span>Giữ lại</span><b>' + r.conLai + ' file · ' + r.conLaiMb + ' MB</b></div>' +
    '</div></div>' +
    '<div class="hop-canh">Phiếu và mọi dòng chữ <b>không mất</b> — chỉ ảnh/video cũ hơn 6 tháng bị xoá khỏi kho. ' +
    'Chỗ ảnh đã dọn sẽ hiện nhãn "ảnh đã dọn theo chu kỳ" thay vì ảnh hỏng.</div>' +
    (r.seXoa ? '<div class="f" style="margin-top:12px"><label>GÕ CHỮ <i>XOA</i> ĐỂ XÁC NHẬN</label>' +
      '<input class="ip bb2" id="dk_xn" placeholder="XOA" style="text-transform:uppercase"></div>' : ''),
    r.seXoa
      ? '<button class="btn v" data-dongsheet="1">Huỷ</button><button class="btn do" id="dk_lam">Xoá ' + r.seXoa + ' file</button>'
      : '<button class="btn v" style="flex:1" data-dongsheet="1">Chưa có gì để dọn — Đóng</button>'));
}
async function lamDonKho() {
  const xn = (document.getElementById('dk_xn').value || '').trim().toUpperCase();
  if (xn !== 'XOA') { nhac('Gõ đúng chữ XOA để xác nhận', 'do'); return; }
  const b = document.getElementById('dk_lam'); b.disabled = true; b.textContent = 'Đang dọn…';
  const r = await fetch('/api/don-kho?thang=6', {
    method: 'POST', headers: { 'content-type': 'application/json',
      'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') },   /* vé PIN (01/09) */
    body: JSON.stringify({ xacNhan: 'XOA' })
  }).then(x => x.json()).catch(() => ({ loi: 'lỗi mạng' }));
  dongSheet();
  if (r.loi) nhac(r.loi, 'do');
  else nhac('Đã dọn ' + r.daXoa + ' file · ' + r.daXoaMb + ' MB', 'la');
}

/* ================= SỰ KIỆN ================= */
document.addEventListener('click', e => {
  const t = e.target.closest('button,a'); if (!t) return;
  const d = t.dataset || {};
  if (d.thoai) return moGhiAm();
  if (d.gagui) return dungGhiAm();
  if (d.gahuy) return huyGhiAm();
  if (d.chiase) return chiaSePhieu();
  if (d.donkho) { dongSheet(); return formXoaKhoang(); }
  /* mốc nhanh: từ 01/01/2020 (trước cả web) tới mốc đã chọn — khỏi hiện ngày
     1976 trông như lỗi */
  if (d.dkmoc) { DK_TU = '2020-01-01'; DK_DEN = ngayTruoc(Number(d.dkmoc)); return formXoaKhoang(DK_TU, DK_DEN); }
  if (d.dkgan !== undefined) {
    const n = Number(d.dkgan);
    DK_TU = n ? ngayTruocNgay(n) : '2020-01-01'; DK_DEN = homNay();
    return formXoaKhoang(DK_TU, DK_DEN);
  }
  if (d.dkxem) {
    const t = (document.getElementById('dk_tu') || {}).value || DK_TU;
    const n = (document.getElementById('dk_den') || {}).value || DK_DEN;
    return formXoaKhoang(t, n);
  }
  if (d.dkluu) return luuTruocXoa();
  /* sao lưu + dọn rác (20/10) */
  if (d.slchay) return chaySaoLuuTay(t);
  if (d.sltai) return taiSaoLuu(String(d.sltai));
  if (d.racxoa) return donRac(t);
  if (t.id === 'dk_xoa') return lamXoaKhoang();      /* xoá hẳn một khoảng (09/09) */
  if (t.id === 'dk_lam') return lamDonKho();
});

/* ảnh đã bị dọn thì hiện nhãn, không để ô hỏng */
document.addEventListener('error', e => {
  const el = e.target;
  if (el && el.tagName === 'IMG' && /\/anh\//.test(el.src || '')) {
    /* BẢN NHỎ chưa lên (nó gửi sau bản nét, mạng yếu có thể chưa tới) → lùi về
       BẢN NÉT thay vì dán nhãn "đã dọn" làm người dùng tưởng mất ảnh (07/09) */
    if (/-nho\.\w+(\?|$)/i.test(el.src) && !el.dataset.daLui) {
      el.dataset.daLui = '1';
      el.src = el.src.replace(/-nho(\.\w+)(\?|$)/i, '$1$2');
      return;
    }
    el.style.display = 'none';
    const cha = el.parentElement;
    if (cha && !cha.querySelector('.anhDon')) {
      /* ============================================================
         NÓI ĐÚNG LÝ DO ẢNH KHÔNG HIỆN (20/09 — Trường chụp màn hình phiếu
         KT-0019 thấy bốn ô ghi "ảnh đã dọn theo chu kỳ" trong khi ảnh VẪN
         NẰM NGUYÊN trên kho).
         Ảnh đuôi .heic là ảnh gốc iPhone; Chrome trên Windows/Android và cả
         webview trong Zalo đều không giải mã được, nên thẻ <img> báo lỗi y
         như ảnh đã bị xoá. Dán nhãn "đã dọn" là nói sai — người xem tưởng
         mất bằng chứng, trong khi chỉ cần bấm để tải về là xem được.
         ============================================================ */
      const s = document.createElement('span');
      if (/\.(heic|heif)(\?|$)/i.test(el.src || '')) {
        s.className = 'anhDon heic';
        s.innerHTML = 'Ảnh iPhone (HEIC)<i>Máy này không mở được — bấm để tải về</i>';
        const u = el.src;
        if (cha.tagName !== 'A') {
          s.style.cursor = 'pointer';
          s.onclick = ev => { ev.stopPropagation(); try { window.open(u, '_blank'); } catch (x) { } };
        }
      } else {
        s.className = 'anhDon';
        s.textContent = 'ảnh đã dọn theo chu kỳ';
      }
      cha.appendChild(s);
    }
  }
}, true);

/* ============================================================
   HIỆU SUẤT KỸ THUẬT + MÁY CHIA VIỆC (Trường chốt 04/09)
   Toàn bộ tính ngay trong máy từ dữ liệu phiếu — không gọi dịch vụ
   ngoài, không tốn phí, số liệu công ty không chảy đi đâu.
   ============================================================ */
const daXong2 = p => p.trangThai === 'hoanthanh' || p.trangThai === 'nghiemthu';
const cuaTho = (p, ten) => (p.nguoiSua || []).length ? p.nguoiSua.includes(ten) : p.nguoiNhanKt === ten;

/* số liệu 1 kỹ thuật trong THÁNG ĐANG XEM + tải hiện tại (mọi tháng) */
function soHieuSuat() {
  /* đếm theo NGÀY BÁO (01/10) — hiệu suất tháng 9 phải giữ nguyên con số cũ */
  const thang = phieuThat().filter(trongThangBao).filter(p => p.trangThai !== 'huy');
  const tat = phieuThat().filter(p => p.trangThai !== 'huy');
  return dsTho().map(t => {
    const ten = t.ten;
    const xong = thang.filter(p => daXong2(p) && cuaTho(p, ten));
    const coHen = xong.filter(p => p.duKien && p.ngayXong);
    const dungHen = coHen.filter(p => p.ngayXong <= p.duKien + NGAY - 1).length;
    const coTb = xong.filter(p => p.nhanLuc && p.ngayXong && p.ngayXong >= p.nhanLuc);
    const tb = coTb.length ? coTb.reduce((s, p) => s + (p.ngayXong - p.nhanLuc), 0) / coTb.length / NGAY : 0;
    const om = tat.filter(p => (p.trangThai === 'tiepnhan' || duocGiao(p)) && p.nguoiNhanKt === ten);
    /* 4 cột thêm cho bản máy tính (Trường chốt 08/09) — đều tính từ chính các phiếu:
       Nhận = việc người này nhận trong tháng (đo mức chủ động, khác Xong)
       Chi phí = tiền linh kiện + công của các việc người này làm xong
       Giỏi nhóm lỗi = nhóm lỗi người này xử nhiều nhất từ đầu đến giờ */
    const nhan = thang.filter(p => p.nhanLuc && cuaTho(p, ten)).length;
    const chiPhi = xong.reduce((s, p) => s + (Number(p.chiPhi) || 0), 0);
    const dem = {};
    tat.filter(p => daXong2(p) && cuaTho(p, ten)).forEach(p => {
      const k = p.nhomLoi || 'khac'; dem[k] = (dem[k] || 0) + 1;
    });
    const kGioi = Object.keys(dem).sort((a, b) => dem[b] - dem[a])[0];
    return {
      ten: ten, mau: t.mau, xong: xong.length,
      henPt: coHen.length ? Math.round(dungHen / coHen.length * 100) : -1,
      tb: Math.round(tb * 10) / 10,
      traLai: thang.filter(p => p.chtKetQua === 'chua_dat' && p.trangThai === 'tiepnhan' && p.nguoiNhanKt === ten).length,
      om: om.length, tre: om.filter(p => soNgayTre(p) > 0).length,
      /* XONG MUỘN (19/09): việc đã đóng nhưng đóng sau ngày chính thợ tự hẹn.
         Khác cột "Quá hạn" — cột đó chỉ đếm việc ĐANG cầm mà đã trễ. */
      muon: xong.filter(p => typeof soNgayMuon === 'function' && soNgayMuon(p) > 0).length,
      nhan: nhan, chiPhi: chiPhi,
      gioi: kGioi ? tenNhom(kGioi) : '', gioiSo: kGioi ? dem[kGioi] : 0
    };
  }).sort((a, b) => b.xong - a.xong || b.henPt - a.henPt);
}

/* bảng hiệu suất dạng HTML — dùng chung cho ngăn (bấm nút) và khối phơi sẵn trên PC */
function hsBangHtml() {
  const ds = soHieuSuat();
  const hang = (r, i) => '<button class="hsHang' + (i === 0 && r.xong ? ' nhat' : '') + '" data-hskt="' + esc(r.ten) + '">' +
    veAv(r.ten, r.mau, anhCua(r.ten)) +
    '<b>' + (i === 0 && r.xong ? '🥇 ' : '') + esc(r.ten) + '</b>' +
    '<i>' + r.xong + '</i>' +
    '<i class="' + (r.henPt < 0 ? '' : (r.henPt >= 85 ? 'tot' : (r.henPt < 70 ? 'kem' : ''))) + '">' + (r.henPt < 0 ? '—' : r.henPt + '%') + '</i>' +
    '<i>' + (r.tb ? String(r.tb).replace('.', ',') + ' ng' : (r.xong ? '&lt;1 ng' : '—')) + '</i>' +
    '<i class="' + (r.traLai ? 'kem' : '') + '">' + r.traLai + '</i>' +
    '<i class="' + (r.tre ? 'kem' : '') + '">' + r.om + '</i>' +
    '<i class="cotTo">' + r.nhan + '</i>' +
    '<i class="cotTo ' + (r.tre ? 'kem' : '') + '">' + (r.tre || 0) + (r.tre ? '⚠' : '') + '</i>' +
    '<i class="cotTo ' + (r.muon ? 'kem' : '') + '">' + (r.muon || '—') + '</i>' +
    '<i class="cotTo">' + (r.chiPhi ? tienGon(r.chiPhi) : '—') + '</i>' +
    '<i class="cotTo cotNhom">' + (r.gioi ? esc(r.gioi) + (r.gioiSo > 1 ? ' ×' + r.gioiSo : '') : '—') + '</i></button>';
  return '<div class="hsDau"><span></span><b>Tên</b><i>Xong</i><i>Đúng hẹn</i><i>TB/việc</i><i>Trả lại</i><i>Đang ôm</i>' +
    '<i class="cotTo">Nhận</i><i class="cotTo">Quá hạn</i><i class="cotTo">Xong muộn</i>' +
    '<i class="cotTo">Chi phí</i><i class="cotTo cotNhom">Giỏi nhóm lỗi</i></div>' +
    ds.map(hang).join('');
}
/* tiền viết gọn cho bảng: 1.200.000₫ → 1,2tr · 380.000₫ → 380k */
function tienGon(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return String(Math.round(n / 100000) / 10).replace('.', ',') + 'tr';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return String(n);
}
const HS_CHU = 'Đúng hẹn = xong trước hạn đã cam kết · Trả lại = việc CHT bấm Chưa đạt đang phải làm lại · Đang ôm và Quá hạn tính cả tháng khác · Nhận = việc bấm nhận trong tháng · Xong muộn = việc đã đóng nhưng đóng sau ngày tự hẹn · Chi phí = tiền của các việc đã xong';
function formHieuSuat() {
  moSheet(khungSheet('👷 Hiệu suất kỹ thuật', tenThangDai(L.thang) + ' — tính từ chính các phiếu, bấm tên xem chi tiết',
    hsBangHtml(),
    '<div style="font-size:11px;color:#94A3B8;padding:2px 4px">' + HS_CHU + '</div>'));
  sheetTo();
}

function formChiTietKT(ten) {
  /* chi tiết hiệu suất một người — cùng cách đếm với bảng hiệu suất (01/10) */
  const thang = phieuThat().filter(trongThangBao).filter(p => p.trangThai !== 'huy');
  const xong = thang.filter(p => daXong2(p) && cuaTho(p, ten));
  const demTheo = (ds, khoa, tenCua) => {
    const m = {};
    ds.forEach(p => { const k = khoa(p); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(k => [tenCua(k), m[k]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  const nhom = demTheo(xong, p => p.nhomLoi, k => NHOM_LOI[k] || k);
  const cs = demTheo(xong, p => p.coSoId, k => tenCoSo(k));
  const om = phieuThat().filter(p => (p.trangThai === 'tiepnhan' || duocGiao(p)) && p.nguoiNhanKt === ten);
  const tre = om.filter(p => soNgayTre(p) > 0);
  const day = (t, ds2) => '<div class="hsKhoi"><b>' + t + '</b>' +
    (ds2.length ? ds2.map(x => '<span>' + esc(x[0]) + ' <i>' + x[1] + '</i></span>').join('') : '<span style="color:#94A3B8">chưa có dữ liệu</span>') + '</div>';
  moSheet(khungSheet('👷 ' + esc(ten) + ' — ' + tenThangDai(L.thang), 'Xong ' + xong.length + ' việc · đang ôm ' + om.length + (tre.length ? ' · ⚠ ' + tre.length + ' việc trễ' : ''),
    day('HAY SỬA NHÓM LỖI', nhom) + day('HAY LÀM Ở CƠ SỞ', cs) +
    (tre.length ? '<div class="hsKhoi"><b style="color:#DC2626">⚠ ĐANG TRỄ HẸN</b>' +
      tre.map(p => '<button class="llDong" data-moll="' + esc(p.id) + '">' + esc(p.noiDung) + ' <i>' + esc(p.id) + ' · trễ ' + soNgayTre(p) + ' ngày</i></button>').join('') + '</div>' : ''),
    '<button class="btn v" data-hieusuat="1">‹ Quay lại bảng</button>'));
}

/* ---------- chọn tay: giao phiếu này cho ai ---------- */
/* ============================================================
   CHẤM ĐIỂM TỪNG NGƯỜI CHO MỘT VIỆC (11/09) — một chỗ tính duy nhất, dùng
   chung cho cả máy gợi ý lẫn màn chọn người, để hai nơi không nói khác nhau.
   Tính từ dữ liệu có thật:
     · đang ôm mấy việc, mấy việc trễ        → tải
     · đã xong bao nhiêu việc CÙNG NHÓM LỖI  → nghề
     · có đang có việc ở CÙNG CƠ SỞ          → tiện đường
     · tỉ lệ đúng hẹn (từ 3 việc trở lên)    → tin cậy
     · lịch bận trong quãng phải làm         → loại xuống cuối
   ============================================================ */
function chamNguoi(p) {
  const tat = phieuThat().filter(q => q.trangThai !== 'huy');
  const homNay = ngayNgan(Date.now());
  const han = p && p.mongMuon ? ngayNgan(p.mongMuon) : homNay;
  const tu = homNay <= han ? homNay : han, den = homNay <= han ? han : homNay;
  return dsTho().map(t => {
    const ten = t.ten;
    const om = tat.filter(q => (q.trangThai === 'tiepnhan' || duocGiao(q)) && giaoChoToi(q, ten));
    const tre = om.filter(q => soNgayTre(q) > 0).length;
    const xong = tat.filter(q => daXong2(q) && cuaTho(q, ten));
    const coHen = xong.filter(q => q.duKien && q.ngayXong);
    const henPt = coHen.length >= 3
      ? Math.round(coHen.filter(q => q.ngayXong <= q.duKien + NGAY - 1).length / coHen.length * 100) : -1;
    const ngheSo = p ? xong.filter(q => q.nhomLoi === p.nhomLoi).length : 0;
    const tienDuong = p ? tat.filter(q => q.trangThai === 'tiepnhan' &&
      giaoChoToi(q, ten) && q.coSoId === p.coSoId).length : 0;
    /* 20/10: bỏ nhánh "né người đang bận" — lịch bận đã gỡ khỏi web, không
       còn chỗ nào nhập nên biến này vĩnh viễn rỗng. */
    let diem = 50 - om.length * 10 - tre * 6;
    const ly = [];
    if (ngheSo) { diem += 12 + Math.min(ngheSo, 6) * 2; ly.push({ ic: '🔧', chu: 'giỏi ' + String(NHOM_LOI[p.nhomLoi] || 'loại này').toLowerCase() + ' (' + ngheSo + ' việc)' }); }
    if (tienDuong) { diem += 10; ly.push({ ic: '📍', chu: 'đang có việc ở ' + tenCoSo(p.coSoId) }); }
    /* tỉ lệ đúng hẹn đã hiện ở góc phải mỗi dòng — không lặp lại thành chip */
    if (henPt >= 85) diem += 6;
    if (!om.length) { diem += 4; ly.push({ ic: '✓', chu: 'đang rảnh' }); }
    return { t: t, ten: ten, diem: diem, ly: ly, om: om.length, tre: tre,
      henPt: henPt, nghe: ngheSo, tienDuong: tienDuong, xong: xong.length };
  }).sort((a, b) => b.diem - a.diem);
}

/* ============================================================
   GIAO VIỆC — ADMIN TỰ BẤM CHỌN NGƯỜI (Trường chốt 11/09: "admin phải là
   người giao việc, admin chỉ định việc đấy 1 hay 2 hay tất cả thì chỉ việc
   bấm chọn rồi giao").
   Khác màn cũ: bấm tên là CHỌN (tích xanh), chọn được nhiều người, nút dưới
   đếm theo số đã chọn. Mỗi dòng ghi rõ đang ôm mấy việc và CÓ ĐANG BẬN KHÔNG
   (đi setup / nghỉ phép) — vẫn giao được, web chỉ cảnh báo đỏ.
   ============================================================ */
let CHON_GIAO = [];        /* tên những người đang được tích trong màn này */

function formChonTho(pid, gy) {
  const p = phieu(pid); if (!p) return;
  /* KHÔNG tích sẵn ai (Trường chốt 11/09). Máy vẫn xếp người hợp nhất lên đầu
     và đeo nhãn TỐT NHẤT để mắt biết nên chọn ai, nhưng quyết định là của
     admin — mở ra mà đã có tích sẵn thì dễ bấm nhầm thành giao cho 2 người.
     Ngoại lệ: phiếu ĐANG có người giữ thì tích sẵn đúng người đó, để nhìn ra
     ai đang cầm việc mà không phải nhớ. */
  /* 14/09: mở từ nút "＋ Thêm KT" trong màn chia việc thì TÍCH SẴN người máy
     vừa gợi ý — nút đó nghĩa là "giữ người này, thêm người nữa", mở ra trắng
     trơn là bắt admin chọn lại từ đầu. Mở từ trong phiếu vẫn không tích ai. */
  const san = String(gy || '').split(',').map(x => x.trim()).filter(Boolean);
  CHON_GIAO = p.nguoiNhanKt ? [p.nguoiNhanKt]
    : ((p.nguoiGiao || []).length ? (p.nguoiGiao || []).slice() : san);
  veChonTho(pid, gy);
}
function veChonTho(pid, gy) {
  const p = phieu(pid); if (!p) return;
  const cham = chamNguoi(p);
  const soChon = CHON_GIAO.length;

  /* một dòng người: tên · tải · mấy chip lý do · nhãn TỐT NHẤT ở dòng đầu */
  const dong = (x, totNhat) => {
    const chon = CHON_GIAO.indexOf(x.ten) >= 0;
    const tai = x.om ? x.om + ' việc đang làm' + (x.tre ? ' · <b style="color:#DC2626">' + x.tre + ' trễ</b>' : '')
      : 'chưa cầm việc nào';
    return '<button class="ngO' + (chon ? ' on' : '') +
      '" data-chongiao="' + esc(x.ten) + '">' +
      '<div class="ngAv">' + veAv(x.ten, x.t.mau, x.t.anh) + '</div>' +
      '<div class="ngNoi">' +
      '<div class="ngDau"><b>' + esc(x.ten) + '</b>' +
      (totNhat ? '<em class="ngTot">TỐT NHẤT</em>' : '') +
      (x.henPt >= 0 ? '<span class="ngHen">' + x.henPt + '% đúng hẹn</span>' : '') + '</div>' +
      '<div class="ngTai">' + tai + '</div>' +
      (x.ly.length ? '<div class="ngLy">' + x.ly.slice(0, 2).map(l =>
        '<span>' + l.ic + ' ' + esc(l.chu) + '</span>').join('') + '</div>' : '') +
      '</div>' + (chon ? '<span class="tic">✓</span>' : '') + '</button>';
  };

  moSheet(khungSheet(gy ? '＋ Thêm kỹ thuật cùng làm' : 'Giao việc cho ai?',
    [esc(p.noiDung), esc(tenCoSo(p.coSoId)), esc(NHOM_LOI[p.nhomLoi] || ''),
      p.mongMuon ? 'mong xong ' + ddyy(p.mongMuon) : ''].filter(Boolean).join(' · '),
    '<div class="nhomCd">NÊN GIAO — xếp theo mức hợp việc này</div>' +
    '<div class="ngLuoi">' + cham.map((x, i) => dong(x, i === 0)).join('') + '</div>' +
    '<button class="mn" data-chonhet="1" style="margin-top:8px">' +
    '<div class="ic" style="background:#EDE9FE;color:#6D28D9"><img width="22" height="22" class="mnIc" src="ic/av-nhom.webp" alt="" loading="lazy"></div>' +
    '<div><b>' + (soChon === cham.length ? 'Bỏ chọn tất cả' : 'Chọn cả team') + '</b>' +
    '<div class="s">' + cham.length + ' người</div></div></button>' +
    (soChon > 1
      ? '<div class="qlNhac">Giao cho <b>' + CHON_GIAO.map(esc).join(', ') + '</b> — cả nhóm nhận thông báo, ' +
        'ai bấm nhận thì việc về tay người đó và hẹn ngày.</div>'
      : '<div class="qlNhac">' + (soChon ? '<b>' + CHON_GIAO.map(esc).join(', ') + '</b> đang được tích sẵn — bấm thêm tên khác để giao cho cả nhóm, bấm vào tên đã tích để bỏ ra. ' : '') +
        'Bấm tên để chọn, bấm lại để bỏ — chọn được nhiều người. ' +
        'Thứ tự xếp theo: đang rảnh · giỏi loại lỗi này · tiện đường cùng cơ sở · hay đúng hẹn.</div>'),
    '<button class="btn v" data-dongsheet="1">Huỷ</button>' +
    '<button class="btn pri" style="flex:1"' + (soChon ? '' : ' disabled') + ' data-giaochon="' + esc(pid) + '">' +
    (soChon ? 'Giao cho ' + (soChon === 1 ? CHON_GIAO[0] : soChon + ' người') : 'Chưa chọn ai') + '</button>'));
}

/* ============================================================
   LỊCH BẬN — GỠ BỎ 20/10 (Trường: "bỏ lịch anh em đi").
   Dựng 11/09, hai màn: quản lý xem bảng tuần cả team, kỹ thuật tự báo bận.
   Đo sau hai tháng chạy thật: ĐÚNG 0 bản ghi. Không một ai nhập lấy một
   dòng, dù có tới ba cửa vào (nút cột trái, mục trong Thống kê, ô trong
   Trang cá nhân). Giữ lại chỉ là ba chỗ bấm dẫn vào một căn phòng trống.
   Gỡ ở đây: formLichTeam, formLichToi, ngayCuaTuan, LICH_TUAN, T_NGAY.
   KHÔNG đụng tới bảng kt_lich trên máy chủ — dữ liệu là việc của Trường,
   và nếu sau này cần dựng lại thì kho vẫn còn nguyên.
   ============================================================ */

/* ---------- máy gợi ý chia việc ---------- */
let GOI_Y = [];
function goiYChia() {
  const tat = phieuThat().filter(p => p.trangThai !== 'huy');
  /* Chỉ gợi ý phiếu CHƯA CÓ TÊN AI. Phiếu của cơ sở có kỹ thuật phụ trách đã
     mang sẵn tên người đó (11/09) — gợi ý giao tiếp cho người khác là giật
     việc khỏi tay người đang lo. Muốn đổi người thì vào phiếu, ⋯ → Đổi người. */
  /* ============================================================
     14/09 — Trường: "lỗi Huế vẫn bắt buộc hiện cho tao vì đôi khi tao cho
     người vào hỗ trợ".
     Trước đây màn này bỏ qua mọi phiếu đã mang tên ai, nên cơ sở có kỹ thuật
     phụ trách (Huế → anh Hiến) biến mất khỏi màn chia việc hoàn toàn — muốn
     thêm người phải đi tìm lại từng phiếu. Giờ giữ lại HẾT các phiếu chưa ai
     bấm nhận; phiếu đã có người giữ thì máy gợi ý người HỖ TRỢ (loại chính
     người đang giữ ra khỏi vòng chấm) và nút đổi thành "Thêm hỗ trợ".
     Vẫn chỉ lấy phiếu trạng thái 'moi': đã bấm nhận rồi thì người ta đang làm,
     không phải việc cần chia.
     ============================================================ */
  const cho = tat.filter(p => chuaAiNhan(p))
    .sort((a, b) => ((b.mucDo === 'khancap') - (a.mucDo === 'khancap')) || (soNgayTre(b) - soNgayTre(a)) || (a.ngayBao - b.ngayBao));
  const thos = dsTho();
  const tai = {};
  thos.forEach(t => { tai[t.ten] = tat.filter(q => (q.trangThai === 'tiepnhan' || duocGiao(q)) && q.nguoiNhanKt === t.ten).length; });
  const henPt = {};
  thos.forEach(t => {
    const xg = tat.filter(q => daXong2(q) && cuaTho(q, t.ten) && q.duKien && q.ngayXong);
    henPt[t.ten] = xg.length >= 3 ? xg.filter(q => q.ngayXong <= q.duKien + NGAY - 1).length / xg.length : -1;
  });
  return cho.slice(0, 12).map(p => {
    /* NÉ NGƯỜI ĐANG BẬN: gỡ 20/10 cùng với lịch bận. Dựng 11/09 theo yêu cầu
       "cần căn cứ cả vào lịch của ae báo cho tao", nhưng hai tháng không ai
       báo lịch lần nào nên nhánh này chưa từng chạy thật. */
    const homNay = ngayNgan(Date.now());
    /* p.mongMuon đã là MILI GIÂY (chuyenPhieu đổi rồi) — cộng thêm 'T00:00:00'
       là ra NaN và ngayNgan() nổ (bug tao tự tạo 11/09, test bắt được) */
    const hanXet = p.mongMuon ? ngayNgan(p.mongMuon) : homNay;
    const tuXet = homNay <= hanXet ? homNay : hanXet;
    const denXet = homNay <= hanXet ? hanXet : homNay;
    /* ai đang giữ phiếu này: người phụ trách cơ sở, hoặc nhóm đã được giao.
       Họ bị loại khỏi vòng chấm — gợi ý chính người đang giữ là vô nghĩa. */
    const giu = p.nguoiNhanKt ? [p.nguoiNhanKt] : ((p.nguoiGiao || []).slice());
    let tot = null;
    for (const t of thos) {
      const ten = t.ten;
      if (giu.indexOf(ten) >= 0) continue;
      let diem = -(tai[ten] || 0) * 10;
      const ly = [];
      const xn = tat.filter(q => daXong2(q) && q.nhomLoi === p.nhomLoi && cuaTho(q, ten)).length;
      if (xn) { diem += 12 + Math.min(xn, 6) * 2; ly.push('đã xong ' + xn + ' việc ' + String(NHOM_LOI[p.nhomLoi] || 'cùng loại').toLowerCase()); }
      const cungCS = tat.filter(q => q.trangThai === 'tiepnhan' && q.nguoiNhanKt === ten && q.coSoId === p.coSoId).length;
      if (cungCS) { diem += 10; ly.push('đang có việc ở ' + tenCoSo(p.coSoId) + ', tiện đường'); }
      if (henPt[ten] >= 0.85) { diem += 6; ly.push('hay đúng hẹn'); }
      if (!tot || diem > tot.diem) tot = { ten: ten, diem: diem, ly: ly };
    }
    /* cả team chỉ có đúng người đang giữ (đội 1 người, hoặc đã giao cho tất cả)
       → không còn ai để gợi ý hỗ trợ; thẻ khi đó chỉ còn nút mở màn chọn tay */
    if (!tot) tot = { ten: '', diem: 0, ly: [] };
    /* "đang rảnh nhất" tính trong nhóm không phải người đang giữ */
    const raOK = thos.filter(t => giu.indexOf(t.ten) < 0);
    if (tot.ten && raOK.length) {
      const itNhat = Math.min.apply(null, raOK.map(t => tai[t.ten] || 0));
      if ((tai[tot.ten] || 0) === itNhat) tot.ly.unshift('đang rảnh nhất');
    }
    if (tot.ten) tai[tot.ten] = (tai[tot.ten] || 0) + 1;   /* giao dồn thì gợi ý sau tự né người này */
    /* GIAN HÀNG (14/09 — Trường: "tên cơ sở và gian hàng đang bị nhỏ, phải nhìn
       rõ thì mới phân công chuẩn được ai đi sửa điểm nào"). Trước đây màn này
       chỉ lấy tên cơ sở, quên hẳn gian hàng — cái "Khoá – cửa – kho" trông
       giống địa điểm thật ra là NHÓM LỖI. Giao việc mà không biết gian nào thì
       thợ đến nơi vẫn phải hỏi lại. */
    return { id: p.id, noiDung: p.noiDung, coSo: tenCoSo(p.coSoId), coSoId: p.coSoId,
      giu: giu, gian: tenGianHang(p.gianHangId), khan: p.mucDo === 'khancap',
      muc: (MUC_DO[p.mucDo] || MUC_DO.binhthuong).ten, mongMuon: p.mongMuon || 0,
      nhom: NHOM_LOI[p.nhomLoi] || "",
      tre: soNgayTre(p), ten: tot.ten, ly: tot.ly.slice(0, 2).join(' · ') || 'chia đều tải' };
  });
}

/* ============================================================
   ĐỊA ĐIỂM TRONG MÀN PHÂN CHIA (14/09 — Trường chốt kiểu dải màu, đã bỏ hai
   kiểu kia). Cơ sở và gian hàng lên một dải màu riêng trên đầu thẻ: lướt ngón
   tay là mắt bắt được điểm ngay, khỏi phải đọc dòng xám. Thẻ bóp sát lại theo
   yêu cầu "thu nhỏ độ cao thẻ" — vẫn đủ chỗ cho địa điểm mà không cao hơn thẻ cũ.
   ============================================================ */
function gyNoi(g) {
  return '<span class="gyCS">' + esc(g.coSo) + '</span>' +
    (g.gian ? '<s>\u203a</s><span class="gyGH">' + esc(g.gian) + '</span>' : '');
}
function gyPhu(g) {
  return esc(g.id) + (g.nhom ? ' \u00b7 ' + esc(g.nhom) : '') +
    (g.mongMuon ? ' \u00b7 mong xong ' + ddyy(g.mongMuon) : '') +
    (g.ly ? '<br><b class="gyLy">v\u00ec ' + esc(g.ly) + '</b>' : '');
}
function gyNhan(g) {
  return '<em class="gyMuc' + (g.khan ? ' khan' : '') + '">' + esc(g.muc) + '</em>' +
    (g.tre ? ' <em class="gyTre">qu\u00e1 h\u1ea1n ' + g.tre + ' ng\u00e0y</em>' : '');
}
/* HAI N\u00daT (14/09 \u2014 Tr\u01b0\u1eddng: "\u00f4 \u0111\u1ea7u ti\u00ean l\u00e0 giao vi\u1ec7c, \u00f4 ti\u1ebfp theo l\u00e0 th\u00eam k\u0129
   thu\u1eadt, \u1ea5n v\u00e0o \u0111\u1ec3 ch\u1ecdn th\u00eam"). N\u00fat 2 kh\u00f4ng c\u00f2n l\u00e0 "\u0110\u1ed5i" n\u1eefa: n\u00f3 m\u1edf m\u00e0n ch\u1ecdn
   ng\u01b0\u1eddi v\u1edbi NG\u01af\u1edcI M\u00c1Y G\u1ee2I \u00dd \u0110\u00c3 T\u00cdCH S\u1eb4N, b\u1ea5m th\u00eam t\u00ean th\u1ee9 hai th\u1ee9 ba l\u00e0 giao
   cho c\u1ea3 nh\u00f3m \u2014 mu\u1ed1n \u0111\u1ed5i h\u1eb3n ng\u01b0\u1eddi th\u00ec b\u1ecf t\u00edch ng\u01b0\u1eddi c\u0169 \u0111i, v\u1eabn l\u00e0m \u0111\u01b0\u1ee3c.
   L\u00fd do g\u1ee3i \u00fd \u0111\u1ea9y l\u00ean d\u00f2ng x\u00e1m ph\u00eda tr\u00ean \u0111\u1ec3 h\u00e0ng n\u00fat \u0111\u1ee7 r\u1ed9ng cho hai nh\u00e3n d\u00e0i
   m\u00e0 th\u1ebb kh\u00f4ng cao th\u00eam. */
function gyHang(g) {
  const giu = (g.giu || []);
  /* PHI\u1ebeU \u0110\u00c3 C\u00d3 NG\u01af\u1edcI GI\u1eee (c\u01a1 s\u1edf c\u00f3 k\u1ef9 thu\u1eadt ph\u1ee5 tr\u00e1ch, ho\u1eb7c m\u00e0y \u0111\u00e3 giao r\u1ed3i):
     kh\u00f4ng h\u1ecfi "giao cho ai" n\u1eefa m\u00e0 h\u1ecfi "cho ai v\u00e0o h\u1ed7 tr\u1ee3". N\u00fat ch\u00ednh gh\u00e9p
     ng\u01b0\u1eddi m\u00e1y g\u1ee3i \u00fd V\u00c0O C\u00d9NG ng\u01b0\u1eddi \u0111ang gi\u1eef, kh\u00f4ng h\u1ea5t ai ra. */
  if (giu.length) {
    return '<div class="gyDong">' +
      (g.ten
        ? '\uff0b <b>' + esc(g.ten) + '</b>' +
          '<button class="btn pri" data-themho="' + esc(g.id) + '|' + esc(g.ten) + '">Th\u00eam h\u1ed7 tr\u1ee3</button>'
        : '<b class="gyHet">c\u1ea3 team \u0111ang gi\u1eef vi\u1ec7c n\u00e0y</b>') +
      '<button class="btn v" data-doigiao="' + esc(g.id) + '|' + esc(giu.join(',')) + '">\uff0b Ch\u1ecdn tay</button></div>';
  }
  return '<div class="gyDong">\u2192 <b>' + esc(g.ten) + '</b>' +
    '<button class="btn pri" data-giaogoiy="' + esc(g.id) + '|' + esc(g.ten) + '">Giao vi\u1ec7c</button>' +
    '<button class="btn v" data-doigiao="' + esc(g.id) + '|' + esc(g.ten) + '">\uff0b Th\u00eam KT</button></div>';
}
function gyThe(g) {
  return '<div class="gyO k2' + (g.khan ? ' khan' : '') + ((g.giu || []).length ? ' giu' : '') + '">' +
    '<div class="gyBang">' + gyNoi(g) +
    ((g.giu || []).length ? '<i class="gyGiu">📌 ' + esc(g.giu.join(', ')) + ' đang giữ</i>' : '') + '</div>' +
    '<div class="gyThan"><div class="gyTen">' + esc(g.noiDung) + ' ' + gyNhan(g) + '</div>' +
    '<i class="gyPhu">' + gyPhu(g) + '</i>' + gyHang(g) + '</div></div>';
}

/* ============================================================
   DẢI "VỪA GIAO XONG" (14/09 — Trường: "trượt tay giao nhầm việc thì admin
   phải thu hồi lại"). Giao xong là phiếu biến khỏi danh sách gợi ý ngay, nên
   nếu bấm nhầm thì không còn chỗ nào để sửa trong màn này — phải đi tìm lại
   phiếu. Dải này giữ lại những việc vừa giao trong phiên mở màn, kèm nút ↩.
   Chỉ nhớ trong bộ nhớ, đóng màn là quên — nó chỉ để chữa cú trượt tay vừa
   xảy ra, không phải sổ lưu.
   ============================================================ */
let VUA_GIAO = [];
function nhoVuaGiao(id, ten) {
  VUA_GIAO = VUA_GIAO.filter(x => x.id !== id);
  VUA_GIAO.unshift({ id: id, ten: ten, luc: Date.now() });
  VUA_GIAO = VUA_GIAO.slice(0, 8);
}
function gyVuaGiao() {
  /* bỏ khỏi dải những việc đã bị thu hồi rồi, hoặc thợ đã bấm nhận (lúc đó
     thu hồi vẫn được nhưng phải qua màn hỏi lại trong phiếu, không bấm tắt) */
  const con = VUA_GIAO.filter(v => {
    const p = phieu(v.id);
    return p && p.trangThai === 'moi' && (p.nguoiNhanKt === v.ten || (p.nguoiGiao || []).indexOf(v.ten) >= 0);
  });
  if (!con.length) return '';
  return '<div class="gyVua"><div class="bcNhan">VỪA GIAO XONG — BẤM ↩ NẾU NHẦM</div>' +
    con.map(v => {
      const p = phieu(v.id);
      return '<div class="gyVO"><div><b>' + esc(v.ten) + '</b>' +
        '<span>' + esc(v.id) + ' · ' + esc(tenCoSo(p.coSoId)) +
        (tenGianHang(p.gianHangId) ? ' › ' + esc(tenGianHang(p.gianHangId)) : '') + '</span></div>' +
        '<button class="btn v" data-thuhoigy="' + esc(v.id) + '">↩ Thu hồi lại lỗi vừa giao</button></div>';
    }).join('') + '</div>';
}

function formChiaViec() {
  GOI_Y = goiYChia();
  if (!GOI_Y.length) {
    /* giao hết sạch rồi mới là lúc DỄ nhận ra mình vừa bấm nhầm — dải thu hồi
       phải có mặt ở đây, không chỉ ở màn còn việc (14/09) */
    moSheet(khungSheet('🧠 Phân chia công việc cho team kỹ thuật', '',
      '<div style="padding:18px;text-align:center;color:#15803D;font-weight:700">Không còn việc nào chưa ai nhận — êm 👌</div>' +
      gyVuaGiao(), ''));
    return;
  }
  /* bảng tải bên phải: ai đang ôm mấy việc, mấy việc trễ — nhìn là biết ai rảnh
     (Trường chốt 08/09). Đếm cả việc vừa được gợi ý giao trong màn này. */
  const tat = phieuThat().filter(p => p.trangThai !== 'huy');
  const demGoi = {};
  GOI_Y.forEach(g => { demGoi[g.ten] = (demGoi[g.ten] || 0) + 1; });
  const taiDs = dsTho().map(t => {
    const om = tat.filter(p => (p.trangThai === 'tiepnhan' || duocGiao(p)) && p.nguoiNhanKt === t.ten);
    return { ten: t.ten, mau: t.mau, om: om.length, tre: om.filter(p => soNgayTre(p) > 0).length,
      sapNhan: demGoi[t.ten] || 0 };
  }).sort((a, b) => a.om - b.om || b.sapNhan - a.sapNhan);
  const taiHtml = '<div class="gyTai"><div class="bcNhan">ĐANG ÔM BAO NHIÊU</div>' +
    taiDs.map(x => '<button class="gyTaiO" data-hskt="' + esc(x.ten) + '">' +
      veAv(x.ten, x.mau, anhCua(x.ten)) + '<b>' + esc(x.ten) + '</b>' +
      '<span class="' + (x.tre ? 'do' : (x.om ? '' : 'ranh')) + '">' +
      (x.om ? x.om + ' việc' + (x.tre ? ' · ' + x.tre + ' trễ' : '') : 'đang rảnh') + '</span>' +
      (x.sapNhan ? '<i class="gySap">+' + x.sapNhan + '</i>' : '') + '</button>').join('') +
    '<div class="hsChu">Bấm tên xem chi tiết từng người · +N là số việc gợi ý đang chờ mày bấm Giao</div></div>';

  /* đếm tách hai loại: việc trống mới là việc "giao cả loạt" được (14/09) */
  const soTrong = GOI_Y.filter(g => !(g.giu || []).length).length;
  const soGiu = GOI_Y.length - soTrong;
  moSheet(khungSheet('🧠 Phân chia công việc cho team kỹ thuật',
    'Máy gợi ý, mày duyệt — ' + soTrong + ' việc chưa ai nhận' +
    (soGiu ? ' · ' + soGiu + ' việc đã có người giữ (thêm hỗ trợ được)' : '') +
    ' · chấm theo: đang rảnh · giỏi nhóm lỗi · tiện đường · đúng hẹn',
    '<div class="gyLuoi"><div class="gyCot">' + gyVuaGiao() +
    GOI_Y.map(gyThe).join('') +
    '</div>' + taiHtml + '</div>',
    soTrong
      ? '<button class="btn la" data-giaohet="1" style="flex:1">✓✓ Giao cả ' + soTrong + ' việc theo gợi ý</button>'
      : '<button class="btn v" data-dongsheet="1" style="flex:1">Đóng</button>'));
  sheetTo();
}

/* ============================================================
   TRANG CÁ NHÂN (Trường chốt 04/09) — bấm avatar góc trên là ra.
   Avatar = con người: thành tích, việc của tôi, ảnh đại diện, đổi người.
   Tab ⚙ vẫn là nhà của Cài đặt — hết cảnh hai nút một việc.
   ============================================================ */
const oSoCN = (so, nhan, mau) => '<div class="cnO"><b' + (mau ? ' style="color:' + mau + '"' : '') + '>' + so + '</b><i>' + nhan + '</i></div>';
const dongCN = (nhan, gt) => '<div class="cnDong"><span>' + nhan + '</span><b>' + esc(gt) + '</b></div>';

/* ============================================================
   THẺ HỒ SƠ — dựng HTML (16/10).
   Tách ra hàm riêng để formCaNhan() khỏi phình, và để sau muốn đổi bày biện
   thì sửa một chỗ.
   Ba chip: có ảnh hay chưa · đang hoạt động · lần đăng nhập cuối.
   Chip thứ ba ẩn khi thu gọn (class daiNgay) vì nó dài nhất.
   ============================================================ */
function veTheHoSo(n, vang) {
  const vaiTen = { coso: 'Cơ sở', tho: 'Kỹ thuật', quanly: 'Quản lý' }[n.vai] || '';
  let dn = '';
  try { dn = localStorage.getItem('ikid_lan_dn_v1') || ''; } catch (e) { }
  let gon = true;                       /* mặc định thu gọn */
  try { const l = localStorage.getItem('kt_hoso_gon_v1'); if (l === '0') gon = false; } catch (e) { }
  return '<div class="hsThe' + (gon ? ' gon' : '') + '" id="hsThe">' +
    '<div class="hsTay"></div>' +
    '<button class="hsNut" data-hoso="1" title="Thu gọn / mở rộng">⌃</button>' +
    '<div class="hsTrong">' +
      '<button class="hsAv" data-doianh="1" title="Đổi ảnh đại diện">' +
        '<span class="av" style="background:' + (n.mau || '#0E7490') + '">' +
        (n.anh ? '<img src="' + esc(n.anh) + '" alt="">' : esc((n.ten || '?').trim().slice(-1))) +
        '</span><span class="may"><img width="22" height="22" src="ic/kg-chupanh.webp" alt=""></span></button>' +
      '<div class="hsChu">' +
        '<div class="hsTen">' + esc(n.ten || '') + (vang || '') + '<span class="tick">✓</span></div>' +
        '<div class="hsVai">' + vaiTen + '</div>' +
        '<div class="hsChip">' +
          '<span><img width="22" height="22" src="ic/av-lich.webp" alt="">' +
            '<b>' + (n.anh ? 'Đã lưu ảnh' : 'Chưa có ảnh') + '</b></span>' +
          '<span><i class="cham"></i>Hoạt động</span>' +
          (dn ? '<span class="daiNgay"><b>Lần đăng nhập cuối</b><i>' + esc(dn) + '</i></span>' : '') +
        '</div>' +
      '</div>' +
    '</div></div>';
}

function formCaNhan() {
  const n = D.nguoi || {};
  /* trang cá nhân là bảng thành tích theo tháng → đếm theo ngày báo (01/10) */
  const thang = phieuThat().filter(trongThangBao).filter(p => p.trangThai !== 'huy');
  let so = '', them = '', nutRieng = '', vang = '';
  if (laTho()) {
    const hs = soHieuSuat();
    const toi = hs.find(x => x.ten === n.ten) || { xong: 0, henPt: -1, om: 0 };
    if (hs.length && hs[0].ten === n.ten && hs[0].xong > 0) vang = ' 🥇';
    so = oSoCN(toi.xong, 'xong tháng này', '#22D3EE') +
      oSoCN(toi.henPt < 0 ? '—' : toi.henPt + '%', 'đúng hẹn', '#4ADE80') +
      oSoCN(toi.om, 'đang làm', '#FDE68A');
    const xg = thang.filter(p => daXong2(p) && cuaTho(p, n.ten));
    const top = (khoa, tenCua) => {
      const m = {};
      xg.forEach(p => { const k = khoa(p); if (k) m[k] = (m[k] || 0) + 1; });
      return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 2).map(tenCua).join(' · ') || 'chưa có dữ liệu';
    };
    them = dongCN('Giỏi nhất', top(p => p.nhomLoi, k => NHOM_LOI[k] || k)) +
      dongCN('Hay làm ở', top(p => p.coSoId, k => tenCoSo(k)));
    nutRieng = '<button class="btn pri" data-vieccuatoi="1" style="width:100%">🔧 Xem việc của tôi (' + toi.om + ')</button>';
  } else if (laCoSo()) {
    const cua = thang.filter(p => p.coSoId === n.coSoId);
    const cho = cua.filter(choCHT).length;
    so = oSoCN(cua.filter(p => p.nguoiTao === n.ten).length, 'đã báo tháng này', '#22D3EE') +
      oSoCN(cho, 'chờ tôi nghiệm thu', '#FDE68A') +
      oSoCN(cua.filter(p => p.trangThai === 'nghiemthu').length, 'đã xong', '#4ADE80');
    if (cho) nutRieng = '<button class="btn pri" data-choduyet="1" style="width:100%">✅ ' + cho + ' việc chờ tôi nghiệm thu</button>';
  } else {
    const tong = thang.length;
    const xg = thang.filter(p => ['hoanthanh', 'nghiemthu'].includes(p.trangThai)).length;
    so = oSoCN(tong, 'tổng lỗi tháng này', '#22D3EE') +
      oSoCN(thang.filter(chuaAiNhan).length, 'chưa ai nhận', '#FDE68A') +
      oSoCN(tong ? Math.round(xg / tong * 100) + '%' : '—', 'đã xử lý', '#4ADE80');
  }
  moSheet(khungSheet('Trang cá nhân', '',
    /* ============================================================
       THẺ HỒ SƠ THU GỌN / MỞ RỘNG (16/10 — Trường gửi ảnh mẫu).
       CẢ HAI trạng thái đều giữ nền công nghệ, chỉ khác chiều cao và cỡ chữ.
       Bản đầu em cho thu gọn về nền xám — sai mẫu, Trường gửi ảnh mới mới biết.
       Mặc định THU GỌN: vào đây chín phần mười là để chỉnh cài đặt, không phải
       ngắm ảnh đại diện. Lựa chọn nhớ trong máy nên ai thích mở thì mở luôn.
       ============================================================ */
    veTheHoSo(n, vang) +
    /* BỎ BA Ô SỐ LIỆU (03/10 — Trường chốt). Chúng lặp lại đúng mấy con số đã
       có ở hàng thẻ KPI ngoài màn chính, mà màn này là chỗ chỉnh cài đặt chứ
       không phải chỗ xem báo cáo. Biến `so` giữ nguyên trong mã, không xoá. */
    them +
    (nutRieng ? '<div style="margin-top:10px">' + nutRieng + '</div>' : '') +
    /* LỒNG HẲN CÀI ĐẶT VÀO ĐÂY (10/09 — Trường: "chỉnh nó cao lên và cái gì
       cho lồng vào được thì cho"). Trước phải bấm hai lớp: Trang cá nhân →
       Cài đặt. Giờ một màn cuộn được, bỏ luôn nút "⚙ Cài đặt" và nút "Đổi
       người" vì cả hai đã có sẵn trong phần lồng vào. */
    (typeof thanCaiDat === 'function' ? thanCaiDat(true) : '') +
    /* nút đổi người: khối avatar của Cài đặt bị bỏ khi lồng (đã có avatar to ở
       trên), nên phải đưa nút này ra riêng kẻo mất đường đổi người (10/09) */
    '<button class="mn" data-doinguoi="1"><div class="ic" style="background:#F1F5F9;color:#475569">↔</div>' +
    '<div><b>Đổi người dùng máy này</b><div class="s">máy dùng chung thì đổi tên người đang trực</div></div>' +
    '<span class="mui">›</span></button>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  /* cỡ VỪA chứ không TO (03/10 — Trường: "thu nhỏ lại còn 2 phần 3"): màn này
     chỉ có ba ô số liệu và mấy dòng cài đặt, 1180px là thừa mênh mông */
  sheetVua();
  /* Dung lượng kho tự hiện luôn, khỏi phải bấm vào mới biết (20/10 — hai mục
     Kho ảnh và Dọn dữ liệu vừa gộp làm một). Đếm ở nền, xong thì điền vào. */
  if (typeof laQuanLy === 'function' && laQuanLy() && typeof xemKho === 'function') {
    xemKho().then(k => {
      const el = document.getElementById('soKho');
      if (!el || !k || k.loi) return;
      el.textContent = k.mb + ' MB / 10.000 MB · ' + k.soFile + ' file — bấm để dọn';
    }).catch(() => { });
  }
}

function formDoiAnh() {
  moSheet(khungSheet('Đổi ảnh đại diện', 'Ảnh tự cắt vuông, nén nhẹ (~15KB) — cả đội thấy mặt mới ngay',
    '<button class="mn" data-avchon="chup"><div class="ic" style="background:#CFFAFE;color:#0E7490"><img width="22" height="22" class="mnIc" src="ic/kg-chupanh.webp" alt="" loading="lazy"></div><div><b>Chụp ảnh mới</b><div class="s">mở camera trước</div></div><span class="mui">›</span></button>' +
    '<button class="mn" data-avchon="album"><div class="ic" style="background:#EDE9FE;color:#6D28D9"><img width="22" height="22" class="mnIc" src="ic/kg-thuvien.webp" alt="" loading="lazy"></div><div><b>Chọn từ album</b></div><span class="mui">›</span></button>' +
    ((D.nguoi || {}).anh
      ? '<button class="mn" data-avchu="1"><div class="ic" style="background:#F1F5F9;color:#475569">' +
      esc(((D.nguoi || {}).ten || '?').trim().slice(0, 1).toUpperCase()) +
      '</div><div><b>Dùng lại chữ cái như cũ</b></div><span class="mui">›</span></button>' : ''),
    '<button class="btn v" style="flex:1" data-dongsheet="1">Thôi</button>'));
}
/* ============================================================
   XEM TRƯỚC RỒI MỚI LƯU (Trường chốt 07/09). Trước đây chọn ảnh xong là lưu
   ngầm, không nút không dấu hiệu — "tao thấy nó có lưu được đâu". Giờ: chọn
   ảnh → thấy đúng khuôn mặt tròn sẽ hiện cho cả đội → bấm "Dùng ảnh này" mới
   lưu, lưu xong hiện "Đã lưu ✓". Hỏng bước nào nói rõ bước đó + nút Thử lại.
   ============================================================ */
let AV_TAM = null;                 /* ảnh đã nén đang chờ mày duyệt */
let AV_KIEU = 'album';             /* bấm "Chọn ảnh khác" thì mở lại đúng đường vừa dùng */
let AV_INP = null;
function chonAnhDaiDien(kieu) {
  AV_KIEU = kieu || 'album';
  /* ô chọn gắn sẵn trong trang, không bị hệ thống thu hồi giữa lúc chờ (07/09) */
  let inp = AV_INP;
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'oChonAv';
    inp.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(inp);
    AV_INP = inp;
  }
  inp.accept = 'image/*';
  if (kieu === 'chup') { inp.capture = 'user'; inp.setAttribute('capture', 'user'); }
  else { inp.removeAttribute('capture'); }
  inp.onchange = async () => {
    const f = (inp.files || [])[0];
    try { inp.value = ''; } catch (e) { }
    if (!f) return;
    nhac('Đang mở ảnh…', 'canh');
    try {
      const nho = await nenVuong(f, 128);
      AV_TAM = nho;
      formXemTruocAnh();
    } catch (e) {
      nhacNut('Không mở được ảnh — ' + (e.message || 'thử ảnh khác'), 'do', 'Chọn ảnh khác',
        () => chonAnhDaiDien(AV_KIEU), 14);
    }
  };
  inp.click();
}

function formXemTruocAnh() {
  if (!AV_TAM) return formDoiAnh();
  const kb = Math.max(1, Math.round(AV_TAM.size / 1024));
  const u = URL.createObjectURL(AV_TAM);
  moSheet(khungSheet('Ảnh này ổn chưa?', 'Cả đội sẽ thấy mặt này ở phiếu và trao đổi',
    '<div class="avXem"><span class="av coAnh to" style="background-image:url(' + u + ')"></span></div>' +
    '<div class="avGhi">đã cắt vuông · ' + kb + ' KB · tải nhanh trên 4G</div>',
    '<div class="avNut">' +
    '<button class="btn pri" data-avluu="1">✓ Dùng ảnh này</button>' +
    '<div class="avHai"><button class="btn v" data-avchon="' + esc(AV_KIEU) + '">↻ Chọn ảnh khác</button>' +
    '<button class="btn v" data-avthoi="1">Thôi</button></div></div>'));
}

async function luuAnhTam() {
  if (!AV_TAM) return;
  const b = document.querySelector('[data-avluu]');
  if (b) { b.disabled = true; b.textContent = '⏳ Đang lưu…'; }
  try {
    await luuAnhDaiDien(AV_TAM);
    AV_TAM = null;
    veTop(); veHet();
    formCaNhan();
    nhac('Đã lưu ảnh đại diện — cả đội sẽ thấy mặt mới', 'la');
  } catch (e) {
    if (b) { b.disabled = false; b.textContent = '✓ Dùng ảnh này'; }
    nhacNut('Chưa lưu được: ' + (e.message || 'lỗi lạ'), 'do', 'Thử lại', () => luuAnhTam(), 16);
  }
}
