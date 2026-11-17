# DEC-058: Cơ chế Bảo toàn 100% Đồng nhất Cây Nội dung (Parity) và Starter Snapshot

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Khi một dự án mới được khởi tạo bằng `node core/bin/treecraft.js init`, người dùng kỳ vọng ngay sau khi gõ `npm run dev` và truy cập `/admin`, cây nội dung (`items_master`) của dự án phải **hoàn toàn giống với môi trường hiện tại của Core**:
- Đúng cấu trúc 6 nhánh: `/root`, `/root/content`, `/root/layout`, `/root/media library`, `/root/system`, `/root/templates`.
- Đúng các Template thành phần (`Feature/Components/HeroBanner`, `ImageText`, `Introduction`, `carousel-item`, ...).
- Đúng các Presentation Renderings, Layouts, Placeholders.
- Đúng các trang mẫu (`Home`, `about-us`) với cấu hình Presentation và nội dung mẫu.
- Giữ nguyên các `_id` bất biến để các liên kết templateId, layoutId, renderingId không bị đứt gãy.

Trước đây, dữ liệu mẫu nằm rải rác giữa các script seed (`seed-initial-data.js`, `seed-presentation-data.js`, `seed-sample-site.js`) và một phần trong thư mục `Serialization/`, dẫn đến nguy cơ lệch ID hoặc mất đồng nhất khi chạy trên DB mới.

## Quyết định
1. **Phân Định Rõ Hai Nguồn Cấp Dữ Liệu:**
   - **Nguồn 1: Core System Seed (`core/src/scripts/seed-initial-data.js`):**
     - Chịu trách nhiệm tạo khung sườn hệ thống với các `_id` cố định bất biến (deterministic ObjectId):
       - 5 root branches (`/root`, `content`, `layout`, `media library`, `system`, `templates`).
       - 13 System Templates (`/root/templates/System/**`).
       - 1 System Languages folder (`/root/system/Languages`).
       - Roles, Admin user ban đầu, Launchpad apps, Default Language (`vi`).
   - **Nguồn 2: Starter Site Serialization (`core/starter/corporate/serialization/`):**
     - Đóng gói toàn bộ các định nghĩa Template nghiệp vụ (`Feature`, `Project`, `Common`), Presentation (`Layouts`, `Renderings`, `Placeholders`) và Content (`Home`, `about-us`) dưới dạng các tệp YAML chuẩn (DEC-053, DEC-054, DEC-055).
     - Khi `init`, hệ thống tự động copy starter này vào `<SITE_DIR>/serialization/` và thực thi Sync (nguyên vẹn `_id` từ YAML).
2. **Snapshot Manifest Chuẩn Hoá:**
   - Tạo lệnh `npm run tree:snapshot` trong Core để kết xuất toàn bộ hiện trạng của `items_master` thành tệp `core/starter/corporate/tree.manifest.json`.
   - Manifest chứa danh sách toàn bộ các node, path, ID, templateId, SHA-256 hash của fields và presentation settings.
3. **Công Cụ So Sánh Đối Soát `npm run tree:compare`:**
   - Cung cấp CLI tool để đối soát cây nội dung giữa 2 nguồn bất kỳ (giữa DB mới và Snapshot manifest, hoặc giữa 2 DB):
     ```bash
     npm run tree:compare -- --a core/starter/corporate/tree.manifest.json --b mongodb://127.0.0.1:27017/treecraft_corporate
     ```
   - Trả về mã thoát `0` (Parity 100%) hoặc bảng thống kê các sai khác (Missing / Extra / Modified properties).

## Hệ quả
- **Tích cực:**
  - Đảm bảo 100% tính lặp lại (reproducibility) khi tạo dự án mới: `init` là chạy được ngay, không phụ thuộc vào thao tác thủ công.
  - Tách bạch rõ: Những gì thuộc về nền tảng CMS nằm ở System Seed; những gì thuộc về giao diện/nội dung website mẫu nằm ở Starter Serialization YAML.
  - Cung cấp công cụ kiểm thử tự động (automated parity verification) cho CI/CD.

