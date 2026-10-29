/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Bật thông báo đẩy trên máy người dùng
   ============================================================ */
'use strict';

const KHOA_DAY = 'kt_day_v1';

/* ---------- đăng ký service worker ---------- */
async function ganSW() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch (e) { return null; }
}

const hoTroDay = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const daBatDay = () => hoTroDay() && Notification.permission === 'granted' && localStorage.getItem(KHOA_DAY) === '1';

function laBoNho(s) {
  const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
const raB64 = buf => {
  const b = new Uint8Array(buf); let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/* ---------- bật ---------- */
async function batDay() {
  if (!hoTroDay()) { nhac('Máy này không nhận được thông báo đẩy', 'do'); return false; }
  if (!D.nguoi) { nhac('Chọn tên mình trước đã', 'do'); return false; }

  const k = await fetch('/api/day-khoa').then(r => r.json()).catch(() => ({}));
  if (!k.bat || !k.cong) { nhac('Chưa cài khoá đẩy trên server — xem file BAT-THONG-BAO.md', 'canh'); return false; }

  const quyen = await Notification.requestPermission();
  if (quyen !== 'granted') {
    nhac(quyen === 'denied'
      ? 'Máy đã chặn thông báo — vào Cài đặt trình duyệt mở lại cho trang này'
      : 'Chưa cho phép thông báo', 'canh');
    return false;
  }

  const reg = await ganSW();
  if (!reg) { nhac('Không đăng ký được — thử thêm web vào màn hình chính trước', 'do'); return false; }
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options && sub.options.applicationServerKey) {
    /* khoá đổi thì phải đăng ký lại */
    const cu = raB64(sub.options.applicationServerKey);
    if (cu !== k.cong) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: laBoNho(k.cong) });
    } catch (e) { nhac('Đăng ký thông báo không được: ' + (e.message || ''), 'do'); return false; }
  }

  const j = sub.toJSON();
  /* ============================================================
     ĐĂNG KÝ PHẢI MANG THEO LỰA CHỌN RUNG CỦA CHÍNH MÁY NÀY (21/09).
     Tắt thông báo là huỷ đăng ký cũ; bật lại là sinh MỘT endpoint MỚI tinh,
     dòng mới trong kho mặc định rung=1. Máy thì vẫn nhớ "đã tắt rung" →
     màn Cài đặt ghi Tắt mà máy cứ rung. Nên gửi kèm cờ ngay lúc đăng ký.
     ============================================================ */
  const r = await ghi('kt_day', 'insert', {
    nguoi_id: D.nguoi.id, nguoi_ten: D.nguoi.ten, vai: D.nguoi.vai,
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
    may: (navigator.userAgent || '').slice(0, 160), bat: true,
    rung: (typeof rungBat === 'function' ? rungBat() : true) ? 1 : 0
  });
  localStorage.setItem(KHOA_DAY, '1');
  MA_MAY_NHO = null;              /* đăng ký lại = mã máy mới, quên bản nhớ cũ */
  nhac('Đã bật thông báo cho ' + D.nguoi.ten, 'la');
  return true;
}

/* ============================================================
   TỰ CHỮA LÀNH ĐĂNG KÝ — chạy ngầm mỗi lần mở web.
   Bẫy có thật (máy Tuân 21/08): web hiện "ĐANG BẬT" vì localStorage còn cờ cũ,
   nhưng đăng ký nằm ở hệ Supabase cũ với KHOÁ CŨ — bảng kt_day trong D1 trống,
   khoá mới tự sinh khác khoá cũ → Apple từ chối, thông báo câm lặng lẽ.
   Quyền đã granted rồi nên đăng ký lại KHÔNG hỏi gì người dùng.
   ============================================================ */
async function chuaLanhDay() {
  try {
    if (!hoTroDay() || Notification.permission !== 'granted') return;
    if (localStorage.getItem(KHOA_DAY) !== '1' || !D.nguoi) return;
    const k = await fetch('/api/day-khoa').then(r => r.json()).catch(() => ({}));
    if (!k.bat || !k.cong) return;
    const reg = await ganSW(); if (!reg) return;
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey &&
      raB64(sub.options.applicationServerKey) !== k.cong) {
      await sub.unsubscribe(); sub = null;         // khoá server đã đổi → đăng ký cũ vô dụng
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: laBoNho(k.cong) });
    const j = sub.toJSON();
    /* ghi im lặng; d1.js upsert theo endpoint nên mở nhiều lần không sinh rác,
       và người đang dùng máy là người nhận thông báo của máy này */
    await ghi('kt_day', 'insert', {
      nguoi_id: D.nguoi.id, nguoi_ten: D.nguoi.ten, vai: D.nguoi.vai,
      endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      may: (navigator.userAgent || '').slice(0, 160), bat: true,
      rung: (typeof rungBat === 'function' ? rungBat() : true) ? 1 : 0
    }, null, true);
    MA_MAY_NHO = null;            /* đăng ký lại ngầm cũng sinh mã máy mới */
  } catch (e) { /* chữa lành thất bại thì thôi — lần bật tay vẫn còn đó */ }
}

/* ---------- tắt ---------- */
async function tatDay() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) {
      /* tắt đúng dòng của MÁY NÀY — tìm theo endpoint, không theo id */
      await ghi('kt_day', 'update', { bat: false }, null, true, { cot: 'endpoint', gt: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch (e) { }
  localStorage.removeItem(KHOA_DAY);
  MA_MAY_NHO = null;
  nhac('Đã tắt thông báo trên máy này', 'canh');
}

/* ============================================================
   MÃ MÁY CỦA CHÍNH MÁY NÀY (24/09 — Trường chốt "theo từng máy").
   Dùng để máy chủ loại đúng máy vừa bấm ra khỏi danh sách nhận, thay vì loại
   cả mã người — 4-5 admin dùng chung mã 'ql' nên loại theo người là cả đội
   admin cùng câm.
   Nhớ lại sau lần đọc đầu: hàm này nằm trên đường gửi MỌI thông báo, không
   để nó hỏi trình duyệt mỗi lần.
   ============================================================ */
let MA_MAY_NHO = null;
async function maMayNay() {
  if (MA_MAY_NHO !== null) return MA_MAY_NHO;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    MA_MAY_NHO = (sub && sub.endpoint) || '';
  } catch (e) { MA_MAY_NHO = ''; }
  return MA_MAY_NHO;
}

/* ---------- gửi ---------- */
async function guiDay(mau, du, ai) {
  if (!ai || !ai.length) return;
  try {
    const boMay = await maMayNay();
    await fetch('/api/day-gui', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mau, du, ai, boMay: boMay || undefined })
    });
  } catch (e) { /* thông báo lỗi thì bỏ qua, việc chính vẫn xong */ }
}

/* Gửi thử vào chính máy này và NÓI THẬT kết quả — công cụ soi tại chỗ */
async function guiThu() {
  nhac('Đang gửi thử…', 'canh');
  try {
    const chiMay = await maMayNay();
    const r = await fetch('/api/day-gui', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      /* chiMay: gửi ĐÚNG máy đang bấm. Trước đây gửi theo mã người nên một
         admin bấm thử là điện thoại của cả 5 người cùng kêu (24/09). */
      body: JSON.stringify({ mau: 'thu', du: { ten: (D.nguoi || {}).ten || '' },
        ai: [(D.nguoi || {}).id], chiMay: chiMay || undefined })
    }).then(x => x.json());
    if (r.loi) return nhac('Máy chủ: ' + r.loi, 'do');
    if (!r.soMay) return nhac('Máy chủ KHÔNG có đăng ký nào cho ' + ((D.nguoi || {}).ten || '?') +
      ' — bấm tắt rồi bật lại thông báo', 'do');
    if (r.gui) return nhac('Đã gửi tới ' + r.gui + ' máy — chờ vài giây, thông báo phải hiện' +
      ((typeof rungBat !== 'function' || rungBat()) ? ' và máy rung' : ' (rung đang tắt nên máy im lặng)'), 'la');
    nhac('Apple/Google từ chối: ' + (r.chiTiet || []).join(' · ').slice(0, 130) +
      ' — bấm tắt rồi bật lại thông báo', 'do');
  } catch (e) { nhac('Không gọi được máy chủ: ' + (e.message || ''), 'do'); }
}

/* ai nhận: id trong bảng kt_nguoi */
const idThoTatCa = () => D.ai.filter(a => a.vai === 'tho').map(a => a.id);
const idQuanLy = () => D.ai.filter(a => a.vai === 'quanly').map(a => a.id);
const idCoSo = csId => D.ai.filter(a => a.vai === 'coso' && a.coSoId === csId).map(a => a.id);
const idTheoTen = ten => D.ai.filter(a => a.ten === ten).map(a => a.id);

/* Trường chốt 21/08: "sửa lại tất cả đều nhận thông báo hết" — Admin nhận MỌI loại,
   không chỉ 4 loại như trước. Gộp danh sách người nhận: + admin, bỏ trùng.
   ============================================================
   24/09 — KHÔNG CÒN LOẠI THEO MÃ NGƯỜI Ở ĐÂY NỮA.
   Bản cũ lọc bỏ mã của chính người vừa bấm, để họ khỏi tự rung máy mình. Với
   cơ sở và kỹ thuật thì đúng, vì mỗi người một mã. Nhưng 4-5 admin DÙNG CHUNG
   mã 'ql' — một người bấm là cả chín máy admin bị loại, giám đốc giao việc
   khẩn mà ba người còn lại không hề biết.
   Giờ việc loại chuyển xuống máy chủ và loại theo MÃ MÁY (xem guiDay ở trên):
   đúng cái máy vừa bấm thì im, mọi máy khác — kể cả máy khác của chính người
   đó — vẫn nhận. Người ngồi máy tính thao tác thì điện thoại trong túi vẫn
   biết, đó là điều mong muốn.
   ============================================================ */
function nhanDay() {
  const tat = [].concat.apply([], [].slice.call(arguments)).concat(idQuanLy()).filter(Boolean);
  return tat.filter((x, i) => tat.indexOf(x) === i);
}

/* ---------- nối vào 4 bước + trao đổi ---------- */
(function noiDay() {
  const goc = {
    giaoViec: window.giaoViec, tiepNhan: window.tiepNhan, baoXong: window.baoXong,
    nghiemThu: window.nghiemThu, doiNgay: window.doiNgay, doiVuong: window.doiVuong,
    nhanTin: window.nhanTin, huyPhieu: window.huyPhieu,
    /* luồng xin dời hạn chờ duyệt (28/09) */
    xinDoiNgay: window.xinDoiNgay, duyetDoiNgay: window.duyetDoiNgay,
    tuChoiDoiNgay: window.tuChoiDoiNgay, rutXinDoi: window.rutXinDoi
  };

  /* AI NHẬN TIN CỦA PHIẾU NÀY — dùng chung cho tin nhắn, ảnh trao đổi, sửa/huỷ phiếu:
     kỹ thuật gửi → CHT cơ sở đó; phía cơ sở/admin gửi → người đã nhận việc,
     CHƯA AI NHẬN thì cả team (luật Trường chốt 29/08). */
  window.aiNhanTinPhieu = function (p) {
    if (laTho()) return idCoSo(p.coSoId);
    const daNhan = (p.nguoiSua && p.nguoiSua.length ? p.nguoiSua : [p.nguoiNhanKt]).filter(Boolean);
    return daNhan.length ? [].concat.apply([], daNhan.map(idTheoTen)) : idThoTatCa();
  };

  giaoViec = async function (v) {
    const id = await goc.giaoViec(v);
    const p = phieu(id) || {};
    const du = {
      id: id, noiDung: v.noiDung, coSo: tenCoSo(v.coSoId), gianHang: tenGianHang(v.gianHangId),
      mongMuon: p.mongMuon, mucDo: (MUC_DO[v.mucDo] || {}).ten,
      nguoi: (D.nguoi || {}).ten, soAnh: (v.anh || []).length
    };
    /* ============================================================
       CƠ SỞ CÓ KỸ THUẬT PHỤ TRÁCH (11/09): báo ĐÍCH DANH người đó — "Bạn được
       giao việc…", đọc là biết mình phải lo, khỏi chờ ai để ý.
       Nhưng KHẨN CẤP thì vẫn báo CẢ TEAM: người phụ trách có thể đang ốm, đang
       ở cơ sở khác, hoặc hết pin — việc trẻ có thể bị thương không được phép
       phụ thuộc vào một cái điện thoại.
       ============================================================ */
    const pt = p.nguoiNhanKt || '';
    if (pt && v.mucDo !== 'khancap') {
      guiDay('giao_danh', du, nhanDay(idTheoTen(pt)));
    } else {
      guiDay(v.mucDo === 'khancap' ? 'giao_khan' : 'giao_thuong', du, nhanDay(idThoTatCa()));
    }
    return id;
  };

  /* chỗ xảy ra gửi kèm mọi tin — kỹ thuật/CHT đọc thông báo là biết ngay cơ sở nào, gian nào */
  const noiCho = p => ({ coSo: tenCoSo(p.coSoId), gianHang: tenGianHang(p.gianHangId) });

  tiepNhan = async function (p, duKien, ghiChu) {
    await goc.tiepNhan(p, duKien, ghiChu);
    guiDay('tiep_nhan', Object.assign({ id: p.id, noiDung: p.noiDung, tho: (D.nguoi || {}).ten, duKien: p.duKien }, noiCho(p)), nhanDay(idCoSo(p.coSoId)));
  };

  baoXong = async function (p, v) {
    await goc.baoXong(p, v);
    guiDay('bao_xong', Object.assign({
      id: p.id, noiDung: p.noiDung, nguoiSua: (v.nguoiSua || []).join(', '),
      ngayXong: p.ngayXong, chiPhi: p.chiPhi, soAnh: (v.anh || []).length
    }, noiCho(p)), nhanDay(idCoSo(p.coSoId)));
  };

  nghiemThu = async function (p, dat, lyDo) {
    await goc.nghiemThu(p, dat, lyDo);
    const nhan = [].concat.apply([], (p.nguoiSua && p.nguoiSua.length ? p.nguoiSua : [p.nguoiNhanKt]).filter(Boolean).map(idTheoTen));
    if (dat) guiDay('dat', Object.assign({ id: p.id, noiDung: p.noiDung, cht: (D.nguoi || {}).ten }, noiCho(p)), nhanDay(nhan));
    else guiDay('chua_dat', Object.assign({ id: p.id, noiDung: p.noiDung, cht: (D.nguoi || {}).ten, lyDo: lyDo }, noiCho(p)),
      nhanDay(idThoTatCa()));
  };

  doiNgay = async function (p, duKien, lyDo) {
    const cu = p.duKien;
    await goc.doiNgay(p, duKien, lyDo);
    guiDay('doi_ngay', Object.assign({ id: p.id, noiDung: p.noiDung, tho: (D.nguoi || {}).ten, cu: cu, moi: p.duKien, lyDo: lyDo }, noiCho(p)),
      nhanDay(idCoSo(p.coSoId)));
  };

  /* ============================================================
     XIN DỜI HẠN — BA LUỒNG THÔNG BÁO (28/09, Trường chốt).
     ① kỹ thuật xin  → chỉ ADMIN (nhanDay() tự thêm admin, nên truyền mảng rỗng)
     ② admin duyệt   → kỹ thuật đã xin + CHT cơ sở đó
     ③ admin từ chối → y như ② — cơ sở cũng phải biết hạn KHÔNG đổi
     Rút lời xin thì chỉ báo admin: cơ sở chưa từng biết có lời xin nào, báo
     thêm một tin "đã rút" chỉ tổ làm nhiễu.
     ============================================================ */
  xinDoiNgay = async function (p, duKien, lyDo) {
    const cu = p.duKien;
    await goc.xinDoiNgay(p, duKien, lyDo);
    guiDay('xin_doi', Object.assign({
      id: p.id, noiDung: p.noiDung, tho: (D.nguoi || {}).ten,
      cu: cu, moi: p.doiXinNgay, lyDo: lyDo
    }, noiCho(p)), nhanDay());
  };

  duyetDoiNgay = async function (p) {
    const aiXin = p.doiXinNguoi, moi = p.doiXinNgay, cu = p.duKien;
    await goc.duyetDoiNgay(p);
    guiDay('duyet_doi', Object.assign({
      id: p.id, noiDung: p.noiDung, ql: (D.nguoi || {}).ten, tho: aiXin, cu: cu, moi: moi
    }, noiCho(p)), nhanDay(idTheoTen(aiXin), idCoSo(p.coSoId)));
  };

  tuChoiDoiNgay = async function (p, lyDo) {
    const aiXin = p.doiXinNguoi, xin = p.doiXinNgay;
    await goc.tuChoiDoiNgay(p, lyDo);
    guiDay('tuchoi_doi', Object.assign({
      id: p.id, noiDung: p.noiDung, ql: (D.nguoi || {}).ten, tho: aiXin,
      xin: xin, giu: p.duKien, lyDo: lyDo
    }, noiCho(p)), nhanDay(idTheoTen(aiXin), idCoSo(p.coSoId)));
  };

  rutXinDoi = async function (p) {
    const xin = p.doiXinNgay;
    await goc.rutXinDoi(p);
    guiDay('rut_xin', Object.assign({
      id: p.id, noiDung: p.noiDung, tho: (D.nguoi || {}).ten, xin: xin
    }, noiCho(p)), nhanDay());
  };

  doiVuong = async function (p, vuong, ghiChu) {
    await goc.doiVuong(p, vuong, ghiChu);
    if (vuong) guiDay('vuong', Object.assign({
      id: p.id, noiDung: p.noiDung, tho: (D.nguoi || {}).ten,
      vuong: (VUONG[vuong] || {}).ten, ghi: ghiChu
    }, noiCho(p)), nhanDay(idCoSo(p.coSoId)));
  };

  /* GIAO ĐÍCH DANH / ĐỔI NGƯỜI / TRẢ VIỆC (04/09) — bọc sau khi kt-data khai xong */
  const gocGiao = { giaoDichDanh: window.giaoDichDanh, doiNguoiNhan: window.doiNguoiNhan,
    traViec: window.traViec, giaoNhieuNguoi: window.giaoNhieuNguoi,
    thuHoiGiao: window.thuHoiGiao };
  /* ============================================================
     THU HỒI (14/09): người bị rút việc PHẢI được báo. Trường chốt: "Lực sẽ
     nhận được thông báo là admin đã thu hồi lại lỗi đã bàn giao". Không báo
     thì họ vẫn đi đến nơi rồi mới biết việc không còn của mình.
     ============================================================ */
  thuHoiGiao = async function (p, lyDo) {
    const kq = await gocGiao.thuHoiGiao(p, lyDo);
    const ai = (kq && kq.ai) || [];
    if (!ai.length) return kq;
    guiDay('thu_hoi', Object.assign({ id: p.id, noiDung: p.noiDung,
      ql: (D.nguoi || {}).ten, lyDo: lyDo || '' }, noiCho(p)),
      nhanDay([].concat.apply([], ai.map(idTheoTen))));
    return kq;
  };
  /* giao cho NHIỀU người (11/09): cả nhóm nhận thông báo đích danh */
  giaoNhieuNguoi = async function (p, tens) {
    await gocGiao.giaoNhieuNguoi(p, tens);
    const ds = (tens || []).filter(Boolean);
    if (ds.length < 2) return;                 /* 1 người thì giaoDichDanh đã bắn rồi */
    guiDay('giao_danh', Object.assign({ id: p.id, noiDung: p.noiDung, mongMuon: p.mongMuon }, noiCho(p)),
      nhanDay([].concat.apply([], ds.map(idTheoTen))));
  };
  giaoDichDanh = async function (p, tenTho) {
    await gocGiao.giaoDichDanh(p, tenTho);
    guiDay('giao_danh', Object.assign({ id: p.id, noiDung: p.noiDung, mongMuon: p.mongMuon }, noiCho(p)),
      nhanDay(idTheoTen(tenTho)));
  };
  doiNguoiNhan = async function (p, tenMoi) {
    const cu = p.nguoiNhanKt;
    await gocGiao.doiNguoiNhan(p, tenMoi);
    /* người mới: nhận đích danh; người cũ: biết mình được rút khỏi việc */
    guiDay('giao_danh', Object.assign({ id: p.id, noiDung: p.noiDung, mongMuon: p.mongMuon }, noiCho(p)),
      nhanDay(idTheoTen(tenMoi)));
    if (cu) guiDay('tin_moi', Object.assign({ id: p.id, nguoi: (D.nguoi || {}).ten, noiDung: p.noiDung,
      tin: 'Việc này đã chuyển sang ' + tenMoi + ' — bạn khỏi lo nữa' }, noiCho(p)), nhanDay(idTheoTen(cu)));
  };
  traViec = async function (p, lyDo) {
    const tho = (D.nguoi || {}).ten;
    await gocGiao.traViec(p, lyDo);
    guiDay('tra_viec', Object.assign({ id: p.id, noiDung: p.noiDung, tho: tho, lyDo: lyDo }, noiCho(p)),
      nhanDay(idThoTatCa()));
  };

  nhanTin = async function (p, text, anh) {
    await goc.nhanTin(p, text, anh);
    const ten = (D.nguoi || {}).ten;
    /* bỏ phần trích [[TL:...]] / lệnh ghim [[GHIM:]]·[[BOGHIM:]] trước khi dò @
       và soạn thông báo — kẻo tin gốc có @Tên là nhắc nhầm người, và thông báo
       lòi mã kỹ thuật (30-31/08) */
    text = String(text || '').replace(/^\[\[(?:TL|GHIM|BOGHIM|HUYTIN):[^\]]*\]\]\n?/, '');
    /* @nhắc tên → gửi riêng cho người bị nhắc */
    const nhac2 = (text || '').match(/@(\S+)/g) || [];
    const biNhac = [].concat.apply([], nhac2.map(x => idTheoTen(x.slice(1))));
    if (biNhac.length) {
      guiDay('nhac_ten', Object.assign({ id: p.id, noiDung: p.noiDung, nguoi: ten, tin: text }, noiCho(p)),
        nhanDay(biNhac));
      return;
    }
    /* Còn lại: gửi cho phía bên kia.
       CHT nhắn vào phiếu CHƯA AI NHẬN thì không có "người bên kia" nào cả — trước
       đây danh sách rỗng nên tin bay vào hư không, kỹ thuật không ai biết (Trường
       bắt 29/08: nhắn từ laptop CHT, điện thoại kỹ thuật im re). Mà đó lại đúng lúc
       cần báo nhất: cơ sở đang bổ sung thông tin cho việc chưa ai cầm.
       → chưa ai nhận thì gửi cho CẢ TEAM kỹ thuật. */
    /* gửi kèm tên việc + cơ sở▸gian hàng: đọc thông báo là biết ngay phiếu nào,
       khỏi phải mở app ra tra (Trường bắt 29/08) */
    guiDay('tin_moi', Object.assign({ id: p.id, nguoi: ten, noiDung: p.noiDung,
      tin: (text || '').slice(0, 120) }, noiCho(p)), nhanDay(aiNhanTinPhieu(p)));
  };

  /* PHIẾU BỊ HUỶ → báo người đã nhận việc / cả team (Trường bắt 30/08:
     trước đây huỷ im lặng, kỹ thuật vẫn xách đồ đến sửa) */
  huyPhieu = async function (p, lyDo) {
    const ai = aiNhanTinPhieu(p);      // tính TRƯỚC khi huỷ, kẻo trạng thái đổi
    await goc.huyPhieu(p, lyDo);
    guiDay('huy_phieu', Object.assign({ id: p.id, noiDung: p.noiDung,
      nguoi: (D.nguoi || {}).ten, lyDo: lyDo }, noiCho(p)), nhanDay(ai));
  };
})();

/* Ảnh/video gửi vào TRAO ĐỔI xong (đường gửi nền) → bắn thông báo như một tin
   nhắn (Trường chốt 29-30/08: trước đây gửi ảnh không kèm chữ là CÂM LẶNG,
   người kia không hề biết). kt-form gọi hàm này sau khi ảnh đã vào phiếu. */
function dayAnhChat(p, soAnh, laVid, tenGui) {
  try {
    guiDay('tin_moi', Object.assign({
      id: p.id, nguoi: tenGui || (D.nguoi || {}).ten, noiDung: p.noiDung,
      tin: (laVid ? '🎬 Gửi ' + soAnh + ' video' : '📷 Gửi ' + soAnh + ' ảnh')
    }, { coSo: tenCoSo(p.coSoId), gianHang: tenGianHang(p.gianHangId) }), nhanDay(aiNhanTinPhieu(p)));
  } catch (e) { }
}

/* ---------- dòng bật/tắt trong Cài đặt ---------- */
function dongDay() {
  if (!hoTroDay()) return '<div class="mn" style="opacity:.6"><div class="ic" style="background:#F1F5F9;color:#64748B"><img width="22" height="22" class="mnIc" src="ic/av-chuong.webp" alt="" loading="lazy"></div>' +
    '<div><b>Thông báo đẩy</b><div class="s">Máy này không nhận được — dùng Chrome hoặc Safari</div></div></div>';
  const bat = daBatDay();
  return '<button class="mn ' + (bat ? 'on' : '') + '" data-day="' + (bat ? 'tat' : 'bat') + '">' +
    '<div class="ic" style="background:' + (bat ? '#DCFCE7;color:#15803D' : '#FEF3C7;color:#B45309') + '"><img width="22" height="22" class="mnIc" src="ic/av-chuong.webp" alt="" loading="lazy"></div>' +
    /* Tiêu đề bỏ chữ "ĐANG BẬT/TẮT": công tắc bên phải đã nói rồi, ghi thêm là thừa
       và làm tiêu đề xuống 2 dòng (hàng cao 84px, các hàng khác chỉ 54px). */
    '<div><b>Thông báo đẩy</b>' +
    '<div class="s">' + (bat
      ? 'Hiện việc mới, việc quá hạn ngay trên màn khoá'
      : 'Nhận việc ngay trên màn khoá, khỏi mở app') + '</div></div>' +
    /* công tắc thay dấu ✓/› — nhìn phát biết bật hay tắt (Trường 29/08) */
    '<span class="ctac' + (bat ? ' on' : '') + '"><i></i></span>' +
    '<span class="ctacLb">' + (bat ? 'Bật' : 'Tắt') + '</span></button>' +
    /* ============================================================
       CÔNG TẮC RUNG RIÊNG (14/09 — Trường: "chia làm 2 nút bật tắt… nếu bật cả
       2 thì vừa rung vừa có thông báo"). Mở cho MỌI VAI (Trường chốt cùng ngày:
       "code cả cho các vai trò khác nữa").
       Chỉ hiện khi thông báo đang BẬT: tắt hết rồi thì rung hay không vô nghĩa.
       Cơ sở / kỹ thuật tắt rung thì kèm một dòng nhắc — họ sống bằng việc nhận
       tin ngay, im máy mà không biết là bỏ lỡ việc khẩn.
       ============================================================ */
    (bat
      ? (() => {
        const r = typeof rungBat === 'function' ? rungBat() : true;
        return '<button class="mn ' + (r ? 'on' : '') + '" data-rung="' + (r ? 'tat' : 'bat') + '">' +
          '<div class="ic" style="background:' + (r ? '#DCFCE7;color:#15803D' : '#F1F5F9;color:#64748B') + '"><img width="22" height="22" class="mnIc" src="ic/kg-ghiam.webp" alt="" loading="lazy"></div>' +
          '<div><b>Rung khi có thông báo</b><div class="s">' +
          (r ? 'Máy rung mỗi lần có việc mới' : 'Thông báo vẫn hiện, máy im lặng') + '</div></div>' +
          '<span class="ctac' + (r ? ' on' : '') + '"><i></i></span>' +
          '<span class="ctacLb">' + (r ? 'Bật' : 'Tắt') + '</span></button>' +
          /* nhắc cho MỌI VAI kể cả admin (Trường chốt 21/09: "đồng bộ tất cả
             kể cả admin") — trước đây admin bị giấu dòng này */
          (!r
            ? '<div class="hop-canh">Máy đang im lặng — việc khẩn vẫn hiện trên màn khoá ' +
              'nhưng sẽ không rung gọi. Nhớ mở app xem trong ngày.</div>'
            : '');
      })()
      : '') +
    /* ============================================================
       RUNG KHI THAO TÁC (21/10) — khác hẳn công tắc "Rung khi có thông báo"
       ở trên: cái kia là máy rung lúc có việc mới, cái này là rung khẽ 12ms
       lúc ngón tay chạm vào nút. Phải tách hai công tắc vì có người muốn
       nhận rung báo việc nhưng ghét máy rung mỗi lần bấm.
       iPhone chưa hỗ trợ rung cho web nên mục này chỉ hiện trên máy có hỗ trợ
       — không bày ra cái công tắc gạt mãi mà chẳng thấy gì.
       ============================================================ */
    (typeof rungBamBat === 'function' && navigator.vibrate
      ? (function () {
        const rr = rungBamBat();
        return '<button class="mn ' + (rr ? 'on' : '') + '" data-rungthaotac="' + (rr ? 'tat' : 'bat') + '">' +
          '<div class="ic" style="background:' + (rr ? '#DCFCE7;color:#15803D' : '#F1F5F9;color:#64748B') + '">✋</div>' +
          '<div><b>Rung khi bấm</b><div class="s">' +
          (rr ? 'Rung khẽ khi mở bảng thao tác, khi lưu hỏng' : 'Bấm nút máy không rung') + '</div></div>' +
          '<span class="ctac' + (rr ? ' on' : '') + '"><i></i></span>' +
          '<span class="ctacLb">' + (rr ? 'Bật' : 'Tắt') + '</span></button>';
      })()
      : '') +
    /* GỬI THỬ — soi được tại chỗ vì sao thông báo câm, khỏi phải đoán mò qua ảnh chụp */
    (bat ? '<button class="mn" data-day="thu"><div class="ic" style="background:#E0F2FE;color:#0369A1"><img width="22" height="22" class="mnIc" src="ic/kg-gui.webp" alt="" loading="lazy"></div>' +
      '<div><b>Gửi thử vào máy này</b><div class="s">Thông báo phải hiện trong vài giây</div></div>' +
      '<span class="mui">›</span></button>' : '') +
    (laIOS() && !laIconManHinh()
      ? (trongWebview()
        /* mở từ Zalo thì chỉ "Chia sẻ → Thêm vào MH chính" là chỉ vào chỗ
           không có nút — phải ra Safari trước (10/09) */
        ? '<div class="hop-canh">Đang mở trong <b>' + esc(tenAppBoc()) + '</b> — iPhone không cho bật thông báo ở đây. ' +
          'Bấm <b>••• → Mở trong Safari</b>, rồi <b>Chia sẻ ⬆ → Thêm vào MH chính</b>, mở app từ icon đó.</div>'
        : '<div class="hop-canh">iPhone: phải bấm <b>Chia sẻ ⬆ → Thêm vào MH chính</b> rồi mở app từ icon đó, thông báo mới chạy được.</div>')
      : '');
}

/* ============================================================
   BẮT BUỘC BẬT THÔNG BÁO (Trường chốt 26/08: "tao muốn tất cả bắt buộc
   phải nhận thông báo").
   Không ép được bằng code — Apple/Google bắt chính người dùng phải bấm
   "Cho phép" trên máy họ. Nên chặn cửa: chưa bật thì không vào được web.
   NHƯNG nếu máy đã TỪ CHỐI VĨNH VIỄN thì trình duyệt không hỏi lại nữa,
   chặn tiếp chỉ làm người ta tắc việc chứ không giải quyết gì → chuyển sang
   màn hướng dẫn vào Cài đặt máy, cho vào làm việc, và ghi vào bảng theo dõi
   để Trường gọi nhắc.
   ============================================================ */
const laIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const laIconManHinh = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function canChanDay() {
  if (!hoTroDay()) return false;              // máy không hỗ trợ thì thôi, không hành người ta
  if (daBatDay()) return false;               // bật rồi
  return true;
}

function veManChan() {
  let d = document.getElementById('chanDay');
  if (!d) { d = document.createElement('div'); d.id = 'chanDay'; d.className = 'chanDay'; document.body.appendChild(d); }

  /* iPhone mở trong Safari thường: KHÔNG thể bật, phải thêm vào màn hình chính trước */
  const iosChuaCai = laIOS() && !laIconManHinh();
  const daTuChoi = Notification.permission === 'denied';

  /* ============================================================
     MÀN CHẶN LÀ THỨ ĐẦU TIÊN NGƯỜI TA GẶP — nên nó phải nói đúng chỗ họ đang
     đứng (vá 11/09). Mở link từ Zalo mà bảo "bấm Chia sẻ ⬆ ở thanh dưới
     Safari" thì họ tìm cả buổi không thấy: trong Zalo không có nút đó. Phải
     bảo ra Safari trước, rồi mới nói chuyện cài.
     ============================================================ */
  const than = (iosChuaCai && trongWebview())
    ? '<h2>Mở bằng Safari trước đã</h2>' +
      '<p>Đang mở trong <b>' + esc(tenAppBoc()) + '</b>. iPhone không cho bật thông báo ở đây, ' +
      'cũng không cho cài ra màn hình chính.</p>' +
      '<ol class="buoc"><li>Bấm dấu <b>•••</b> ở góc <b>trên bên phải</b></li>' +
      '<li>Chọn <b>Mở trong Safari</b></li>' +
      '<li>Ở Safari: bấm <b>Chia sẻ ⬆</b> → <b>Thêm vào MH chính</b> → <b>Thêm</b></li>' +
      '<li>Mở app từ <b>icon vừa hiện ra</b> ngoài màn hình</li></ol>' +
      '<button class="btn pri to" data-chan="lai">Tôi đã cài xong — kiểm tra lại</button>' +
      '<button class="btn v to" data-cai="1">📋 Copy link để dán vào Safari</button>' +
      '<p class="nho">Từ nay mở web bằng icon đó, đừng bấm lại link trong ' + esc(tenAppBoc()) + '.</p>'
    : iosChuaCai
    ? '<h2>Thêm web vào màn hình chính trước</h2>' +
      '<p>iPhone chỉ cho nhận thông báo khi mở app từ icon ngoài màn hình chính.</p>' +
      '<ol class="buoc"><li>Bấm nút <b>Chia sẻ</b> ⬆ ở thanh dưới Safari</li>' +
      '<li>Kéo xuống chọn <b>Thêm vào MH chính</b></li>' +
      '<li>Bấm <b>Thêm</b>, rồi mở app từ icon vừa hiện ra</li></ol>' +
      '<button class="btn pri to" data-chan="lai">Tôi đã cài xong — kiểm tra lại</button>'
    : (daTuChoi
      ? '<h2>Máy này đang chặn thông báo</h2>' +
        '<p>Máy đã từ chối trước đó nên trình duyệt không hỏi lại được nữa. Phải bật tay:</p>' +
        '<ol class="buoc">' + (laIOS()
          ? '<li>Mở <b>Cài đặt</b> của iPhone</li><li>Kéo tìm <b>Kỹ thuật IKID</b></li><li>Bấm <b>Thông báo</b> → bật <b>Cho phép Thông báo</b></li>'
          : '<li>Bấm vào <b>ổ khoá 🔒</b> cạnh địa chỉ web</li><li>Tìm <b>Thông báo</b> → chọn <b>Cho phép</b></li><li>Tải lại trang</li>') +
        '</ol>' +
        '<button class="btn pri to" data-chan="lai">Tôi đã bật — kiểm tra lại</button>' +
        '<button class="btn v to" data-chan="bo">Vào làm việc đã, để sau</button>' +
        '<p class="nho">Chưa bật thì vẫn thấy việc khi mở web, chỉ là máy không kêu khi có việc mới. Tên bạn sẽ hiện trong danh sách chưa bật của quản lý.</p>'
      : '<h2>Bật thông báo để nhận việc</h2>' +
        '<p>Có lỗi mới, có người nhắn, có việc trễ hẹn — máy sẽ báo ngay cả khi không mở web. Bấm một lần là xong.</p>' +
        '<button class="btn pri to" data-chan="bat">🔔 Bật thông báo</button>' +
        '<p class="nho">Trình duyệt sẽ hỏi "Cho phép?" — chọn <b>Cho phép</b>. Bấm nhầm Từ chối thì phải vào Cài đặt máy bật tay, hơi mất công.</p>');

  d.innerHTML = '<div class="chanHop"><img src="logo-kh-mark.png" alt="" class="chanLogo">' + than + '</div>';
  d.classList.remove('an');
}
function dongManChan() { const d = document.getElementById('chanDay'); if (d) d.remove(); }

/* ============================================================
   NHẮC BẬT THÔNG BÁO (sửa 20/10 — Trường chốt sau khi đo: 7/20 người chưa
   bật, trong đó 6 CHT và 1 kỹ thuật).

   BỆNH CŨ: bấm "để sau" là cắm cờ vào sessionStorage, im suốt cả phiên. Mà
   web này cài ra màn hình chính nên "phiên" kéo dài hàng tuần — bấm để sau
   một lần là coi như không bao giờ bị hỏi nữa. Đó là lý do có người chưa bật
   suốt hai tháng.

   GIỜ: "để sau" chỉ hoãn MỘT TIẾNG, và chỉ siết với CHT + kỹ thuật — hai vai
   mà không nhận được tin thì việc nằm chết. Vai quản lý ngồi máy tính, mở web
   suốt ngày nên giữ nguyên kiểu cũ, khỏi phiền.

   MỘT TIẾNG CHỨ KHÔNG PHẢI 30 PHÚT (sửa 28/10 — Trường: "1 tiếng e nhắc 1
   lần đến khi nào bật thông báo mới thôi"). 30 phút đủ dai nhưng cũng đủ
   phiền: người ta đang làm dở một việc mà cứ nửa tiếng lại bị chặn màn một
   lần thì đâm ra ghét cái web. Một tiếng vẫn là 8-9 lần mỗi ngày làm việc,
   thừa sức nhắc.

   KHÔNG CÓ ĐƯỜNG THOÁT VĨNH VIỄN. Hoãn bao nhiêu lần cũng được, nhưng lần
   nào cũng chỉ hoãn được một tiếng — bật thông báo mới hết bị hỏi.

   KHÔNG CHẶN CỨNG. Trường: "làm ra web để dùng tiện hơn chứ méo phải để vẽ
   thêm việc" — chặn không cho dùng thì CHT không báo được lỗi, ngược hẳn mục
   đích. Nhắc dai thì được, khoá cửa thì không.
   ============================================================ */
const HOAN_PHUT = 60;
const KHOA_HOAN = 'kt_hoan_chan_v1';

function vaiCanTin() {
  const v = (typeof D !== 'undefined' && D.nguoi && D.nguoi.vai) || '';
  return v === 'coso' || v === 'tho';
}

function kiemChanDay() {
  if (!canChanDay()) { dongManChan(); return; }
  if (vaiCanTin()) {
    /* CHT và kỹ thuật: hoãn tối đa MỘT TIẾNG rồi hỏi lại (xem HOAN_PHUT) */
    const den = Number(localStorage.getItem(KHOA_HOAN) || 0);
    if (den && Date.now() < den) return;
    veManChan();
    return;
  }
  if (sessionStorage.getItem('kt_bo_chan') === '1') return;   // đã bấm "để sau" trong phiên này
  veManChan();
}

document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset || {};
  if (d.day === 'bat') { const ok = await batDay(); if (ok) { dongManChan(); formCaiDat(); } return; }
  if (d.day === 'tat') { await tatDay(); formCaiDat(); return; }
  if (d.day === 'thu') { await guiThu(); return; }
  /* công tắc rung — chỉ đổi riêng MÁY NÀY, không đụng ai khác và không đụng
     công tắc Thông báo. Rung một nhịp làm mẫu cho biết vừa bật cái gì. */
  /* công tắc RUNG KHI BẤM (21/10) — khác công tắc d.rung ngay dưới, cái đó là
     rung khi có thông báo đẩy. Cái này chỉ lưu trong máy, không gọi máy chủ. */
  if (d.rungthaotac) {
    const b3 = d.rungthaotac === 'bat';
    if (typeof datRungBam === 'function') datRungBam(b3);
    formCaiDat();
    if (b3 && typeof rung === 'function') rung('tin');
    nhac(b3 ? 'Đã bật rung khi bấm' : 'Đã tắt rung khi bấm', b3 ? 'la' : 'canh');
    return;
  }
  if (d.rung) {
    const bat2 = d.rung === 'bat';
    const xong = await datRung(bat2);
    formCaiDat();
    if (!xong) { nhac('Không lưu được lên máy chủ — kiểm tra mạng rồi bấm lại', 'do'); return; }
    if (bat2) { try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (x) { } }
    nhac(bat2 ? '📳 Đã bật rung trên máy này — máy rung mỗi lần có việc mới'
      : '🔕 Đã tắt rung trên máy này — thông báo vẫn hiện đủ, máy im lặng', bat2 ? 'la' : 'canh');
    return;
  }
  if (d.chan === 'bat') {
    const ok = await batDay();
    if (ok) { dongManChan(); nhac('Xong — máy này sẽ nhận được việc mới', 'la'); }
    else veManChan();                       // vẽ lại: có thể vừa chuyển sang trạng thái bị từ chối
    return;
  }
  if (d.chan === 'lai') { if (daBatDay() || !canChanDay()) dongManChan(); else veManChan(); return; }
  if (d.chan === 'bo') {
    /* CHT và kỹ thuật chỉ hoãn được 30 phút; vai khác im cả phiên như cũ */
    if (vaiCanTin()) {
      localStorage.setItem(KHOA_HOAN, String(Date.now() + HOAN_PHUT * 60000));
      dongManChan();
      nhac('Được, một tiếng nữa máy sẽ hỏi lại. Bật một lần là xong, khỏi bị hỏi nữa.', 'canh');
      return;
    }
    sessionStorage.setItem('kt_bo_chan', '1'); dongManChan(); return;
  }
});

/* đăng ký sẵn service worker để lần sau bật nhanh */
if (hoTroDay()) ganSW();

/* ============================================================
   CÀI RA MÀN HÌNH CHÍNH BẰNG MỘT NÚT (Trường bắt 08/09: "cách cài web ra màn
   hình chính ở Android mỗi máy một kiểu, tao không biết làm luôn").
   Gốc bệnh KHÔNG phải máy khác nhau: manifest cũ trỏ icon sai đường (../) và
   khai 192/512 trong khi ảnh thật chỉ 103×148 — Chrome không đủ điều kiện nên
   KHÔNG BAO GIỜ mời cài, ai cũng phải mò menu 3 chấm. Icon đã làm lại đúng cỡ;
   phần này bắt lời mời của trình duyệt và biến nó thành một nút bấm.
   ============================================================ */
let CAI_LOI = null;                       /* lời mời cài của trình duyệt, giữ để bấm là gọi */
const KHOA_BO_CAI = 'kt_bo_cai_v1';       /* đã bấm "để sau" thì đừng mời lại mãi */

const laAndroid = () => /Android/i.test(navigator.userAgent);
const laSamsungNet = () => /SamsungBrowser/i.test(navigator.userAgent);
const daCaiApp = () => laIconManHinh();

/* ============================================================
   MỞ LINK TỪ ZALO — CHỖ TẮC LỚN NHẤT LÚC BÀN GIAO (Trường chốt 10/09).
   Gửi link vào Zalo, CHT bấm → iPhone KHÔNG mở Safari mà mở trình duyệt
   riêng bên trong Zalo. Trong đó không có nút Chia sẻ ⬆, nên hướng dẫn
   "bấm Chia sẻ → Thêm vào MH chính" thành vô nghĩa: họ tìm không thấy nút
   nào rồi kết luận web hỏng. Mà chưa cài ra màn hình chính thì iPhone không
   cho web gửi thông báo — tức là mất luôn thứ quyết định họ có dùng web hay
   quay về Zalo.
   Nên: nhận ra đang ở trong webview thì đổi hẳn hướng dẫn sang "Bấm ••• →
   Mở trong Safari", kèm nút copy link để dán tay vào Safari.
   ============================================================ */
/* laIOS() đã khai ở phần thông báo phía trên — dùng lại, đừng khai lần hai */
function tenAppBoc() {
  const u = navigator.userAgent || '';
  if (/Zalo/i.test(u)) return 'Zalo';
  if (/FBAN|FBAV|FB_IAB|Instagram/i.test(u)) return 'Facebook';
  if (/Line\//i.test(u)) return 'LINE';
  if (/MicroMessenger/i.test(u)) return 'WeChat';
  /* iOS: Safari thật luôn có "Version/x" trong chuỗi; webview thì không.
     Chrome/Edge/Firefox trên iOS có tên riêng (CriOS/EdgiOS/FxiOS) nên loại ra. */
  if (laIOS() && !/CriOS|EdgiOS|FxiOS/i.test(u) && !/Version\//i.test(u)) return 'ứng dụng nhắn tin';
  return '';
}
const trongWebview = () => !laIconManHinh() && !!tenAppBoc();

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();                     /* giữ lời mời lại, mình tự chọn lúc hiện */
  CAI_LOI = e;
  veTheCai();
});
window.addEventListener('appinstalled', () => {
  CAI_LOI = null;
  try { localStorage.setItem(KHOA_BO_CAI, 'xong'); } catch (e) { }
  const t = document.getElementById('theCai'); if (t) t.remove();
  if (typeof nhac === 'function') nhac('Đã cài — mở app bằng icon ngoài màn hình chính nhé', 'la');
});

/* thẻ mời cài: Android thì mời cài thẳng; đang mở trong Zalo/Facebook thì mời
   RA SAFARI trước (cả iPhone lẫn Android) — 10/09 */
function veTheCai() {
  if (daCaiApp()) return;
  const boc = trongWebview();
  if (!boc && !laAndroid()) return;
  try { if (localStorage.getItem(KHOA_BO_CAI)) return; } catch (e) { }
  if (document.getElementById('theCai')) return;
  if (document.getElementById('manVao') && !document.getElementById('manVao').classList.contains('an')) return;
  const d = document.createElement('div');
  d.id = 'theCai'; d.className = 'theCai' + (boc ? ' tcBoc' : '');
  d.innerHTML = boc
    ? '<div class="tcIc"><img width="22" height="22" class="mnIc" src="ic/tab-radar.webp" alt="" loading="lazy"></div>' +
      '<div class="tcNoi"><b>Đang mở trong ' + esc(tenAppBoc()) + '</b>' +
      '<div class="s">Ra Safari mới cài được ra màn hình chính — chưa cài thì máy không rung khi có phiếu mới</div></div>' +
      '<button class="tcNut" data-cai="1">Xem cách</button>' +
      '<button class="tcBo" data-cai="bo" title="Để sau">✕</button>'
    : '<div class="tcIc"><img width="22" height="22" class="mnIc" src="ic/tab-danhsach.webp" alt="" loading="lazy"></div>' +
      '<div class="tcNoi"><b>Cài Kỹ thuật IKID</b>' +
      '<div class="s">Đưa ra màn hình chính, mở nhanh như một ứng dụng</div></div>' +
      '<button class="tcNut" data-cai="1">Cài ngay</button>' +
      '<button class="tcBo" data-cai="bo" title="Để sau">✕</button>';
  document.body.appendChild(d);
}
/* webview không phát beforeinstallprompt nên phải tự gọi lúc web vừa mở */
if (typeof window !== 'undefined') setTimeout(() => { try { veTheCai(); } catch (e) { } }, 2500);

/* bấm "Cài ngay": có lời mời thì gọi thẳng, không có thì chỉ đúng 2 bước theo máy */
async function bamCaiApp() {
  /* ĐANG Ở TRONG ZALO/FACEBOOK: việc đầu tiên phải làm là RA SAFARI đã,
     nói chuyện cài đặt lúc này là nói vào chỗ không có nút (10/09) */
  if (trongWebview()) return manRaSafari();
  if (CAI_LOI) {
    const e = CAI_LOI; CAI_LOI = null;
    try {
      e.prompt();
      const kq = await e.userChoice;
      if (kq && kq.outcome === 'accepted') return;      /* appinstalled sẽ dọn thẻ */
      try { localStorage.setItem(KHOA_BO_CAI, '1'); } catch (x) { }
      const t = document.getElementById('theCai'); if (t) t.remove();
      return;
    } catch (x) { CAI_LOI = null; }
  }
  /* trình duyệt không mời (Samsung Internet, Firefox, hoặc đã mời rồi) → chỉ tay */
  const buoc = laSamsungNet()
    ? '<ol class="buoc"><li>Bấm nút <b>≡</b> (ba gạch) ở góc dưới bên phải</li>' +
      '<li>Chọn <b>Thêm trang vào</b> → <b>Màn hình chính</b></li></ol>'
    : (laAndroid()
      ? '<ol class="buoc"><li>Bấm nút <b>⋮</b> (ba chấm) ở góc trên bên phải Chrome</li>' +
        '<li>Chọn <b>Thêm vào Màn hình chính</b> → <b>Cài đặt</b></li></ol>'
      : '<ol class="buoc"><li>Bấm nút <b>Chia sẻ</b> ⬆ ở thanh dưới Safari</li>' +
        '<li>Kéo xuống chọn <b>Thêm vào MH chính</b></li></ol>');
  moSheet(khungSheet('📱 Cài ra màn hình chính', 'Máy này trình duyệt không tự mời được — làm đúng 2 bước',
    buoc + '<div class="qlNhac">Cài rồi thì mở app bằng icon đó, đừng mở lại bằng link — có vậy thông báo mới rung và web mở nhanh hơn.</div>',
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}

/* ============================================================
   MÀN "RA SAFARI ĐÃ" — hiện khi web đang bị mở trong Zalo/Facebook.
   Nói đúng một việc: bấm ••• → Mở trong Safari. Kèm nút copy link cho trường
   hợp máy không có mục đó (Zalo đổi giao diện, Android, hoặc app khác).
   ============================================================ */
function manRaSafari() {
  const app = tenAppBoc() || 'ứng dụng nhắn tin';
  const ios = laIOS();
  const buoc = ios
    ? '<ol class="buoc">' +
      '<li>Bấm dấu <b>•••</b> ở góc <b>trên bên phải</b> (trong ' + esc(app) + ')</li>' +
      '<li>Chọn <b>Mở trong Safari</b></li>' +
      '<li>Ở Safari: bấm <b>Chia sẻ ⬆</b> → <b>Thêm vào MH chính</b></li>' +
      '<li>Từ nay mở web bằng <b>icon ngoài màn hình</b>, đừng bấm lại link trong ' + esc(app) + '</li></ol>'
    : '<ol class="buoc">' +
      '<li>Bấm dấu <b>⋮</b> hoặc <b>•••</b> ở góc trên bên phải</li>' +
      '<li>Chọn <b>Mở bằng Chrome</b> (hoặc trình duyệt của máy)</li>' +
      '<li>Ở Chrome: bấm <b>⋮</b> → <b>Thêm vào Màn hình chính</b></li></ol>';
  moSheet(khungSheet('Mở bằng Safari trước đã',
    'Web đang chạy trong ' + esc(app) + ' — chỗ này ' + (ios ? 'iPhone' : 'máy') + ' không cho cài ra màn hình chính',
    buoc +
    '<div class="qlNhac"><b>Vì sao phải làm?</b> Chưa cài ra màn hình chính thì ' +
    (ios ? 'iPhone' : 'máy') + ' KHÔNG cho web gửi thông báo — có phiếu mới cũng không rung, ' +
    'phải tự mở web mới biết.</div>' +
    '<div class="f" style="margin-top:10px"><label>HOẶC COPY LINK RỒI DÁN VÀO SAFARI</label>' +
    '<input class="ip" id="lkSafari" readonly value="' + esc(location.origin + location.pathname) + '"></div>',
    '<button class="btn v" data-dongsheet="1">Để sau</button>' +
    '<button class="btn pri" style="flex:1" data-coplink="1">📋 Copy link</button>'));
}

document.addEventListener('click', e => {
  const t0 = e.target.closest('[data-coplink]');
  if (t0) {
    const u = location.origin + location.pathname;
    const xong = () => nhac('Đã copy link — mở Safari rồi dán vào ô địa chỉ', 'la');
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(xong).catch(() => {
      const o = document.getElementById('lkSafari'); if (o) { o.select(); document.execCommand('copy'); xong(); }
    });
    else { const o = document.getElementById('lkSafari'); if (o) { o.select(); document.execCommand('copy'); xong(); } }
    return;
  }
  const t = e.target.closest('[data-cai]'); if (!t) return;
  if (t.dataset.cai === 'bo') {
    try { localStorage.setItem(KHOA_BO_CAI, '1'); } catch (x) { }
    const d = document.getElementById('theCai'); if (d) d.remove();
    return;
  }
  bamCaiApp();
});

/* Android mà trình duyệt không phát lời mời (đã cài rồi, hoặc Samsung Internet):
   vẫn cho một đường vào trong Cài đặt — xem dongCaiApp() dùng ở formCaiDat */
function dongCaiApp() {
  if (daCaiApp()) return '<div class="mn" style="opacity:.72"><div class="ic" style="background:#DCFCE7;color:#15803D"><img width="22" height="22" class="mnIc" src="ic/tab-danhsach.webp" alt="" loading="lazy"></div>' +
    '<div><b>Đang mở từ icon màn hình chính</b><div class="s">đúng cách rồi — thông báo mới rung được</div></div></div>';
  /* đang trong Zalo/Facebook: nói thẳng việc phải làm, đừng nói "cài ra màn
     hình chính" ở chỗ không có nút để cài (10/09) */
  if (trongWebview()) return '<button class="mn" data-cai="1">' +
    '<div class="ic" style="background:#FEE2E2;color:#B91C1C"><img width="22" height="22" class="mnIc" src="ic/tab-radar.webp" alt="" loading="lazy"></div>' +
    '<div><b>Mở bằng Safari trước đã</b><div class="s">đang chạy trong ' + esc(tenAppBoc()) +
    ' — chỗ này không cài được, mà chưa cài thì không có thông báo</div></div>' +
    '<span class="mui">›</span></button>';
  return '<button class="mn" data-cai="1"><div class="ic" style="background:#CFFAFE;color:#0E7490"><img width="22" height="22" class="mnIc" src="ic/tab-danhsach.webp" alt="" loading="lazy"></div>' +
    '<div><b>Cài ra màn hình chính</b><div class="s">mở nhanh như ứng dụng, thông báo rung đúng lúc</div></div>' +
    '<span class="mui">›</span></button>';
}
