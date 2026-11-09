# DEC-044: Cơ Chế Xóa An Toàn, Kiểm Tra Tham Chiếu Toàn Vẹn & Quản Lý Thùng Rác (Recycle Bin)

- **Ngày quyết định:** 2026-11-09
- **Giai đoạn liên quan:** GĐ 9 (Recycle Bin, Audit Log), GĐ 6 (Presentation), GĐ 5.1 (Media Library), GĐ 8/10 (Master/Web)
- **Trạng thái:** Đã chốt (Accepted)
- **Người đề xuất:** Tech Lead / User Architecture Command

---

## 1. Bối cảnh
Trong hệ thống Treecraft CMS, "Mọi thứ là Item" (Page, Folder, Media, Layout, Rendering, Placeholder, Template). Khi một item bị xóa, nếu item đó đang được tham chiếu bởi các cấu hình Presentation, template, media fields, hoặc các trang công khai trên Web Store (`items_web`), việc xóa sẽ dẫn tới gãy cấu trúc cây, lỗi 500 khi render website, hoặc mồ côi tài nguyên CDN Cloudinary.

Do đó, Giai đoạn 9 yêu cầu thiết lập cơ chế xóa an toàn nhiều lớp:
1. Tập trung hóa việc phát hiện tham chiếu thông qua một service chuyên biệt `referenceService`.
2. Phân định rõ ràng giữa **Chặn cứng (Hard Block)** và **Cảnh báo (Warning)** khi xóa.
3. Quản lý Thùng rác (Recycle Bin) theo phiên xóa nhóm (`deletionBatchId`), cho phép khôi phục nguyên trạng hoặc di dời vị trí khi node cha đã mất, và xử lý va chạm tên trùng.
4. Xóa vĩnh viễn (Purge): Kiểm tra lại tham chiếu, dọn dẹp triệt để trên Web Store (`cleanupWeb`), và dọn dẹp asset Cloudinary khi và chỉ khi không còn item nào tham chiếu cùng `publicId`.

---

## 2. Quyết định Kiến trúc

### 2.1. Tập trung hóa Phát hiện Tham chiếu (`referenceService.findReferences`)
Toàn bộ logic truy vấn liên kết được gom về một service duy nhất `referenceService.findReferences(itemOrId, options)`:
- **Kiểm tra Presentation:** Layout, Rendering, Placeholder trong Standard Presentation của Template, Shared Presentation và Final Presentation của Item trên cả Master và Web.
- **Kiểm tra Kế thừa & Schema:** Rendering sử dụng `componentTemplate`; Template đang có item instantiate; Template được dùng làm `baseTemplates` của template khác.
- **Kiểm tra Nội dung & Dữ liệu:** Datasource Item (`datasourceId`); Media trong Image field và `data-media-id` trong Rich Text; Liên kết nội bộ `data-item-id` trong Rich Text; TreeList/ItemPicker lưu mảng ObjectId.
- **Kiểm tra Phân cấp Nhánh (Subtree Descendants):** Khi xóa một node cha (ví dụ thư mục), toàn bộ nhánh con sẽ bị xóa theo. `referenceService` sẽ quét tham chiếu của **tất cả item trong nhánh** từ bên ngoài nhánh.
- **Kiểm tra Trạng thái Xuất bản:** Phát hiện xem item hoặc con cháu có đang tồn tại trên `items_web` hay không.

### 2.2. Quy tắc Chặn (BLOCK) vs Cảnh Báo (WARN)
| Loại Item / Tham chiếu | Hành vi Hệ thống | Mã HTTP | Chi tiết xử lý |
|---|---|---|---|
| **Node Hệ thống** (`/root`, `/root/content`, `/root/media library`, `/root/templates`, `/root/system`, `/root/layout`...) | **CHẶN TUYỆT ĐỐI** | `400 Bad Request` | Không cho phép xóa trong bất kỳ hoàn cảnh nào. |
| **System Templates** (`isSystem: true`) | **CHẶN TUYỆT ĐỐI** | `400 Bad Request` | Không cho phép xóa template cốt lõi. |
| **Layout / Rendering / Placeholder** đang được dùng trong Presentation | **CHẶN (BLOCK)** | `409 Conflict` | Trả về danh sách Template / Item đang dùng. Yêu cầu gỡ bỏ component khỏi presentation trước. |
| **Component Template** đang được Rendering trỏ tới | **CHẶN (BLOCK)** | `409 Conflict` | Không thể xóa template khi Rendering component còn gắn nó. |
| **Template** đang có Item khởi tạo hoặc làm Base Template | **CHẶN (BLOCK)** | `409 Conflict` | Phải xóa hoặc chuyển template của item trước. |
| **Datasource / Media / Internal Link / Trang đã xuất bản** | **CẢNH BÁO (WARN)** | `200 OK` (kèm danh sách cảnh báo) / Yêu cầu `confirmWarnings: true` khi POST | Cho phép người dùng xác nhận hiểu rõ rủi ro để tiếp tục đưa vào thùng rác. |

### 2.3. Cấu trúc Dữ liệu Soft Delete & Recycle Bin
Mô hình `Item` được mở rộng thêm các trường phục hồi:
```javascript
{
  deleted: { type: Boolean, default: false, index: true },
  isDeleted: { type: Boolean, default: false, index: true }, // Tương thích kép
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedFromPath: { type: String, default: null },
  deletedFromParentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  deletionBatchId: { type: String, default: null, index: true }
}
```
- Khi xóa một node có con cháu: Sinh một `deletionBatchId` chung duy nhất dạng UUID/ObjectId cho cả cha và toàn bộ con cháu trong nhánh.
- Dữ liệu cũ đã bị xóa mềm trước GĐ 9: Migration idempotent sẽ điền `deletedAt = item.updatedAt`, `deletedFromPath = item.path`, `deletionBatchId = item._id.toString()`.

### 2.4. Quy tắc Khôi phục (Restore)
1. **Khôi phục vị trí cũ:** Nếu node cha ban đầu (`deletedFromParentId`) vẫn còn sống (`deleted !== true`), tự động gắn lại vào node cha cũ.
2. **Khôi phục khi cha đã mất:** Nếu node cha cũ đã bị xóa hoặc không còn tồn tại, giao diện yêu cầu người dùng chọn một node cha đích (`targetParentId`) qua ItemPicker.
3. **Xử lý Tên trùng (Name Collision):** Nếu tại vị trí đích đã tồn tại item cùng tên, tự động thêm hậu tố ` (Restored)` hoặc số thứ tự tăng dần (` (Restored 1)`, ` (Restored 2)`).
4. **Cập nhật Materialized Path:** Tự động tính toán lại đường dẫn `path` và mảng `ancestors` cho toàn bộ nhánh con của item được khôi phục.
5. **Khôi phục theo Batch:** Hỗ trợ khôi phục trọn vẹn cả phiên xóa nhánh hoặc khôi phục đơn lẻ một item (tự động khôi phục chuỗi cha cần thiết nếu chưa có).

### 2.5. Quy tắc Xóa Vĩnh Viễn (Purge / Hard Delete)
1. **Kiểm tra quyền hạn cao:** Yêu cầu quyền `recyclebin:purge` qua `canPerform`.
2. **Kiểm tra lại tham chiếu:** Trước khi xóa vĩnh viễn, kiểm tra xem có item sống nào mới tạo trỏ tới item này không; nếu có thì chặn hoặc cảnh báo theo quy tắc.
3. **Dọn dẹp Web Store (`items_web`):**
   - Gọi `PublishedItem.deleteMany({ _id: { $in: purgedIds } })`.
   - Phát sự kiện `item.unpublished` để `renderCache` tự động vô hiệu hóa cache trang công khai tương ứng.
4. **Dọn dẹp Cloudinary Media:**
   - Với Media Item có `sharedFields.publicId`, hệ thống kiểm tra xem còn bất kỳ item nào khác (kể cả trong thùng rác hoặc trên Web) dùng chung `publicId` này không.
   - Chỉ gọi `cloudinaryStorageProvider.destroy(publicId)` khi **không còn bất kỳ item nào** dùng chung.
   - Nếu Cloudinary API trả về lỗi: Đánh dấu trạng thái lỗi vào audit log và bản ghi `purgeError`, không làm nghẽn tiến trình và cho phép thử lại.

---

## 3. Hệ quả
- Loại bỏ hoàn toàn nguy cơ gãy trang web công khai do vô tình xóa component hoặc layout đang phục vụ SSR.
- Tác giả nội dung có thể tự tin xóa và khôi phục dữ liệu mà không sợ mất mát phiên bản hay ngôn ngữ.

