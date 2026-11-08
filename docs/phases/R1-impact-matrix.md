# BẢNG PHẠM VI ẢNH HƯỞNG (R1 - IMPACT MATRIX)
## Kế hoạch Rebrand "Treecraft" & Đổi Root Item `/root` → `/root`

Tài liệu này đánh giá chi tiết phạm vi tác động, mức độ rủi ro, hiện trạng và hành động tương ứng cho từng thành phần trong toàn bộ hệ sinh thái codebase và cơ sở dữ liệu dựa trên kết quả rà soát thực tế.

---

## 1. Bảng Tổng hợp Số liệu Thống kê Toàn hệ thống

| Chỉ số Thống kê | Số lượng / Giá trị thực tế | Ghi chú |
| :--- | :--- | :--- |
| **Tổng số tệp quét (loại trừ `node_modules`, `.git`, `archive`)** | 368 tệp | Quét toàn bộ repo |
| **Số lần xuất hiện từ khóa `sitecore` (không phân biệt hoa thường)** | 1.274 lần | Rải rác trên 177 tệp |
| **Số lần xuất hiện đường dẫn `/root/` hoặc `/root`** | 791 lần | Nằm trong 116 tệp mã nguồn, test, tài liệu |
| **Số lần xuất hiện cú pháp domain `treecraft\`** | 12 lần | Trên 8 tệp (auth, quick info, seed, test) |
| **Số lần xuất hiện cụm `Sitecore Experience`** | 18 lần | Trên 15 tệp giao diện topbar, taskbar, login, footer |
| **Số lần xuất hiện `AdminCMS`** | 67 lần | Trên 17 tệp (Cloudinary mapper, config, seed) |
| **Số lần xuất hiện từ `root` (từ đơn độc lập)** | 196 lần | Trên 58 tệp (cần kiểm tra va chạm biến/hàm) |
| **Số Item trong Master (`items_master`)** | 72 items | 100% (72/72) có `path` bắt đầu bằng `/root` |
| **Số Item trong Web (`items_web`)** | 53 items | 100% (53/53) có `path` bắt đầu bằng `/root` |
| **Số Template trong `templates`** | 24 templates | 100% (24/24) có `path` bắt đầu bằng `/root` |
| **Độ dài path lớn nhất trong DB** | 104 ký tự | `/root/media library/test/mazda-cx-5-2026-100-7127...` |
| **Số bản ghi ACL (`access_control_lists`)** | 55 bản ghi | Lưu theo `itemId: ObjectId`, không chứa chuỗi path |
| **Số bản ghi Lịch sử Workflow (`workflow_histories`)** | 11 bản ghi | Lưu theo `itemId: ObjectId` |
| **Số bản ghi Lịch sử Xuất bản (`publish_histories`)** | 13 bản ghi | Mảng `logDetails` chứa chuỗi path `/root/...` |
| **Số phiên đăng nhập hoạt động (`sessions`)** | 3 sessions | Lưu cookie `cms_session_id` |

---

## 2. Ma trận Tác động Chi tiết theo Khu vực (Detailed Impact Matrix)

| Khu vực | Thành phần cụ thể | Số lần xuất hiện / Số bản ghi | Hiện trạng thực tế | Hành động đề xuất | Mức rủi ro | Cách kiểm chứng |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **1. Dữ liệu Master và Web** | Item gốc (Root Item) | 2 bản ghi (1 Master, 1 Web) | `name: "sitecore"`, `path: "/root"`, `_id: 6ae95cc6b1e541e051fd4162` | Đổi `name: "root"`, `path: "/root"`, **giữ nguyên `_id`** | **Cao** | Truy vấn `Item.findOne({ parentId: null })` kiểm tra path và name |
| | Cây Item Master (`items_master`) | 72 bản ghi | Toàn bộ `path` bắt đầu bằng `/root/...` | Migration cập nhật tiền tố `^/sitecore` &rarr; `/root` | **Cao** | Chạy dry-run, đếm `countDocuments({ path: /^\/root/i }) === 0` |
| | Cây Item Web (`items_web`) | 53 bản ghi | Toàn bộ `path` bắt đầu bằng `/root/...` | Migration cập nhật tiền tố `^/sitecore` &rarr; `/root` đồng bộ | **Cao** | So sánh diff Master vs Web; Site Resolver không bị 404 |
| | Cây Template (`templates`) | 24 bản ghi | `path: "/root/templates/..."` | Migration cập nhật `path` &rarr; `/root/templates/...` | **Trung bình** | Template Manager nạp đủ danh sách, `resolveTemplate` chuẩn |
| | Index `path_1` trên Master & Web | 2 indexes | Index B-Tree theo chuỗi path | Rebuild index sau khi bulk update path | **Trung bình** | `db.collection.getIndexes()` và `explain("executionStats")` |
| | Trang chủ (`SITE_START_ITEM`) | 1 cấu hình | Mặc định `/root/content/Home` | Đổi sang `/root/content/Home` qua `branding.PATHS.START_ITEM` | **Cao** | Truy cập `GET /` render đúng trang Home, không bị 404 |
| **2. Collection khác** | Phân quyền ACL (`access_control_lists`) | 55 bản ghi | Liên kết bằng `itemId: ObjectId`, `principalId: ObjectId` | **Giữ nguyên 100%**, không cần sửa đổi dữ liệu DB vì không lưu path | **Thấp** | Kiểm tra quyền `canPerform` sau khi đổi path item |
| | Lịch sử Workflow (`workflow_histories`) | 11 bản ghi | Lưu `itemId: ObjectId`, `fromState`, `toState` | **Giữ nguyên**, không chứa path | **Thấp** | Mở modal Workflow History trong Content Editor |
| | Lịch sử Publish (`publish_histories`) | 13 bản ghi | Mảng `logDetails[].path` lưu chuỗi `/root/...` cũ | **Giữ nguyên làm audit log lịch sử** (hoặc migration cập nhật chuỗi) | **Thấp** | Xem bảng lịch sử xuất bản trong Publish Manager |
| | Job xuất bản (`publish_jobs`) | 7 bản ghi | Lưu `rootItemId: ObjectId` | **Giữ nguyên** | **Thấp** | Kiểm tra hàng đợi publish queue |
| | Danh mục ứng dụng (`launchpad_apps`) | 14 bản ghi | Các URL đã trỏ tới route chuẩn (sau fix Phase 7) | **Giữ nguyên** | **Thấp** | Launchpad hiển thị đủ 14 ứng dụng click được |
| | Domain người dùng (`domains`) | 1 bản ghi | `{ name: "sitecore", isDefault: true }` | Cập nhật `name: "treecraft"` (kèm migration) | **Trung bình** | Đăng nhập tài khoản admin với domain mới |
| | Phiên làm việc (`sessions`) | 3 bản ghi | Cookie lưu `cms_session_id` | Xóa/thay thế bằng `treecraft_session_id` (chấp nhận login lại) | **Thấp** | Đăng nhập lại thành công, session mới được ghi vào DB |
| **3. Seed, Migration cũ & Test** | Seed chính (`src/scripts/seed-initial-data.js`) | 102 occurrences | Hard-code chuỗi `/root/...` | Chuyển sang dùng hằng số `branding.PATHS.*` | **Cao** | Chạy seed trên DB sạch dựng thành công cây `/root` |
| | Seed Presentation (`seed-presentation-data.js`) | 84 occurrences | Hard-code `/root/layout/...`, `/root/templates/...` | Chuyển sang dùng hằng số `branding.PATHS.*` | **Cao** | Chạy seed presentation liên kết chính xác Layout/Rendering |
| | Seed Sample Site (`seed-sample-site.js`) | 28 occurrences | Hard-code `/root/content/Home` | Chuyển sang dùng `branding.PATHS.START_ITEM` | **Trung bình** | Render site mẫu EJS hoạt động bình thường |
| | Đồng bộ Template (`sync-system-templates.js`) | 32 occurrences | Hard-code `/root/templates/System/...` | Chuyển sang dùng `branding.PATHS.TEMPLATES` | **Trung bình** | Chạy script sync không báo lỗi |
| | Migration cũ (GĐ 0 &rarr; 8.1) | 9 tệp migration | Chứa chuỗi `/root` lịch sử | **Giữ bất biến (Immutable)**; thêm migration R1 riêng | **Thấp** | Không chạy lại migration cũ trên DB đã nâng cấp |
| | Bộ kiểm thử (`tests/`) | 24 tệp, 244 occurrences | Khởi tạo mock tree `/root/...` | Cập nhật đồng loạt sang `ROOT_PATH` hoặc helper | **Cao** | Chạy `npm test` xanh 100% (305+ test cases) |
| **4. Mapper & Hằng số** | Media Path Mapper (`src/utils/mediaPathMapper.js`) | 5 occurrences | `ROOT_MEDIA_PATH = '/root/media library'` | Đổi thành `branding.PATHS.MEDIA` (`/root/media library`) | **Cao** | Upload ảnh mới, reverse sync Cloudinary, map URL |
| | Site Resolver (`src/services/siteResolver.js`) | 12 occurrences | Prefix candidate `/root/content/...` | Đổi thành `branding.PATHS.CONTENT + '/...'` | **Cao** | Test truy cập URL công khai `/`, `/about-us`, `/hotels` |
| | Item Service (`src/services/itemService.js`) | 18 occurrences | `PROTECTED_PATHS`, `getRoot()`, tree rules | Hằng số hóa bằng `branding.PATHS.*` | **Cao** | Ngăn xóa node `/root`, `/root/content`, `/root/layout` |
| | Template Service (`src/services/templateService.js`) | 16 occurrences | Rule Component Template `/root/templates/...` | Chuyển sang `branding.PATHS.TEMPLATES` | **Cao** | Insert Options & Component Template validation |
| | Presentation Service (`src/services/presentationService.js`) | 14 occurrences | Layout `/root/layout/Layouts`, Renderings | Chuyển sang `branding.PATHS.LAYOUT` | **Cao** | Lưu/gán presentation details không bị lỗi validation |
| | ACL Service (`src/services/aclService.js`) | 1 occurrence | `isLayoutTree = startsWith('/root/layout')` | Chuyển sang `startsWith(branding.PATHS.LAYOUT)` | **Trung bình** | Developer role có quyền ghi trên nhánh layout |
| | Icon Registry (`src/config/icons.js`, `public/js/admin/icons.js`) | 22 occurrences | Rule gán icon theo đường dẫn `/root/...` | Cập nhật rule đường dẫn sang `/root/...` | **Thấp** | Cây Content Editor hiển thị đúng icon đặc thù cho từng nhánh |
| **5. Cú pháp Cấu hình** | Source của Field Template (`Template.sections.fields.source`) | 1 bản ghi trong DB | `source: '/root/templates/Feature/Components'` | Migration đổi chuỗi `source` sang `/root/...` | **Trung bình** | Trường `componentTemplate` trong form Rendering hoạt động |
| | Whitelist `viewPath` | Nhiều tệp EJS | Đường dẫn file trên ổ đĩa `src/views/site/...` | **Giữ nguyên** (không liên quan đến path cây Item) | **Thấp** | Component EJS render bình thường |
| **6. Giao diện (UI)** | Topbar Header (`src/views/partials/topbar.ejs`) | 2 occurrences | Chữ "Sitecore" và link logo | Đổi thành "Treecraft" kèm icon cây | **Thấp** | Kiểm tra trực quan trên trình duyệt |
| | Trang đăng nhập (`src/views/admin/auth/login.ejs`) | 2 occurrences | "Treecraft Experience Management" | Đổi thành "Treecraft Content Management" | **Thấp** | Trang `/admin/login` hiển thị thương hiệu mới |
| | Thẻ `<title>` (`src/views/partials/head.ejs`, `404.ejs`, ...) | 6 tệp | "... - Treecraft Experience Management" | Đổi thành "... - Treecraft CMS" | **Thấp** | Title hiển thị đúng trên tab trình duyệt |
| | Cây Content Editor (`public/js/admin/content-editor.js`) | 14 occurrences | `PROTECTED_PATHS`, kiểm tra nhánh content/layout | Cập nhật sang `/root/...` | **Cao** | Cây Fancytree hiển thị node gốc tên "root", dnd5 chuẩn |
| | Quick Info (`src/views/partials/quick-info.ejs`) | 2 occurrences | Label và format | Giữ format, cập nhật mẫu hiển thị path `/root/...` | **Thấp** | Quick Info hiển thị đúng path bắt đầu bằng `/root` |
| **7. Domain & User** | Domain người dùng | 3 users (`admin`, `editor`, `author`) | `domain: "sitecore"`, hiển thị `treecraft\admin` | Migration đổi sang `domain: "treecraft"` | **Trung bình** | Đăng nhập thành công, Quick Info hiển thị `treecraft\admin` |
| **8. Hạ tầng (Infra)** | Tên Cookie Session (`src/config/env.js`, `session.js`) | 2 tệp | `SESSION_NAME = 'cms_session_id'` | Đổi thành `SESSION_NAME = 'treecraft_session_id'` | **Thấp** | Cookie mới được thiết lập trên trình duyệt |
| | Tiền tố Logger (`src/utils/logger.js`) | Nhiều nơi | Log chung | Bổ sung prefix `[Treecraft]` | **Thấp** | Log terminal hiển thị rõ ràng |
| | Biến môi trường (`.env.example`) | 1 tệp | `APP_NAME="Treecraft CMS"`, `SITE_START_ITEM` | Đổi thành `APP_NAME="Treecraft CMS"`, `SITE_START_ITEM="/root/content/Home"` | **Thấp** | File env mẫu đồng bộ thương hiệu mới |
| **9. Thư viện & Gói** | Thông tin dự án (`package.json`) | 1 tệp | `name: "admin-cms"`, `description: "Treecraft..."` | Đổi thành `name: "treecraft"`, `description: "Treecraft CMS..."` | **Thấp** | `npm test` và các scripts chạy bình thường |
| **10. Tài liệu (Docs)** | `AGENTS.md` | 1 tệp | Mô tả dự án và bảng cheat-sheet | Cập nhật định danh Treecraft & root path | **Trung bình** | AI Agent đọc đúng quy tắc mới |
| | Các file quy tắc (`docs/rules/*`) | 5 tệp | Đề cập `Sitecore`, `/root/...` | Cập nhật đường dẫn mẫu sang `/root/...` | **Thấp** | Tài liệu quy chuẩn đồng bộ |
| | File quyết định cũ (`docs/decisions/DEC-*`) | 42 tệp | Chứa tài liệu lịch sử | **Giữ nguyên**, chỉ ghi chú cập nhật ở DEC-043 | **Thấp** | Bảo toàn tính toàn vẹn lịch sử quyết định |
| **11. Site Công khai** | Public Site Controller (`src/controllers/site/siteController.js`) | 2 occurrences | Regex sitemap `/^\/treecraft\/content/i` | Đổi thành `/^\/root\/content/i` qua hằng số | **Cao** | Truy cập `/sitemap.xml` sinh đúng URL các trang |
| | Public Site Views (`src/views/site/partials/header.ejs`, `footer.ejs`) | 4 tệp | Chữ "Treecraft" mẫu trên header/footer | Đổi thành "Treecraft" | **Thấp** | Trang chủ `http://localhost:4000/` hiển thị Treecraft |
| **12. Dịch vụ Bên ngoài** | Thư mục Cloudinary | Cloud service | Thư mục `AdminCMS` trên cloud | **Giữ nguyên 100%**, không đổi tên trên cloud | **Thấp** | Ảnh đã upload vẫn load bình thường qua CDN |
| | Rich Text HTML trong nội dung | Dữ liệu field | Chứa link ảnh Cloudinary hoặc link nội bộ | **Giữ nguyên** CDN link; migration sửa link nội bộ (nếu có) | **Trung bình** | Bài viết hiển thị đủ ảnh và liên kết |

---

## 3. Phân tích Va chạm với Từ khóa "root" (Collision Analysis)

Từ khóa `root` là một danh từ rất phổ biến trong lập trình và cấu trúc cây. Quá trình thay thế tuyệt đối **không được dùng regex Replace All mù quáng**. Kết quả rà soát phát hiện các điểm va chạm cần phân biệt:

| Dạng xuất hiện | Số lượng | Ngữ cảnh hiện tại | Xử lý trong R1 | Rủi ro nếu replace ẩu |
| :--- | :---: | :--- | :--- | :--- |
| **Đường dẫn `/root` &rarr; `/root`** | 791 | Đường dẫn phân cấp CMS Item | **Đổi** sang `/root` bằng hằng số `branding.PATHS.ROOT` | Nếu regex sai sẽ đổi nhầm `root` trong Linux/OS |
| **`getRoot(db)`** | 11 | Hàm lấy root item của CMS trong `itemService.js` | **Giữ nguyên tên hàm**, sửa nội dung bên trong tìm `path: branding.PATHS.ROOT` | Đổi tên hàm làm hỏng chữ ký API nội bộ |
| **`rootItem` / `rootNode`** | 107 | Tên biến cục bộ đại diện cho node gốc trong controller/test | **Giữ nguyên tên biến** | Gây lỗi cú pháp JavaScript nếu đổi nhầm |
| **`isRoot`** | 10 | Cờ boolean kiểm tra một item có phải là root hay không | **Giữ nguyên tên thuộc tính** | Gây sai lệch logic kiểm tra node hệ thống |
| **CSS `:root`** | 1 | Bộ chọn CSS biến toàn cục (`public/css/...`) | **Tuyệt đối giữ nguyên** | Phá hỏng toàn bộ CSS stylesheet giao diện |
| **`--root=`** | 1 | Tham số CLI trong `sync-cloudinary-media.js` | **Giữ nguyên tên flag CLI** | Làm gãy script sync Cloudinary |
| **`rootFolder`** | 6 | Thuộc tính thư mục gốc Cloudinary (`AdminCMS`) | **Giữ nguyên tên biến** | Gãy cấu hình Cloudinary Storage Provider |
| **`root=` trong cú pháp Source** | 0 | Chưa có source nào dùng cú pháp `root=` | Sẽ dùng chuẩn `root=/root/...` nếu có | Không bị va chạm |

---

## 4. Kết luận & Đánh giá Rủi ro Tổng thể

- **Phạm vi tác động:** Toàn diện nhưng có cấu trúc rõ ràng. Phần lõi là việc **chuyển đổi từ chuỗi cứng (Hard-coded strings) sang Hằng số hóa tập trung (`branding.js`)**.
- **Khối lượng dữ liệu cần chuyển dịch:** Tương đối nhỏ và gọn gàng (72 items Master, 53 items Web, 24 templates, 3 users, 1 domain).
- **Tính khả thi của Migration:** Cực kỳ cao. Toàn bộ quá trình migration trên MongoDB Atlas có thể hoàn thành trong dưới 5 giây nếu chạy bulk operations theo transaction hoặc sequential batch.
- **Biện pháp then chốt:** Tuyệt đối không hard-code chuỗi `/root` mới, mà phải đưa vào `branding.js` ngay từ bước đầu tiên để đảm bảo tính duy nhất và khả năng mở rộng lâu dài.

