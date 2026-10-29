/* ============================================================
   LUỒNG NÉN ẢNH RIÊNG (Trường chốt 07/09 — "lag vcl", Chrome báo renderer
   không phản hồi khi nén 8 ảnh 12MP).
   Việc nén một tấm ảnh điện thoại = giải mã ~12 triệu điểm ảnh rồi vẽ lại.
   Trước đây việc đó chạy trên ĐÚNG cái luồng đang vẽ giao diện, nên trong lúc
   nén thì cả web đứng hình: bấm không ăn, cuộn không chạy.
   File này chạy ở một luồng KHÁC hẳn (Web Worker). Giao diện không hề hay biết
   máy đang nén 15 tấm — vẫn cuộn, vẫn gõ, vẫn bấm được.
   Nhận: { id, blob, canh, chat, vuong }
   Trả:  { id, blob } hoặc { id, loi }
   ============================================================ */
'use strict';

self.onmessage = async e => {
  const d = e.data || {};
  const id = d.id;
  try {
    if (!d.blob) throw new Error('không có ảnh');
    const bm = await createImageBitmap(d.blob);
    const w = bm.width, h = bm.height;
    let sx = 0, sy = 0, sw = w, sh = h, dw, dh;
    if (d.vuong) {
      /* ảnh đại diện: cắt vuông giữa rồi thu về đúng cạnh yêu cầu */
      const m = Math.min(w, h);
      sx = (w - m) / 2; sy = (h - m) / 2; sw = sh = m;
      dw = dh = d.canh || 128;
    } else {
      const ti = Math.min(1, (d.canh || 2400) / Math.max(w, h));
      dw = Math.max(1, Math.round(w * ti));
      dh = Math.max(1, Math.round(h * ti));
    }
    const c = new OffscreenCanvas(dw, dh);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('không mở được khung vẽ ở luồng riêng');
    ctx.drawImage(bm, sx, sy, sw, sh, 0, 0, dw, dh);
    try { bm.close(); } catch (x) { }
    /* kieu: 'image/jpeg' (mặc định) hoặc 'image/webp' — máy gọi chọn, vì với ảnh
       chụp màn hình nhiều chữ thì WebP nhẹ hơn JPEG ~30%, còn ảnh máy ảnh có hạt
       nhiễu thì WebP lại NẶNG hơn ~18% (đo 10/09). Nên bên gọi nén cả hai rồi
       chọn cái nhẹ hơn cho từng tấm. */
    const kieu = d.kieu === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const ra = await c.convertToBlob({ type: kieu, quality: d.chat || 0.84 });
    if (!ra) throw new Error('nén ra rỗng');
    self.postMessage({ id: id, blob: ra, rong: dw, cao: dh });
  } catch (err) {
    self.postMessage({ id: id, loi: String((err && err.message) || err || 'nén lỗi') });
  }
};
