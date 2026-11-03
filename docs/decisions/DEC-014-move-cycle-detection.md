# DEC-014: Kiểm tra Vòng lặp khi Move Item

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 2 (Content Editor MVP)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Khi biên tập viên kéo thả (Drag & Drop) hoặc thực hiện lệnh di chuyển (Move) một node trong cây nội dung, nếu người dùng vô tình kéo một node cha vào bên trong chính node con cháu của nó (ví dụ di chuyển `/A` vào trong `/A/B/C`), cấu trúc phân cấp cây sẽ bị gãy (tạo thành chu trình lặp vô hạn, cô lập toàn bộ nhánh con khỏi gốc cây).

## 2. Quyết định
Tại tầng nghiệp vụ `itemService.moveItem(itemId, newParentId)`:
- Kiểm tra danh sách tổ tiên `targetParent.ancestors` của node cha đích: mảng này **tuyệt đối không được chứa `itemId`** của node đang được di chuyển.
- Kiểm tra thêm điều kiện `itemId !== newParentId` (không được di chuyển node làm con của chính nó).
- Nếu vi phạm, ném lỗi `OperationalError` với HTTP 400 và thông báo rõ ràng: "Không thể di chuyển một node vào bên trong chính nó hoặc con cháu của nó".

## 3. Hệ quả & Lưu ý kỹ thuật
- **Bảo toàn cây:** Bảo đảm cây nội dung luôn là một đồ thị có hướng không chu trình (DAG) dạng cây phân cấp (Tree Hierarchy).
- **Tốc độ:** Tận dụng trường `ancestors` đã được đánh index trong MongoDB để kiểm tra tức thì O(1) mà không cần duyệt đệ quy tốn kém.
- Khi kiểm tra thành công, tiến hành cập nhật lại `parentId`, `path`, và mảng `ancestors` cho node đó và toàn bộ cây con bên dưới theo dạng batch operation.

