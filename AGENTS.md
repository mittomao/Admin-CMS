# AGENTS.md — HƯỚNG DẪN DÀNH CHO AI AGENT

## 1. DỰ ÁN TRONG 5 DÒNG
Hệ thống CMS quản trị nội dung phân cấp (Hierarchical Tree) theo triết lý **Sitecore Experience Management (XM)**: "Mọi thứ là Item" và tách biệt Master/Web. 
Backend và Website công khai chạy chung trong một ứng dụng monolithic **Node.js (v20+ LTS) + Express.js + EJS SSR (100% Server-Side Rendering) + MongoDB (Mongoose)** trên cổng 4000. 
Giao diện quản trị desktop-like (Launchpad, Content Editor 3 vùng, Ribbon, Fancytree, SortableJS, TinyMCE) tại `/admin`; Website công khai kết xuất HTML phía server tại `/`.
Quản lý bố cục Presentation (Layout, Rendering, Placeholders) và render trực tiếp thông qua các file view EJS trong repo.

## 2. QUY TẮC VÀNG (BẮT BUỘC TUÂN THỦ)
1. **Chỉ code khi có lệnh:** Chỉ được phép tạo/sửa code, cài thư viện hoặc chạy DB migration khi người dùng gửi đúng cú pháp: `APPROVE GĐ <số>` (ví dụ: `APPROVE GĐ 6`).
2. **Kỷ luật từng giai đoạn:** Mỗi lệnh phê duyệt chỉ thực hiện **đúng một giai đoạn duy nhất**; tuyệt đối không làm gộp hay làm trước giai đoạn tiếp theo.
3. **Không tự ý cài thêm package ngoài:** Phải hỏi ý kiến người dùng trước khi cài thêm bất kỳ thư viện bên ngoài nào chưa có trong kế hoạch.
4. **Dừng và hỏi ngay:** Khi gặp điểm chưa rõ, phát sinh mâu thuẫn hoặc lệch phạm vi, phải dừng lại hỏi ý kiến người dùng, không tự suy diễn.
5. **Kỷ luật checklist:** Hoàn thành task nào tick ngay `[x]` vào checklist của file phase tương ứng; hoàn thành giai đoạn phải kiểm tra DoD, cập nhật trạng thái `Hoàn thành` và báo cáo rồi dừng lại chờ duyệt.

## 3. TRẠNG THÁI HIỆN TẠI
- **Nguồn sự thật duy nhất (Single Source of Truth):** Xem bảng tiến độ chi tiết và sơ đồ phụ thuộc 13 giai đoạn (GĐ 0 → GĐ 12) tại [docs/phases/README.md](docs/phases/README.md).
- **Tóm tắt nhanh:** GĐ 0 (Bootstrap), GĐ 1 (Auth & Launchpad), GĐ 2 (Content Editor MVP), GĐ 3 (Template Manager), GĐ 4 (Version & Ngôn ngữ), GĐ 5 (Media Library), GĐ 6 (Presentation EJS), GĐ 6.2 (Rendering Component Template & Effective Fields) đã **Hoàn thành**. GĐ 7 đến GĐ 12 ở trạng thái **Chưa bắt đầu**.

## 4. QUY TRÌNH ĐỌC TÀI LIỆU CHO MỖI PHIÊN (BẮT BUỘC)
1. **Bước 1 (Khởi động phiên):** Luôn đọc tuần tự: `AGENTS.md` → [docs/rules/00-workflow.md](docs/rules/00-workflow.md) → [docs/phases/README.md](docs/phases/README.md).
2. **Bước 2 (Khi nhận lệnh `APPROVE GĐ n`):** Mở file kế hoạch giai đoạn tương ứng `docs/phases/phase-nn-*.md`. Đọc kỹ mục tiêu, phạm vi và **chỉ** đọc các file tài liệu được chỉ định trong mục "Tài liệu cần đọc trước".
3. **Bước 3 (Khi triển khai chi tiết):** Tra cứu cấu trúc collection tại [docs/data-model/](docs/data-model/) và các tiền lệ kỹ thuật tại [docs/decisions/](docs/decisions/) liên quan đến tác vụ đang làm.

## 5. BẢNG TÌM NHANH (CHEAT-SHEET)
| Muốn biết về | Đọc file |
| :--- | :--- |
| Quy trình APPROVE, cách tick task, định dạng báo cáo | [docs/rules/00-workflow.md](docs/rules/00-workflow.md) |
| Cấu trúc thư mục, quy ước đặt tên, phân tầng, AppError, logging | [docs/rules/03-conventions.md](docs/rules/03-conventions.md) |
| Định tuyến Admin (/admin) vs Public Site Renderer (/) | [docs/rules/04-routing.md](docs/rules/04-routing.md) |
| Bảo mật CSRF, sanitize-html, viewPath an toàn, ACL | [docs/rules/05-security.md](docs/rules/05-security.md) |
| Mô hình Item (Master/Web), Materialized Path, trường động | [docs/data-model/items-and-tree.md](docs/data-model/items-and-tree.md) |
| Kế thừa Template, Dynamic Standard Values, Insert Options | [docs/data-model/templates.md](docs/data-model/templates.md) |
| Cấu hình Presentation EJS, cây 3 nhánh, viewPath, Standard Presentation | [docs/data-model/presentation.md](docs/data-model/presentation.md) |
| Kế hoạch chi tiết của từng giai đoạn (GĐ 0 → 12) | `docs/phases/phase-XX-*.md` |
| Các quyết định kiến trúc đã chốt (DEC-001 → DEC-035) | [docs/decisions/README.md](docs/decisions/README.md) |
| Các câu hỏi kỹ thuật còn mở kèm đề xuất mặc định | [docs/open-questions.md](docs/open-questions.md) |
| Bản sao lưu gốc ban đầu (chỉ để tra cứu lịch sử) | [docs/archive/AGENTS.original.md](docs/archive/AGENTS.original.md) |

## 6. QUY TẮC BẢO TRÌ TÀI LIỆU
- **Checklist công việc:** Tick `[x]` trực tiếp trong file giai đoạn `docs/phases/phase-XX-*.md` khi hoàn thành từng task.
- **Tiến độ giai đoạn:** Cập nhật trạng thái (`Đang thực hiện` / `Hoàn thành`) và ngày hoàn thành duy nhất tại [docs/phases/README.md](docs/phases/README.md).
- **Quyết định kỹ thuật mới:** Nếu phát sinh quyết định kiến trúc mới trong quá trình thực hiện, tạo file `docs/decisions/DEC-XXX-<slug>.md` và cập nhật mục lục tại [docs/decisions/README.md](docs/decisions/README.md).
- **Báo cáo kết thúc giai đoạn:** Soạn thảo báo cáo nghiệm thu tại `docs/reports/phase-XX-report.md` theo mẫu chuẩn trước khi dừng lại chờ lệnh duyệt tiếp theo.
