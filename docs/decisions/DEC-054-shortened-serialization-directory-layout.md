# DEC-054: Chuẩn Hóa Cấu Trúc Thư Mục Serialization Rút Gọn (Shortened Directory Layout)

- **Trạng thái:** Đang áp dụng
- **Ngày quyết định:** 2026-11-11
- **Phạm vi:** GĐ 11-Y2, Serialization, Storage Layout, Developer Experience
- **Người đề xuất:** Antigravity Tech Lead
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề

Sau khi triển khai GĐ 11-Y2, cấu trúc thư mục serialization lưu trên đĩa gặp tình trạng đường dẫn bị lặp lại quá dài:
`data\data\serialization\items\templates\items\templates\...`
Qua báo cáo chẩn đoán `docs/reports/serialization-path-diagnosis.md`, ba nguyên nhân cốt lõi bao gồm:
1. Giá trị mặc định `data/serialization` bị nối thêm `data/` trong một số script resolve đường dẫn.
2. Thư mục trung gian `items/` không cần thiết.
3. Tên nhánh bị lặp lại trong đường dẫn tương đối của item.

Đường dẫn dài gây nguy cơ vượt trần `MAX_PATH` trên Windows (260 ký tự), làm bẩn diff Git và gây khó khăn khi duyệt mã nguồn.

---

## 2. Quyết định Kỹ thuật

### 2.1. Cấu trúc thư mục đích chuẩn hóa
Thư mục gốc Serialization được đặt trực tiếp tại thư mục gốc của repository:
```
Serialization/                       # = SERIALIZATION_DIR (mặc định tại gốc repo)
├── serialization.manifest.yml      # Manifest toàn cục (layoutVersion: 2)
├── Templates/                       # ROOT_PATH/templates
├── Renderings/                      # ROOT_PATH/layout/Renderings
├── Layouts/                         # ROOT_PATH/layout/Layouts
├── Placeholders/                    # ROOT_PATH/layout/Placeholders
└── Contents/                        # ROOT_PATH/content
```

1. **Loại bỏ hoàn toàn tầng `items/` và `data/`:**
   Các section nằm trực tiếp dưới `SERIALIZATION_DIR`.
2. **Tách 5 Section rõ ràng:**
   - `Templates` (`/root/templates`)
   - `Renderings` (`/root/layout/Renderings`)
   - `Layouts` (`/root/layout/Layouts`)
   - `Placeholders` (`/root/layout/Placeholders`)
   - `Contents` (`/root/content`)
3. **Đường dẫn tệp tương đối so với root của section:**
   - Item `/root/templates/Feature/Components/HeroBanner`  
     $\rightarrow$ `Serialization/Templates/Feature/Components/HeroBanner/HeroBanner.yml`
   - Node gốc của section (ví dụ `/root/templates`, `/root/content`):  
     Lưu trực tiếp tại `<Section>/<Section>.yml` mà không tạo thư mục con thừa.
4. **Bảo tồn tính logic trong nội dung YAML:**
   Trường `path` bên trong file YAML vẫn lưu đường dẫn logic đầy đủ (ví dụ `/root/templates/...`). Vị trí tệp đĩa chỉ là phương tiện tổ chức vật lý.

### 2.2. Xử lý tương thích ngược trong Importer
Để đơn giản hóa và tránh lỗi phân giải đường dẫn phức tạp:
- **Phương án lựa chọn:** Từ chối nạp cấu trúc cũ và hướng dẫn rõ ràng.
- Khi phát hiện cấu trúc cũ (chứa thư mục `items/` hoặc thiếu `layoutVersion: 2` trong manifest), Sync sẽ dừng lại và hiển thị thông báo:
  > *"Phát hiện cấu trúc lưu trữ Serialization cũ (v1). Vui lòng chạy lệnh: 'npm run serialize:migrate-layout' để nâng cấp cấu trúc trước khi đồng bộ."*
- Công cụ CLI di chuyển `npm run serialize:migrate-layout` hỗ trợ `--dry-run`, phát hiện va chạm và di chuyển tệp an toàn bằng `fs` (không dùng `git mv`).

### 2.3. Cấu hình biến môi trường
- Biến `SERIALIZATION_DIR` mặc định là `Serialization` (tương đối so với gốc dự án).
- Được định nghĩa đồng nhất trong `src/config/env.js`, `.env.example`, `.env.development.example`, `.env.staging.example`, `.env.production.example`.

---

## 3. Hệ quả & Lợi ích

- Đường dẫn tệp ngắn hơn ~60%, loại bỏ hoàn toàn nguy cơ vượt quá 260 ký tự trên Windows.
- Cây thư mục Git sạch sẽ, trực quan, tương thích tiêu chuẩn Sitecore/Unicorn.
- Hoàn toàn độc lập với 2 tab JSON cũ.

