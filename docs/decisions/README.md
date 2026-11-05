# Danh mục Quyết định Kiến trúc (Decision Log - ADR)
> File: `docs/decisions/README.md`  
> Mô tả: Bảng tổng hợp các Quyết định Kiến trúc Phần mềm (Architecture Decision Records - ADR) của dự án.

---

## Bảng Mục lục Quyết định Kiến trúc

| ID | Tiêu đề Quyết định | GĐ liên quan | Ngày quyết định | Trạng thái | File chi tiết |
| :---: | :--- | :--- :---: | :---: | :---: | :--- |
| **DEC-001** | Kiến trúc Cây: Materialized Path + Ancestors Array | GĐ 2 | 2026-11-03 | Đang áp dụng | [`DEC-001-materialized-path-ancestors.md`](./DEC-001-materialized-path-ancestors.md) |
| **DEC-002** | Kỷ luật Tầng điều khiển (Controller qua Service) | GĐ 0 | 2026-11-03 | Đang áp dụng | [`DEC-002-service-layer-discipline.md`](./DEC-002-service-layer-discipline.md) |
| **DEC-003** | Giao diện Form Editor: Partial HTML SSR | GĐ 2 | 2026-11-03 | Đang áp dụng | [`DEC-003-partial-html-ssr.md`](./DEC-003-partial-html-ssr.md) |
| **DEC-004** | Logging tập trung đa cấp độ bằng Winston | GĐ 0 | 2026-11-03 | Đang áp dụng | [`DEC-004-centralized-logging-winston.md`](./DEC-004-centralized-logging-winston.md) |
| **DEC-005** | Layout Engine: Tách Shell và Auth layout qua express-ejs-layouts | GĐ 0 | 2026-11-03 | Đang áp dụng | [`DEC-005-ejs-layouts-separation.md`](./DEC-005-ejs-layouts-separation.md) |
| **DEC-006** | Kiến trúc CSS thuần Module hóa (Sitecore Theme) | GĐ 0 | 2026-11-03 | Đang áp dụng | [`DEC-006-vanilla-css-sitecore-theme.md`](./DEC-006-vanilla-css-sitecore-theme.md) |
| **DEC-007** | Kết nối MongoDB không chặn khởi động và Graceful Reconnection | GĐ 0 | 2026-11-03 | Đang áp dụng | [`DEC-007-graceful-mongodb-connection.md`](./DEC-007-graceful-mongodb-connection.md) |
| **DEC-008** | Quản lý Session bền vững với connect-mongo | GĐ 1 | 2026-11-03 | Đang áp dụng | [`DEC-008-session-mongo-store.md`](./DEC-008-session-mongo-store.md) |
| **DEC-009** | Mã hóa Mật khẩu: bcryptjs với salt rounds = 10 | GĐ 1 | 2026-11-03 | Đang áp dụng | [`DEC-009-bcrypt-password-hashing.md`](./DEC-009-bcrypt-password-hashing.md) |
| **DEC-010** | Phân quyền Hiển thị Launchpad theo Role | GĐ 1 | 2026-11-03 | Đang áp dụng | [`DEC-010-role-based-launchpad.md`](./DEC-010-role-based-launchpad.md) |
| **DEC-011** | Cây nội dung Fancytree & Kéo thả native dnd5 | GĐ 2 | 2026-11-03 | Đang áp dụng | [`DEC-011-fancytree-dnd5.md`](./DEC-011-fancytree-dnd5.md) |
| **DEC-012** | Khóa Lạc quan (Optimistic Locking) HTTP 409 Conflict | GĐ 2 | 2026-11-03 | Đang áp dụng | [`DEC-012-optimistic-locking-409.md`](./DEC-012-optimistic-locking-409.md) |
| **DEC-013** | Làm sạch mã Rich Text HTML tại Server bằng sanitize-html | GĐ 2 | 2026-11-03 | Đang áp dụng | [`DEC-013-sanitize-html-server.md`](./DEC-013-sanitize-html-server.md) |
| **DEC-014** | Phát hiện Vòng lặp (Cycle Detection) khi Di chuyển Item | GĐ 2 | 2026-11-03 | Đang áp dụng | [`DEC-014-move-cycle-detection.md`](./DEC-014-move-cycle-detection.md) |
| **DEC-015** | Lưu trữ Giá trị Field theo Immutable Field ID | GĐ 3 | 2026-11-03 | Đang áp dụng | [`DEC-015-immutable-field-id.md`](./DEC-015-immutable-field-id.md) |
| **DEC-016** | Thuật toán Kế thừa Đa cấp & Chống Chu trình Template | GĐ 3 | 2026-11-03 | Đang áp dụng | [`DEC-016-template-inheritance-cycle-detection.md`](./DEC-016-template-inheritance-cycle-detection.md) |
| **DEC-017** | Standard Values Động phân giải tại thời điểm đọc | GĐ 3 | 2026-11-03 | Đang áp dụng | [`DEC-017-dynamic-standard-values.md`](./DEC-017-dynamic-standard-values.md) |
| **DEC-018** | Bảo vệ Xóa An toàn Cho Template đang được sử dụng | GĐ 3 | 2026-11-03 | Đang áp dụng | [`DEC-018-safe-delete-template.md`](./DEC-018-safe-delete-template.md) |
| **DEC-019** | Bổ sung GĐ Presentation (GĐ 6) & Đánh số lại 13 Giai đoạn | Toàn dự án | 2026-11-03 | Đang áp dụng (một phần thay thế bởi DEC-031) | [`DEC-019-presentation-phase-position.md`](./DEC-019-presentation-phase-position.md) |
| **DEC-020** | Kiến trúc Presentation: Tách biệt Shared Layout và Final Layout | GĐ 4, 6 | 2026-11-03 | Thay thế bởi DEC-031, DEC-032 | [`DEC-020-presentation-shared-vs-final.md`](./DEC-020-presentation-shared-vs-final.md) |
| **DEC-021** | Thuật toán Phân giải Presentation: Delta Override với UUID v4 | GĐ 6 | 2026-11-03 | Thay thế bởi DEC-031, DEC-035 | [`DEC-021-presentation-delta-resolution.md`](./DEC-021-presentation-delta-resolution.md) |
| **DEC-022** | Quy tắc Khớp Dynamic Placeholder Keys (`column-{*}`) | GĐ 6 | 2026-11-03 | Thay thế bởi DEC-032 | [`DEC-022-dynamic-placeholder-matching.md`](./DEC-022-dynamic-placeholder-matching.md) |
| **DEC-023** | Xử lý Datasource Chưa Publish: Cảnh báo mềm (Warning) | GĐ 8 | 2026-11-03 | Thay thế bởi DEC-031, DEC-035 | [`DEC-023-publish-datasource-warning.md`](./DEC-023-publish-datasource-warning.md) |
| **DEC-024** | Quản lý Layout/Rendering như Item Hệ thống trong Content Editor | GĐ 6 | 2026-11-03 | Đang áp dụng | [`DEC-024-presentation-items-in-content-tree.md`](./DEC-024-presentation-items-in-content-tree.md) |
| **DEC-025** | Khôi phục Phiên bản Bằng Cách Tạo Version Mới | GĐ 4 | 2026-11-03 | Đang áp dụng | [`DEC-025-version-restore-creates-new-version.md`](./DEC-025-version-restore-creates-new-version.md) |
| **DEC-026** | Tự động Sao chép Final Layout khi Tạo Version Mới | GĐ 4, 6 | 2026-11-03 | Đang áp dụng | [`DEC-026-final-presentation-copy-on-version-creation.md`](./DEC-026-final-presentation-copy-on-version-creation.md) |
| **DEC-027** | Thuật toán Phân giải Trường 3 Cấp độ & Fallback | GĐ 4 | 2026-11-03 | Đang áp dụng | [`DEC-027-three-level-field-resolution.md`](./DEC-027-three-level-field-resolution.md) |
| **DEC-028** | Đối chiếu Kiến trúc & Kế thừa Module Media Library + Rich Text Editor | GĐ 5 | 2026-11-03 | Thay thế bởi DEC-038 | [`DEC-028-media-richtext-reference.md`](./DEC-028-media-richtext-reference.md) |
| **DEC-029** | Thiết lập Ngôn ngữ Mặc định Toàn hệ thống là `vi` và Bỏ Cảnh báo Ngôn ngữ Trống | GĐ 4.1 | 2026-11-03 | Đang áp dụng | [`DEC-029-default-language-vi-and-silent-empty-language.md`](./DEC-029-default-language-vi-and-silent-empty-language.md) |
| **DEC-030** | Cấu trúc Cây Item Layout, Thư mục Nhóm và Cơ chế Bảo vệ Node Hệ thống | GĐ 6 | 2026-11-04 | Thay thế bởi DEC-032 | [`DEC-030-layout-tree-structure-and-node-protection.md`](./DEC-030-layout-tree-structure-and-node-protection.md) |
| **DEC-031** | Kiến trúc Monolithic EJS Server-Side Rendering (SSR 100%) Thay Thế Headless React | Toàn dự án, GĐ 6, 10 | 2026-11-04 | Đang áp dụng | [`DEC-031-server-side-ejs-renderer-architecture.md`](./DEC-031-server-side-ejs-renderer-architecture.md) |
| **DEC-032** | Tái cấu trúc Cây Layout 3 Nhánh và Loại bỏ Devices/Placeholder Settings | GĐ 6, GĐ 10 | 2026-11-04 | Đang áp dụng | [`DEC-032-three-branch-layout-tree-structure.md`](./DEC-032-three-branch-layout-tree-structure.md) |
| **DEC-033** | Cơ chế An toàn viewPath và Xử lý Lỗi Biên dịch EJS Component | GĐ 6, GĐ 10 | 2026-11-04 | Đang áp dụng | [`DEC-033-viewpath-and-template-security.md`](./DEC-033-viewpath-and-template-security.md) |
| **DEC-034** | Quy tắc Phân giải URL Công khai (Public URL Resolution Rules) | GĐ 6, GĐ 10, GĐ 12 | 2026-11-04 | Đang áp dụng | [`DEC-034-public-url-resolution-rules.md`](./DEC-034-public-url-resolution-rules.md) |
| **DEC-035** | Kế thừa Field Component và Ngữ cảnh Truyền vào View | GĐ 6, GĐ 8, GĐ 10, GĐ 12 | 2026-11-04 | Thay thế một phần bởi DEC-036 | [`DEC-035-component-field-inheritance-and-context.md`](./DEC-035-component-field-inheritance-and-context.md) |
| **DEC-036** | Rendering Gắn Component Template & Cơ chế Suy ra Trường Hiệu lực (Effective Template) | GĐ 6.2, GĐ 8, GĐ 10, GĐ 12 | 2026-11-04 | Đang đề xuất (Chờ duyệt) | [`DEC-036-rendering-component-template-and-effective-field-resolution.md`](./DEC-036-rendering-component-template-and-effective-field-resolution.md) |
| **DEC-037** | Định dạng Section Quick Info, Item ID và Quản lý Owner theo chuẩn Sitecore | GĐ 6.3, Content Editor, Item Model | 2026-11-04 | Đang áp dụng | [`DEC-037-quick-info-section-and-formatting.md`](./DEC-037-quick-info-section-and-formatting.md) |
| **DEC-038** | Tái Định Nghĩa Media Library: Cloudinary Storage & Hợp Nhất "Mọi Media Là Item" | GĐ 5.1, Media Library, Item Model | 2026-11-05 | Đang áp dụng (Thay thế DEC-028) | [`DEC-038-cloudinary-media-item-unification.md`](./DEC-038-cloudinary-media-item-unification.md) |
