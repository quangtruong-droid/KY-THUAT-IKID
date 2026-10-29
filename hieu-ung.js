// =====================================================================================
// BỘ HIỆU ỨNG GIAO DIỆN – phần JS (trích từ IKID Camera Audit, 10–11/10/2026) · dùng độc lập, không thư viện
// Dùng 2 cách:
//   • Dự án dùng import (Vite, Webpack…):  import './hieu-ung.js'; const { HieuUng } = window;
//   • Thẻ script thường:  <script src="hieu-ung.js"></script>  → dùng HieuUng.toast(...)
// Mọi chuyển động tự bỏ qua khi máy bật "giảm chuyển động".
// =====================================================================================
(function (goc) {
  const giamCD = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    vuong: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 8l4.5 4L12 4l5.5 8L22 8l-2 11H4L2 8z"/></svg>',
  };

  // 1. KHỐI HIỆN DẦN: các khối con trực tiếp của `khung` trượt nhẹ lên, lần lượt (tối đa 14 khối, 55ms/khối)
  function vaoMan(khung, chon = ':scope > *') {
    if (!khung || giamCD()) return;
    const ds = [...khung.querySelectorAll(chon)].filter((x) => x.offsetParent !== null).slice(0, 14);
    ds.forEach((x, i) => { x.style.setProperty('--hu-i', i); x.classList.remove('hu-vao'); void x.offsetWidth; x.classList.add('hu-vao'); });
    setTimeout(() => ds.forEach((x) => x.classList.remove('hu-vao')), 900 + ds.length * 60);
  }

  // 2. SỐ ĐẾM CHẠY từ 0 lên số thật (0,6 giây) – giữ nguyên phần chữ phía sau số ("/ 16", " đ", "%")
  //    hiểu dấu chấm hàng nghìn (1.250.000) và dấu phẩy thập phân (79,7)
  const dangDem = new WeakSet();
  function demSo(el, dai = 600) {
    if (!el) return;
    const cuoi = el.textContent;
    if (dangDem.has(el) || el.dataset.huDem === cuoi) return;
    el.dataset.huDem = cuoi;
    const m = cuoi.match(/^([+−-]?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?([\s\S]*)$/);
    if (!m || giamCD()) return;
    const nghin = m[2].includes('.'), le = m[3] ? m[3].length - 1 : 0;
    const giaTri = parseFloat(m[2].replace(/\./g, '') + (m[3] ? '.' + m[3].slice(1) : ''));
    if (!giaTri) return;
    const viet = (v) => { let [n, l] = v.toFixed(le).split('.'); if (nghin) n = Number(n).toLocaleString('vi-VN'); return m[1] + n + (l ? ',' + l : '') + m[4]; };
    dangDem.add(el); el.textContent = viet(0);
    const t0 = performance.now();
    const buoc = (t) => {
      const k = Math.min(1, (t - t0) / dai), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? viet(giaTri * e) : cuoi;
      if (k < 1 && el.isConnected) requestAnimationFrame(buoc); else { el.textContent = cuoi; dangDem.delete(el); }
    };
    requestAnimationFrame(buoc);
  }

  // 4. DÒNG SÁNG NHẤP 1 LẦN (gọi sau khi lưu / duyệt / gửi thành công)
  function nhayDong(el) {
    if (!el || giamCD()) return;
    el.classList.remove('hu-nhay'); void el.offsetWidth; el.classList.add('hu-nhay');
    setTimeout(() => el.classList.remove('hu-nhay'), 1500);
  }

  // 9. KHỐI TIÊU ĐỀ: chạy lại hiệu ứng "vào" (icon bật, chữ trượt, vạch vàng) – gọi mỗi lần đổi trang
  function tieuDeVao(khoi, { mau } = {}) {
    if (!khoi) return;
    if (mau) khoi.style.setProperty('--hu-k', mau);
    if (giamCD()) return;
    khoi.classList.remove('hu-tt-vao'); void khoi.offsetWidth; khoi.classList.add('hu-tt-vao');
  }

  // 10. THÔNG BÁO NHỎ – loai: 'ok' (xanh) · 'error' (đỏ, hiện lâu hơn) · 'info' (xanh dương)
  let toastEl = null, hen = 0;
  function toast(chu, loai = 'info') {
    toastEl?.remove(); clearTimeout(hen);
    toastEl = document.createElement('div'); toastEl.className = 'hu-toast ' + loai; toastEl.setAttribute('role', 'status');
    toastEl.innerHTML = SVG[loai] || SVG.info; toastEl.append(document.createTextNode(chu));
    document.body.append(toastEl);
    const el = toastEl;
    hen = setTimeout(() => { el.classList.add('tat'); setTimeout(() => el.remove(), 260); }, loai === 'error' ? 4500 : 2500);
  }

  // 11. XONG VIỆC: ✓ giữa màn + câu xác nhận, tự tắt sau ~1,3s · trả Promise (chờ xong rồi mới chuyển trang)
  //     toi = phần tử cần trỏ tới sau đó (vd dòng việc tiếp theo) → cuộn tới + viền vàng 1,6s
  function xong(chu, phu = '', { toi = null } = {}) {
    document.querySelector('.hu-xong')?.remove();
    const o = document.createElement('div'); o.className = 'hu-xong'; o.setAttribute('role', 'status');
    o.innerHTML = `<div class="hu-xong-k"><span class="hu-xong-ic">${SVG.check}</span><b></b>${phu ? '<small></small>' : ''}</div>`;
    o.querySelector('b').textContent = chu; if (phu) o.querySelector('small').textContent = phu;
    document.body.append(o);
    return new Promise((ok) => setTimeout(() => {
      o.classList.add('tat');
      setTimeout(() => {
        o.remove();
        if (toi) { toi.scrollIntoView({ behavior: 'smooth', block: 'center' }); toi.classList.add('hu-den'); setTimeout(() => toi.classList.remove('hu-den'), 1600); }
        ok();
      }, 220);
    }, 1100));
  }

  // 6. Chèn vương miện cho huy hiệu #1 (.hu-top.h1) – gọi sau khi vẽ danh sách xếp hạng
  function vuongMien(goc2 = document) {
    for (const h of goc2.querySelectorAll('.hu-top.h1:not(.hu-loai)')) if (!h.querySelector('.hu-vuong')) { const s = document.createElement('span'); s.className = 'hu-vuong'; s.innerHTML = SVG.vuong; h.prepend(s); }
  }

  // TỰ ĐỘNG: đếm số cho mọi [data-hu-dem] + vương miện cho .hu-top.h1 – cả khi nội dung được vẽ thêm sau
  function gan(goc2 = document.body) {
    const chay = () => { for (const el of goc2.querySelectorAll('[data-hu-dem]')) demSo(el); vuongMien(goc2); };
    chay();
    new MutationObserver(chay).observe(goc2, { childList: true, subtree: true, characterData: true });
  }

  const HieuUng = { vaoMan, demSo, nhayDong, tieuDeVao, toast, xong, vuongMien, gan };
  goc.HieuUng = HieuUng;
  if (typeof module !== 'undefined') module.exports = { HieuUng };
})(typeof window !== 'undefined' ? window : globalThis);
