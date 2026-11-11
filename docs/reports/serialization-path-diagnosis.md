# BÁO CÁO CHẨN ĐOÁN: HIỆN TRẠNG VÀ NGUYÊN NHÂN LẶP ĐƯỜNG DẪN SERIALIZATION

- **Ngày chẩn đoán:** 2026-11-11
- **Mã báo cáo:** `DIAG-SERIALIZATION-PATH-01`
- **Phạm vi:** Cơ chế định danh đường dẫn và lưu trữ tệp YAML Serialization (GĐ 11-Y, GĐ 11-Y2)
- **Tài liệu liên quan:** [`docs/decisions/DEC-053-section-based-yaml-serialization-and-sync.md`](../decisions/DEC-053-section-based-yaml-serialization-and-sync.md), [`docs/guides/serialization.md`](../guides/serialization.md)

---

## 1. Hiện trạng ghi nhận

Trong quá trình sử dụng và kiểm thử tính năng YAML Sync theo section, đường dẫn tệp trên hệ thống tệp đĩa xuất hiện hiện tượng lồng nhau quá sâu và lặp lại nhiều lần, có dạng:
```
data\data\serialization\items\templates\items\templates\...
```
Cấu trúc này làm đường dẫn tệp trở nên cồng kềnh, khó duyệt bằng mắt thường, và đặc biệt tiềm ẩn rủi ro chạm trần độ dài đường dẫn Windows (`MAX_PATH = 260` ký tự).

---

## 2. Nguyên nhân chi tiết của từng lớp lặp

Qua rà soát mã nguồn tại `src/config/serializationPaths.js`, `src/config/serializationSections.js`, `src/services/yamlSectionService.js`, các file môi trường `.env*` và các bộ test, chúng tôi xác định được căn nguyên kỹ thuật của từng lớp lặp như sau:

### (1) Lớp lặp 1: `data/data` (Xung đột Resolve và Giá trị Mặc định)
- **Căn nguyên 1 - Gán cứng `data/` trong giá trị mặc định:**
  Tại `src/config/serializationPaths.js`:
  ```javascript
  const DEFAULT_SERIALIZATION_DIR = path.join(PROJECT_ROOT, 'data/serialization');
  function getSerializationDir() {
    const envDir = process.env.SERIALIZATION_DIR;
    const resolvedDir = envDir ? path.resolve(PROJECT_ROOT, envDir) : DEFAULT_SERIALIZATION_DIR;
    ...
  }
  ```
  Thư mục mặc định ban đầu được chỉ định là `data/serialization`.
- **Căn nguyên 2 - Xung đột cấu hình môi trường / resolve hai lần:**
  Khi người dùng hoặc script kiểm thử định nghĩa biến môi trường `SERIALIZATION_DIR=data/serialization` (vì tưởng rằng biến này phải chỉ định đường dẫn tương đối từ gốc repo), nhưng ở một số script hoặc module tiện ích khác lại thực hiện `path.resolve(process.cwd(), 'data', process.env.SERIALIZATION_DIR)` (do giả định thư mục serialization luôn nằm trong thư mục dữ liệu `data/`). Kết quả là phép nối chuỗi ghép `data/` vào `data/serialization` $\rightarrow$ sinh ra `data/data/serialization`.
- **Căn nguyên 3 - Thiếu chuẩn hóa trong `.env.example`:**
  Biến `SERIALIZATION_DIR` trước đây chưa được định nghĩa tường minh trong `.env.example` và các file cấu hình môi trường, dẫn đến các script, test và công cụ CLI tự resolve theo các quy ước khác nhau.

### (2) Lớp lặp 2: Thư mục trung gian `items/` (Tầng bao bọc thừa thãi)
- **Căn nguyên:**
  Trong `src/config/serializationSections.js`:
  ```javascript
  const SECTIONS = {
    template: {
      folder: 'items/templates', ...
    },
    layout: {
      folder: 'items/layout', ...
    },
    rendering: {
      folder: 'items/layout/Renderings', ...
    },
    content: {
      folder: 'items/content', ...
    }
  };
  ```
  Tất cả các section đều được gán thuộc tính `folder` bắt đầu bằng `items/`. Thiết kế ban đầu này vay mượn từ cấu trúc thư mục của Sitecore/Unicorn (nơi phân biệt giữa `items` và `configuration`). Tuy nhiên trong hệ thống Treecraft, toàn bộ thư mục `Serialization/` đã mang bản chất lưu trữ các item phân cấp, nên tầng bọc `items/` trở nên hoàn toàn dư thừa, làm tăng thêm một cấp thư mục không cần thiết.

### (3) Lớp lặp 3: `items/templates` (hoặc tên section) bị lặp lại trong đường dẫn
- **Căn nguyên 1 - Ghép nối tên thư mục Section với đường dẫn tương đối:**
  Khi resolve đường dẫn tệp:
  - Thư mục section đã là `items/templates`.
  - Trong logic phân giải `itemPathToRelativeFile`, nếu root prefix được đối soát là `/root` thay vì `/root/templates` (hoặc khi import/export gói tổng hợp của GĐ 11 trước đây), phần đường dẫn tương đối còn lại của item `/root/templates/...` sẽ giữ lại `templates/...`.
  - Khi ghép `path.join(sectionDir, relativeFile)`, đường dẫn trở thành:
    `.../items/templates/templates/...` hoặc `.../items/templates/items/templates/...`.
- **Căn nguyên 2 - Dữ liệu cũ hoặc cấu trúc item lồng nhau trong DB:**
  Nếu trong DB có các thư mục con phân loại có tên trùng với section (ví dụ thư mục `templates` nằm dưới `/root/templates`), hoặc khi di chuyển dữ liệu từ các bản demo trước đây, việc không loại bỏ tiền tố root chuẩn của section sẽ khiến tên nhánh bị lặp lại nhiều lần trên cây thư mục đĩa.

---

## 3. Rủi ro kỹ thuật nếu không xử lý

1. **Chạm trần giới hạn Windows `MAX_PATH` (260 ký tự):**
   Trên môi trường Windows, đường dẫn sâu vượt quá 260 ký tự sẽ gây lỗi `ENOENT` hoặc `ENAMETOOLONG` khi `fs.writeFileSync` hoặc `fs.mkdirSync`.
2. **Khó đọc, khó duyệt mã nguồn:**
   Lập trình viên khi mở cây mã nguồn trên VS Code / Antigravity IDE phải mở qua 6-7 tầng thư mục rỗng trước khi nhìn thấy file YAML thực sự.
3. **Diff Git cồng kềnh:**
   Đường dẫn tệp quá dài làm thông báo `git status --short` và tiêu đề file trong `git diff` bị tràn màn hình console.

---

## 4. Cấu trúc đích chuẩn hóa (Rút gọn tối đa)

Để triệt tiêu hoàn toàn 3 lớp lặp trên, hệ thống chuyển đổi sang cấu trúc đích như sau:

```
Serialization/                       # = SERIALIZATION_DIR (tương đối so với gốc repo)
├── serialization.manifest.yml      # Manifest chung cấp hệ thống (layoutVersion: 2)
├── Templates/                       # ROOT_PATH/templates
├── Renderings/                      # ROOT_PATH/layout/Renderings
├── Layouts/                         # ROOT_PATH/layout/Layouts
├── Placeholders/                    # ROOT_PATH/layout/Placeholders
└── Contents/                        # ROOT_PATH/content
```

### Nguyên tắc thiết kế mới:
1. **Bỏ hoàn toàn lớp `data/` và lớp `items/`:**
   `SERIALIZATION_DIR` mặc định nằm ngay tại gốc dự án (`Serialization/`), đồng bộ ở cả `.env.example` và ba file `.env.<env>.example`.
2. **5 Section độc lập cấp 1 trực tiếp dưới `SERIALIZATION_DIR`:**
   `Templates/`, `Renderings/`, `Layouts/`, `Placeholders/`, `Contents/` (quản lý tập trung qua `src/config/serializationSections.js`).
3. **Đường dẫn file tương đối so với root của Section:**
   - Ví dụ: Item `/root/templates/Feature/Components/HeroBanner`  
     $\rightarrow$ `Serialization/Templates/Feature/Components/HeroBanner/HeroBanner.yml`
   - Item gốc của section (node `templates`, `content`...) được lưu trực tiếp tại `<Section>/<Section>.yml` mà không sinh thư mục con thừa.
4. **Bảo tồn nội dung logic trong file YAML:**
   Trường `path` bên trong nội dung YAML vẫn giữ nguyên đường dẫn logic đầy đủ (`/root/templates/...`) để phục vụ tính toàn vẹn và import vào DB; chỉ có vị trí file vật lý trên đĩa là được rút ngắn.

---

## 5. Kết luận & Các bước tiếp theo

Bản chẩn đoán này là cơ sở để tiến hành:
1. Ban hành **DEC-054** chuẩn hóa cấu trúc thư mục Serialization rút gọn.
2. Cập nhật `src/config/serializationSections.js` và `src/config/serializationPaths.js`.
3. Cung cấp công cụ di chuyển dữ liệu `npm run serialize:migrate-layout -- [--dry-run]` an toàn, không làm mất file và bảo tồn Git history.

