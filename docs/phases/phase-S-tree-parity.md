---
phase: S-Parity
name: Bảo toàn Đồng nhất Cây Nội dung (Content Tree Parity) & Snapshot Starter
status: Hoàn thành
depends_on: [S]
estimate: 1-2 ngày làm việc
started: 2026-11-17
completed: 2026-11-17
updated: 2026-11-17
---

# GĐ S-Parity - Bảo toàn Đồng nhất Cây Nội dung & Snapshot Starter

> Đảm bảo rằng sau khi thực hiện lệnh `init` trên một dự án mới hoàn toàn, cây nội dung (`items_master`) trong database của dự án phải khớp 100% với cây nội dung hiện tại của Core repo: cùng `_id`, cùng đường dẫn `path`, cùng `templateId`, cùng `sortOrder`, cùng cấu hình Presentation và các trường dữ liệu mẫu.

---

## 1. Mục tiêu Chi tiết

1. **Chuẩn Hoá Nguồn Khởi Tạo (Source Separation):**
   - **Core System Seed:** Sinh 5 node gốc, 13 System Templates, System Languages với ID xác định cố định (deterministic IDs).
   - **Starter Serialization:** Đóng gói toàn bộ các Template thành phần, Presentation items và Content pages thành bộ YAML mẫu đặt tại `core/starter/corporate/serialization/`.
2. **Công Cụ Chụp Ảnh Cây Nội Dung (`npm run tree:snapshot`):**
   - Xuất toàn bộ trạng thái hiện tại của `items_master` thành `core/starter/corporate/tree.manifest.json`.
   - Mỗi item bao gồm: `id`, `path`, `name`, `templateId`, `sortOrder`, `hasPresentation`, hash của `fields` và `sharedFields`.
3. **Công Cụ So Sánh Đối Soát (`npm run tree:compare`):**
   - So sánh giữa Snapshot manifest với một database đang chạy, hoặc giữa 2 connection URIs.
   - Trả về mã lỗi 0 nếu 100% khớp, hoặc hiển thị rõ:
     - Nodes bị thiếu (Missing).
     - Nodes thừa (Extra).
     - Thuộc tính sai lệch (Different: name, templateId, sortOrder, fields, presentation).
4. **Kiểm Thử Tự Động Độ Đồng Nhất (Parity Invariant Test):**
   - Tạo test suite `tests/treeParity.test.js` kiểm tra độ khớp của dữ liệu sau khi thực hiện lệnh `init`.

---

## 2. Checklist Triển khai

- [x] Hoàn thiện starter YAML tại `core/starter/corporate/serialization/` gồm đầy đủ các sections: `Templates`, `Layouts`, `Renderings`, `Placeholders`, `Contents`.
- [x] Xây dựng script `src/scripts/tree-snapshot.js` (CLI: `npm run tree:snapshot`).
- [x] Xây dựng script `src/scripts/tree-compare.js` (CLI: `npm run tree:compare`).
- [x] Tạo tệp baseline `core/starter/corporate/tree.manifest.json`.
- [x] Viết test tự động `tests/treeParity.test.js` đối soát snapshot với database hiện tại.

