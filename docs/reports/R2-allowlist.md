# Danh sách Cho phép Chứa Từ khóa Lịch sử (R2 Allowlist)

Tài liệu này lưu trữ danh mục các tệp tin và vị trí được phép chứa từ khóa lịch sử `sitecore` / `/sitecore` theo quy tắc Giai đoạn R2. Bất kỳ vị trí nào khác ngoài danh sách này đều bị script kiểm tra tự động `npm run check:branding` đánh dấu vi phạm.

---

## Danh mục Cho phép Chính thức

| STT | Mẫu / Tệp tin | Lý do Cho phép (Rationale) |
| :--- | :--- | :--- |
| 1 | `docs/archive/**` | Bản sao lưu tài liệu và quy chuẩn lịch sử ban đầu (DEC-000 / AGENTS.md), đóng băng bất biến. |
| 2 | `package-lock.json` | Tệp lock phụ thuộc tự động do NPM quản lý. |
| 3 | `src/scripts/migrate-phase-r1-root-rename.js` | Script migration chuyển đổi dữ liệu thực tế trên MongoDB từ `/sitecore` sang `/root` (kèm logic rollback). |
| 4 | `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md` | Quyết định kiến trúc ghi nhận chính thức việc rebrand từ Sitecore sang Treecraft và root `/sitecore` &rarr; `/root`. |
| 5 | `docs/phases/phase-R1-rebrand-root-rename.md` | Kế hoạch thực thi giai đoạn R1 ghi nhận bối cảnh chuyển đổi. |
| 6 | `docs/phases/R1-impact-matrix.md` | Ma trận đánh giá rủi ro và phạm vi ảnh hưởng của việc đổi tên R1. |
| 7 | `docs/reports/phase-R1-report.md` | Báo cáo nghiệm thu Giai đoạn R1. |
| 8 | `docs/open-questions.md` | Tài liệu lưu trữ lịch sử các câu hỏi mở và phương án lựa chọn về domain/database. |
| 9 | `tests/brandingAudit.test.js` | Chứa assertion kiểm thử bảo vệ thương hiệu (`expect(value).not.toContain('sitecore')`). |
| 10 | `docs/reports/phase-R2-*` & `docs/reports/R2-*` | Các báo cáo kiểm kê số liệu trước/sau của chính Giai đoạn R2. |

