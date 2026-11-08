---
phase: 6.3
name: Quick Info for Content Editor Items
status: Hoàn thành
depends_on: [6, 6.2]
estimate: 1 ngày
started: 2026-11-04
completed: 2026-11-04
updated: 2026-11-04
---

# GĐ 6.3 — Hiển Thị Section "Quick Info" Cho Mọi Item Trong Content Editor

> Bổ sung section metadata "Quick Info" chuẩn Treecraft ở đầu form của mọi Item trong Content Editor (Content, Template, Template Folder, Layout, Placeholder, Rendering, Media Library, System). Hiển thị 6 thông tin cốt lõi (Item ID, Item name, Item path, Template kèm liên kết, Created from, Item owner), hỗ trợ thu gọn/mở rộng lưu theo `localStorage`, giao diện chuẩn Treecraft (thanh xám đậm, vạch đỏ, chevron).

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/decisions/DEC-037-quick-info-section-and-formatting.md`](../decisions/DEC-037-quick-info-section-and-formatting.md)

---

## 1. Yêu Cầu Chi Tiết 6 Dòng Thông Tin

| Dòng | Nhãn | Định dạng & Nguồn dữ liệu |
| :---: | :--- | :--- |
| **1** | **Item ID** | `{GUID-VIẾT-HOA}` trong ngoặc nhọn. Với MongoDB ObjectId: `{_ID_UPPERCASE}` (ví dụ: `{64A1B2C3D4E5F67890123456}`). Hỗ trợ chọn văn bản và nút copy nhanh. |
| **2** | **Item name** | Tên item (`item.name`). Đã escape EJS an toàn. |
| **3** | **Item path** | Đường dẫn đầy đủ của item theo materialized path (`item.path`). Hỗ trợ nút copy nhanh. |
| **4** | **Template** | Đường dẫn đầy đủ của template kèm `{TEMPLATE_ID_UPPERCASE}`, ví dụ `/root/templates/System/Templates/Template - {ID}`. Đường dẫn là thẻ liên kết (`<a>` / click handler) mở trực tiếp template đó trong cây nội dung. |
| **5** | **Created from** | Tên/ID item nguồn nếu item được tạo bằng Duplicate hoặc Copy; nếu item gốc tạo mới bình thường hoặc item nguồn không tồn tại thì hiển thị `[unknown]`. |
| **6** | **Item owner** | Người tạo theo định dạng `domain\username` (mặc định `treecraft\username`); nếu không có thông tin hoặc user đã bị xóa thì hiển thị `[unknown]`. |

---

## 2. Checklist Công Việc

- [x] **Task 1: Mở rộng Model `Item`**
  - [x] Thêm trường `createdFrom` (ObjectId, ref: 'Item', default: null) vào `src/models/Item.js`.
  - [x] Cập nhật `itemService.duplicate` và `_recursiveDuplicate` để gán `createdFrom: sourceItem._id`.
- [x] **Task 2: Mở rộng `itemService` & Logic Truy Vấn Metadata**
  - [x] Viết hàm `itemService.getQuickInfo(itemOrId)`: gom dữ liệu 6 dòng song song tránh N+1.
  - [x] Tích hợp `quickInfo` vào `itemService.getItemWithRenderSchema` và `contentEditorController`.
- [x] **Task 3: Thiết Kế Giao Diện & CSS Variables**
  - [x] Bổ sung các biến CSS `--color-section-bar`, `--color-section-accent`, `--color-section-body-bg` vào `public/css/variables.css`.
  - [x] Thêm styles cho component `.sc-section-bar`, `.sc-quick-info` vào `public/css/components.css`.
- [x] **Task 4: Xây Dựng Reusable Partial `partials/quick-info.ejs`**
  - [x] Tạo file `src/views/partials/quick-info.ejs` dùng chung, render đúng 6 dòng theo ảnh mẫu.
  - [x] Hỗ trợ chevron toggle thu gọn/mở rộng, lưu trạng thái vào `localStorage` có bọc `try/catch`.
  - [x] Tạo liên kết mở Template trực tiếp trên Content Tree.
- [x] **Task 5: Tích Hợp Vào Mọi View Content Editor**
  - [x] Tích hợp vào `src/views/content-editor/item-form.ejs` (đặt ở đầu form, trước các accordion sections).
  - [x] Tích hợp vào `src/views/content-editor/template-workspace.ejs` / `tab-builder.ejs` (hiển thị khi chọn node Template).
- [x] **Task 6: Endpoint JSON API**
  - [x] Thêm route `GET /api/items/:id/quick-info` trả JSON, có xác thực `canPerform('item:read')`.
- [x] **Task 7: Kiểm Thử & Nghiệm Thu**
  - [x] Tạo test suite `tests/quickInfo.test.js`: kiểm tra đầy đủ 6 dòng cho Content, Template, Layout, Rendering, Media; kiểm tra fallback `[unknown]`; kiểm tra `createdFrom` khi duplicate; kiểm tra escape HTML.
  - [x] Chạy toàn bộ regression test suite (`npm test`) và linter (`npm run lint`).
- [x] **Task 8: Hoàn Thiện Tài Liệu**
  - [x] Cập nhật `docs/data-model/items-and-tree.md` (trường `createdFrom`).
  - [x] Ghi Decision Log `docs/decisions/DEC-037-quick-info-section-and-formatting.md`.
  - [x] Cập nhật `docs/phases/README.md`.
  - [x] Lập báo cáo nghiệm thu `docs/reports/phase-06-3-report.md`.

---

## 3. Definition of Done (DoD)
1. Mọi item trong cây khi click đều thấy section Quick Info xuất hiện ở đầu form (kể cả Content item, Template, Template Folder, Layout, Placeholder, Rendering, Media, System).
2. Đúng 6 dòng thông tin theo đúng thứ tự, căn lề và định dạng chuẩn: Item ID, Item name, Item path, Template, Created from, Item owner.
3. Giao diện bám sát ảnh mẫu: thanh tiêu đề xám đậm, vạch đỏ bên trái, chevron thu gọn, nền xám nhạt, hàng thoáng, copy ID/path nhanh.
4. Trạng thái thu gọn/mở rộng ghi nhớ chính xác theo user qua `localStorage`.
5. Duplicate/Copy gán đúng `createdFrom`; item tạo thủ công hiển thị `[unknown]`.
6. Liên kết Template mở đúng template node trong Content Tree.
7. 100% test suites pass, 0 ESLint warnings.
