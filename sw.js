/* ============================================================
   Kỹ thuật IKID — Service Worker
   Việc: nhận thông báo đẩy và mở đúng phiếu khi bấm vào.
   ============================================================ */

self.addEventListener('install', e => self.skipWaiting());
const KHO_TINH = 'kt-tinh-2';
const KHO_ANH = 'kt-anh-1';   /* ảnh đã xem — giữ qua các bản */

/* activate: nhận quyền ngay + DỌN KHO CŨ (#46 Trường chốt 03/09) — trước đây
   kho 'kt-tinh-1' giữ mãi css/js của mọi bản từng qua máy, không ai dọn */
self.addEventListener('activate', e => e.waitUntil((async () => {
  await self.clients.claim();
  const ks = await caches.keys();
  /* GIỮ cả kho ảnh đã xem (10/09) — trước đây dòng này xoá mọi kho khác
     KHO_TINH, tức là mỗi lần lên bản mới là ảnh đã xem bị dọn sạch, mở phiếu cũ
     lại phải tải lại từ đầu. Đúng cái Trường vừa hỏi. */
  const GIU = [KHO_TINH, KHO_ANH];
  await Promise.all(ks.filter(k => !GIU.includes(k)).map(k => caches.delete(k)));
})()));

/* ============================================================
   CACHE FILE TĨNH — mở app từ icon là HIỆN NGAY, kể cả 4G yếu.
   - File có ?v= (css/js đánh số bản): lấy từ kho máy trước, thiếu mới ra mạng.
     Đổi bản là đổi số v → tự thành khoá mới, không bao giờ dính bản cũ.
   - index.html / logo / manifest: mạng trước (luôn mới), rớt mạng lấy bản đã cất
     → mất sóng vẫn mở được app, dữ liệu thì đã có bản cache trong localStorage.
   - /api/ KHÔNG đụng: dữ liệu phải tươi.
   - /anh/ ẢNH thì cất lại (xem mục dưới); VIDEO thì không, nhét vào kho máy là
     đầy điện thoại.
   ============================================================ */

/* ============================================================
   CACHE ẢNH ĐÃ XEM (10/09 — Trường: "phiếu cách 2-3 tháng ấn vào lại thì nó
   còn nét không").
   Ảnh trên kho không bao giờ mờ đi, nhưng mở phiếu cũ là phải TẢI LẠI từ đầu,
   4G kém thì ngồi chờ. Mỗi ảnh có MỘT TÊN DUY NHẤT, không bao giờ bị ghi đè,
   nên lấy từ kho máy trước là an toàn tuyệt đối — đã xem một lần thì lần sau
   mở ra hiện tức thì, kể cả mất sóng.
   Chặn 3 cái để không phình máy: chỉ ảnh (không video), chỉ file dưới 3MB,
   và giữ tối đa 400 tấm — quá thì bỏ tấm cất lâu nhất.
   ============================================================ */
const ANH_TRAN_FILE = 400;
const ANH_TRAN_CO = 3 * 1024 * 1024;
const laAnhTinh = p => /\.(jpe?g|png|webp|gif|heic)$/i.test(p);
async function donKhoAnh() {
  try {
    const c = await caches.open(KHO_ANH);
    const ks = await c.keys();
    if (ks.length <= ANH_TRAN_FILE) return;
    /* keys() trả theo thứ tự cất vào → bỏ từ đầu danh sách là bỏ tấm cũ nhất */
    for (let i = 0; i < ks.length - ANH_TRAN_FILE; i++) await c.delete(ks[i]);
  } catch (e) { }
}
async function anhTuKho(req) {
  const c = await caches.open(KHO_ANH);
  const co = await c.match(req);
  if (co) return co;                          /* đã xem rồi → hiện tức thì */
  const r = await fetch(req);
  try {
    const co2 = Number(r.headers.get('content-length') || 0);
    if (r.ok && r.status === 200 && co2 <= ANH_TRAN_CO) {
      await c.put(req, r.clone());
      donKhoAnh();
    }
  } catch (e) { }
  return r;
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/api/')) return;
  if (u.pathname.startsWith('/anh/')) {
    /* video đi đường thẳng: nó dùng Range 206, cache vào là vỡ tua và đầy máy */
    if (!laAnhTinh(u.pathname) || e.request.headers.get('range')) return;
    e.respondWith(anhTuKho(e.request).catch(() => fetch(e.request)));
    return;
  }

  if (u.searchParams.has('v')) {
    e.respondWith(caches.open(KHO_TINH).then(async c => {
      const co = await c.match(e.request);
      if (co) return co;
      const r = await fetch(e.request);
      if (r.ok) {
        c.put(e.request, r.clone());
        /* cất bản mới xong thì VỨT các bản v cũ của đúng file này —
           đổi bản chục lần cũng không chất rác đầy điện thoại (#46) */
        c.keys().then(ds => ds.forEach(k => {
          const ku = new URL(k.url);
          if (ku.pathname === u.pathname && ku.search !== u.search) c.delete(k);
        }));
      }
      return r;
    }));
    return;
  }
  e.respondWith(
    fetch(e.request).then(r => {
      /* PHẢI CLONE NGAY, ĐỒNG BỘ (vá 11/09 — Trường mở console thấy 9 lỗi
         "Failed to execute 'clone' on 'Response': Response body is already used").
         Lỗi cũ: caches.open() là bất đồng bộ nên r.clone() chạy SAU khi response
         đã trả cho trang → body đã bị đọc → clone nổ, và index.html / logo /
         manifest KHÔNG BAO GIỜ được cất vào kho. Tức là mất đúng cái mục này
         hứa làm: mất sóng vẫn mở được app. */
      if (r.ok) {
        const ban = r.clone();
        caches.open(KHO_TINH).then(c => c.put(e.request, ban)).catch(() => { });
      }
      return r;
    }).catch(async () => (await caches.match(e.request)) || new Response('Mất mạng', { status: 503 }))
  );
});

/* ============================================================
   CỜ RUNG ĐI KÈM THÔNG BÁO, KHÔNG ĐỌC KHO NỮA (21/09 — sau khi Trường báo
   "sáng nay không có thông báo 9h và nhắn tin cũng không ai nhận được").

   Bản 14/09 đọc cài đặt rung từ IndexedDB NGAY TRƯỚC khi hiện thông báo.
   Hai chỗ chết người:
   ① Luật Web Push: đăng ký userVisibleOnly:true thì MỌI lần nhận push đều
     PHẢI hiện một thông báo. Chèn một lượt đọc kho bất đồng bộ (tới 800ms)
     vào trước đó — trên iPhone lúc máy đang bóp tài nguyên, service worker
     có thể bị cắt trước khi kịp hiện. Không hiện đủ nhiều lần thì trình duyệt
     TỰ THU HỒI quyền đẩy của máy đó, và từ đó im lặng hoàn toàn.
   ② silent:true đi cùng vibrate là tổ hợp CẤM — trình duyệt ném lỗi và
     showNotification hỏng luôn, tức là không có thông báo nào hiện ra.

   Cách chữa: máy chủ đính sẵn cờ rung vào nội dung đẩy, service worker chỉ
   đọc một thuộc tính có sẵn trong tay — đồng bộ, không chờ, không hỏng.
   ============================================================ */

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { tieu: 'Kỹ thuật IKID', than: (e.data && e.data.text()) || '' }; }

  const tuyChon = {
    body: d.than || '',
    icon: '/logo-kh-mark.png',
    badge: '/logo-kh-mark.png',
    /* KHÔNG dùng tag theo phiếu nữa (Trường chốt 04/09): trước đây các tin cùng
       một phiếu THAY THẾ nhau trên màn khoá — tin sau nuốt tin trước, lỡ đọc
       thiếu. Giờ mỗi thông báo một dòng riêng, CHỒNG lên nhau như Zalo.
       Riêng "Gửi thử" giữ tag để bấm thử 5 lần không rác 5 dòng. */
    tag: d.tag || undefined,
    requireInteraction: !!d.gap,
    data: { url: d.url || (d.phieu ? '/?p=' + d.phieu : '/') },
    actions: d.phieu ? [{ action: 'mo', title: 'Mở phiếu' }] : []
  };
  /* d.rung === false → người này đã tắt rung. Thiếu cờ thì coi như BẬT:
     thà rung thừa còn hơn nuốt mất một việc khẩn.
     Đặt MỘT trong hai, không bao giờ cả hai: có vibrate thì không silent. */
  if (d.rung === false) tuyChon.silent = true;
  else tuyChon.vibrate = d.gap ? [200, 80, 200, 80, 200] : [120, 60, 120];

  e.waitUntil((async () => {
    /* hiện thông báo TRƯỚC TIÊN, không chờ bất cứ thứ gì — đây là việc bắt
       buộc của mỗi lần nhận đẩy, mọi việc khác xếp sau */
    await self.registration.showNotification(d.tieu || 'Kỹ thuật IKID', tuyChon);
    /* chấm trên icon app khi có việc tới lúc app đang đóng — không biết số chính
       xác ở đây nên chỉ cắm cờ; mở app lên là cửa sổ tính lại số đúng */
    try { if (self.navigator && 'setAppBadge' in self.navigator) self.navigator.setAppBadge(1); } catch (x) { }
    /* báo cho các tab đang mở tự tải dữ liệu mới — chuông nhảy ngay, khỏi phải thoát ra vào lại */
    const ds = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    ds.forEach(c => { try { c.postMessage({ loai: 'day-moi', phieu: d.phieu || '' }); } catch (x) { } });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const dich = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const ds = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of ds) {
      if (c.url.indexOf(self.location.origin) === 0) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(dich); } catch (x) { } }
        return;
      }
    }
    await self.clients.openWindow(dich);
  })());
});
