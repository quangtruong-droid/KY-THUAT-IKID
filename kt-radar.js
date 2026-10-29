/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · 🔎 RADAR
   Trường chốt 14/09: "tao thấy vẫn chỉ là đang lặp lại của các phần kia thôi,
   tao cần 1 cái gì đấy mới lạ nếu có thể thì thay thế luôn tab chú ý này".

   Mọi màn khác trong web đều LIỆT KÊ cái đang có. Màn này SOI: đọc dữ liệu rồi
   nói ra kết luận mà mắt không bắt được khi lướt danh sách — bốn lần hỏng cùng
   một chỗ nằm rải rác bốn tuần, một cơ sở lặng lẽ ngừng báo, một việc nhận rồi
   bỏ đó nhưng chưa tới hạn nên không thẻ nào bắt.

   LUẬT CHUNG CHO MỌI PHÁT HIỆN:
   ① phải có BẰNG CHỨNG ĐẾM ĐƯỢC — không viết câu cảm tính
   ② phải ghi rõ CƠ SỞ › GIAN HÀNG (Trường 14/09) — biết chỗ mới làm được gì
   ③ phải có ÍT NHẤT MỘT NÚT làm ngay, không bắt đi tìm lại phiếu
   ④ thiếu dữ liệu thì IM LẶNG bỏ qua, không đoán bừa
   ============================================================ */
'use strict';

const RAD_NGAY = 24 * 60 * 60 * 1000;
const RAD_SOI = 60 * RAD_NGAY;          /* cửa sổ soi mặc định: 60 ngày */
const RAD_BO = 'kt_radar_bo_v1';        /* những phát hiện Trường đã bấm "bỏ qua" */

function radBoQua() {
  try { return JSON.parse(localStorage.getItem(RAD_BO) || '{}'); } catch (e) { return {}; }
}
function radBo(khoa, ngay) {
  const m = radBoQua();
  m[khoa] = Date.now() + (ngay || 30) * RAD_NGAY;
  try { localStorage.setItem(RAD_BO, JSON.stringify(m)); } catch (e) { }
}
const radDaBo = khoa => { const t = radBoQua()[khoa]; return !!t && t > Date.now(); };

/* nơi xảy ra, dạng đã dùng quen ở màn chia việc: CƠ SỞ › GIAN HÀNG */
function radNoi(coSoId, gianHangId) {
  const cs = tenCoSo(coSoId) || '';
  const gh = gianHangId ? (tenGianHang(gianHangId) || '') : '';
  if (!cs) return '';
  return '<div class="rdNoi"><span class="rdCS">' + esc(cs) + '</span>' +
    (gh ? '<s>›</s><span class="rdGH">' + esc(gh) + '</span>' : '') + '</div>';
}
const radTien = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
const radChat = pid => (D.dienBien[pid] || []).filter(t => t.loai === 'chat');

/* ============================================================
   ① HỎNG ĐI HỎNG LẠI
   Gom phiếu theo (cơ sở + gian hàng + nhóm lỗi). Cùng một chỗ hỏng cùng một
   kiểu từ 3 lần trở lên trong 60 ngày là hỏng hệ thống, không phải rủi ro —
   sửa tiếp là ném tiền. Cộng luôn tiền đã sửa để so với giá thay mới.
   ============================================================ */
function soiHongLap(ds) {
  const moc = Date.now() - RAD_SOI;
  const cum = {};
  ds.filter(p => p.ngayBao >= moc && p.trangThai !== 'huy' && p.gianHangId).forEach(p => {
    const k = p.coSoId + '|' + p.gianHangId + '|' + (p.nhomLoi || 'khac');
    (cum[k] = cum[k] || []).push(p);
  });
  return Object.keys(cum).map(k => cum[k]).filter(v => v.length >= 3).map(v => {
    const sap = v.slice().sort((a, b) => b.ngayBao - a.ngayBao);
    const p = sap[0];
    const tien = sap.reduce((s, x) => s + (Number(x.chiPhi) || 0), 0);
    const soNgay = Math.round((sap[0].ngayBao - sap[sap.length - 1].ngayBao) / RAD_NGAY);
    const khoa = 'hong|' + p.coSoId + '|' + p.gianHangId + '|' + p.nhomLoi;
    return {
      khoa: khoa, uu: 1, mau: '#B91C1C', ic: '🔁', nhan: 'HỎNG ĐI HỎNG LẠI',
      coSoId: p.coSoId, gianHangId: p.gianHangId,
      ket: 'Hỏng <b>lần thứ ' + v.length + '</b> trong ' + (soNgay || 1) + ' ngày' +
        (tenNhom(p.nhomLoi) ? ' · ' + esc(tenNhom(p.nhomLoi)) : ''),
      bc: sap.slice(0, 4).map((x, i) => esc(x.id) + (i ? ' cách ' +
        Math.round((sap[0].ngayBao - x.ngayBao) / RAD_NGAY) + ' ngày' : ' mới nhất')).join(' · ') +
        (tien ? '<br>Tiền sửa cộng dồn <b>' + radTien(tien) + '</b> — cân nhắc thay mới thay vì sửa tiếp' : ''),
      nut: [{ chu: 'Xem ' + v.length + ' phiếu', lenh: 'radloc', gt: sap.map(x => x.id).join(',') },
        { chu: 'Bỏ qua 30 ngày', lenh: 'radbo', gt: khoa }],
      diem: v.length * 10 + tien / 1e6
    };
  });
}

/* ============================================================
   ② CƠ SỞ IM BẤT THƯỜNG
   Đây là thứ KHÔNG màn nào hiện được, vì nó là SỰ VẮNG MẶT của dữ liệu.
   Cơ sở vẫn chạy máy mỗi ngày thì không thể im — im nghĩa là họ đã quay lại
   báo qua Zalo, hoặc đang ngại dùng web. Đúng cái Trường lo nhất.
   Chỉ xét cơ sở có từ 4 lần báo trở lên (ít hơn thì "bình thường" chưa có
   nghĩa gì), và ngưỡng lấy theo chính nhịp của cơ sở đó.
   ============================================================ */
function soiCoSoIm(ds) {
  const moc = Date.now() - 120 * RAD_NGAY;
  const theo = {};
  ds.filter(p => p.ngayBao >= moc && p.trangThai !== 'huy')
    .forEach(p => { (theo[p.coSoId] = theo[p.coSoId] || []).push(p.ngayBao); });
  return Object.keys(theo).map(csId => {
    const t = theo[csId].slice().sort((a, b) => a - b);
    if (t.length < 4) return null;
    const khoang = [];
    for (let i = 1; i < t.length; i++) khoang.push((t[i] - t[i - 1]) / RAD_NGAY);
    const tb = khoang.reduce((s, x) => s + x, 0) / khoang.length;
    const dai = Math.max.apply(null, khoang);
    const im = (Date.now() - t[t.length - 1]) / RAD_NGAY;
    /* phải im hơn 3 lần nhịp thường VÀ hơn kỷ lục cũ — hai điều kiện để không
       kêu oan khi cơ sở vốn thưa việc */
    if (!(im > tb * 3 && im > dai && im >= 7)) return null;
    return {
      khoa: 'im|' + csId, uu: 2, mau: '#C2410C', ic: '🔇', nhan: 'CƠ SỞ IM BẤT THƯỜNG',
      coSoId: csId, gianHangId: '',
      ket: '<b>' + Math.round(im) + ' ngày</b> không báo lỗi nào',
      bc: 'Bình thường cơ sở này báo ' + tb.toFixed(1) + ' ngày một lần · quãng im dài nhất từ trước tới nay là ' +
        Math.round(dai) + ' ngày<br>Cơ sở vẫn mở cửa mỗi ngày mà không báo gì — hỏi lại xem có đang báo qua Zalo không',
      nut: [{ chu: 'Xem phiếu cũ của cơ sở', lenh: 'radcs', gt: csId },
        { chu: 'Bỏ qua 30 ngày', lenh: 'radbo', gt: 'im|' + csId }],
      diem: im
    };
  }).filter(Boolean);
}

/* ============================================================
   ③ VIỆC BỊ QUÊN GIỮA ĐƯỜNG
   Đã nhận nhưng nhiều ngày không một dấu vết nào: không nhắn, không ảnh, không
   báo vướng, không dời hẹn. Chưa quá hạn nên KHÔNG thẻ nào bắt được — mà đây
   đúng là lúc cứu được, quá hạn rồi thì muộn.
   ============================================================ */
function soiViecQuen(ds) {
  const HAN = 5;
  return ds.filter(p => p.trangThai === 'tiepnhan' && p.nhanLuc).map(p => {
    const db = (D.dienBien[p.id] || []);
    const cuoi = db.length ? Math.max.apply(null, db.map(x => x.t || 0)) : p.nhanLuc;
    const im = (Date.now() - Math.max(cuoi, p.nhanLuc)) / RAD_NGAY;
    if (im < HAN) return null;
    /* người này có bận thật không, hay chỉ quên đúng việc này? */
    const khac = ds.filter(q => q.id !== p.id && daXong2(q) && cuaTho(q, p.nguoiNhanKt) &&
      q.ngayXong > p.nhanLuc).length;
    return {
      khoa: 'quen|' + p.id, uu: 3, mau: '#6D28D9', ic: '⏳', nhan: 'VIỆC BỊ QUÊN GIỮA ĐƯỜNG',
      coSoId: p.coSoId, gianHangId: p.gianHangId,
      ket: esc(p.id) + ' nhận rồi nhưng <b>' + Math.round(im) + ' ngày không động gì</b>',
      bc: esc(p.noiDung) + '<br>' + esc(p.nguoiNhanKt || '') + ' nhận ' + ddyy(p.nhanLuc) +
        (p.duKien ? ', hẹn xong ' + ddyy(p.duKien) : '') +
        ' · không tin nhắn, không ảnh, không báo vướng' +
        (khac ? '<br>Cùng lúc đã xong <b>' + khac + ' việc khác</b> nhận SAU việc này' : ''),
      nut: [{ chu: 'Mở phiếu', lenh: 'radmo', gt: p.id },
        { chu: 'Thu hồi, giao người khác', lenh: 'radthu', gt: p.id, chinh: 1 }],
      diem: im * 2 + khac * 5
    };
  }).filter(Boolean);
}

/* ============================================================
   ④ NÓI NHIỀU MÀ CHƯA AI LÀM
   Nhiều tin nhắn qua lại trên một phiếu CHƯA AI NHẬN thường là chỗ đang rối —
   hỏi tới hỏi lui, không ai cầm. Trong danh sách nó trông y hệt mọi việc mới.
   ============================================================ */
function soiNoiNhieu(ds) {
  return ds.filter(p => chuaAiNhan(p)).map(p => {
    const tin = radChat(p.id);
    if (tin.length < 4) return null;
    const dai = (Date.now() - (tin[0].t || Date.now())) / RAD_NGAY;
    const conLai = p.mongMuon ? Math.round((p.mongMuon - Date.now()) / RAD_NGAY) : null;
    return {
      khoa: 'noi|' + p.id, uu: 4, mau: '#A16207', ic: '💬', nhan: 'NÓI NHIỀU, CHƯA AI LÀM',
      coSoId: p.coSoId, gianHangId: p.gianHangId,
      ket: esc(p.id) + ' có <b>' + tin.length + ' tin nhắn</b> mà vẫn chưa ai nhận',
      bc: esc(p.noiDung) + '<br>Nhắn qua lại ' + Math.max(1, Math.round(dai)) + ' ngày' +
        (conLai !== null ? ' · cơ sở mong xong ' + ddyy(p.mongMuon) +
          (conLai >= 0 ? ' · còn ' + conLai + ' ngày' : ' · đã quá ' + (-conLai) + ' ngày') : '') +
        '<br>Nhiều tin thường là chỗ đang rối — không phải chỗ đang chạy',
      nut: [{ chu: 'Mở phiếu', lenh: 'radmo', gt: p.id },
        { chu: 'Giao ngay', lenh: 'radgiao', gt: p.id, chinh: 1 }],
      diem: tin.length * 3 + (conLai !== null && conLai < 0 ? 20 : 0)
    };
  }).filter(Boolean);
}

/* ============================================================
   ⑤ GIAN HÀNG NGỐN TIỀN NHẤT
   Cộng tiền sửa theo từng gian hàng trong 90 ngày. Chỉ kêu khi một gian chiếm
   từ 25% tiền cả hệ thống — lúc đó nó không còn là chuyện sửa vặt nữa.
   ============================================================ */
function soiGianTonTien(ds) {
  const moc = Date.now() - 90 * RAD_NGAY;
  const cum = {};
  let tong = 0;
  ds.filter(p => p.gianHangId && p.ngayBao >= moc && Number(p.chiPhi) > 0).forEach(p => {
    const k = p.coSoId + '|' + p.gianHangId;
    const o = cum[k] = cum[k] || { coSoId: p.coSoId, gianHangId: p.gianHangId, tien: 0, lan: 0 };
    o.tien += Number(p.chiPhi); o.lan++; tong += Number(p.chiPhi);
  });
  const ds2 = Object.keys(cum).map(k => cum[k]).sort((a, b) => b.tien - a.tien);
  const top = ds2[0];
  if (!top || !tong || top.lan < 3 || top.tien / tong < 0.25) return [];
  const hai = ds2[1];
  return [{
    khoa: 'tien|' + top.coSoId + '|' + top.gianHangId, uu: 5, mau: '#9F1239', ic: '💸',
    nhan: 'GIAN HÀNG NGỐN TIỀN NHẤT', coSoId: top.coSoId, gianHangId: top.gianHangId,
    ket: 'Ngốn <b>' + radTien(top.tien) + '</b> trong 3 tháng — bằng ' +
      Math.round(top.tien / tong * 100) + '% tiền sửa cả hệ thống',
    bc: top.lan + ' lần sửa · trung bình ' + radTien(Math.round(top.tien / top.lan)) + '/lần' +
      (hai ? '<br>Gian đứng thứ hai (' + esc(tenGianHang(hai.gianHangId) || '?') + ') chỉ hết ' + radTien(hai.tien) : ''),
    nut: [{ chu: 'Xem ' + top.lan + ' phiếu', lenh: 'radgian', gt: top.coSoId + '|' + top.gianHangId }],
    diem: top.tien / 1e6 + 8
  }];
}

/* ============================================================
   ⑥ LỆCH TAY
   Một người ôm quá nhiều trong khi có người rảnh. Bảng "đang ôm bao nhiêu" ở
   màn chia việc cho thấy con số, nhưng không nối với tỉ lệ đúng hẹn đang tụt —
   đó mới là chỗ đau: giao thêm cho người đang đuối là hỏng cả hai việc.
   ============================================================ */
function soiLechTay(ds) {
  const thos = dsTho();
  if (thos.length < 2) return [];
  const song = ds.filter(p => !['nghiemthu', 'huy'].includes(p.trangThai));
  const om = {}, hen = {};
  thos.forEach(t => {
    om[t.ten] = song.filter(p => p.nguoiNhanKt === t.ten).length;
    const xg = ds.filter(p => daXong2(p) && cuaTho(p, t.ten) && p.duKien && p.ngayXong);
    hen[t.ten] = xg.length >= 3
      ? Math.round(xg.filter(p => p.ngayXong <= p.duKien + RAD_NGAY - 1).length / xg.length * 100) : -1;
  });
  const sap = thos.slice().sort((a, b) => om[b.ten] - om[a.ten]);
  const nhieu = sap[0], it = sap[sap.length - 1];
  if (!nhieu || !it || om[nhieu.ten] < 4 || om[nhieu.ten] - om[it.ten] < 3) return [];
  const tre = song.filter(p => p.nguoiNhanKt === nhieu.ten && soNgayTre(p) > 0).length;
  /* dồn ở đâu — để biết có phải vì phân vùng hay không */
  const demCS = {};
  song.filter(p => p.nguoiNhanKt === nhieu.ten).forEach(p => { demCS[p.coSoId] = (demCS[p.coSoId] || 0) + 1; });
  const csTop = Object.keys(demCS).sort((a, b) => demCS[b] - demCS[a])[0];
  return [{
    khoa: 'lech|' + nhieu.ten, uu: 6, mau: '#0F766E', ic: '⚖️', nhan: 'LỆCH TAY',
    coSoId: '', gianHangId: '',
    ket: esc(nhieu.ten) + ' ôm <b>' + om[nhieu.ten] + ' việc</b>, ' + esc(it.ten) +
      (om[it.ten] ? ' chỉ có <b>' + om[it.ten] + '</b>' : ' đang <b>rảnh</b>'),
    bc: esc(nhieu.ten) + ': ' + om[nhieu.ten] + ' việc' + (tre ? ' · ' + tre + ' quá hạn' : '') +
      (hen[nhieu.ten] >= 0 ? ' · đúng hẹn ' + hen[nhieu.ten] + '%' : '') +
      (csTop && demCS[csTop] > 1 ? ' · ' + demCS[csTop] + ' việc dồn ở ' + esc(tenCoSo(csTop)) : '') +
      '<br>' + esc(it.ten) + ': ' + om[it.ten] + ' việc' +
      (hen[it.ten] >= 0 ? ' · đúng hẹn ' + hen[it.ten] + '%' : ''),
    nut: [{ chu: 'Mở màn chia việc', lenh: 'radchia', gt: '1', chinh: 1 },
      { chu: 'Bỏ qua 7 ngày', lenh: 'radbo7', gt: 'lech|' + nhieu.ten }],
    diem: (om[nhieu.ten] - om[it.ten]) * 3 + tre * 4
  }];
}

/* ============================================================
   ⑦ CHT NGÂM NGHIỆM THU
   Kỹ thuật đã sửa xong, chỉ chờ một cú bấm xác nhận. Để lâu thì số liệu tháng
   sai và thợ mang tiếng chưa xong việc.
   ============================================================ */
function soiChtNgam(ds) {
  const cho = ds.filter(p => choCHT(p) && p.ngayXong && (Date.now() - p.ngayXong) > 3 * RAD_NGAY);
  if (!cho.length) return [];
  const sap = cho.slice().sort((a, b) => a.ngayXong - b.ngayXong);
  const p = sap[0];
  const lau = Math.round((Date.now() - p.ngayXong) / RAD_NGAY);
  return [{
    khoa: 'ngam|' + p.id, uu: 7, mau: '#7C3AED', ic: '🕰', nhan: 'CHỜ NGHIỆM THU QUÁ LÂU',
    coSoId: p.coSoId, gianHangId: p.gianHangId,
    ket: cho.length > 1
      ? '<b>' + cho.length + ' việc</b> đã sửa xong mà cơ sở chưa bấm xác nhận'
      : esc(p.id) + ' sửa xong <b>' + lau + ' ngày</b> mà cơ sở chưa bấm xác nhận',
    bc: esc(p.noiDung) + '<br>' + esc((p.nguoiSua || []).join(', ') || 'Kỹ thuật') + ' báo xong ' + ddyy(p.ngayXong) +
      ' · lâu nhất ' + lau + ' ngày<br>Chưa xác nhận thì việc vẫn tính là chưa đóng, số liệu tháng lệch theo',
    nut: [{ chu: 'Xem ' + cho.length + ' việc chờ', lenh: 'radloc', gt: cho.map(x => x.id).join(',') }],
    diem: lau + cho.length * 3
  }];
}

/* ============================================================
   GOM LẠI — bỏ những cái Trường đã bấm "bỏ qua", xếp theo điểm nặng trước
   ============================================================ */
function radarSoi() {
  const ds = phieuThat();
  let ra = [];
  [soiHongLap, soiCoSoIm, soiViecQuen, soiNoiNhieu, soiGianTonTien, soiLechTay, soiChtNgam]
    .forEach(f => { try { ra = ra.concat(f(ds) || []); } catch (e) { } });
  return ra.filter(x => !radDaBo(x.khoa)).sort((a, b) => (b.diem || 0) - (a.diem || 0)).slice(0, 12);
}

/* ============================================================
   DÒNG THỜI GIAN HÔM NAY
   Danh sách phiếu chỉ cho thấy HIỆN TRẠNG, không bao giờ cho thấy DIỄN BIẾN.
   Mở buổi tối là biết cả ngày team đã làm gì, kể cả những bước máy tự làm.
   ============================================================ */
const RAD_LOAI = {
  tao: { mau: '#0891B2', chu: 'báo lỗi mới' },
  giao: { mau: '#7C3AED', chu: '' },
  nhan: { mau: '#15803D', chu: '' },
  xong: { mau: '#15803D', chu: '' },
  cht: { mau: '#7C3AED', chu: '' },
  chat: { mau: '#0891B2', chu: '' },
  vuong: { mau: '#D97706', chu: '' },
  doingay: { mau: '#DC2626', chu: '' },
  traviec: { mau: '#DC2626', chu: '' },
  thuhoi: { mau: '#DC2626', chu: '' },
  huy: { mau: '#64748B', chu: '' }
};
function radarHomNay() {
  const dau = new Date(); dau.setHours(0, 0, 0, 0);
  const moc = dau.getTime();
  const ra = [];
  phieuThat().forEach(p => {
    (D.dienBien[p.id] || []).forEach(e => {
      if (!e.t || e.t < moc) return;
      const l = RAD_LOAI[e.loai] || { mau: '#94A3B8' };
      let chu = String(e.text || '').replace(/\[\[[^\]]*\]\]/g, '').trim();
      if (e.loai === 'chat') chu = (e.anh || []).length
        ? 'gửi ' + e.anh.length + ' ảnh/video' : 'nhắn: ' + chu.slice(0, 60);
      if (chu.length > 90) chu = chu.slice(0, 90) + '…';
      ra.push({ t: e.t, mau: l.mau, ai: e.ten || 'Máy', chu: chu, p: p });
    });
  });
  return ra.sort((a, b) => a.t - b.t);
}

/* ============================================================
   MÀN RADAR — thay tab 🔔 Cần chú ý của vai quản lý (14/09).
   Vai cơ sở và kỹ thuật vẫn dùng màn cũ: họ cần "việc của tôi hôm nay", không
   cần máy soi cả hệ thống.
   Ba tầng: TIN NHẮN MỚI (thứ duy nhất của màn cũ không lặp ở đâu khác) →
   PHÁT HIỆN → HÔM NAY ĐÃ DIỄN RA.
   ============================================================ */
function radNut(x) {
  return (x.nut || []).map(n =>
    '<button class="rdN' + (n.chinh ? ' ph' : '') + '" data-' + n.lenh + '="' + esc(n.gt) + '">' +
    esc(n.chu) + '</button>').join('');
}
function radThe(x) {
  return '<div class="rdO" style="--m:' + x.mau + '">' +
    '<div class="rdTop"><span class="rdIc">' + x.ic + '</span><em>' + x.nhan + '</em></div>' +
    (x.coSoId ? radNoi(x.coSoId, x.gianHangId) : '') +
    '<div class="rdKet">' + x.ket + '</div>' +
    '<div class="rdBc">' + x.bc + '</div>' +
    (x.nut && x.nut.length ? '<div class="rdNut">' + radNut(x) + '</div>' : '') + '</div>';
}

/* tin nhắn chưa đọc — gọn hơn màn cũ: ai nhắn, nhắn gì, ở đâu, bao lâu rồi */
function radTinMoi() {
  const ra = [];
  phieuThat().forEach(p => {
    const n = tinChuaDoc(p.id);
    if (!n) return;
    /* Hai nguồn, ưu tiên cái nào ĐẦY ĐỦ hơn:
       ① D.dienBien — chỉ có khi người dùng ĐÃ MỞ phiếu đó lần nào
       ② D.soChat — máy chủ trả về cho MỌI phiếu (14/09 thêm ai + tin + số ảnh)
       Trước đây chỉ đọc ① nên phiếu chưa mở bao giờ hiện trơ "Có tin mới ·
       tệp đính kèm" — đúng lỗi Trường bắt được trên ảnh chụp màn hình. */
    const tin = radChat(p.id);
    const cuoi = tin[tin.length - 1];
    const sv = (D.soChat && D.soChat[p.id]) || {};
    const ai = (cuoi && cuoi.ten) || sv.ai || '';
    const t = (cuoi && cuoi.t) || sv.cuoi || 0;
    let tom = String((cuoi ? cuoi.text : sv.tin) || '').replace(/\[\[[^\]]*\]\]/g, '').trim();
    if (!tom) {
      const as = cuoi ? (cuoi.anh || []) : new Array(sv.soAnh || 0);
      const vid = cuoi ? as.filter(u => /\.(mp4|mov|webm|m4v)$/i.test(String(u))).length : 0;
      tom = as.length
        ? (vid ? '🎬 ' + vid + ' video' + (as.length > vid ? ' · 🖼 ' + (as.length - vid) + ' ảnh' : '')
          : '🖼 ' + as.length + ' ảnh')
        : '';          /* không biết thật thì ĐỂ TRỐNG, không bịa "tệp đính kèm" */
    }
    if (tom.length > 64) tom = tom.slice(0, 64) + '…';
    ra.push({ p: p, n: n, ai: ai, tom: tom, t: t });
  });
  return ra.sort((a, b) => b.t - a.t);
}

function formRadar() {
  const ds = radarSoi();
  const tin = radTinMoi();
  const hn = radarHomNay();
  /* soLieu() KHÔNG có khoá 'ton' — trước đây viết s.ton nên dòng phụ hiện
     "undefined việc đang tồn" (Trường bắt 14/09). Tồn = chưa nghiệm thu, chưa huỷ. */
  const s = soLieu();
  const soTon = phieuThat().filter(p => !['nghiemthu', 'huy'].includes(p.trangThai)).length;

  const khoiTin = tin.length
    ? '<div class="rdDau">💬 TIN NHẮN MỚI<span>' + tin.length + ' phiếu</span></div>' +
      /* data-radmo chứ KHÔNG phải data-tbmo: hai cái mở phiếu giống nhau nhưng
         ĐƯỜNG VỀ khác nhau. Dùng nhầm thì bấm Back từ Radar lại bật ra hộp thư
         Trao đổi — sai chỗ đang đứng (24/09, bắt được khi bấm thật). */
      tin.map(x => '<button class="rdTin" data-radmo="' + esc(x.p.id) + '">' +
        veAv(x.ai || '?', '#0E7490', anhCua(x.ai)) +
        '<div class="rdTNoi"><div class="rdTHang"><b>' + esc(x.ai || (x.n + ' tin chưa đọc')) + '</b>' +
        (x.t ? '<span class="rdTLuc">' + truocDay(x.t) + '</span>' : '') + '</div>' +
        /* không có nội dung thì bỏ hẳn dòng, đừng để một dòng trống lửng lơ */
        (x.tom ? '<div class="rdTom">' + esc(x.tom) + '</div>' : '') +
        '<div class="rdTPh">' + esc(x.p.id) + ' · ' + esc(tenCoSo(x.p.coSoId)) +
        (tenGianHang(x.p.gianHangId) ? ' › ' + esc(tenGianHang(x.p.gianHangId)) : '') + '</div></div>' +
        '<i class="rdDem">' + x.n + '</i></button>').join('')
    : '';

  const khoiSoi = ds.length
    ? '<div class="rdDau">🔎 MÁY SOI RA<span>' + ds.length + ' điều · trong 60 ngày</span></div>' +
      ds.map(radThe).join('')
    : '<div class="rdEm">✓ <b>Không có gì bất thường</b><div>Máy đã soi hỏng lặp, cơ sở im, việc bị quên, ' +
      'lệch tay, tiền sửa dồn một chỗ — sạch cả.</div></div>';

  const khoiHN = hn.length
    ? '<div class="rdDau">📜 HÔM NAY ĐÃ DIỄN RA<span>' + hn.length + ' việc</span></div>' +
      hn.map(x => '<button class="dtO" data-radmo="' + esc(x.p.id) + '">' +
        '<div class="dtGio">' + gio(x.t) + '</div>' +
        '<div class="dtCham" style="background:' + x.mau + '"></div>' +
        '<div class="dtNoi"><b>' + esc(x.ai) + '</b> <i>' + esc(x.chu) + '</i>' +
        '<span>' + esc(x.p.id) + '</span>' +
        '<div class="dtCS">' + esc(tenCoSo(x.p.coSoId)) +
        (tenGianHang(x.p.gianHangId) ? '<s>›</s>' + esc(tenGianHang(x.p.gianHangId)) : '') + '</div>' +
        '</div></button>').join('')
    : '<div class="rdEm">Hôm nay chưa có hoạt động nào.</div>';

  moSheet(khungSheet('🔎 Radar',
    'Máy soi dữ liệu rồi nói ra kết luận — không phải danh sách việc · ' +
    soTon + ' việc đang tồn · ' + s.chuaNhan + ' chưa ai nhận' + (s.tre ? ' · ' + s.tre + ' quá hạn' : ''),
    /* máy tính chia hai cột: phát hiện bên trái, tin nhắn + dòng thời gian bên
       phải — màn rộng 1400px mà đổ một cột thì nửa màn bỏ trống (14/09) */
    '<div class="rdCot"><div class="rdTrai">' + khoiSoi + '</div>' +
    '<div class="rdPhai">' + khoiTin + khoiHN + '</div></div>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  /* mở rộng trên máy tính: màn này có hai cột, bó trong 560px thì vỡ bố cục */
  sheetTo();
}

/* ============================================================
   QUÉT LẠI NHÓM LỖI BẰNG AI (20/09 — Trường chốt "quét lại hết một lượt").
   KHÔNG tự ghi đè: quét xong hiện bảng đối chiếu nhóm CŨ với nhóm AI đề
   xuất, Trường xem rồi mới bấm lưu. Dòng nào thấy sai thì bỏ tích riêng dòng
   đó. Phiếu nào AI trả về đúng nhóm đang có thì không liệt kê cho đỡ rối.
   Gửi theo lô 20 phiếu để một lượt gọi không quá lâu.
   ============================================================ */
let AI_KQ = [];        /* kết quả quét gần nhất, chờ Trường duyệt */
let AI_BO = {};        /* những dòng Trường bỏ tích */

async function aiQuetLai() {
  if (!laQuanLy()) return;
  const ds = phieuThat().filter(p => p.trangThai !== 'huy');
  if (!ds.length) { nhac('Chưa có phiếu nào để quét', 'canh'); return; }
  moSheet(khungSheet('🤖 AI đọc lại nhóm lỗi',
    'Đang đọc ' + ds.length + ' phiếu — chưa ghi gì vào kho',
    '<div class="aiCho"><span class="vong"></span><div><b id="aiSo">0 / ' + ds.length + '</b>' +
    '<div>Mỗi lô 20 phiếu · xong sẽ hiện bảng đối chiếu để mày duyệt</div></div></div>', ''));
  sheetTo();

  AI_KQ = []; AI_BO = {};
  const lo = [];
  for (let i = 0; i < ds.length; i += 20) lo.push(ds.slice(i, i + 20));
  let xong = 0;
  for (const l of lo) {
    try {
      const r = await fetch('/api/ai-nhom', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ds: l.map(p => ({ id: p.id, chu: (p.noiDung + ' ' + (p.moTa || '')).slice(0, 400) }))
        })
      }).then(x => x.json());
      (r.ds || []).forEach(x => {
        const p = phieu(x.id);
        if (!p || !x.nhom || !NHOM_LOI[x.nhom] || x.nhom === p.nhomLoi) return;
        AI_KQ.push({ id: p.id, noiDung: p.noiDung, cu: p.nhomLoi, moi: x.nhom });
      });
    } catch (e) { }
    xong += l.length;
    const el = document.getElementById('aiSo');
    if (el) el.textContent = xong + ' / ' + ds.length;
  }
  veAiKetQua(ds.length);
}

function veAiKetQua(tong) {
  if (!AI_KQ.length) {
    moSheet(khungSheet('🤖 AI đọc lại nhóm lỗi', 'Đã đọc ' + tong + ' phiếu',
      '<div class="rdEm">✓ <b>AI đồng ý với toàn bộ nhóm đang ghi</b>' +
      '<div>Không có phiếu nào cần đổi.</div></div>',
      '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
    return;
  }
  const hang = AI_KQ.map((x, i) =>
    '<button class="aiH' + (AI_BO[x.id] ? ' bo' : '') + '" data-aibo="' + esc(x.id) + '">' +
    '<span class="aiTic">' + (AI_BO[x.id] ? '' : '✓') + '</span>' +
    '<div class="aiND"><b>' + esc(x.noiDung) + '</b><span>' + esc(x.id) + '</span></div>' +
    '<div class="aiDoi"><s>' + esc(NHOM_LOI[x.cu] || 'Khác') + '</s>' +
    '<i>→</i><b>' + esc(NHOM_LOI[x.moi] || 'Khác') + '</b></div></button>').join('');
  const nhan = AI_KQ.length - Object.keys(AI_BO).filter(k => AI_BO[k]).length;
  moSheet(khungSheet('🤖 AI đọc lại nhóm lỗi',
    'Đã đọc ' + tong + ' phiếu · AI đề xuất đổi ' + AI_KQ.length + ' phiếu · bấm một dòng để bỏ qua dòng đó',
    '<div class="aiBang">' + hang + '</div>',
    '<button class="btn v" data-dongsheet="1">Thôi, không đổi</button>' +
    '<button class="btn pri" style="flex:1" data-ailuu="1">Lưu ' + nhan + ' thay đổi vào kho</button>'));
  sheetTo();
}

async function aiLuuKetQua() {
  const ds = AI_KQ.filter(x => !AI_BO[x.id]);
  if (!ds.length) { nhac('Không còn dòng nào được tích', 'canh'); return; }
  let ok = 0;
  for (const x of ds) {
    try {
      await ghi('phieu_loi', 'update', { loai_loi: x.moi }, x.id);
      const p = phieu(x.id);
      if (p) p.nhomLoi = x.moi;
      veVet(x.id, 'ai_nhom_quet', { tu: x.cu, sang: x.moi });
      ok++;
    } catch (e) { }
  }
  luuCache(); dongSheet(); veHet();
  nhac('🤖 Đã cập nhật nhóm lỗi cho ' + ok + '/' + ds.length + ' phiếu', ok ? 'la' : 'do');
}

/* ============================================================
   AI TỰ QUÉT PHIẾU CŨ — KHÔNG AI PHẢI BẤM (20/09 — Trường: "tao tưởng cái
   này AI tự quét mà, tao lại còn phải tự ấn nút nữa á").
   Phiếu MỚI thì AI đã tự đọc ngay lúc cơ sở gửi. Còn phiếu có từ trước ngày
   bật AI thì phải quét bù — và việc đó chạy ngầm luôn, không hỏi han gì.

   Ba cái chốt để chạy ngầm mà vẫn an toàn:
   ① mỗi phiếu chỉ quét ĐÚNG MỘT LẦN — nhớ id đã quét trong máy, mở web trăm
     lần cũng không gọi AI lại lần hai
   ② mỗi lượt mở web chỉ quét tối đa 40 phiếu, chạy sau khi web vẽ xong 6 giây
     — không tranh đường với việc tải dữ liệu và ảnh
   ③ đổi xong thì hiện một dòng nhắc nhẹ ở góc, bấm vào xem đã đổi những gì
     và HOÀN TÁC được cả loạt nếu thấy sai
   Chỉ chạy ở vai quản lý: cơ sở và kỹ thuật không việc gì phải gánh phần này.
   ============================================================ */
const AI_DAQUET = 'kt_ai_daquet_v1';
let AI_VUA_DOI = [];        /* những phiếu AI vừa đổi trong phiên này */

function aiDaQuet() {
  try { return new Set(JSON.parse(localStorage.getItem(AI_DAQUET) || '[]')); }
  catch (e) { return new Set(); }
}
function aiGhiDaQuet(ids) {
  try {
    const s = aiDaQuet();
    ids.forEach(x => s.add(x));
    /* giữ 2000 id gần nhất là quá đủ, không để localStorage phình mãi */
    localStorage.setItem(AI_DAQUET, JSON.stringify([...s].slice(-2000)));
  } catch (e) { }
}

async function aiQuetNgam() {
  if (!laQuanLy() || typeof phieuThat !== 'function') return;
  const da = aiDaQuet();
  const con = phieuThat().filter(p => p.trangThai !== 'huy' && !da.has(p.id)).slice(0, 40);
  if (!con.length) return;
  let doi = [];
  for (let i = 0; i < con.length; i += 20) {
    const l = con.slice(i, i + 20);
    try {
      const r = await fetch('/api/ai-nhom', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ds: l.map(p => ({ id: p.id, chu: (p.noiDung + ' ' + (p.moTa || '')).slice(0, 400) })) })
      }).then(x => x.json());
      for (const x of (r.ds || [])) {
        const p = phieu(x.id);
        if (!p || !x.nhom || !NHOM_LOI[x.nhom] || x.nhom === p.nhomLoi) continue;
        const cu = p.nhomLoi;
        try {
          await ghi('phieu_loi', 'update', { loai_loi: x.nhom }, p.id);
          p.nhomLoi = x.nhom;
          veVet(p.id, 'ai_nhom_ngam', { tu: cu, sang: x.nhom });
          doi.push({ id: p.id, noiDung: p.noiDung, cu: cu, moi: x.nhom });
        } catch (e) { }
      }
    } catch (e) { return; }      /* AI hỏng thì dừng, để lần mở sau quét tiếp */
    aiGhiDaQuet(l.map(p => p.id));
  }
  if (!doi.length) { luuCache(); return; }
  AI_VUA_DOI = AI_VUA_DOI.concat(doi);
  luuCache(); if (typeof veHet === 'function') veHet();
  veAiNhac();
}

/* dòng nhắc nhẹ ở góc — không chặn màn, bấm mới xem chi tiết */
function veAiNhac() {
  let el = document.getElementById('aiNhac');
  if (!el) {
    el = document.createElement('button');
    el.id = 'aiNhac'; el.className = 'aiNhac'; el.dataset.aixem = '1';
    document.body.appendChild(el);
  }
  el.innerHTML = '🤖 AI đã đọc lại và sửa <b>' + AI_VUA_DOI.length + ' nhóm lỗi</b><i>bấm để xem · hoàn tác được</i>';
}

function formAiVuaDoi() {
  if (!AI_VUA_DOI.length) return;
  moSheet(khungSheet('🤖 AI vừa sửa nhóm lỗi',
    AI_VUA_DOI.length + ' phiếu · đã lưu vào kho · thấy sai thì hoàn tác cả loạt hoặc sửa từng phiếu',
    '<div class="aiBang">' + AI_VUA_DOI.map(x =>
      '<div class="aiH"><span class="aiTic">✓</span>' +
      '<div class="aiND"><b>' + esc(x.noiDung) + '</b><span>' + esc(x.id) + '</span></div>' +
      '<div class="aiDoi"><s>' + esc(NHOM_LOI[x.cu] || 'Khác') + '</s><i>→</i>' +
      '<b>' + esc(NHOM_LOI[x.moi] || 'Khác') + '</b></div></div>').join('') + '</div>',
    '<button class="btn v" data-aihoantac="1">↩ Hoàn tác tất cả</button>' +
    '<button class="btn pri" style="flex:1" data-aiok="1">Được, giữ nguyên</button>'));
  sheetTo();
}

async function aiHoanTac() {
  let ok = 0;
  for (const x of AI_VUA_DOI) {
    try {
      await ghi('phieu_loi', 'update', { loai_loi: x.cu }, x.id);
      const p = phieu(x.id); if (p) p.nhomLoi = x.cu;
      veVet(x.id, 'ai_nhom_hoantac', { tu: x.moi, ve: x.cu });
      ok++;
    } catch (e) { }
  }
  AI_VUA_DOI = [];
  const el = document.getElementById('aiNhac'); if (el) el.remove();
  luuCache(); dongSheet(); veHet();
  nhac('↩ Đã trả ' + ok + ' phiếu về nhóm cũ', 'canh');
}
