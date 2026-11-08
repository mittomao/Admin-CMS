# DEC-024: Quản lý Layout/Rendering như Item Hệ thống

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 6 (Presentation)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Khi phát triển tính năng quản trị Presentation (Layout, Rendering, Device, Placeholder Settings), có hai lựa chọn kiến trúc:
1. Xây dựng các trang quản trị độc lập riêng biệt (ví dụ tạo các controller/view riêng cho Layout Manager, Rendering Manager).
2. Lưu trữ toàn bộ các cấu hình này thành các Node Item trong Cây nội dung dưới nhánh `/root/layout/*`, kế thừa triết lý Treecraft "Mọi thứ là Item" (Everything is an Item).

## 2. Quyết định
Chọn phương án 2: **Quản lý Layout, Rendering, Device, Placeholder Settings hoàn toàn dưới dạng các Item hệ thống trong Cây nội dung Content Editor**:
- Định nghĩa các System Template chuẩn: `Layout`, `Rendering`, `Placeholder Settings`, `Device`.
- Lưu trữ dưới nhánh cây `/root/layout/`:
  - `/root/layout/Devices`
  - `/root/layout/Layouts`
  - `/root/layout/Renderings`
  - `/root/layout/Placeholder Settings`
- Biên tập viên và developer quản lý các thực thể này bằng chính form soạn thảo tiêu chuẩn của Content Editor.
- Không cần thêm tile riêng trên Launchpad; việc gắn Presentation Details vào Item được thực hiện qua tab Ribbon `Presentation` trong Content Editor.

## 3. Hệ quả & Lưu ý kỹ thuật
- **Tối ưu mã nguồn:** Tái sử dụng 100% cơ sở hạ tầng đã có của Content Editor (Fancytree, CRUD, ACL, Workflow, Audit Log) mà không phải viết thêm một dòng mã UI quản trị nào riêng.
- **Tính nhất quán:** Tuân thủ triệt để triết lý thiết kế của Treecraft, tạo sự thống nhất cao độ trong toàn bộ mô hình dữ liệu hệ thống.

