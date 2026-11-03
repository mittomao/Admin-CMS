# DEC-029: Thiết lập Ngôn ngữ Mặc định Toàn hệ thống là Tiếng Việt (`vi`) và Bỏ Cảnh báo Ngôn ngữ Trống

- **Ngày quyết định:** 2026-11-03
- **Trạng thái:** Đã chốt (Approved theo GĐ 4.1)
- **Người đề xuất:** Product Owner / Senior Architect
- **Phạm vi ảnh hưởng:** `Item` schema, `Language` schema, `itemService`, `versionService`, `contentEditorController`, View SSR & Partial (`item-form.ejs`, modal).

---

## 1. Bối cảnh
Trước GĐ 4.1, hệ thống CMS mặc định sử dụng Tiếng Anh (`en`) làm ngôn ngữ chính (`defaultLanguage: 'en'`). Khi biên tập viên chuyển sang một ngôn ngữ chưa có phiên bản nội dung nào (ví dụ Tiếng Việt `vi`), giao diện hiển thị hộp cảnh báo màu vàng: *"Ngôn ngữ [XX] chưa có nội dung!"* kèm nút bấm bắt buộc tạo phiên bản dịch thuật.

Trải nghiệm này gây gián đoạn và không phù hợp với định hướng hệ thống quản trị ưu tiên Tiếng Việt (`vi`) tại thị trường Việt Nam:
1. Ngôn ngữ chính vận hành nên là `vi` (Tiếng Việt) thay vì `en`.
2. Hộp thông báo màu vàng gây rối mắt và làm gián đoạn luồng làm việc tự nhiên của biên tập viên.
3. Cần cơ chế fallback linh hoạt và tự động khởi tạo phiên bản khi lưu lần đầu thay vì ép tạo trước.

---

## 2. Quyết định kỹ thuật đã chốt

### 2.1. Ngôn ngữ mặc định hệ thống là `vi`
- Giá trị mặc định `defaultLanguage` trong `Item` schema và các tham số `langCode` ở Service/Controller/API chuyển từ `'en'` sang `'vi'`.
- Trong collection `languages`, mã `vi` được thiết lập `isDefault: true`, `sortOrder: 10`, đưa lên đầu danh sách. Mã `en` giữ nguyên trong hệ thống với `isDefault: false`, `sortOrder: 20`.
- Mọi API, Controller hoặc hàm nội bộ khi không nhận được tham số `lang` hoặc `langCode` sẽ tự động mặc định là `'vi'`.
- Mọi item mới tạo từ template sẽ tự động được khởi tạo với ngôn ngữ `vi` và phiên bản `1` (`languages: [{ code: 'vi', versions: [{ version: 1 }] }]`).

### 2.2. Không migration dữ liệu `en` cũ - Áp dụng cơ chế Fallback chỉ đọc
- Dữ liệu hiện có đang lưu ở `lang: 'en', version: 1` **giữ nguyên nhãn `en`**, tuyệt đối không đổi nhãn hay chạy migration sửa DB trực tiếp.
- Khi người dùng hoặc API truy cập một item ở ngôn ngữ `vi` nhưng item đó chưa có `vi` trong mảng `languages`:
  - Hàm `resolveFields` tự động lấy dữ liệu từ phiên bản mới nhất của `en` (hoặc ngôn ngữ đầu tiên có nội dung) để hiển thị làm nội dung gợi ý/fallback.
  - Các trường này được gán nhãn nguồn `origins[fieldKey] = 'fallback'`.
  - Cờ `hasLanguage: false` được trả về để hệ thống nhận biết item chưa có bản dịch chính thức.
- **Tự động tạo version khi lưu lần đầu:** Khi biên tập viên nhấn **Save** ở ngôn ngữ `vi`, hàm `updateFields` tự động tạo ngôn ngữ `vi` với `version: 1`, sao chép cấu trúc layout/unversioned và lưu các giá trị mới. Dữ liệu bản dịch `en` cũ vẫn được bảo toàn nguyên vẹn.

### 2.3. Bỏ hoàn toàn thông báo "chưa có nội dung" (Silent Missing Language)
- Xóa bỏ hoàn toàn khối `alert-warning` *"Ngôn ngữ [XX] chưa có nội dung!"* và nút `btnCreateMissingLanguageVersion` trong `item-form.ejs` và `content-editor.js`.
- Dropdown chọn ngôn ngữ trong Content Editor giữ dấu hiệu nhận biết trực quan:
  - Ngôn ngữ đã có nội dung: hiển thị icon tích xanh `ti-check` / nhãn `Đã có nội dung`.
  - Ngôn ngữ chưa có nội dung: hiển thị badge xám `Trống`.
- Biên tập viên có thể tự do xem fallback, chỉnh sửa và lưu mà không gặp bất kỳ popup hay cảnh báo cản trở.

---

## 3. Hệ quả & Tác động
- **Tích cực:**
  - Biên tập viên người Việt có trải nghiệm tự nhiên, hệ thống mặc định mở tiếng Việt ngay từ đầu.
  - Giao diện biên tập sạch sẽ, không còn các hộp thông báo cảnh báo không cần thiết.
  - Không phá vỡ dữ liệu cũ hay phụ thuộc vào DB migration rủi ro.
- **Lưu ý cho các giai đoạn tiếp theo (GĐ 5, GĐ 6, GĐ 10):**
  - Mọi logic lấy Media, Presentation layout hay Delivery API cần nhận thức rằng ngôn ngữ mặc định là `vi`. Nếu không chỉ định ngôn ngữ, luôn ưu tiên `vi` trước khi fallback sang `en`.

