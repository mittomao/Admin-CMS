# DEC-040: Triển khai Giai đoạn 10 (Site Renderer) Trước Giai đoạn 7 (ACL) và Giai đoạn 9 (Recycle Bin & Audit)

- **Ngày quyết định:** 2026-11-07
- **Giai đoạn liên quan:** GĐ 10 (Site Renderer), GĐ 7 (Bảo mật ACL), GĐ 9 (Recycle Bin & Audit Log)
- **Trạng thái:** Đã chốt (Accepted)
- **Người đề xuất:** Tech Lead / User Architecture Command

---

## 1. Bối cảnh
Theo lộ trình ban đầu, GĐ 7 (Phân quyền ACL theo Item) và GĐ 9 (Recycle Bin & Audit Log) được xếp lịch trước GĐ 10 (Public Site Renderer). Tuy nhiên, sau khi hoàn thành GĐ 8 (Publishing Engine chuyển dữ liệu sang `items_web`), toàn bộ dữ liệu cần thiết cho việc kết xuất trang web công khai (Page, Presentation, Layout, Component, Media) đã sẵn sàng trên kho `Web`.

Người dùng/Chủ đầu tư yêu cầu kích hoạt **Giai đoạn 10 trước GĐ 7 và GĐ 9** để sớm chạy được một trang web mẫu (sample website) hoàn chỉnh từ đầu đến cuối trên cổng 4000 (`http://localhost:4000/` và `http://localhost:4000/about-us`), phục vụ kiểm thử trải nghiệm người dùng thực tế và thẩm định kiến trúc SSR EJS.

## 2. Quyết định
1. **Phê duyệt triển khai GĐ 10 trước GĐ 7 và GĐ 9:**
   - Tiến hành phát triển Site Renderer kết xuất trực tiếp HTML SSR từ collection `items_web`.
   - Giữ nguyên số thứ tự của các giai đoạn (không đánh lại số).
2. **Nguyên tắc bảo vệ an toàn định tuyến và phân quyền:**
   - **Tách biệt định tuyến:** Route công khai gắn sau `/admin`, `/api`, `/media`, `/health`. Tuyệt đối không để route catch-all `/*` của site che lấp hoặc xung đột với các route quản trị và API.
   - **Route Preview Admin (`/admin/preview`):** Dùng chung `siteRenderer` với dữ liệu Master, yêu cầu đăng nhập và kiểm tra quyền thông qua `itemService.canPerform(user, item, 'item:read')`, không kiểm tra role cứng.
   - **Bảo mật viewPath:** Whitelist nghiêm ngặt `src/views/site/`, chặn tuyệt đối path traversal và tệp không phải `.ejs`.
3. **Phần việc phải bổ sung ở các giai đoạn sau:**
   - **Giai đoạn 7 (Bảo mật ACL):** Cấu hình quyền truy cập nâng cao cho route `/admin/preview` theo từng item/nhánh nội dung.
   - **Giai đoạn 9 (Recycle Bin & Audit Log):** Bổ sung cơ chế chặn/cảnh báo xóa các Layout, Rendering, Placeholder, Datasource đang được các trang web tham chiếu trong Presentation; ghi nhật ký kiểm toán cho thao tác Publish/Presentation; dọn dẹp Web store (`cleanupWeb`) khi xóa vĩnh viễn (purge).

## 3. Hệ quả
- Lộ trình phụ thuộc được cập nhật: GĐ 10 phụ thuộc vào `[6, 8]` (không còn phụ thuộc GĐ 7, 9).
- Hệ thống sớm có sản phẩm chạy được thực tế (working sample website) từ trang chủ `/` đến các trang con `/about-us`.

