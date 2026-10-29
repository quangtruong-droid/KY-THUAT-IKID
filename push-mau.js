/* ============================================================
   IKID · MẪU THÔNG BÁO ĐẨY
   Sửa chữ trong file này là đổi được toàn bộ nội dung thông báo.
   Mỗi mẫu: tieu (dòng đậm) · than (dòng nhỏ) · gap (rung mạnh,
   nằm lại màn khoá đến khi bấm) · phieu (bấm vào mở đúng phiếu)
   ============================================================ */

const dd = t => { if (!t) return ''; const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
/* mốc SỰ KIỆN kèm giờ:phút; dữ liệu cũ 00:00 (không có giờ thật) thì giấu đi */
const ddGio = t => { if (!t) return ''; const d = new Date(t); const g = d.getHours() || d.getMinutes() ? ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''; return dd(t) + g; };
const tien = n => (Number(n) || 0).toLocaleString('vi-VN');

export function MAU_TIN(mau, d) {
  /* chỗ xảy ra: "Royal City ▸ Snow Fun" — kỹ thuật đọc phát biết đến đâu, vào gian nào */
  const cho = (d.coSo || '') + (d.gianHang ? ' ▸ ' + d.gianHang : '');
  /* "Vì Thị Nga (Time City)" → "Vì Thị Nga": phần trong ngoặc đã nói ở dòng nơi chốn,
     để nguyên thì iPhone cắt mất mã phiếu ở cuối tiêu đề (Trường bắt 29/08). */
  const tenGon = t => String(t || '').split('(')[0].trim() || String(t || '');
  const anh = d.soAnh ? ' · 📷 ' + d.soAnh + ' ảnh' : '';
  const M = {

    /* ⓪ GỬI THỬ — nút "Gửi thử thông báo" trong Cài đặt */
    thu: {
      tieu: '✅ Thông báo chạy rồi' + (d.ten ? ' · ' + d.ten : ''),
      than: 'Máy này nhận được thông báo đẩy của Kỹ thuật IKID. Không phải làm gì thêm.',
      tag: 'thu'
    },

    /* ① CƠ SỞ GIAO VIỆC KHẨN CẤP → cả 6 kỹ thuật + quản lý, rung mạnh */
    giao_khan: {
      tieu: '🔴 KHẨN CẤP · ' + cho,
      than: d.noiDung +
        '\nMong muốn xong ' + dd(d.mongMuon) + anh + ' · chưa ai nhận' +
        '\n' + (d.nguoi ? d.nguoi + ' báo · ' : '') + d.id,
      gap: true, phieu: d.id
    },

    /* ② CƠ SỞ GIAO VIỆC THƯỜNG → cả 6 kỹ thuật */
    giao_thuong: {
      tieu: '🔧 Việc mới · ' + cho,
      /* mucDo có thể trống/lạ từ điển — đừng bao giờ in chữ "undefined" (30/08) */
      than: d.noiDung +
        '\n' + (d.mucDo ? d.mucDo + ' · ' : '') + 'mong muốn xong ' + dd(d.mongMuon) + anh +
        '\n' + (d.nguoi ? d.nguoi + ' báo · ' : '') + d.id,
      phieu: d.id
    },

    /* ③ KỸ THUẬT TIẾP NHẬN → CHT cơ sở đó */
    tiep_nhan: {
      tieu: '🔵 ' + d.tho + ' đã nhận · ' + cho,
      than: d.noiDung + '\nCam kết xong ' + dd(d.duKien) + ' · ' + d.id,
      phieu: d.id
    },

    /* ④ KỸ THUẬT DỜI NGÀY → CHT cơ sở đó */
    doi_ngay: {
      tieu: '📅 ' + d.tho + ' dời hạn: ' + dd(d.cu) + ' → ' + dd(d.moi),
      than: d.noiDung + (d.lyDo ? '\nLý do: ' + d.lyDo : '') + '\n' + cho + ' · ' + d.id,
      phieu: d.id
    },

    /* ============================================================
       ④b XIN DỜI HẠN CHỜ DUYỆT (28/09 — Trường chốt quy trình mới).
       Kỹ thuật không tự dời nữa. Ba tin dưới đây là cả vòng: xin → admin,
       admin quyết → kỹ thuật + cơ sở. Tiêu đề nói LUÔN kết quả, vì phần lớn
       người đọc chỉ liếc dòng đầu trên màn khoá.
       ============================================================ */
    /* kỹ thuật xin → CHỈ admin. Đánh dấu gấp: kỹ thuật đang đứng chờ bấm nút. */
    xin_doi: {
      tieu: '⏳ ' + d.tho + ' xin dời hạn: ' + dd(d.cu) + ' → ' + dd(d.moi),
      than: d.noiDung + (d.lyDo ? '\nLý do: ' + d.lyDo : '') +
        '\nVào duyệt hoặc từ chối · ' + cho + ' · ' + d.id,
      gap: true, phieu: d.id
    },
    /* admin duyệt → kỹ thuật đã xin + CHT cơ sở đó */
    duyet_doi: {
      tieu: '✓ Quản lý DUYỆT dời hạn → ' + dd(d.moi),
      than: d.noiDung + '\n' + (d.tho ? d.tho + ' xin dời, ' : '') + 'hạn cũ ' + dd(d.cu) +
        '\n' + cho + ' · ' + d.id,
      phieu: d.id
    },
    /* admin từ chối → kỹ thuật + cơ sở. Nói rõ hạn GIỮ NGUYÊN là ngày nào. */
    tuchoi_doi: {
      tieu: '✕ Quản lý KHÔNG duyệt dời hạn — giữ ' + dd(d.giu),
      than: d.noiDung + '\nXin dời sang ' + dd(d.xin) + (d.lyDo ? '\nVì sao: ' + d.lyDo : '') +
        '\n' + cho + ' · ' + d.id,
      gap: true, phieu: d.id
    },
    /* kỹ thuật tự rút → chỉ admin, để admin khỏi mở ra thấy trống */
    rut_xin: {
      tieu: '↩ ' + d.tho + ' rút lời xin dời hạn',
      than: d.noiDung + '\nKhông cần duyệt nữa · ' + cho + ' · ' + d.id,
      phieu: d.id
    },

    /* ⑤ KỸ THUẬT BÁO VƯỚNG → CHT cơ sở đó */
    vuong: {
      tieu: '⏸ ' + d.tho + ': ' + d.vuong,
      than: d.noiDung + (d.ghi ? '\n' + d.ghi : '') + '\n' + cho + ' · ' + d.id,
      phieu: d.id
    },

    /* ⑥ KỸ THUẬT BÁO XONG → CHT cơ sở đó, rung mạnh vì đang chờ nghiệm thu */
    bao_xong: {
      tieu: '✅ ' + (d.nguoiSua || 'Kỹ thuật') + ' báo đã sửa xong · ' + cho,
      than: d.noiDung +
        '\nXong ' + ddGio(d.ngayXong) + (d.chiPhi ? ' · chi phí ' + tien(d.chiPhi) + '₫' : '') + anh +
        '\nVào nghiệm thu Đạt / Chưa đạt · ' + d.id,
      gap: true, phieu: d.id
    },

    /* ⑦ CHT XÁC NHẬN ĐẠT → kỹ thuật đã làm */
    dat: {
      tieu: '🏁 Nghiệm thu ĐẠT · ' + cho,
      than: d.noiDung + '\n' + d.cht + ' xác nhận — xong việc · ' + d.id,
      phieu: d.id
    },

    /* ⑧ CHT TRẢ LẠI CHƯA ĐẠT → kỹ thuật + cả team, rung mạnh */
    chua_dat: {
      tieu: '↩️ CHƯA ĐẠT — phải làm lại · ' + cho,
      than: d.noiDung + '\nLý do: ' + (d.lyDo || 'không ghi') + '\n' + d.cht + ' trả lại · ' + d.id,
      gap: true, phieu: d.id
    },

    /* ⑨ @NHẮC TÊN TRONG TRAO ĐỔI → người bị nhắc */
    nhac_ten: {
      tieu: '💬 ' + tenGon(d.nguoi) + ' nhắc bạn',
      than: d.tin + '\n' + (cho ? cho + ' · ' : '') + (d.noiDung || '') + ' · ' + d.id,
      phieu: d.id
    },

    /* ⑩ NHẮN THƯỜNG TRONG PHIẾU → những người theo dõi phiếu.
       Bản cũ tiêu đề là "tên người · mã phiếu": tên dài như "Vì Thị Nga (Time City)"
       ăn hết chỗ nên iPhone cắt mất đúng cái mã phiếu; thân tin lại chỉ có mỗi câu
       nhắn, đọc xong không biết phiếu nào, lỗi gì (Trường bắt 29/08).
       Giờ: tiêu đề = tên đã rút gọn + nơi chốn; thân = câu nhắn, rồi tên việc + mã. */
    tin_moi: {
      tieu: '💬 ' + tenGon(d.nguoi) + (cho ? ' · ' + cho : ''),
      than: d.tin + '\n' + (d.noiDung ? d.noiDung + ' · ' : '') + d.id,
      phieu: d.id
    },

    /* ⑩b PHIẾU BỊ HUỶ → người đã nhận việc (Trường bắt 30/08: trước đây huỷ
       im lặng, kỹ thuật không biết, vẫn xách đồ đến sửa) */
    huy_phieu: {
      tieu: '🗑 Phiếu bị huỷ' + (cho ? ' · ' + cho : ''),
      than: (d.noiDung || '') + '\n' + tenGon(d.nguoi) + ' huỷ' + (d.lyDo ? ': ' + d.lyDo : '') + ' · ' + d.id,
      phieu: d.id
    },

    /* ⑩c QUẢN LÝ GIAO ĐÍCH DANH → đúng người được giao, rung mạnh (04/09) */
    giao_danh: {
      tieu: '📌 Quản lý giao đích danh cho bạn' + (cho ? ' · ' + cho : ''),
      than: (d.noiDung || '') + (d.mongMuon ? '\nMong muốn xong ' + dd(d.mongMuon) : '') +
        '\nVào hẹn ngày xong — kẹt thì trả lại kèm lý do · ' + d.id,
      gap: true, phieu: d.id
    },

    /* ⑩d KỸ THUẬT TRẢ VIỆC LẠI TEAM → cả team + quản lý (04/09) */
    tra_viec: {
      tieu: '↩️ ' + (d.tho || 'Kỹ thuật') + ' trả việc lại team' + (cho ? ' · ' + cho : ''),
      than: (d.noiDung || '') + '\nLý do: ' + (d.lyDo || 'không ghi') + '\nViệc đang CHƯA AI NHẬN · ' + d.id,
      gap: true, phieu: d.id
    },

    /* ⑩e QUẢN LÝ THU HỒI VIỆC ĐÃ GIAO → đúng người bị rút (14/09).
       Nói thẳng "bạn không phải làm nữa" để không ai còn đi đến nơi rồi mới biết. */
    thu_hoi: {
      tieu: '↩️ Quản lý thu hồi việc đã giao' + (cho ? ' · ' + cho : ''),
      than: (d.noiDung || '') + '\nBạn KHÔNG phải làm việc này nữa' +
        (d.lyDo ? '\nLý do: ' + d.lyDo : '') + '\n' + d.id,
      gap: true, phieu: d.id
    },

    /* ⑪ NHẮC QUÁ HẠN — 9h sáng (Trường đổi 10/09), nhắc lại mỗi 2 ngày */
    qua_han: {
      tieu: '⚠️ Quá hạn ' + d.soNgay + ' ngày · ' + d.id,
      than: d.noiDung + '\n' + d.coSo + ' · hẹn xong ' + dd(d.duKien) + ' · ' + (d.tho || 'chưa ai nhận'),
      gap: true, phieu: d.id
    },

    /* ⑫ SẮP HẾT HẠN — 9h sáng của ngày hết hạn (Trường đổi 10/09) */
    sap_han: {
      tieu: '⏱ Hôm nay là hạn · ' + d.id,
      than: d.noiDung + '\n' + d.coSo + ' — hôm nay không xong là tính quá hạn',
      phieu: d.id
    },

    /* ⑬ CHƯA AI TIẾP NHẬN QUÁ 24H → cả 6 kỹ thuật */
    chua_nhan: {
      tieu: '👤 ' + d.so + ' việc chưa ai tiếp nhận',
      than: 'Cũ nhất ' + d.soNgay + ' ngày · ' + d.coSo + '\nVào nhận việc và hẹn ngày xong',
      phieu: d.id
    },

    /* ⑭ CHT ĐỂ QUÁ 2 NGÀY KHÔNG NGHIỆM THU → CHT đó + quản lý */
    cht_cham: {
      tieu: '🔒 ' + d.so + ' việc chờ nghiệm thu quá ' + d.soNgay + ' ngày',
      than: d.coSo + '\nKỹ thuật đã báo xong, chưa ai xác nhận Đạt hay Chưa đạt',
      phieu: d.id
    },

    /* ⑮⑯⑰ BẢN TIN SÁNG — kỹ thuật / cơ sở / quản lý.
       PHẢI là (d.dong || []): M dựng CẢ 18 mẫu mỗi lần gọi, nên gửi BẤT KỲ tin nào
       mà d không có .dong là nổ ngay tại đây — chính lỗi này làm MỌI thông báo đẩy
       chết từ đầu (Worker threw exception, tìm ra 21/08 nhờ nút Gửi thử). */
    /* ============================================================
       BẢN TIN ĐẦU BUỔI — CHẠY HAI LẦN MỖI NGÀY (21/10 — Trường: "làm thêm 1
       cái vào 13h chiều tương tự như 9h sáng, vì 9h khả năng chưa ai ngủ dậy").
       Cùng một bộ số liệu, chỉ đổi lời chào: d.buoi = 'sang' | 'chieu'.
       Chiều ghi rõ "còn lại" để người đọc biết đây là bản nhắc lần hai, không
       phải tin mới trùng lặp.
       ============================================================ */
    sang_tho: {
      tieu: (d.buoi === 'chieu' ? '🕐 Chiều ' : '☀️ Sáng ') + dd(Date.now()) +
        ' · ' + d.tong + ' việc' + (d.buoi === 'chieu' ? ' còn lại' : ' cần làm'),
      than: (d.dong || []).join(' · ') + '\nBấm để mở danh sách'
    },
    sang_coso: {
      tieu: (d.buoi === 'chieu' ? '🕐 Chiều ' : '☀️ Sáng ') + dd(Date.now()) + ' · ' + d.coSo,
      than: (d.dong || []).join(' · ')
    },
    sang_quanly: {
      tieu: (d.buoi === 'chieu' ? '🕐 Chiều ' : '☀️ Sáng ') + dd(Date.now()) + ' · toàn hệ thống',
      than: (d.dong || []).join(' · ') + '\nTỉ lệ hoàn thành tháng này ' + d.tyLe + '%'
    },

    /* ⑱ KHO SẮP ĐẦY → quản lý */
    kho_day: {
      tieu: '🗄 Kho ảnh đã dùng ' + d.mb + ' MB',
      than: 'Còn ' + d.con + ' MB trong mức miễn phí\nVào Cài đặt → Dọn kho để xoá file cũ hơn 6 tháng'
    }
  };
  return M[mau] || null;
}

/* ============================================================
   BẢN TIN 8H SÁNG — gộp mọi thứ thành 1 tin cho mỗi người
   ============================================================ */
export function banTinSang(dsPhieu, dsNguoi, dsCoSo, buoi) {
  const B = buoi === 'chieu' ? 'chieu' : 'sang';
  const NGAY = 86400000;
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  const moc = homNay.getTime();
  const tenCS = id => (dsCoSo.find(c => c.id === id) || {}).ten || id || '—';

  const p = dsPhieu.map(r => ({
    id: r.id, coSoId: r.co_so_id, trangThai: r.trang_thai,
    nguoiNhan: r.nguoi_nhan_kt || '', nguoiSua: r.nguoi_sua || [],
    han: r.du_kien ? new Date(r.du_kien).getTime() : (r.mong_muon ? new Date(r.mong_muon + 'T00:00:00').getTime() : 0),
    ngayXong: r.done_at ? new Date(r.done_at).getTime() : 0,
    chtKq: r.cht_ket_qua || '', chtGhi: r.cht_ghi || ''
  }));

  const xong = x => ['hoanthanh', 'nghiemthu'].includes(x.trangThai);
  const tre = x => !xong(x) && x.han && Math.floor((moc - x.han) / NGAY) > 0;
  const hanHomNay = x => !xong(x) && x.han && Math.floor((moc - x.han) / NGAY) === 0;
  const chuaNhan = x => x.trangThai === 'moi' && !x.nguoiNhan;
  const choCht = x => x.trangThai === 'hoanthanh' && !x.chtKq;

  const goi = [];

  /* kỹ thuật */
  dsNguoi.filter(n => n.vai === 'tho').forEach(n => {
    const cua = p.filter(x => x.nguoiNhan === n.ten || (x.nguoiSua || []).includes(n.ten));
    const t = cua.filter(tre).length;
    const h = cua.filter(hanHomNay).length;
    const c = p.filter(chuaNhan).length;
    const traLai = cua.filter(x => x.chtKq === 'chua_dat' && x.trangThai === 'tiepnhan').length;
    const dong = [];
    if (traLai) dong.push('❗' + traLai + ' việc CHT trả lại');
    if (t) dong.push(t + ' quá hạn');
    if (h) dong.push(h + ' hết hạn hôm nay');
    if (c) dong.push(c + ' chưa ai nhận');
    if (!dong.length) return;
    goi.push({ ai: n.id, tin: MAU_TIN('sang_tho', { tong: t + h + c + traLai, dong, buoi: B }) });
  });

  /* cơ sở */
  dsNguoi.filter(n => n.vai === 'coso' && n.co_so_id).forEach(n => {
    const cua = p.filter(x => x.coSoId === n.co_so_id);
    const ng = cua.filter(choCht).length;
    const t = cua.filter(tre).length;
    const cn = cua.filter(x => chuaNhan(x) && tre(x)).length;
    const dong = [];
    if (ng) dong.push('❗' + ng + ' việc chờ anh/chị nghiệm thu');
    if (t) dong.push(t + ' việc quá hạn');
    if (cn) dong.push(cn + ' việc kỹ thuật chưa nhận');
    if (!dong.length) return;
    goi.push({ ai: n.id, tin: MAU_TIN('sang_coso', { coSo: tenCS(n.co_so_id), dong, buoi: B }) });
  });

  /* quản lý */
  const thangNay = p.filter(x => true);
  const soXong = thangNay.filter(xong).length;
  const tyLe = thangNay.length ? Math.round(soXong / thangNay.length * 100) : 0;
  const dong = [];
  const qt = p.filter(tre).length, cn = p.filter(chuaNhan).length, cc = p.filter(choCht).length;
  if (qt) dong.push(qt + ' quá hạn');
  if (cn) dong.push(cn + ' chưa ai nhận');
  if (cc) dong.push(cc + ' chờ nghiệm thu');
  if (dong.length) {
    dsNguoi.filter(n => n.vai === 'quanly').forEach(n => {
      goi.push({ ai: n.id, tin: MAU_TIN('sang_quanly', { dong, tyLe, buoi: B }) });
    });
  }
  return goi;
}
