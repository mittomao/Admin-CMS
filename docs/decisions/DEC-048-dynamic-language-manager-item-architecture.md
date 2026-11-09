# DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động (Dynamic Language Manager) Dưới Dạng Item Hệ Thống

- **Trạng thái:** Đang đề xuất (Chờ duyệt theo GĐ L1)
- **Ngày quyết định:** 2026-11-09
- **Phạm vi:** GĐ L1, Language Management, Site Resolver, Multi-language, Caching
- **Người đề xuất:** Tech Lead / Senior Architect
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề
Trước Giai đoạn L1, cấu hình ngôn ngữ trong hệ thống Treecraft CMS chịu các giới hạn sau:
1. Danh sách ngôn ngữ bị phân mảnh: mã ngôn ngữ `vi` và `en` bị viết cứng (hard-code) rải rác trên hơn 70 tệp tin (từ Models, Services, Controllers, Views, Frontend scripts đến URL router của Site Resolver).
2. Collection `languages` (tạo từ GĐ 4) hoạt động như một bảng độc lập, đi ngược lại triết lý cốt lõi của Treecraft: *"Mọi thứ là Item"*.
3. Không thể thêm, tắt hoặc đổi ngôn ngữ mới (như tiếng Nhật `ja`, tiếng Pháp `fr-FR`) trên giao diện quản trị mà không phải can thiệp sửa code, sửa regex validator và khởi động lại server.
4. Khi tắt một ngôn ngữ, site công khai vẫn có thể bị truy cập nếu router hard-code, hoặc ngược lại làm mất mát dữ liệu cũ của biên tập viên.

---

## 2. Quyết định Kỹ thuật

### 2.1. Ngôn ngữ Là Item Phân cấp Dưới `/root/system/Languages`
- Toàn bộ các định nghĩa ngôn ngữ trong hệ thống được lưu trữ dưới dạng các **Item chính danh** thuộc collection `items_master` (và được xuất bản sang `items_web`) bên dưới nhánh phân cấp:
  ```
  /root/system/Languages
  ├── vi  (Item Language: Tiếng Việt - Mặc định)
  ├── en  (Item Language: English)
  └── ... (Item Language khác)
  ```
- **System Templates chuyên biệt** tại `/root/templates/System`:
  - `Languages Folder`: Template cho thư mục chứa `/root/system/Languages` (icon `folder`, node hệ thống được bảo vệ chống xóa, đổi tên hoặc di chuyển).
  - `Language`: Template định nghĩa thuộc tính của từng ngôn ngữ.
- **Trường Dữ liệu của Language Item:** Toàn bộ thuộc tính lưu ở `sharedFields` (bất biến qua các phiên bản nội dung):
  - `code`: Chuỗi BCP 47 (ví dụ `vi`, `en`, `ja`, `fr-FR`). **Bất biến tuyệt đối sau khi tạo**, dùng làm khóa trong dữ liệu nội dung (`languages[].code`).
  - `displayName`: Tên hiển thị (ví dụ `Tiếng Việt`, `English`).
  - `nativeName`: Tên bản địa hóa (ví dụ `Tiếng Việt`, `English`, `日本語`).
  - `direction`: Hướng văn bản (`ltr` hoặc `rtl`).
  - `enabled`: Cờ bật/tắt kích hoạt (`true`/`false`).
  - `sortOrder`: Thứ tự sắp xếp trên dropdown và bảng quản trị.
  - `fallbackLanguage`: Mã ngôn ngữ fallback dự phòng khi thiếu giá trị trường.
  - `urlPrefix`: Tiền tố URL trên website công khai (mặc định bằng `code`).
  - `flagIcon`: Biểu tượng cờ từ icon registry (Tabler icons hoặc SVG flag).

### 2.2. Ngôn ngữ Mặc định Hệ thống (Site Default Language)
- Ngôn ngữ mặc định của website không lưu dạng cờ boolean trên từng item mà lưu tập trung trong cấu hình site tại collection `settings` (khóa `siteConfig.defaultLanguage` hoặc `languages.defaultLanguage`).
- Bắt buộc ngôn ngữ mặc định phải trỏ tới một Language item đang có trạng thái `enabled = true`.
- Khi người dùng đổi ngôn ngữ mặc định:
  - Hệ thống kiểm tra điều kiện ngôn ngữ đích phải đang kích hoạt.
  - Cảnh báo người dùng về tác động thay đổi cấu trúc URL (ngôn ngữ mặc định không có tiền tố URL), sitemap và SEO canonical.
  - Tự động xóa sạch toàn bộ bộ nhớ đệm `renderCache` của website công khai.

### 2.3. Tầng Dịch vụ `languageService` (Nguồn Sự Thật Duy Nhất)
Tất cả các module trong toàn bộ hệ thống (Content Editor, Media Library, Template Manager, Publish Manager, Site Resolver, Site Renderer...) bắt buộc phải giao tiếp thông qua `languageService`:
- `list({ enabledOnly = true, store = 'master' })`: Trả về danh sách ngôn ngữ sắp xếp theo `sortOrder`.
- `getByCode(code, { store = 'master' })`: Lấy thông tin chi tiết của một ngôn ngữ.
- `getDefault({ store = 'master' })`: Lấy ngôn ngữ mặc định của site.
- `isValid(code, { store = 'master' })`: Kiểm tra tính hợp lệ của mã ngôn ngữ.
- `getFallbackChain(code, { store = 'master' })`: Trả về mảng chuỗi fallback có kiểm tra chống chu trình (cycle detection) và giới hạn độ sâu (tối đa 5 cấp).
- `create(data, { userId })`, `update(code, data, { userId })`, `setEnabled(code, enabled, { userId })`, `setDefault(code, { userId })`, `reorder(orderedCodes, { userId })`, `delete(code, { userId })`.
- `getUsage(code)`: Đếm số lượng item/version/presentation đang sử dụng mã ngôn ngữ đó theo lô.

### 2.4. Cơ chế Đệm Bộ nhớ (In-Memory Cache) & Vô hiệu hóa Qua Event Bus
- `languageService` duy trì cache In-Memory với TTL ngắn (ví dụ 60 giây) cho danh sách ngôn ngữ và ngôn ngữ mặc định để tối ưu hóa hiệu năng truy vấn của Site Resolver và SSR Renderer.
- Khi có bất kỳ thay đổi nào về cấu hình ngôn ngữ, `languageService` phát các sự kiện tương ứng qua `eventBus`:
  - `language.created`
  - `language.updated`
  - `language.enabled`
  - `language.disabled`
  - `language.default.changed`
  - `language.deleted`
- Các module phụ thuộc (như `renderCache`, `auditService`) lắng nghe sự kiện trên để tự động xóa cache hoặc ghi nhật ký kiểm toán.

### 2.5. Quy tắc Nghiệp vụ Bật/Tắt và Xóa Ngôn ngữ
1. **Quy tắc Bất biến Mã Ngôn ngữ (`code`):** Không cho phép chỉnh sửa `code` sau khi đã tạo để bảo toàn tính toàn vẹn của khóa dữ liệu trong các bản ghi `Item.languages`. Muốn đổi mã bắt buộc phải tạo ngôn ngữ mới.
2. **Quy tắc Vô hiệu hóa (`enabled = false`):**
   - Ẩn ngôn ngữ khỏi dropdown tạo mới trong Content Editor và khỏi site công khai (URL truy cập ngôn ngữ bị tắt trả về HTTP 404).
   - Dữ liệu hiện có của ngôn ngữ đó được bảo toàn nguyên vẹn 100%. Biên tập viên trong Admin vẫn có thể xem lại dữ liệu cũ ở chế độ chỉ đọc.
   - Không cho phép vô hiệu hóa ngôn ngữ đang được thiết lập làm mặc định hệ thống.
3. **Quy tắc Xóa An toàn (Safe Delete):**
   - Chỉ cho phép xóa vĩnh viễn một Language Item khi `getUsage(code) === 0` (chưa có bất kỳ item, version hoặc presentation nào sử dụng) và ngôn ngữ đó không phải là ngôn ngữ mặc định.
   - Nếu còn dữ liệu liên kết, hệ thống chặn hành động xóa và hiển thị thông báo kèm số liệu chi tiết, gợi ý người dùng chuyển sang trạng thái vô hiệu hóa (`enabled = false`).

### 2.6. Đồng bộ Xuất bản sang Web Store
- Language Items được đưa vào danh sách xuất bản liên quan (`resolveRelatedItems`) hoặc có thể xuất bản độc lập sang database `items_web`.
- `SiteResolver` khi phân giải request công khai sẽ truy vấn danh sách ngôn ngữ kích hoạt trực tiếp từ database `items_web`, đảm bảo tách biệt tuyệt đối giữa dữ liệu nháp của Admin và môi trường công khai.

---

## 3. Hệ quả & Lợi ích
- **Lợi ích:**
  - Hệ thống trở nên linh hoạt tuyệt đối: thêm bất kỳ ngôn ngữ nào chỉ qua vài thao tác chuột trên giao diện.
  - Tuân thủ triệt để kiến trúc "Mọi thứ là Item", tái sử dụng toàn bộ hạ tầng phân quyền, phả hệ cây và xuất bản có sẵn.
  - Không còn rủi ro xung đột hoặc sót mã ngôn ngữ hard-code khi mở rộng hệ thống sang các thị trường quốc tế.
- **Ràng buộc:**
  - Các script seed và migration phải đảm bảo tạo sẵn các ngôn ngữ nền tảng ban đầu (`vi`, `en`) và kiểm tra tính toàn vẹn khi chạy lại nhiều lần.

