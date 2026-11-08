# DEC-016: Thuật toán Kế thừa Đa cấp & Chống Chu trình

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 3 (Template Manager)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Template trong CMS theo chuẩn Treecraft cho phép một Template kế thừa nhiều Template khác (`baseTemplates`), và bản thân các Base Template lại có thể kế thừa các template cha khác. Nếu xảy ra vòng lặp kế thừa (ví dụ A kế thừa B, B kế thừa C, C kế thừa A), thuật toán duyệt đệ quy sẽ bị tràn bộ nhớ stack (`Maximum call stack size exceeded`), làm sập ứng dụng. Ngoài ra cần quy tắc xử lý khi các template kế thừa có section hoặc field trùng tên.

## 2. Quyết định
Tại `templateService.resolveTemplate(templateId)`:
- Duyệt đệ quy theo chiều sâu (depth-first) toàn bộ cây kế thừa `baseTemplates`, từ sâu nhất lên nông nhất.
- **Phát hiện chu trình (Cycle Detection):** Duy trì tập hợp `visitedSet` trong suốt quá trình đệ quy. Nếu một `templateId` xuất hiện lần thứ hai trong chuỗi kế thừa đang xét, lập tức ngắt đệ quy và ném lỗi nghiệp vụ rõ ràng. Giới hạn độ sâu kế thừa tối đa là 10 cấp.
- **Quy tắc gộp:**
  - Sections trùng tên (`name`) sẽ được gộp chung lại (merged).
  - Field của template con sẽ ghi đè (override) field cùng tên của template cha.
  - Gán nhãn `origin` cho từng section/field để giao diện hiển thị rõ nguồn gốc (thuộc bản thân template hay kế thừa từ template cha nào).

## 3. Hệ quả & Lưu ý kỹ thuật
- Cho phép xây dựng hệ thống template hướng đối tượng mạnh mẽ (ví dụ: `_BasePage` chứa Title/Meta, `_Navigable` chứa ShowInMenu, `ArticlePage` kế thừa cả hai).
- Đảm bảo hệ thống vận hành an toàn tuyệt đối, không bao giờ bị crash do lỗi người dùng cấu hình chu trình.

