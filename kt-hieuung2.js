/* ============================================================
   BỘ HIỆU ỨNG ĐỢT 2 (21/10/2026)

   Học từ bộ hiệu ứng của web IKID Camera Audit — Trường gửi link tài liệu
   ngày 21/10 kèm câu "học được gì nhắn lại anh nhé".

   File này cố ý TÁCH RIÊNG, không nhét vào kt-ui.js. Bài học lấy luôn từ
   bên đó: họ chia 70 file nhỏ thay vì 13 file to, sửa một hiệu ứng thì
   người dùng chỉ tải lại 4 KB chứ không phải 170 KB.

   TRONG NÀY CÓ:
     ① khungXam()      — khung xương hình thẻ phiếu lúc chờ mạng
     ② rung()          — rung phản hồi, tắt được
     ③ hoanTac()       — thanh hoàn tác 5 giây
     ④ (nhãn "ai đang mở" nằm ở kt-dangxem.js, cần máy chủ nên để riêng)

   Phần CSS của cả bộ nằm cuối kt.css, tìm chữ "BỘ HIỆU ỨNG ĐỢT 2".
   ============================================================ */
'use strict';

/* ============================================================
   ① KHUNG XÁM CÓ VỆT QUÉT

   Thay cho dòng chữ "Đang tải…". Khung dựng đúng hình thẻ phiếu thật — bốn
   dòng dài ngắn khác nhau — nên mắt đoán được cái gì sắp hiện ra, cảm giác
   nhanh hơn hẳn dù thời gian tải y nguyên. Ở cơ sở sóng 4G yếu thì khác biệt
   này rõ nhất.

   Số thẻ mặc định 3: đủ lấp một màn điện thoại, không vẽ thừa.
   ============================================================ */
function khungXam(so) {
  const n = Math.max(1, Math.min(8, so || 3));
  let ra = '<div class="skBo">';
  for (let i = 0; i < n; i++) {
    ra += '<div class="skThe">' +
      '<div class="skD" style="width:42%"></div>' +
      '<div class="skD" style="width:78%;height:14px"></div>' +
      '<div class="skD" style="width:56%"></div>' +
      '<div class="skD" style="width:88%"></div></div>';
  }
  return ra + '</div>';
}

/* ============================================================
   ② RUNG PHẢN HỒI

   Ba kiểu, mượn đúng nhịp của bên Camera Audit:
     tin   [200,100,200] — có việc mới / tin nhắn mới: rung, nghỉ, rung
     cham  12ms          — mở bảng thao tác, nhấn giữ: khẽ thôi, chỉ để biết
     hong  [80,60,80,60,80] — lưu hỏng: ba nhịp ngắn, khác hẳn hai kiểu trên

   PHẢI TẮT ĐƯỢC. Có người ghét rung, có người để máy trên bàn họp. Cờ tắt
   lưu trong máy, mặc định BẬT.

   TÊN HÀM rungBamBat/datRungBam chứ KHÔNG phải rungBat/datRung: kt-day.js
   đã có sẵn hai hàm tên y hệt cho công tắc "Rung khi có thông báo", mà nó
   nạp SAU file này nên sẽ ghi đè mất. Khoá lưu cũng đổi sang kt_rungbam_v1
   cho khỏi đá nhau với kt_rung_v1.

   navigator.vibrate không có trên iPhone (Safari chưa hỗ trợ) — gọi vào
   không nổ, chỉ là không rung. Không cần kiểm tra thêm, nhưng cũng đừng hứa
   với người dùng iPhone là máy sẽ rung.
   ============================================================ */
const RUNG_KHOA = 'kt_rungbam_v1';   /* KHÔNG trùng kt_rung_v1 của kt-day.js */
const NHIP = { tin: [200, 100, 200], cham: 12, hong: [80, 60, 80, 60, 80] };

function rungBamBat() { try { return localStorage.getItem(RUNG_KHOA) !== '0'; } catch (e) { return true; } }
function datRungBam(bat) { try { localStorage.setItem(RUNG_KHOA, bat ? '1' : '0'); } catch (e) { } }

function rung(kieu) {
  if (!rungBamBat()) return false;
  const n = NHIP[kieu] || NHIP.cham;
  try { return navigator.vibrate ? navigator.vibrate(n) : false; }
  catch (e) { return false; }
}

/* ============================================================
   ③ THANH HOÀN TÁC 5 GIÂY

   Đây là thứ NẶNG NHẤT trong cả bộ, và cũng là thứ duy nhất không phải trang
   trí: nó chống xoá nhầm.

   CÁCH LÀM — HOÃN GHI, KHÔNG PHẢI GHI RỒI LÙI:
   Bấm huỷ xong, web KHÔNG gọi máy chủ ngay. Nó giấu phiếu khỏi danh sách,
   hiện thanh hoàn tác, và hẹn 5 giây. Hết 5 giây mà không ai bấm thì mới ghi
   thật. Bấm Hoàn tác thì chỉ việc huỷ cái hẹn — máy chủ chưa biết gì cả, nên
   không có gì phải sửa lại.

   Cách kia (ghi thật rồi lùi lại) nghe đơn giản hơn nhưng hỏng ở chỗ: giữa
   hai lượt ghi đó, người khác mở phiếu ra sẽ thấy nó đã huỷ, rồi tự nhiên nó
   sống lại. Hai người nhìn hai trạng thái khác nhau trong cùng một phút.

   BA CHỖ PHẢI CẨN THẬN:
     · Đóng web giữa chừng → chạy nốt việc đang hẹn (pagehide)
     · Huỷ phiếu thứ hai khi phiếu thứ nhất còn đang chờ → chốt cái cũ trước
     · Mất mạng lúc ghi → báo rõ và trả phiếu về danh sách
   ============================================================ */
let HT_HEN = 0, HT_VIEC = null, HT_EL = null;

function hoanTacDong() {
  if (HT_EL) { HT_EL.remove(); HT_EL = null; }
}

/* chạy nốt việc đang chờ — gọi khi hết giờ, khi huỷ phiếu khác, khi đóng web */
async function hoanTacChot() {
  if (!HT_VIEC) return;
  const v = HT_VIEC;
  HT_VIEC = null;
  clearTimeout(HT_HEN); HT_HEN = 0;
  hoanTacDong();
  try { await v.lam(); }
  catch (e) {
    if (typeof nhac === 'function') nhac('Không lưu được: ' + ((e && e.message) || ''), 'do');
    if (typeof v.traLai === 'function') v.traLai();
    if (typeof veHet === 'function') veHet();
  }
}

/* Gọi: hoanTac({ chu, phu, lam, traLai })
     chu    — dòng đậm, PHẢI nêu tên phiếu ("Đã huỷ phiếu #0094")
     phu    — dòng nhạt, nội dung phiếu cho dễ nhận ra
     lam    — hàm async ghi thật, chạy sau 5 giây
     traLai — hàm gọi khi người dùng bấm Hoàn tác (vẽ lại phiếu vào danh sách)
*/
function hoanTac(o) {
  if (!o || typeof o.lam !== 'function') return;
  hoanTacChot();                     /* còn việc cũ đang chờ thì chốt nó trước */

  HT_VIEC = o;
  const el = document.createElement('div');
  el.className = 'htThanh';
  el.innerHTML =
    '<b>' + (o.chu || 'Đã xoá') + '<i>' + (o.phu || '') + '</i></b>' +
    '<button data-hoantac="1">Hoàn tác</button>' +
    '<span class="htVach"></span>';
  document.body.appendChild(el);
  HT_EL = el;

  HT_HEN = setTimeout(hoanTacChot, 5000);
}

/* người dùng bấm Hoàn tác — việc chưa hề được ghi nên chỉ cần quên nó đi */
function hoanTacBo() {
  if (!HT_VIEC) return;
  const v = HT_VIEC;
  HT_VIEC = null;
  clearTimeout(HT_HEN); HT_HEN = 0;
  hoanTacDong();
  try { if (typeof v.traLai === 'function') v.traLai(); } catch (e) { }
  if (typeof veHet === 'function') veHet();
  if (typeof nhac === 'function') nhac('Đã hoàn tác', 'la');
  rung('cham');
}

/* Đóng web khi còn việc đang chờ: chạy nốt. Dùng pagehide chứ KHÔNG dùng
   beforeunload — iOS gần như không bắn beforeunload khi người dùng vuốt đóng
   app, còn pagehide thì có. */
window.addEventListener('pagehide', () => { if (HT_VIEC) { try { HT_VIEC.lam(); } catch (e) { } } });

/* bắt nút Hoàn tác */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-hoantac]');
  if (b) { e.preventDefault(); hoanTacBo(); }
}, true);

/* ============================================================
   ④ "AI ĐANG MỞ PHIẾU NÀY" (21/10)

   Hai kỹ thuật cùng mở một phiếu rồi cùng bấm nhận, hoặc CHT nghiệm thu
   trong lúc kỹ thuật đang sửa dở — biết trước là tránh được.

   CÁCH CHẠY: cứ 20 giây, trong lúc ngăn chi tiết còn mở, web báo "máy này
   đang mở phiếu X" và nhận lại ngay danh sách người khác đang mở cùng phiếu.
   Một lượt gọi làm hai việc.

   KHÔNG có đường "tôi đóng phiếu rồi". Máy chủ coi dòng cũ hơn 45 giây là đã
   rời đi — đóng web, mất sóng, hết pin, tắt máy đều rơi vào cùng một rọ. Thêm
   đường báo-rời chỉ làm phức tạp mà vẫn phải có hạn giờ phòng khi nó không
   kịp chạy.

   NHỊP 20 GIÂY: ba lượt một phút, hai mươi người dùng cùng lúc là 60 lượt
   gọi mỗi phút — không đáng gì. Nhanh hơn thì tốn, chậm hơn thì nhãn hiện
   quá trễ, lúc đó người kia đã bấm xong rồi.
   ============================================================ */
let DX_HEN = 0, DX_PHIEU = '', DX_DS = [];

async function dangXemNhip() {
  if (!DX_PHIEU) return;
  try {
    const may = (typeof maMayNay === 'function' ? await maMayNay() : '') ||
      (function () {               /* máy chưa bật thông báo thì chưa có mã máy */
        try {
          let m = localStorage.getItem('kt_mamay_tam_v1');
          if (!m) { m = 'tam-' + Math.random().toString(36).slice(2, 12); localStorage.setItem('kt_mamay_tam_v1', m); }
          return m;
        } catch (e) { return 'tam-' + Math.random().toString(36).slice(2, 10); }
      })();
    const n = (typeof D !== 'undefined' && D.nguoi) || {};
    const r = await fetch('/api/dang-xem', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ve': (typeof veQuanLy === 'function' ? veQuanLy() : '') },
      body: JSON.stringify({ phieu: DX_PHIEU, may: may, ai: n.id || '', ten: n.ten || '' })
    }).then(x => x.json()).catch(() => null);
    if (!r || !r.ds) return;
    /* chỉ vẽ lại khi danh sách ĐỔI — vẽ mỗi 20 giây thì nhãn nhấp nháy vô cớ */
    const cu = DX_DS.join('|'), moi = r.ds.join('|');
    DX_DS = r.ds;
    if (cu !== moi) dangXemVe();
  } catch (e) { /* mất mạng thì thôi, nhịp sau hỏi lại */ }
}

function dangXemVe() {
  const cho = document.getElementById('dxCho');
  if (!cho) return;
  if (!DX_DS.length) { cho.innerHTML = ''; return; }
  const ten = DX_DS.length === 1 ? DX_DS[0]
    : DX_DS.length === 2 ? DX_DS[0] + ' và ' + DX_DS[1]
      : DX_DS[0] + ' và ' + (DX_DS.length - 1) + ' người nữa';
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  cho.innerHTML = '<span class="dxNhan"><i></i>' + esc2(ten) + ' đang mở phiếu này</span>';
}

function dangXemBat(phieuId) {
  dangXemTat();
  if (!phieuId) return;
  DX_PHIEU = phieuId; DX_DS = [];
  dangXemNhip();                      /* hỏi ngay một lượt, khỏi đợi 20 giây */
  DX_HEN = setInterval(dangXemNhip, 20000);
}

function dangXemTat() {
  if (DX_HEN) { clearInterval(DX_HEN); DX_HEN = 0; }
  DX_PHIEU = ''; DX_DS = [];
}
