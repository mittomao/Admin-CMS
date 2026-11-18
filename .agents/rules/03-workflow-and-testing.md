# QUY TRÌNH LÀM VIỆC, KIỂM THỬ & TÀI LIỆU

## 1. QUY TRÌNH ĐỌC TÀI LIỆU (BẮT BUỘC MỖI PHIÊN)
1. **Bước 1 (Khởi động):** Đọc tuần tự `AGENTS.md` -> `docs/rules/00-workflow.md` -> `docs/phases/README.md`.
2. **Bước 2 (Khi nhận lệnh APPROVE GĐ n):** Mở `docs/phases/phase-nn-*.md`. Đọc kỹ mục tiêu, phạm vi và CHỈ đọc các file trong mục "Tài liệu cần đọc trước".
3. **Bước 3 (Thực thi chi tiết):** Tra cứu `docs/data-model/` và `docs/decisions/`. Không đọc `docs/archive/`.

## 2. QUY TRÌNH KIỂM THỬ (TESTING)
- Trước khi báo cáo hoàn thành bất kỳ giai đoạn nào:
  - `npm test`: Phải đạt 100% Pass, không có test bị bỏ qua hoặc flaky.
  - `npm run lint`: Phải đạt 0 errors.
  - `npm run doctor`: Phải đạt 0 errors.
  - `npm run check:branding`: Phải đạt 100% Pass.

## 3. QUY TRÌNH TÀI LIỆU (DOCUMENTATION)
- Mỗi quy trình/công cụ mới phải có hướng dẫn tương ứng tại `docs/guides/` theo **cấu trúc chuẩn 7 mục (tiếng Việt)**:
  1. Mục đích / Khi nào sử dụng.
  2. Điều kiện tiên quyết.
  3. Các bước thực hiện (Lệnh copy chạy được trên Windows / macOS / Linux).
  4. Kết quả mong đợi.
  5. Cách kiểm tra xác nhận.
  6. Xử lý sự cố và lỗi thường gặp.
  7. Cảnh báo và lưu ý quan trọng.
- Khi hoàn thành giai đoạn: Soạn thảo báo cáo nghiệm thu tại `docs/reports/phase-XX-report.md`.
