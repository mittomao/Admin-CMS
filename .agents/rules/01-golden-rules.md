# QUY TẮC VÀNG VÀ KỶ LUẬT THỰC THI CHO AI AGENT

## 1. NGUYÊN TẮC CỐT LÕI
1. **Chỉ code khi có lệnh:** Chỉ được phép tạo/sửa code, cài thư viện hoặc chạy DB migration khi người dùng gửi đúng cú pháp: `APPROVE GĐ <số>` (ví dụ: `APPROVE GĐ 6`, `APPROVE GĐ 12c`).
2. **Kỷ luật từng giai đoạn:** Mỗi lệnh phê duyệt chỉ thực hiện đúng một giai đoạn duy nhất; tuyệt đối không làm gộp hay làm trước giai đoạn tiếp theo.
3. **Không tự ý cài thêm package ngoài:** Phải hỏi ý kiến người dùng trước khi cài thêm bất kỳ thư viện bên ngoài nào chưa có trong kế hoạch (`docs/rules/02-tech-stack.md`).
4. **Quyền tự chủ thực thi:** Ngoài những lệnh liên quan đến xóa dữ liệu vĩnh viễn hoặc thay đổi git (commit, push, branch, reset, checkout, clean...), cho phép AI Agent chủ động thực hiện tất cả các tác vụ trong giai đoạn mà không cần hỏi xác nhận từng bước.
5. **Kỷ luật checklist:** Hoàn thành task nào tick ngay `[x]` vào checklist của file phase tương ứng; hoàn thành giai đoạn phải kiểm tra DoD, cập nhật trạng thái `Hoàn thành` và báo cáo rồi dừng lại chờ duyệt.

## 2. QUY TẮC GIT (TUYỆT ĐỐI BẮT BUỘC)
- Cấm: `git commit|add|stash|reset|checkout|restore|rebase|merge|push|tag|branch|clean|revert|mv|submodule`.
- Chỉ sử dụng các lệnh git chỉ đọc: `git status --short`, `git diff`, `git log`, `git ls-files`, `git grep`.
- Báo cáo kết thúc giai đoạn kèm `git status --short` và gợi ý commit message theo nhóm.
- Cần commit/stash/checkout để tiếp tục thì dừng và hỏi người dùng.
