# Hướng dẫn test trên localhost

## Các thay đổi đã thực hiện:

1. ✅ Thêm `type="button"` cho button đăng nhập và đăng ký
2. ✅ Thêm cả `addEventListener` và `onclick` để đảm bảo button hoạt động
3. ✅ Cải thiện timing khởi tạo với setTimeout
4. ✅ Thêm console.log để debug

## Cách test:

1. Khởi động server:
   ```bash
   npm start
   ```

2. Mở trình duyệt và vào: `http://localhost:3000`

3. Mở Console (F12) và kiểm tra:
   - Có thấy "Initializing app..." không?
   - Có thấy "Initializing auth system..." không?
   - Có thấy "Login button found: true" không?
   - Có thấy "Register button found: true" không?

4. Test các nút:
   - Click vào tab "Đăng Ký" → Có chuyển form không?
   - Click vào tab "Đăng Nhập" → Có chuyển form không?
   - Click nút "Đăng Nhập" → Có gọi hàm login() không? (xem console)
   - Click nút "Đăng Ký" → Có gọi hàm register() không? (xem console)

5. Nếu vẫn không hoạt động:
   - Kiểm tra Console có lỗi JavaScript không
   - Kiểm tra Network tab xem có request nào được gửi không
   - Thử hard refresh (Ctrl+F5)

## Nếu vẫn không hoạt động:

Có thể do:
- CSS che phủ button (z-index, pointer-events)
- Element khác che phủ button
- JavaScript bị block bởi extension trình duyệt

Hãy kiểm tra trong Console và báo lại lỗi cụ thể.

