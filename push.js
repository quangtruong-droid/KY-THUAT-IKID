/* ============================================================
   IKID · Gửi thông báo đẩy từ Worker (Web Push chuẩn)
   Không dùng thư viện ngoài — tự ký VAPID và tự mã hoá aes128gcm
   bằng WebCrypto có sẵn trong Cloudflare Worker.
   ============================================================ */

const b64u = {
  ma(buf) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  giai(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const t = atob(s);
    const b = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
    return b;
  }
};
const noi = (...ds) => {
  const tong = ds.reduce((a, b) => a + b.length, 0);
  const r = new Uint8Array(tong);
  let i = 0;
  ds.forEach(d => { r.set(d, i); i += d.length; });
  return r;
};
const chu = s => new TextEncoder().encode(s);

/* ---------- VAPID: ký JWT ES256 ---------- */
async function kyVapid(endpoint, khoaRieng, khoaCong, email) {
  const aud = new URL(endpoint).origin;
  const dau = b64u.ma(chu(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const than = b64u.ma(chu(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:' + (email || 'admin@ikidvn.com')
  })));
  const dl = dau + '.' + than;

  const d = b64u.giai(khoaRieng);
  const cong = b64u.giai(khoaCong);           // 65 byte: 0x04 || X(32) || Y(32)
  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    d: b64u.ma(d),
    x: b64u.ma(cong.slice(1, 33)),
    y: b64u.ma(cong.slice(33, 65))
  };
  const k = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, chu(dl));
  return dl + '.' + b64u.ma(sig);
}

/* ---------- HKDF ---------- */
async function hkdf(muoi, ikm, info, dai) {
  const k1 = await crypto.subtle.importKey('raw', muoi, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: muoi, info }, k1, dai * 8)
    .catch(async () => {
      /* đường vòng cho môi trường không có HKDF: HMAC 2 bước */
      const prkKey = await crypto.subtle.importKey('raw', muoi, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, ikm));
      const okmKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const okm = new Uint8Array(await crypto.subtle.sign('HMAC', okmKey, noi(info, new Uint8Array([1]))));
      return okm.slice(0, dai);
    });
  return new Uint8Array(bits).slice(0, dai);
}
/* HKDF chuẩn cần ikm làm key material → dùng bản tay cho đúng RFC8291 */
async function hkdfTay(muoi, ikm, info, dai) {
  const kMuoi = await crypto.subtle.importKey('raw', muoi, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', kMuoi, ikm));
  const kPrk = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const t = new Uint8Array(await crypto.subtle.sign('HMAC', kPrk, noi(info, new Uint8Array([1]))));
  return t.slice(0, dai);
}

/* ---------- mã hoá nội dung theo RFC 8291 (aes128gcm) ---------- */
async function maHoa(noiDung, p256dhB64, authB64) {
  const uaCong = b64u.giai(p256dhB64);          // 65 byte
  const auth = b64u.giai(authB64);              // 16 byte

  const cap = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asCong = new Uint8Array(await crypto.subtle.exportKey('raw', cap.publicKey));   // 65 byte

  const uaKey = await crypto.subtle.importKey('raw', uaCong, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const chung = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, cap.privateKey, 256));

  const ikm = await hkdfTay(auth, chung, noi(chu('WebPush: info\0'), uaCong, asCong), 32);
  const muoi = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdfTay(muoi, ikm, chu('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfTay(muoi, ikm, chu('Content-Encoding: nonce\0'), 12);

  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ro = noi(chu(noiDung), new Uint8Array([2]));     // 0x02 = khối cuối
  const mat = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, ro));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return noi(muoi, rs, new Uint8Array([asCong.length]), asCong, mat);
}

/* ============================================================
   KÝ MỘT LẦN, DÙNG CHO CẢ NHÓM MÁY CÙNG NHÀ (21/09).
   Chữ ký VAPID gắn với "aud" — tức là NHÀ CUNG CẤP đẩy (Apple, Google), chứ
   không gắn với từng máy. Bản cũ ký lại cho từng máy một: 27 máy là 27 lần
   ký ECDSA, mỗi lần vài mili-giây CPU. Bản tin 9h sáng gửi cho cả đội nên dồn
   hết vào MỘT lượt chạy — mức Cloudflare miễn phí chỉ cho 10ms CPU mỗi lượt
   cron, vượt là bị cắt ngang giữa chừng, ai đứng cuối danh sách mất tin.
   Thực tế cả đội chỉ có 2-3 nhà (web.push.apple.com, fcm.googleapis.com) nên
   ký 2-3 lần là đủ cho tất cả. Chữ ký sống 12 tiếng, dùng lại thoải mái.
   Kho nhớ này truyền tay theo từng lượt gửi, không để dành qua lượt sau —
   worker có thể bị thay mới bất cứ lúc nào, giữ lại chỉ tổ rối.
   ============================================================ */
async function jwtCho(endpoint, env, kho) {
  const aud = new URL(endpoint).origin;
  if (kho && kho[aud]) return kho[aud];
  const jwt = await kyVapid(endpoint, env.VAPID_PRIVATE, env.VAPID_PUBLIC, env.EMAIL_QL);
  if (kho) kho[aud] = jwt;
  return jwt;
}

/* ---------- gửi 1 thông báo ---------- */
export async function guiMot(may, tin, env, kho) {
  if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return { ok: false, loi: 'chưa cài khoá đẩy' };
  try {
    const than = await maHoa(JSON.stringify(tin), may.p256dh, may.auth);
    const jwt = await jwtCho(may.endpoint, env, kho);
    const r = await fetch(may.endpoint, {
      method: 'POST',
      headers: {
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        'ttl': '86400',
        'urgency': tin.gap ? 'high' : 'normal',
        'authorization': 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC
      },
      body: than
    });
    return { ok: r.ok, ma: r.status, het: r.status === 404 || r.status === 410 };
  } catch (e) {
    return { ok: false, loi: String(e && e.message || e) };
  }
}

/* ---------- gửi cho nhiều máy ---------- */
export async function guiNhieu(dsMay, tin, env, khoNgoai) {
  /* đính cờ rung RIÊNG cho từng máy — cùng một tin nhưng máy tắt rung thì im
     lặng, máy khác vẫn rung (21/09). Cột rung thiếu hoặc null = bật. */
  /* ký trước cho từng NHÀ (thường chỉ 2-3 cái), rồi cả đội dùng chung.
     Phải ký xong mới bắn: bắn song song ngay thì mỗi máy thấy kho còn trống,
     lại ký riêng — đúng cái đang muốn tránh. */
  /* khoNgoai: bản tin 9h sáng gọi hàm này 13 lượt liền cho 13 người — đưa
     chung một kho vào thì cả 13 lượt xài lại đúng 2-3 chữ ký đã ký lần đầu. */
  const kho = khoNgoai || {};
  if (env.VAPID_PRIVATE && env.VAPID_PUBLIC) {
    for (const m of dsMay) {
      try {
        const o = new URL(m.endpoint).origin;
        if (!kho[o]) await jwtCho(m.endpoint, env, kho);
      } catch (e) { }
    }
  }
  const kq = await Promise.all(dsMay.map(m =>
    guiMot(m, (m && (m.rung === 0 || m.rung === false)) ? Object.assign({}, tin, { rung: false }) : tin, env, kho)));
  return {
    gui: kq.filter(x => x.ok).length,
    loi: kq.filter(x => !x.ok && !x.het).length,
    het: kq.map((x, i) => x.het ? (dsMay[i] && dsMay[i].endpoint) : null).filter(Boolean),
    /* lý do thật từng máy hỏng — 403 thường là lệch khoá, 410 là đăng ký chết */
    chiTiet: kq.filter(x => !x.ok).map(x => x.het ? 'đăng ký đã chết (' + x.ma + ')' : (x.loi || ('mã ' + x.ma)))
  };
}

/* ---------- tạo cặp khoá VAPID (chạy 1 lần) ---------- */
export async function taoKhoa() {
  const cap = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', cap.privateKey);
  const cong = new Uint8Array(await crypto.subtle.exportKey('raw', cap.publicKey));
  return { cong: b64u.ma(cong), rieng: jwk.d };
}
