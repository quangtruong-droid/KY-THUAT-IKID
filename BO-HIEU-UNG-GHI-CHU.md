# Bộ hiệu ứng — ghi chú để sau còn tra

Nguồn: tài liệu "Bộ hiệu ứng IKID" của web **IKID Camera Audit**, Trường gửi
link ngày 21/10/2026. Bên đó có **49 khung chuyển động, 7 nhóm, 0 thư viện
ngoài**. File này chép lại phần dùng được cho web Kỹ thuật, kèm trạng thái
"đã làm / chưa làm" để lần sau mở ra là biết còn gì.

---

## Bốn nguyên tắc nền — áp cho mọi hiệu ứng về sau

| Nguyên tắc | Vì sao |
|---|---|
| Chỉ đụng `transform` và `opacity` | Đổi `width/height/top/left` là trình duyệt tính lại bố cục cả trang. Danh sách 90 phiếu thì giật thấy rõ. |
| Mỗi hiệu ứng ≤ 0,5 giây, khối sau trễ 55ms | Dài hơn là người dùng phải *chờ* hiệu ứng chạy xong mới làm được việc. |
| Máy tính và điện thoại tách bộ riêng | Bên Camera Audit đặt tiền tố `hv*` cho ≥901px, `dm*` cho ≤900px. |
| Tôn trọng `prefers-reduced-motion` | Người say xe, người nhạy cảm chuyển động bật chế độ này. Bắt buộc tắt hết, không phải tuỳ chọn. |

---

## Bảy bài học — chép nguyên, vì toàn thứ đã trả giá

1. **Không đo vị trí từng thẻ ngay khi vẽ.** Gọi `getBoundingClientRect` cho
   123 dòng bắt trình duyệt tính lại cả trang. Dùng `IntersectionObserver` để
   trình duyệt tự báo thẻ nào đang trong màn.
2. **Gỡ lớp hiệu ứng khi chạy xong** (nghe sự kiện `animationend`). Lớp còn
   nằm đó thì hiệu ứng "bấm lún" bằng `transform` bị đè.
3. **Chỉ chạy khi đổi màn.** Số liệu tự làm mới mỗi 2 phút mà khối nào cũng
   trượt lại thì rất khó chịu.
4. **Giới hạn số thẻ và thời gian:** tối đa 14 thẻ, chỉ trong 0,6 giây sau khi
   vẽ. Thẻ hiện ra lúc đang cuộn thì không trượt.
5. **Hiệu ứng lặp phải chậm và có nghĩa.** Chỉ ô có việc gấp mới "thở", chỉ
   top 3 mới lấp lánh. Thứ gì cũng động thì người dùng không biết nhìn đâu.
6. **Cho chạy lại cùng một hiệu ứng:** gỡ lớp → đọc `el.offsetWidth` để ép vẽ
   lại → gắn lớp lại.
7. **Bộ chọn mạnh trong file điện thoại** (kiểu `body:not(#_a)`) sẽ đè cả
   thuộc tính `hidden`. Phải thêm `:not([hidden])`.

> Bài học 1 và 7 đụng thẳng vào web Kỹ thuật: web mình có **8 chỗ** gọi
> `getBoundingClientRect`, **0 chỗ** dùng `IntersectionObserver`; và họ nhà lỗi
> "luật ẩn bị đè" đã vấp **5 lần** trong tháng 10.

---

## Đã lấy về — bản v256 (21/10)

| | Chỗ xem | File |
|---|---|---|
| **Khung xám có vệt quét** | Màn "Ai đã bật thông báo", "Dọn dữ liệu" | `kt-hieuung2.js` → `khungXam()` |
| **Bấm lún nhẹ** 96% | Mọi thẻ phiếu, nút, tab — chỉ điện thoại | `kt.css` |
| **Rung phản hồi** | Mở bảng thao tác (12ms), lưu hỏng (3 nhịp) | `kt-hieuung2.js` → `rung()` |
| **Thanh hoàn tác 5 giây** | Huỷ phiếu | `kt-hieuung2.js` → `hoanTac()` |
| Tắt theo `prefers-reduced-motion` | — | `kt.css` cuối file |

### Thanh hoàn tác — cách làm, đừng quên

**Hoãn ghi, không phải ghi rồi lùi.** Bấm huỷ xong web *chưa* gọi máy chủ:
nó cắm cờ `p.__anTam` để `phieuThat()` lọc phiếu khỏi danh sách, hiện thanh,
hẹn 5 giây. Hết giờ mới ghi thật.

Cách kia (ghi rồi lùi) hỏng ở chỗ: trong 5 giây đó người khác mở web sẽ thấy
phiếu đã huỷ, rồi tự nhiên nó sống lại.

Ba chỗ đã xử lý: đóng web giữa chừng (`pagehide` chạy nốt), huỷ phiếu thứ hai
khi phiếu đầu còn chờ (chốt cái cũ trước), mất mạng lúc ghi (báo rõ + trả
phiếu về danh sách).

### Hai hàm suýt trùng tên

`kt-data.js` đã có sẵn `rungBat()` / `datRung()` cho công tắc **"Rung khi có
thông báo"**. Bộ mới dùng `rungBamBat()` / `datRungBam()` cho công tắc
**"Rung khi bấm"** — hai việc khác nhau, hai khoá lưu khác nhau
(`kt_rung_v1` và `kt_rungbam_v1`). Đặt trùng tên là file nạp sau ghi đè file
nạp trước, mất một trong hai mà không báo lỗi gì.

---

## Chưa lấy — còn đó, khi nào cần thì mở ra

| Hiệu ứng | Mô tả | Khó ở đâu |
|---|---|---|
| **"Ai đang mở phiếu này"** | Nhãn vàng + chấm nhấp nháy khi người khác cùng mở | Cần bảng mới trên máy chủ + gọi định kỳ. CSS đã viết sẵn (`.dxNhan` trong `kt.css`) |
| Ô số đếm chạy | Số chạy từ 0 lên trị thật trong 0,6s, giữ phần chữ sau ("/16", "đ", "%") | Web mình đã có `data-hu-dem`, chỉ chưa gắn hết |
| Thẻ điện thoại trượt lên | Chỉ thẻ đang trong màn mới chạy, tối đa 14 thẻ | Cần `IntersectionObserver` |
| Thanh tải chạy đầu trang | Vệt vàng chạy ngang mép trên khi đang gọi máy chủ | Dễ, chưa làm |
| Icon xoay khi đang chạy | Nút làm mới xoay tới khi xong | Dễ, chưa làm |
| Huy hiệu top 3 lấp lánh | Vệt sáng chạy #1 → #2 → #3, vương miện lắc | Hợp màn Hiệu suất kỹ thuật |
| Tiêu đề bật vào khi đổi màn | Ô icon bật nảy, chữ trượt từ trái, vạch vàng chạy | Hợp cả web |
| Nền trôi màu rất chậm | 24 giây một vòng, biên độ nhỏ | Trang trí thuần |

---

## Tính năng (không phải hiệu ứng) đáng học tiếp

Từ lần soi web Camera Audit ngày 21/10:

- **Thẻ KPI lưới 3×2 trên điện thoại** thay vì cuộn ngang 10 thẻ — *Trường đã
  xem ảnh nháp 21/10 và chốt không làm*
- **Dải băng việc-cần-làm** dưới thanh trên — *đã xem ảnh, chốt không làm*
- **Số kèm mẫu số** (`54 / 56 ca`) và **số kèm diễn giải** (`70 Trung bình`)
- **Tiêu đề bảng hai tầng** gom nhóm cột — web mình 14 cột phẳng
- **"Vừa xem · 1 giờ trước"** dưới tên cơ sở — dấu vết ai đã đọc
- **Chia nhỏ file**: bên đó 70 file JS (lớn nhất 102 KB), web mình 14 file
  (`kt-form.js` 170 KB, `kt.css` 225 KB). Sửa một dòng là người dùng tải lại
  cả khối.

---

*Cập nhật 21/10/2026 — bản web v256*
