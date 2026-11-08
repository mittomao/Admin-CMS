# TÀI LIỆU HỆ THỐNG QUẢN TRỊ NỘI DUNG TREECRAFT CMS

Tài liệu dự án được cấu trúc thành các module chuyên biệt dưới thư mục `docs/`. Mỗi file tập trung vào một chủ đề duy nhất để tối ưu ngữ cảnh đọc cho cả con người và AI Agent.

---

## 1. QUY TẮC CHUNG (`docs/rules/`)
Quy định các tiêu chuẩn bắt buộc áp dụng xuyên suốt toàn bộ các giai đoạn phát triển:

- [00-workflow.md](rules/00-workflow.md): Quy trình phê duyệt `APPROVE GĐ <số>`, kỷ luật code, cách tick checklist, Definition of Done và báo cáo nghiệm thu.
- [01-project-overview.md](rules/01-project-overview.md): Mục tiêu dự án, triết lý Treecraft ("Mọi thứ là Item", tách Master vs Web), kiến trúc Monolithic EJS Server-Side Rendering trên cổng 4000.
- [02-tech-stack.md](rules/02-tech-stack.md): Danh mục công nghệ (Node.js, Express, EJS SSR 100%, MongoDB, Fancytree, SortableJS, TinyMCE, Winston...) và lý do lựa chọn.
- [03-conventions.md](rules/03-conventions.md): Cấu trúc thư mục dự án, quy ước đặt tên file/model/route, phân tầng Routes-Controllers-Services-Models, xử lý lỗi AppError và logging.
- [04-routing.md](rules/04-routing.md): Quy ước 3 nhóm route: Full Page EJS Admin, Partial HTML EJS cho Content Editor workspace và Public Site Renderer EJS (`/`, `/:slug`).
- [05-security.md](rules/05-security.md): Tiêu chuẩn an toàn: bảo vệ CSRF token, chống XSS với sanitize-html, phân quyền Item ACL đa cấp và bảo vệ `viewPath` an toàn (chặn path traversal).
- [06-testing.md](rules/06-testing.md): Chiến lược kiểm thử phần mềm (Unit, Integration, E2E SSR Flow), tiêu chuẩn bao phủ và Definition of Done chung cho từng giai đoạn.

---

## 2. MÔ HÌNH DỮ LIỆU (`docs/data-model/`)
Đặc tả chi tiết cấu trúc bảng (Collections), schema Mongoose, quan hệ và indexes:

- [README.md](data-model/README.md): Sơ đồ quan hệ thực thể tổng quan (ERD), chiến lược phân cấp Materialized Path + Ancestors Array và bảng tra cứu collection.
- [items-and-tree.md](data-model/items-and-tree.md): Cấu trúc Item Master/Web, quản lý fields động, phân nhánh cây `/root/layout/` 3 nhánh và compound indexes.
- [templates.md](data-model/templates.md): Cấu trúc Template, Section, Field, 9 Field Types, kế thừa Component Templates cho Page Templates, dynamic Standard Values và Insert Options.
- [users-roles-acl.md](data-model/users-roles-acl.md): Cấu trúc User, Role, AccessControl phân quyền theo Item và thuật toán đánh giá quyền ưu tiên (Explicit > Inherited, Deny > Allow).
- [versions-languages.md](data-model/versions-languages.md): Mô hình quản lý đa ngôn ngữ, unversionedFields, version history và thuật toán phân giải 3 cấp độ trường.
- [media.md](data-model/media.md): Mô hình lưu trữ tài nguyên số Media, metadata tệp tin, phân cấp thư mục và ảnh thumbnail tự động.
- [presentation.md](data-model/presentation.md): Cấu trúc Server-Side EJS Presentation (Shared vs Final Layout), System Templates (`Layout`, `Placeholder`, `Rendering`), thuộc tính `viewPath`, helper `placeholder(key)` và an toàn biên dịch.
- [workflow-publish-audit.md](data-model/workflow-publish-audit.md): Cấu trúc Workflow, trạng thái và bước duyệt, bảng lịch sử xuất bản PublishHistory và nhật ký kiểm toán AuditLog.

---

## 3. LỘ TRÌNH VÀ CÁC GIAI ĐOẠN (`docs/phases/`)
Kế hoạch triển khai chi tiết 13 giai đoạn từ GĐ 0 đến GĐ 12:

- [README.md](phases/README.md): **Nguồn sự thật duy nhất** về bảng tiến độ dự án, ngày thực hiện, trạng thái và sơ đồ phụ thuộc giữa các giai đoạn.
- [phase-00-bootstrap.md](phases/phase-00-bootstrap.md): GĐ 0 - Khởi tạo nền tảng & Layout Shell. *(Hoàn thành)*
- [phase-01-foundation.md](phases/phase-01-foundation.md): GĐ 1 - Nền tảng xác thực & Launchpad. *(Hoàn thành)*
- [phase-02-content-editor-mvp.md](phases/phase-02-content-editor-mvp.md): GĐ 2 - Content Editor MVP (Cây, CRUD, Ribbon Home). *(Hoàn thành)*
- [phase-03-template-manager.md](phases/phase-03-template-manager.md): GĐ 3 - Template Manager (Fields, Kế thừa, Insert Options). *(Hoàn thành)*
- [phase-04-versions-languages.md](phases/phase-04-versions-languages.md): GĐ 4 - Quản lý Phiên bản & Đa ngôn ngữ. *(Hoàn thành)*
- [phase-05-media-library.md](phases/phase-05-media-library.md): GĐ 5 - Thư viện Media & Media Picker Modal. *(Hoàn thành)*
- [phase-06-presentation.md](phases/phase-06-presentation.md): GĐ 6 - Presentation (Layout, Rendering, Placeholders & Presentation Details). *(Chưa bắt đầu)*
- [phase-07-item-acl.md](phases/phase-07-item-acl.md): GĐ 7 - Bảo mật nâng cao & Phân quyền truy cập (ACL). *(Chưa bắt đầu)*
- [phase-08-workflow-publish.md](phases/phase-08-workflow-publish.md): GĐ 8 - Workflow Engine, Workbox & Publishing (Master -> Web). *(Chưa bắt đầu)*
- [phase-09-recycle-bin-audit.md](phases/phase-09-recycle-bin-audit.md): GĐ 9 - Thùng rác (Recycle Bin) & Nhật ký kiểm toán (Audit Log). *(Chưa bắt đầu)*
- [phase-10-delivery-layout-api.md](phases/phase-10-delivery-layout-api.md): GĐ 10 - Public Site Renderer & In-Memory Cache. *(Chưa bắt đầu)*
- [phase-11-extensions.md](phases/phase-11-extensions.md): GĐ 11 - Mở rộng tính năng (Forms, Serialization, Tìm kiếm, Control Panel). *(Chưa bắt đầu)*
- [phase-12-hardening.md](phases/phase-12-hardening.md): GĐ 12 - Hoàn thiện, Bảo mật, Hiệu năng, E2E SSR Test & Docker. *(Chưa bắt đầu)*

---

## 4. NHẬT KÝ QUYẾT ĐỊNH KỸ THUẬT (`docs/decisions/`)
Ghi nhận các quyết định kiến trúc quan trọng kèm bối cảnh, lý do và hệ quả:

- [README.md](decisions/README.md): Bảng mục lục tổng hợp 35 quyết định kiến trúc (DEC-001 đến DEC-035).
- Các file quyết định chi tiết từ `DEC-001` đến `DEC-035`.

---

## 5. CÂU HỎI CẦN XÁC NHẬN (`docs/open-questions.md`)
- [open-questions.md](open-questions.md): Danh sách 8 câu hỏi kỹ thuật/nghiệp vụ mở kèm đề xuất mặc định của kiến trúc sư, chờ Product Owner duyệt.

---

## 6. BÁO CÁO NGHIỆM THU (`docs/reports/`)
- [README.md](reports/README.md): Hướng dẫn định dạng báo cáo kết thúc giai đoạn và lưu trữ các biên bản nghiệm thu (`phase-XX-report.md`).

---

## 7. LƯU TRỮ LỊCH SỬ (`docs/archive/`)
- [AGENTS.original.md](archive/AGENTS.original.md): Bản sao lưu nguyên vẹn của tài liệu `AGENTS.md` gốc trước khi thực hiện tái cấu trúc (chỉ dùng để đối chiếu lịch sử khi cần).
