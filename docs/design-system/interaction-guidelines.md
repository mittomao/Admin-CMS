# Quy Chuẩn Tương Tác & Trải Nghiệm Người Dùng (Interaction Guidelines)

Tài liệu này quy chuẩn các hiệu ứng chuyển động (Motion & Transitions), các trạng thái tương tác (States), vòng đời kiểm thực biểu mẫu (Validation Lifecycle), cơ chế bảo vệ thao tác phá hủy (Destructive Confirmation) và vòng lặp phản hồi thông báo (Feedback Loop).

---

## 1. Trạng Thái Tương Tác & Hiệu Ứng Chuyển Động (States & Motion)

### 1.1. Đường Cong Gia Tốc & Thời Lượng Chuẩn (Transition Specs)
Mọi hiệu ứng chuyển động trong hệ thống tuân theo chuẩn chuyển động mượt mà của Tabler:

```css
/* Thời lượng và đường cong tiêu chuẩn */
--admin-transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
--admin-transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--admin-transition-smooth: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
```

### 1.2. Các Vi Tương Tác Cốt Lõi (Micro-interactions)
1. **Nút bấm khi nhấn (Button Active / Pressed)**:
   - Thụt nhẹ xuống 1px để tạo cảm giác cơ học xúc giác:
   ```css
   .btn:active {
     transform: translateY(1px);
   }
   ```
2. **Thẻ ứng dụng khi rê chuột (Card & Tile Hover)**:
   - Nâng nhẹ lên 2px, đổ bóng mềm và đổi màu viền sang màu chính:
   ```css
   .app-tile-card:hover {
     transform: translateY(-2px);
     box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08) !important;
     border-color: var(--tblr-primary) !important;
   }
   ```
3. **Mục menu điều hướng (Sidebar Nav Link Hover)**:
   - Trượt nhẹ sang phải 3px để tăng tính sinh động:
   ```css
   .navbar-vertical .navbar-nav .nav-link:hover {
     transform: translateX(3px);
   }
   ```
4. **Logo thương hiệu khi rê chuột**:
   - Nghiêng nhẹ -6 độ và phóng to 1.05 lần:
   ```css
   .sidebar-brand-link:hover .sidebar-brand-logo {
     transform: rotate(-6deg) scale(1.05);
   }
   ```
5. **Chấm đỏ thông báo nhấp nháy (`.badge-blink`)**:
   ```css
   .badge-blink {
     animation: badge-blink 1.75s ease-in-out infinite;
   }
   @keyframes badge-blink {
     0%, 100% { opacity: 1; transform: scale(1); }
     50% { opacity: 0.4; transform: scale(0.85); }
   }
   ```

---

## 2. Vòng Đời Kiểm Thực Biểu Mẫu (Form Validation Lifecycle)

Hệ thống sử dụng cơ chế kiểm tra lỗi tự động ở phía client thông qua `form-validator.js`:

```text
[ Người Dùng Bấm Submit ]
           |
           v
[ Kiểm Tra Các Trường (validateFormFields) ]
     /                           \
(Có lỗi)                     (Hợp lệ)
    |                             |
    +--> Đánh dấu .is-invalid     +--> Khóa nút Submit (disabled)
    +--> Bật .invalid-feedback    +--> Thêm spinner xoay (.spinner-border)
    +--> Tự động Scroll & Focus   +--> Đổi chữ sang "Đang lưu..."
         vào trường lỗi đầu tiên  +--> Gửi dữ liệu an toàn về Server
```

### 2.1. Quy Tắc Focus & Scroll Thông Minh
Khi form có lỗi, script tự động cuộn màn hình mượt mà đưa ô lỗi đầu tiên vào vị trí trung tâm tầm nhìn và đặt tiêu điểm (focus) vào ô đó:

```javascript
// form-validator.js
if (errors.length > 0) {
    e.preventDefault();
    e.stopPropagation();

    errors.forEach(({ input, message }) => {
        setFieldError(input, message);
    });

    // Tự động focus và cuộn đến ô lỗi đầu tiên
    if (errors[0] && errors[0].input) {
        errors[0].input.focus();
        errors[0].input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
```

### 2.2. Xóa Lỗi Realtime Khi Người Dùng Gõ Phím
Ngay khi người dùng bắt đầu nhập liệu vào ô đang bị báo đỏ, lỗi sẽ được gỡ bỏ ngay lập tức để không gây ức chế tâm lý:
```javascript
form.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('input', () => clearFieldError(input));
    input.addEventListener('change', () => clearFieldError(input));
});
```

### 2.3. Trạng Thái Đang Gửi Form (Submit Loading State)
Để ngăn chặn tình trạng người dùng click liên tiếp nhiều lần gây duplicate dữ liệu:
1. Nút bấm chuyển sang `disabled`.
2. Nội dung nút được thay thế bằng biểu tượng spinner xoay tròn và văn bản `Đang xử lý...`.
3. Biến cờ `isSubmitting = true` chặn mọi sự kiện submit tiếp theo.

---

## 3. Quy Chuẩn Xác Nhận Thao Tác Phá Hủy (Destructive Confirmation)

Tuyệt đối **không bao giờ xóa dữ liệu trực tiếp khi người dùng bấm nút xóa**. Mọi hành động xóa đều phải thông qua Modal xác nhận theo tiêu chuẩn accessible:

### 3.1. Cú Pháp Khai Báo Trên Form
Lập trình viên chỉ cần thêm thuộc tính `data-confirm-delete`:

```html
<form action="/admin/posts/101" method="post" data-confirm-delete="Bạn có chắc chắn muốn chuyển bài viết này vào thùng rác?">
    <input type="hidden" name="_method" value="DELETE">
    <button type="submit" class="btn btn-outline-danger btn-sm">
        <i class="ti ti-trash"></i> Xóa
    </button>
</form>
```

### 3.2. Tiêu Chuẩn Tiếp Cận Của Modal Xác Nhận (`#adminConfirmModal`)
1. **Focus an toàn mặc định**: Khi modal mở lên, tiêu điểm bàn phím tự động đặt vào nút **Hủy Bỏ (Cancel)** thay vì nút Xóa, ngăn chặn việc người dùng vô tình bấm phím Space/Enter gây mất dữ liệu.
2. **Hỗ trợ phím Escape**: Nhấn `Esc` lập tức đóng modal an toàn.
3. **Thanh trạng thái màu đỏ**: Cảnh báo thị giác rõ ràng bằng vạch đỏ `<div class="modal-status bg-danger"></div>`.

---

## 4. Bảo Vệ Thay Đổi Chưa Lưu (Unsaved Changes Guard)

Khi người dùng đang soạn thảo bài viết hoặc thay đổi cài đặt hệ thống:
1. Script `form-validator.js` theo dõi trạng thái `isDirty` của các trường trong form.
2. Nếu người dùng click vào bất kỳ liên kết điều hướng nội bộ nào hoặc nhấn nút Back của trình duyệt, modal `#adminUnsavedModal` sẽ xuất hiện cảnh báo: *"Bạn có thay đổi chưa lưu. Nếu rời đi bây giờ, các thay đổi sẽ bị mất."*
3. Cung cấp 2 lựa chọn rõ ràng:
   - **Ở Lại Trang (Stay on Page)**: Nút Primary xanh nổi bật, tiếp tục công việc.
   - **Rời Khỏi Trang (Leave Page)**: Nút Outline Danger, cho phép bỏ qua thay đổi và chuyển trang.

---

## 5. Vòng Lặp Phản Hồi Thông Báo Qua URL (URL Toast Feedback Pattern)

Đối với các ứng dụng Server-Side Rendering (SSR/MPA), sau khi thực hiện xong thao tác POST/PUT/DELETE, Controller sẽ chuyển hướng (Redirect) kèm tham số query flag:

```javascript
// indexController.js
return res.redirect('/admin/posts?toast=post_created&status=success');
```

Ở phía Client, `form-validator.js` tự động lắng nghe và hiển thị Toast notification tương ứng:

```text
[ Browser nhận Redirect: /admin/posts?toast=post_created ]
                          |
                          v
        [ Đọc URLSearchParams: toast, status ]
                          |
                          v
         [ Kích hoạt AdminNotifier.showToast() ]
                          |
                          v
    [ Làm sạch URL bằng window.history.replaceState() ]
    (Xóa sạch query params khỏi thanh địa chỉ để khi F5 không bị lặp lại Toast)
```

---

## 6. Khả Năng Tiếp Cận & Phím Tắt Bàn Phím (Accessibility & Keyboard Shortcuts)

1. **Phím tắt tìm kiếm toàn cục**:
   - Nhấn tổ hợp phím **`Ctrl + K`** (hoặc `Cmd + K` trên macOS) ở bất kỳ đâu trên màn hình sẽ tự động focus vào ô tìm kiếm nhanh trên Header.
2. **Tiêu chuẩn biểu mẫu WCAG 2.1 AA**:
   - Mọi `<input>` đều có `<label>` liên kết qua thuộc tính `id` / `for`.
   - Các trường bắt buộc có ký hiệu sao đỏ `*` sinh tự động qua class `.required` bằng CSS pseudo-element `::after`.
   - Độ tương phản chữ (Contrast Ratio) giữa chữ xám `#64748b` trên nền trắng `#ffffff` đạt tỉ lệ `4.6:1`, vượt chuẩn AA.

