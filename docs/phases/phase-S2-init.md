---
phase: S2
name: Lệnh Khởi Tạo Dự Án Mới (treecraft init)
depends_on: [S1]
status: Hoàn thành
start_date: 2026-11-13
end_date: 2026-11-13
lead: Senior Software Architect / Tech Lead
---

# GIAI ĐOẠN S2: LỆNH KHỞI TẠO DỰ ÁN MỚI (`treecraft init`)

## 1. MỤC TIÊU & TỔNG QUAN
Cung cấp lệnh CLI `treecraft init` (được gọi từ `core/bin/treecraft.js` hoặc alias npm) giúp người dùng và nhà phát triển khởi tạo một thư mục `site/` hoàn chỉnh từ một Starter Template (mặc định là `corporate`) một cách nhanh chóng, chuẩn xác và không cần can thiệp thủ công.
Lệnh này thay thế hoàn toàn cho logic `seed:sample` cũ, thiết lập cấu trúc thư mục dự án độc lập, sinh file cấu hình `site.config.js`, các file môi trường `.env*`, nạp cấu trúc cây dữ liệu và serialization ban đầu vào cơ sở dữ liệu.

---

## 2. BẢNG SO SÁNH HIỆN TRẠNG, THAY ĐỔI VÀ RỦI RO

| Hạng mục | Hiện trạng (Trước S2) | Sau khi có lệnh `treecraft init` | Rủi ro & Giải pháp phòng ngừa |
|:---|:---|:---|:---|
| **Khởi tạo dự án mới** | Clone toàn bộ repo monolith, phải xóa bớt code/view cũ thủ công. | Chạy lệnh `treecraft init <tên_site> --starter corporate`. Sinh ngay thư mục `site/` hoàn chỉnh. | Rủi ro ghi đè thư mục đang có dữ liệu. Giải pháp: Kiểm tra thư mục đích, chặn ghi đè trừ khi có cờ `--force`. |
| **Cấu hình ban đầu** | Sửa file `.env` và `branding.js` trực tiếp trong mã nguồn core. | CLI hỏi đáp tương tác (Interactive Prompts) hoặc nhận cờ để tự động sinh `site.config.js` và `.env*`. | Rủi ro cấu hình sai tên DB gây xung đột. Giải pháp: Validate tên DB, kiểm tra kết nối qua `dbGuard`. |
| **Dữ liệu mẫu (Sample Data)** | Script `src/scripts/seed-sample-site.js` ghi trực tiếp vào DB dựa trên view trong core. | Nạp dữ liệu từ Starter thông qua cơ chế YAML Sync của Serialization. Không can thiệp DB bằng code cứng. | Rủi ro lỗi tham chiếu UUID template. Giải pháp: Đồng bộ theo thứ tự chuẩn: Template → Layout/Rendering → Content. |
| **Script thực thi của dự án** | Phụ thuộc vào `package.json` đồ sộ của core. | `site/package.json` tối giản chỉ chứa các lệnh cơ bản: `npm start`, `npm run dev`, `npm run sync`. | Rủi ro không tìm thấy binary của core. Giải pháp: Script trỏ tương đối hoặc qua npm link / dependency. |

---

## 3. CHECKLIST CÔNG VIỆC CHI TIẾT (TASKS)

- [x] **Task S2.1: Thiết kế Luồng Tương tác của Lệnh `treecraft init`**
  - [x] Thiết kế tham số CLI:
    - `treecraft init [targetDir]`: Đường dẫn thư mục cần tạo site (mặc định là `./site`).
    - `--starter <name>`: Chọn starter mẫu (mặc định: `corporate`).
    - `--name <projectName>`: Tên hiển thị của dự án (ví dụ: "My Corporate Site").
    - `--root <rootName>`: Tên của node gốc (mặc định: "root").
    - `--db-prefix <prefix>`: Tiền tố tên MongoDB (ví dụ: `treecraft_corporate`).
    - `--lang <defaultLang>`: Ngôn ngữ mặc định (mặc định: `vi`).
    - `--force`: Ghi đè nếu thư mục đích đã tồn tại.
    - `--skip-db`: Chỉ tạo khung thư mục và file, bỏ qua bước khởi tạo cơ sở dữ liệu ban đầu.
  - [x] Hỗ trợ chế độ hỏi đáp tương tác (Interactive Prompt) nếu người dùng chạy lệnh không kèm tham số.

- [x] **Task S2.2: Triển khai Động cơ Tạo Khung Thư mục (Scaffolding Engine)**
  - [x] Sao chép nguyên vẹn cây thư mục từ `core/starter/<starter_name>/` sang thư mục đích:
    - `views/` (layouts, components, partials, errors)
    - `public/` (css, js, images)
    - `serialization/` (Templates, Layouts, Renderings, Placeholders, Contents)
    - Tạo thư mục rỗng `backups/` và `extensions/` kèm file `.gitkeep`.
  - [x] Thiết lập quyền hạn (permissions) chuẩn xác cho các file và thư mục được tạo ra.

- [x] **Task S2.3: Sinh File Cấu hình `site.config.js` Động**
  - [x] Dựa trên thông tin đầu vào, render file `site.config.js` tuân thủ 100% schema đã định nghĩa ở GĐ S1:
    - Gán `projectName`, `rootName`, `defaultLanguage`, `languages`.
    - Sinh tên database theo chuẩn E1: `mongoDbMaster: "${dbPrefix}_master"`, `mongoDbWeb: "${dbPrefix}_web"`.
    - Ghi nhận `starter: "corporate"` và `requiresCore: "^1.0.0"`.
  - [x] Đảm bảo định dạng code rõ ràng, có chú thích chi tiết cho từng trường cấu hình.

- [x] **Task S2.4: Sinh Các File Môi trường `.env*` và `.env.example`**
  - [x] Tạo file `site/.env.example` chuẩn hóa theo chuẩn GĐ E1.
  - [x] Tạo file `site/.env` (hoặc `.env.development`) với các giá trị cấu hình khởi tạo (PORT, MONGODB_URI local, CLOUDINARY credentials trống để người dùng điền).
  - [x] Tự động sinh `SESSION_SECRET` và `BACKUP_ENCRYPTION_KEY` ngẫu nhiên có độ dài chuẩn cryptographic (32 bytes Hex) để đảm bảo an toàn ngay từ đầu.

- [x] **Task S2.5: Khởi tạo Cơ sở Dữ liệu Ban đầu (Starter Sync Engine)**
  - [x] Khởi tạo kết nối MongoDB tới database mới của site.
  - [x] Chạy các migration nền tảng của core (khởi tạo Users, Roles, Languages, System Templates).
  - [x] Kích hoạt đồng bộ serialization từ `site/serialization/` để nạp các Templates, Layouts, Renderings và trang mẫu ban đầu (Home, About Us).
  - [x] Thiết lập tài khoản quản trị mặc định (`admin` / mật khẩu khởi tạo an toàn).

- [x] **Task S2.6: Sinh `site/package.json` và Hướng dẫn Vận hành**
  - [x] Tạo `site/package.json` nhẹ gọn với các script thuận tiện:
    ```json
    {
      "name": "my-site",
      "version": "1.0.0",
      "private": true,
      "scripts": {
        "dev": "treecraft dev",
        "start": "treecraft start",
        "doctor": "treecraft doctor",
        "sync": "treecraft sync",
        "backup": "treecraft backup"
      }
    }
    ```
  - [x] Tạo file `site/README.md` tóm tắt hướng dẫn phát triển cho lập trình viên dự án.

- [x] **Task S2.7: Xây dựng Bộ Kiểm tra Tính Toàn Vẹn `treecraft doctor`**
  - [x] Kiểm tra kết nối giữa Core và Site:
    - Tìm thấy `site.config.js` hợp lệ.
    - Kiểm tra `requiresCore` có tương thích với phiên bản Core đang chạy không.
    - Kiểm tra sự tồn tại của các thư mục bắt buộc: `views/`, `public/`, `serialization/`, `backups/`.
    - Kiểm tra cấu hình database trong `.env` và xác thực qua `dbGuard`.
  - [x] In báo cáo định dạng trực quan (màu xanh cho đạt, màu đỏ kèm hướng dẫn khắc phục cho lỗi).

- [x] **Task S2.8: Soạn Thảo Tài Liệu Hướng Dẫn `docs/guides/core-and-site.md`**
  - [x] Biên soạn tài liệu chi tiết bằng tiếng Việt theo chuẩn 7 mục bắt buộc:
    1. Mục đích / Khi nào sử dụng lệnh `treecraft init`.
    2. Điều kiện tiên quyết (Node.js, MongoDB, core).
    3. Các bước thực hiện đánh số kèm lệnh copy-paste (Windows CMD/PowerShell, Linux, macOS).
    4. Kết quả mong đợi trên màn hình và cấu trúc thư mục sinh ra.
    5. Cách kiểm tra thành công (chạy `treecraft doctor`, truy cập `/admin` và `/`).
    6. Các lỗi thường gặp và cách xử lý (sai tên DB, thiếu quyền ghi, port bị chiếm).
    7. Cảnh báo và rủi ro (lưu ý bảo mật file `.env`, không sửa mã nguồn trong `core/`).

---

## 4. DEFINITION OF DONE (DOD) CHO GIAI ĐOẠN S2
1. **Lệnh `treecraft init` Hoạt Động Trơn Tru:** Chạy `treecraft init` sinh ra một thư mục `site/` hoàn chỉnh, hợp lệ, có đầy đủ cấu hình và tài nguyên starter.
2. **Khởi động Thành công Dự án Mới:** Chạy `treecraft start` trỏ vào thư mục site vừa khởi tạo, website công khai hiển thị đầy đủ giao diện trang chủ mẫu tại `/`, trang Admin CMS truy cập bình thường tại `/admin`.
3. **Core Bất Biến 100%:** Trong suốt quá trình chạy `treecraft init`, không có bất kỳ file nào trong thư mục `core/` bị thay đổi, ghi đè hoặc sinh mới.
4. **Báo cáo Doctor Xanh 100%:** Lệnh `treecraft doctor` chạy trên site mới báo cáo tất cả các chỉ số đều đạt chuẩn (PASSED).
5. **Tài liệu Hướng dẫn Hoàn thiện:** File `docs/guides/core-and-site.md` đã sẵn sàng, đầy đủ 7 mục theo quy định.

