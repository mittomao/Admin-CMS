# DEC-049: Chiến Lược Chỉ Mục Văn Bản MongoDB & Stemming Đa Ngôn Ngữ (Multilingual Text Search Stemming)

- **Trạng thái:** Đang đề xuất (Chờ duyệt theo GĐ L1)
- **Ngày quyết định:** 2026-11-09
- **Phạm vi:** GĐ L1, Search, MongoDB Text Index, Data Model
- **Người đề xuất:** Tech Lead / Senior Architect
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề
Hệ thống Treecraft CMS sử dụng MongoDB Text Index trên Model `Item` để phục vụ chức năng tìm kiếm nhanh theo từ khóa:
```javascript
itemSchema.index({ name: 'text', displayName: 'text' });
```
Khi hỗ trợ đa ngôn ngữ động với các mã chuẩn BCP 47 (như `vi`, `en`, `ja`, `fr-FR`, `de`...):
1. MongoDB hỗ trợ bộ phân tích từ gốc (stemming) cho khoảng 15 ngôn ngữ chính (như `danish`, `dutch`, `english`, `finnish`, `french`, `german`, `hungarian`, `italian`, `norwegian`, `portuguese`, `romanian`, `russian`, `spanish`, `swedish`, `turkish`).
2. Tiếng Việt (`vi`), tiếng Nhật (`ja`), tiếng Trung (`zh`) **không nằm trong danh sách bộ stemming gốc tích hợp sẵn của MongoDB**.
3. Nếu gán một mã ngôn ngữ không được MongoDB hỗ trợ vào thuộc tính `language_override` hoặc `default_language`, MongoDB sẽ ném ra ngoại lệ runtime: `Language not supported for text index`.
4. Cần một chiến lược ánh xạ tường minh và an toàn giữa mã BCP 47 sang stemmer của MongoDB.

---

## 2. Quyết định Kỹ thuật

### 2.1. Bảng Ánh xạ Chuẩn BCP 47 sang MongoDB Stemmer
Tạo module helper `src/utils/mongoTextStemmer.js` thực hiện chuẩn hóa và ánh xạ an toàn:

| Mã BCP 47 (Tiền tố) | Ngôn ngữ | MongoDB Text Stemmer |
| :--- | :--- | :--- |
| `en*` (ví dụ `en`, `en-US`, `en-GB`) | Tiếng Anh | `'english'` |
| `fr*` (ví dụ `fr`, `fr-FR`, `fr-CA`) | Tiếng Pháp | `'french'` |
| `de*` (ví dụ `de`, `de-DE`) | Tiếng Đức | `'german'` |
| `es*` (ví dụ `es`, `es-ES`) | Tiếng Tây Ban Nha | `'spanish'` |
| `it*` (ví dụ `it`, `it-IT`) | Tiếng Ý | `'italian'` |
| `pt*` (ví dụ `pt`, `pt-BR`) | Tiếng Bồ Đào Nha | `'portuguese'` |
| `ru*` (ví dụ `ru`, `ru-RU`) | Tiếng Nga | `'russian'` |
| **Mọi ngôn ngữ khác** (`vi`, `ja`, `zh`, `ko`, `ar`...) | Không có stemmer Mongo | **`'none'`** |

### 2.2. Chiến lược Fallback `none` Cho Tiếng Việt và Ngôn Ngữ Không Hỗ Trợ
- Đối với Tiếng Việt (`vi`) và các ngôn ngữ tượng hình hoặc không có stemmer tích hợp, MongoDB sẽ sử dụng bộ phân tích `'none'`.
- Khi dùng `'none'`, MongoDB không cố gắng cắt đuôi biến thể ngữ pháp mà chỉ tách từ theo khoảng trắng và chuẩn hóa dấu (accent insensitivity & case insensitivity). Điều này hoàn toàn phù hợp và chính xác với cấu trúc từ đơn/từ ghép của Tiếng Việt.

### 2.3. Cấu hình Index trên Schema
- Thiết lập tùy chọn `default_language: 'none'` cho text index của `Item` và `PublishedItem` để tránh việc MongoDB tự động áp đặt bộ stemmer tiếng Anh lên các từ tiếng Việt không dấu:
  ```javascript
  itemSchema.index(
    { name: 'text', displayName: 'text' },
    { default_language: 'none', language_override: 'language_override' }
  );
  ```
- Khi ghi bản ghi item với ngôn ngữ xác định, trường ảo hoặc helper sẽ cung cấp giá trị `language_override` đã được ánh xạ qua bảng trên.

---

## 3. Hệ quả & Lợi ích
- **An toàn tuyệt đối:** Loại bỏ 100% rủi ro lỗi runtime MongoDB khi người dùng thêm các ngôn ngữ mới không phổ biến.
- **Tìm kiếm Tiếng Việt chính xác:** Tránh việc từ tiếng Việt bị bộ stemmer tiếng Anh cắt xén sai lệch ký tự.

