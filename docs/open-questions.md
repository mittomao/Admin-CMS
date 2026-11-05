# CÂU HỎI CẦN XÁC NHẬN CHO GIAI ĐOẠN 6.2 (OPEN QUESTIONS)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho yêu cầu thay đổi: **Rendering gắn Component Template & Page Template không kế thừa Component Template (GĐ 6.2)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Dùng cơ chế suy ra (computed) động, không tự ghi base template vào page template?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036: Rendering gắn Component Template & Cơ chế Suy ra Trường Hiệu lực](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Dùng cơ chế suy ra (computed).** Hàm `resolveEffectiveTemplate(item, lang, version)` tự động hợp nhất template của item cùng các `componentTemplate` của các rendering trong presentation thực tế. Tuyệt đối không tự động ghi hay ép buộc gắn component templates vào mảng `baseTemplates` của page template.
- **Lựa chọn B:** Khi thêm rendering vào Standard Presentation, tự động ghi âm thầm ID của component template vào mảng `baseTemplates` của page template.
- **Lý do đề xuất:** Đảm bảo tính linh hoạt tối đa; khi gỡ rendering khỏi presentation, form tự động ẩn trường mà không phải can thiệp sửa đổi schema base template; tách bạch rõ ràng giữa kế thừa cấu trúc trang và component presentation.

---

### 2. Cùng một component lặp nhiều lần trong một page thì dùng chung một bộ field?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-035](decisions/DEC-035-component-field-inheritance-and-context.md), [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Nếu một page item có 2 hay nhiều rendering cùng loại (ví dụ 2 khối `HeroBanner`), cả 2 sẽ dùng chung một bộ giá trị field đọc từ chính page item. Nếu tác giả cần nội dung độc lập cho từng khối, tác giả sẽ sử dụng trường tùy chọn `datasourceId` trỏ tới item nội dung riêng.
- **Lựa chọn B:** Tự động tạo bản sao trường với hậu tố số thứ tự (ví dụ `HeroTitle_1`, `HeroTitle_2`).
- **Lý do đề xuất:** Tránh làm ô nhiễm và biến dạng schema template; đúng chuẩn thiết kế của CMS Sitecore truyền thống (Datasource Item cho các component độc lập tái sử dụng).

---

### 3. Page item có presentation override (shared/final) thêm rendering mới thì field của component đó xuất hiện cho item đó?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Vì `resolveEffectiveTemplate` nhận trực tiếp ngữ cảnh `(item, lang, version)`, nó phân giải qua `getFinalPresentation`. Khi một item có Final Presentation override thêm một rendering mới (ví dụ thêm `ImageText`), form soạn thảo của chính phiên bản đó sẽ ngay lập tức xuất hiện thêm section và các trường của component đó.
- **Lựa chọn B:** Chỉ cho phép các trường từ Standard Presentation của Page Template, bỏ qua rendering được thêm ở item level.
- **Lý do đề xuất:** Đảm bảo tính nhất quán giữa những gì tác giả cấu hình trên Presentation Details của trang và những trường tác giả có thể nhập liệu trong Content Editor.

---

### 4. Field của component hiển thị thành section riêng theo tên component?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Mỗi component template được gom thành một Section riêng mang tên của Component/Rendering (ví dụ `HeroBanner`, `Introduction`), kèm badge nguồn rõ ràng (`từ rendering HeroBanner`).
- **Lựa chọn B:** Hòa trộn tất cả các trường của component vào chung một Section "Content" mặc định của trang.
- **Lý do đề xuất:** Tránh nhầm lẫn thị giác cho người dùng khi nhiều component có trường cùng tên (như `Title`, `Description`, `Image`), giúp cấu trúc form gọn gàng, trực quan và dễ quản lý.

---

### 5. Chặn hay chỉ cảnh báo khi chọn template `Feature/Components` làm base template của page template?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chỉ cảnh báo.** Trong Template Manager (tab Base Templates), khi người dùng tick chọn một template nằm dưới `/sitecore/templates/Feature/Components`, hiển thị thông báo/cảnh báo màu vàng: *"Template này là Component Template, trường sẽ được tự động suy ra khi gắn vào Presentation. Không khuyến khích kế thừa trực tiếp làm Base Template"*. Không chặn cứng (hard block) để duy trì tính linh hoạt nếu có nhu cầu kiến trúc đặc thù.
- **Lựa chọn B:** Chặn cứng (báo lỗi và không cho lưu).
- **Lý do đề xuất:** Tránh gây gián đoạn khó chịu cho người dùng quản trị cấp cao (Admin/Developer), vừa giáo dục hướng dẫn đúng chuẩn vừa không cản trở thao tác tự do.

---

### 6. Dữ liệu hiện tại reset được hay cần migration giữ nguyên?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md), `src/scripts/migrate-rendering-component-templates.js`
- **Lựa chọn A (Đề xuất mặc định):** **Viết script Migration giữ nguyên dữ liệu** (hỗ trợ `--dry-run`, có rollback, nhắc backup DB trước khi chạy). Cụ thể:
  1. Tự động điền `componentTemplate` cho từng Rendering theo quy ước tên khớp trong `Feature/Components` (`HeroBanner`, `Introduction`, `ImageText`).
  2. Báo cáo danh sách rendering không khớp được để người dùng tự xử lý.
  3. Gỡ các base template thuộc `Feature/Components` ra khỏi các Page Template (`Home`, `About us`).
  4. Bảo toàn nguyên vẹn 100% dữ liệu field đã nhập của các item (nhờ lưu theo `fieldId`).
---

# CÂU HỎI CẦN XÁC NHẬN CHO GIAI ĐOẠN 5.1 (TÁI ĐỊNH NGHĨA MEDIA LIBRARY)

Tài liệu này lưu trữ danh sách 8 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho yêu cầu thay đổi: **Tái định nghĩa Media Library (Cloudinary Storage độc quyền & Mọi Media là Item)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Cho phép sử dụng chính thức package `cloudinary`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Tái Định Nghĩa Media Library](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Sử dụng SDK chính thức `cloudinary@^2.5.1` (hiện đã có trong dependencies dự án), không cài thêm wrapper ngoài.
- **Lựa chọn B:** Không sử dụng SDK, tự viết HTTP client gọi REST API của Cloudinary.
- **Lý do đề xuất:** SDK chính thức hỗ trợ sẵn stream upload, ký chữ ký HMAC-SHA256, phân trang Admin API và tự động sinh transformation URL an toàn.

---

### 2. Tài khoản Cloudinary đang dùng fixed folder mode hay dynamic folder mode?
- **Trạng thái:** Đã kiểm tra thực tế trên tài khoản `v41qu0lg` (Chờ ghi nhận)
- **Quyết định liên quan:** [DEC-038: Mục 2.2](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Kết quả kiểm tra thực tế:** Tài khoản Cloudinary của dự án đang kích hoạt **Dynamic Folder Mode** (API trả về cả trường `asset_folder` và `display_name`).
- **Đề xuất kỹ thuật:** `CloudinaryStorageProvider` gửi tham số `folder: 'AdminCMS/<subpath>'` và `public_id: '<cleanBaseName>'`, hỗ trợ đồng thời cả Dynamic Folders và Fixed Folders để tương thích tối đa.

---

### 3. Hai file khác đuôi cùng tên (`image1.jpg`, `image1.png`) trong một thư mục: Chặn hay tự thêm hậu tố?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.1](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chặn và báo lỗi rõ ràng (HTTP 409 Conflict).** Vì Item name trên CMS không chứa đuôi mở rộng, cả 2 file sẽ cùng tạo ra Item có tên `image1` trong cùng một thư mục cha, gây vi phạm ràng buộc duy nhất `path`. Hệ thống thông báo lỗi: *"Item 'image1' đã tồn tại trong thư mục này. Vui lòng đổi tên tệp trước khi tải lên."*
- **Lựa chọn B:** Tự động thêm hậu tố thời gian hoặc số thứ tự (ví dụ `image1-1`).
- **Lý do đề xuất:** Tránh việc tự ý biến dạng tên item gây khó kiểm soát tài nguyên cho tác giả nội dung; đúng chuẩn bảo đảm tính toàn vẹn đường dẫn của CMS.

---

### 4. Xóa item: Chỉ soft-delete ở CMS, giữ file trên Cloudinary đến GĐ 9?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.3](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Khi xóa media trên Content Editor, chỉ đánh dấu `isDeleted: true` trên Item CMS (đưa vào Recycle Bin), giữ nguyên file trên Cloudinary để có thể khôi phục (Restore). Chỉ khi nào dọn sạch vĩnh viễn thùng rác (Purge Recycle Bin ở GĐ 9), hệ thống mới gọi lệnh `cloudinary.uploader.destroy`.
- **Lựa chọn B:** Xóa tức thì file vật lý trên Cloudinary ngay khi xóa Item trên CMS.
- **Lý do đề xuất:** Tránh rủi ro xóa nhầm làm mất vĩnh viễn tệp gốc của khách hàng mà không thể hoàn tác; phù hợp hoàn hảo với kiến trúc Recycle Bin của Sitecore XM.

---

### 5. Dữ liệu media hiện có: Migration lên Cloudinary hay reset?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** `scripts/migrate-legacy-media-to-items.js`, [DEC-038](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Cung cấp script Migration giữ nguyên dữ liệu** (`scripts/migrate-legacy-media-to-items.js` có `--dry-run`, giữ nguyên `_id` cũ). Nếu toàn bộ dữ liệu hiện có chỉ là ảnh thử nghiệm dev, cho phép chạy lệnh reset database và seed lại chuẩn.
- **Lựa chọn B:** Bắt buộc reset toàn bộ CSDL và seed lại từ đầu.
- **Lý do đề xuất:** Tạo sẵn script migration phục vụ việc nâng cấp dữ liệu thực tế mà không làm đứt gãy các tham chiếu Image field và Rich Text đã nhập.

---

### 6. Route `/media/file/:id` cũ: Redirect sang Cloudinary hay bỏ?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.5](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Redirect HTTP 302** trực tiếp sang Cloudinary CDN URL (`secure_url`), kèm header `Cache-Control: public, max-age=31536000, immutable`.
- **Lựa chọn B:** Xóa bỏ hoàn toàn route `/media/file/:id`.
- **Lý do đề xuất:** Đảm bảo toàn bộ liên kết ảnh cũ trong các bài viết Rich Text hoặc bookmark của người dùng không bị gãy (404), đồng thời chuyển gánh nặng truyền tải sang CDN toàn cầu của Cloudinary.

---

### 7. Gỡ bỏ thư viện `sharp` sau khi chuyển sang Cloudinary Transformation?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.5](decisions/DEC-038-cloudinary-media-item-unification.md), `docs/rules/02-tech-stack.md`
- **Lựa chọn A (Đề xuất mặc định):** **Gỡ bỏ `sharp` khỏi `package.json`** khi bước vào triển khai GĐ 5.1.
- **Lựa chọn B:** Giữ lại `sharp` làm dự phòng nếu offline.
- **Lý do đề xuất:** Cloudinary đảm nhiệm 100% việc resize, nén WebP, crop tự động qua transformation URL; gỡ `sharp` giúp giảm đáng kể kích thước `node_modules` và tránh các vấn đề biên dịch native C++ binary trên các môi trường CI/CD hoặc container.

---

### 8. Tệp tin Video/PDF/tài liệu khác (`raw`) có nằm trong phạm vi?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.1](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Hỗ trợ tệp tin tài liệu (PDF, Word, Zip) thông qua System Template `File` với `resourceType: 'raw'` trên Cloudinary.
- **Lựa chọn B:** Chỉ hỗ trợ duy nhất hình ảnh (`resourceType: 'image'`).
- **Lý do đề xuất:** Media Library chuẩn của CMS cần quản lý cả tài liệu đính kèm (catalogues, báo cáo tài chính PDF); Cloudinary hỗ trợ lưu trữ raw files rất tốt.

