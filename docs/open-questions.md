# CÂU HỎI CẦN XÁC NHẬN (OPEN QUESTIONS)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật / nghiệp vụ cần Product Owner / Tech Lead xác nhận, kèm theo đề xuất mặc định của kiến trúc sư và trạng thái hiện tại.

---

### 1. Quản lý Layout/Rendering/Placeholder Settings trong Content Editor hay trang riêng?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-024: Quản lý Layout/Rendering như Item Hệ thống](decisions/DEC-024-presentation-items-in-content-tree.md)
- **Lựa chọn A (Đề xuất mặc định):** Quản lý ngay trong Content Editor dưới nhánh cây hệ thống `/sitecore/layout/*` (Everything is an Item), form biên tập tự động sinh theo System Template (`Layout`, `Rendering`, `Placeholder Settings`).
- **Lựa chọn B:** Xây dựng ứng dụng quản trị riêng biệt ngoài Content Editor (ví dụ giao diện "Presentation Manager" trên Launchpad).
- **Lý do đề xuất:** Tuân thủ triệt để triết lý Sitecore "Mọi thứ là Item", tái sử dụng 100% nền tảng Content Editor (Fancytree, CRUD, ACL, Template inheritance) mà không phải viết thêm trang quản trị riêng.

---

### 2. Cơ chế lưu trữ Presentation của Item (Lưu toàn bộ hay Delta Override)?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-020](decisions/DEC-020-presentation-shared-vs-final.md), [DEC-021: Phân giải Delta Override](decisions/DEC-021-presentation-delta-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Delta Override** so với Standard Presentation của Template. Item chỉ lưu danh sách thay đổi (thêm rendering mới, ghi đè datasource/parameters/sortOrder, hoặc đánh dấu ẩn rendering từ Standard).
- **Lựa chọn B:** Lưu trọn vẹn toàn bộ mảng Renderings của Item khi biên tập.
- **Lý do đề xuất:** Khi cấu hình Standard Presentation ở Template thay đổi (ví dụ thêm footer component), tất cả các item chưa override sẽ tự động thừa hưởng thay đổi đó ngay lập tức; đồng thời tối ưu kích thước document MongoDB.

---

### 3. Cú pháp Placeholder Key động (`column-{*}`) ở MVP
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-022: Quy tắc Khớp Dynamic Placeholder Keys](decisions/DEC-022-dynamic-placeholder-matching.md)
- **Lựa chọn A (Đề xuất mặc định):** Có hỗ trợ ở mức đơn giản bằng ánh xạ Wildcard sang Regular Expression (ví dụ: `column-{*}` khớp với `column-1`, `column-left`, `column-2`).
- **Lựa chọn B:** Chỉ hỗ trợ các key placeholder tĩnh tuyệt đối (như `main`, `header`, `footer`).
- **Lý do đề xuất:** Cực kỳ quan trọng để frontend React xây dựng các component layout dạng lưới (Grid 2 cột, 3 cột) mà không phải cấu hình hàng chục Placeholder Settings thủ công.

---

### 4. Tách Presentation theo Device ngay từ GĐ 6
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-019](decisions/DEC-019-presentation-phase-position.md), [phase-06-presentation.md](phases/phase-06-presentation.md)
- **Lựa chọn A (Đề xuất mặc định):** Có, thiết kế hỗ trợ 2 device cơ bản là `Default` và `Mobile` (với `Mobile` có thể fallback về `Default`).
- **Lựa chọn B:** Chỉ hỗ trợ 1 thiết bị duy nhất ở MVP.
- **Lý do đề xuất:** Định hình cấu trúc dữ liệu schema chuẩn hóa ngay từ đầu tránh phải migration phức tạp sau này; giao diện tab Device đơn giản, dễ sử dụng.

---

### 5. Xử lý Datasource chưa publish khi Publish Item
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-023: Xử lý Datasource Chưa Publish](decisions/DEC-023-publish-datasource-warning.md)
- **Lựa chọn A (Đề xuất mặc định):** **Cảnh báo (Warning)** trong Publish Dialog và cung cấp checkbox "Publish kèm các Datasource liên đới", cho phép người dùng quyết định tiếp tục publish.
- **Lựa chọn B:** Chặn cứng (Hard Block), không cho phép publish item nếu có bất kỳ datasource nào chưa được publish lên Web.
- **Lý do đề xuất:** Giúp trải nghiệm biên tập linh hoạt; trên frontend React, nếu datasource thiếu thì Layout Service trả `fields: null` và component tự xử lý fallback an toàn mà không làm gãy toàn bộ trang.

---

### 6. Định dạng JSON của Layout Service đối với React Frontend
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-021](decisions/DEC-021-presentation-delta-resolution.md), [phase-10-delivery-layout-api.md](phases/phase-10-delivery-layout-api.md)
- **Lựa chọn A (Đề xuất mặc định):** Định dạng chuẩn Headless tương tự Sitecore JSS Layout Service (gồm đối tượng `route` và bản đồ `placeholders: { [key]: components[] }`), tối giản phù hợp với Component Factory của React.
- **Lựa chọn B:** Tuân thủ 100% toàn bộ metadata phức tạp của Sitecore Layout Service (kể cả context tracking, visitor data).
- **Lý do đề xuất:** Giữ JSON tinh gọn, giảm payload network, tối ưu tốc độ render cho Next.js/React.

---

### 7. Bổ sung Tile "Presentation" riêng trên Dashboard Launchpad
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-010: Role-based Launchpad](decisions/DEC-010-role-based-launchpad.md), [DEC-024](decisions/DEC-024-presentation-items-in-content-tree.md)
- **Lựa chọn A (Đề xuất mặc định):** Không cần tile riêng; người dùng thao tác Presentation Details trực tiếp qua Ribbon tab `Presentation` trong Content Editor, và cấu hình Layout/Rendering tại nhánh `/sitecore/layout/`.
- **Lựa chọn B:** Tạo một tile "Presentation Designer" riêng trên Launchpad.
- **Lý do đề xuất:** Giữ Launchpad gọn gàng, đúng luồng tác vụ Sitecore tiêu chuẩn.

---

### 8. Mức độ ưu tiên của Experience Editor đơn giản (WYSIWYG Preview trong iframe)
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [phase-11-extensions.md](phases/phase-11-extensions.md)
- **Lựa chọn A (Đề xuất mặc định):** Xếp vào danh sách mở rộng ở **GĐ 11 với mức ưu tiên thấp (Optional)**. Trọng tâm cốt lõi là hoàn thiện Content Editor form-based và Headless Layout Service ổn định.
- **Lựa chọn B:** Làm ngay Experience Editor WYSIWYG cùng lúc ở GĐ 6.
- **Lý do đề xuất:** Làm WYSIWYG in-line cho headless React rất tốn thời gian (cần iframe bridge, postMessage sync, content editable tags), trong khi MVP headless chỉ cần Layout Service trả JSON chính xác cho frontend.

