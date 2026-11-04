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
- **Lựa chọn B:** Xoá sạch DB và chạy lại Seed mới hoàn toàn.
- **Lý do đề xuất:** Kiểm chứng hoàn hảo quy trình nâng cấp an toàn dữ liệu thực tế của một Enterprise CMS, đồng thời sẵn sàng script cho các môi trường triển khai tiếp theo.
