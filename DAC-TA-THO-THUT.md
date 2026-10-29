# Thanh trên / thanh dưới thò thụt theo cuộn

Đặc tả để app khác làm theo. Trích từ web **Kỹ thuật IKID** bản v260, đang
chạy thật từ 19/10/2026.

---

## Làm gì

Trên **điện thoại**, khi người dùng cuộn xuống đọc tiếp thì ba thứ cùng rút đi
để nhường chỗ cho nội dung; dừng tay hoặc vuốt ngược lên thì cùng quay lại.

| Thứ | Lúc thụt | Lúc thò |
|---|---|---|
| Thanh trên (logo, tên, nút) | trượt lên khuất hẳn | trượt về chỗ cũ |
| Thanh tab dưới | tụt xuống dưới mép màn | trồi lên |
| Nút tròn nổi (＋ / nút chính) | mờ đi, tụt theo, không bấm được | hiện lại, bấm được |

**Ba thứ dùng CHUNG một lớp CSS** nên luôn cùng nhịp, không bao giờ lệch pha.

---

## Luật

| Điều kiện | Việc |
|---|---|
| Cuộn xuống **hơn 8px** | thụt |
| Cuộn ngược lên **hơn 8px** | thò |
| **Dừng tay 1,4 giây** | thò, dù đang ở đâu |
| Cách đầu trang **dưới 60px** | luôn thò, không bao giờ thụt |
| Màn rộng **≥ 901px** | không chạy gì cả |

**Vì sao ngưỡng 8px:** tay run hay cuộn theo đà làm vị trí nhảy 1-3px liên
tục; không có ngưỡng thì thanh nhấp nháy liên hồi.

**Vì sao 1,4 giây:** đủ lâu để biết người ta đã dừng đọc, đủ nhanh để không
phải chờ khi cần bấm. Thử 0,8s thì thanh cứ nhảy ra lúc đang đọc; 2s thì sốt
ruột.

**Vì sao 60px đầu trang:** chỗ đó là lúc vừa mở app ra. Ẩn thanh đi thì người
dùng tưởng mất nút.

---

## Không làm trên máy tính — và vì sao

Luật nằm gọn trong `@media (max-width: 900px)`, hàm JS cũng thoát ngay nếu màn
≥ 901px.

| | Điện thoại 390×750 | Máy tính 1707×820 |
|---|---|---|
| Thanh trên | 39px | 71px |
| Thanh tab dưới | 74px | **không có** (menu ở cột trái, không cuộn theo trang) |
| **Tổng chiếm** | **113px = 15% màn** | 71px = 8,7% màn |

Trên điện thoại, giấu 113px là thêm được nguyên một thẻ nội dung. Trên máy
tính chỉ được 8,7%, mà đổi lại mỗi lần muốn bấm nút trên thanh lại phải cuộn
ngược lên đầu. Không đáng.

---

## Mã — CSS

```css
/* ===== THANH TAB DƯỚI + NÚT NỔI ===== */
@media (max-width: 900px) {
  #tabDay { transition: transform .24s ease, box-shadow .24s ease; }
  body.tabAn #tabDay { transform: translateY(110%); box-shadow: none; }

  .fab { transition: transform .24s ease, opacity .24s ease; }
  body.tabAn .fab { transform: translateY(150%); opacity: 0; pointer-events: none; }

  /* ===== THANH TRÊN ===== */
  .top { transition: transform .24s ease; }
  body.tabAn .top { transform: translateY(-100%); }
}

/* Máy bật "giảm chuyển động" thì tắt hẳn */
@media (prefers-reduced-motion: reduce) {
  #tabDay, .fab, .top { transition: none; }
}
```

**Thanh trên phải là `position: sticky` hoặc `fixed`** thì `translateY` mới
giấu được nó.

---

## Mã — JavaScript

```js
let TAB_TRUOC = 0, TAB_HEN = 0;

function tabTheoCuon(e) {
  if (matchMedia('(min-width:901px)').matches) return;

  // bỏ qua cuộn bên trong hộp con (ngăn chi tiết, tấm trượt, bảng)
  if (e && e.target && e.target !== document && e.target !== document.body
      && e.target !== document.documentElement) return;

  const y = Math.max(
    document.body.scrollTop || 0,
    document.documentElement.scrollTop || 0,
    (document.scrollingElement && document.scrollingElement.scrollTop) || 0,
    window.scrollY || 0
  );

  const b = document.body;
  if (y < 60) b.classList.remove('tabAn');
  else if (y > TAB_TRUOC + 8) b.classList.add('tabAn');
  else if (y < TAB_TRUOC - 8) b.classList.remove('tabAn');

  TAB_TRUOC = y;
  clearTimeout(TAB_HEN);
  TAB_HEN = setTimeout(() => b.classList.remove('tabAn'), 1400);
}

window.addEventListener('scroll', tabTheoCuon, { passive: true });
document.addEventListener('scroll', tabTheoCuon, { passive: true, capture: true });
```

---

## Bốn cái bẫy — đều đã dính rồi mới biết

### ① `calc()` trong `translateY` bị bỏ qua

```css
transform: translateY(calc(100% + 6px));   /* SAI — thanh đứng im */
transform: translateY(110%);               /* ĐÚNG */
```

Trình duyệt không báo lỗi gì, chỉ lặng lẽ bỏ qua cả dòng. Mất một lúc lâu mới
mò ra vì nhìn mã thì thấy hợp lý.

### ② Phải đo vị trí cuộn ở ba chỗ rồi lấy số lớn nhất

Tuỳ cách dựng trang mà nội dung cuộn ở `<body>`, ở `<html>`, hay ở cửa sổ.
Đo một chỗ thì có máy ra 0 suốt, thanh đứng im không hiểu vì sao.

### ③ Phải nghe cuộn ở **cả hai** nơi

```js
window.addEventListener('scroll', ...);
document.addEventListener('scroll', ..., { capture: true });
```

Sự kiện `scroll` **không nổi bọt**. Trang cuộn ở `<body>` mà chỉ nghe `window`
thì không bao giờ nhận được.

### ④ Phải lọc cuộn trong hộp con

Nghe ở tầng capture nên mọi hộp con cuộn cũng gọi vào hàm. Không lọc thì mở
ngăn chi tiết ra cuộn một cái, đóng lại thấy thanh tab đang thụt dở — trông
như hỏng.

---

## Thử lại cho chắc

1. Cuộn xuống 300px → ba thứ thụt
2. Dừng tay, đếm 1,4 giây → ba thứ thò
3. Vuốt ngược lên một chút → thò ngay, không đợi hết giờ
4. Cuộn về sát đầu trang → thò và ở yên đó
5. Mở ngăn chi tiết, cuộn trong đó, đóng lại → thanh tab vẫn nguyên
6. Mở trên máy tính, cuộn → không gì nhúc nhích
7. Bật "giảm chuyển động" trong cài đặt máy → không gì nhúc nhích

---

*Trích từ web Kỹ thuật IKID v260 · 28/10/2026*
