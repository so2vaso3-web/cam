# Hướng Dẫn Sử Dụng Camera Trên Điện Thoại

## Vấn Đề
Camera chỉ hoạt động trên:
- ✅ HTTPS (https://...)
- ✅ localhost (http://localhost:3000)
- ❌ IP thường (http://192.168.1.10:3000) - KHÔNG hoạt động trên mobile

## Giải Pháp Đơn Giản: Dùng Ngrok (MIỄN PHÍ)

### Bước 1: Tải Ngrok
1. Vào https://ngrok.com/download
2. Tải về và giải nén
3. Hoặc cài qua npm: `npm install -g ngrok`

### Bước 2: Chạy Ngrok
```bash
# Mở terminal mới, chạy:
ngrok http 3000
```

### Bước 3: Lấy Link HTTPS
Ngrok sẽ hiện link như:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

### Bước 4: Dùng Link Trên Điện Thoại
- Mở trình duyệt trên điện thoại
- Vào link: `https://abc123.ngrok.io`
- Camera sẽ hoạt động bình thường!

## Lưu Ý
- Link ngrok thay đổi mỗi lần chạy (trừ khi đăng ký tài khoản miễn phí)
- Ngrok miễn phí có giới hạn số kết nối
- Hoàn toàn an toàn và miễn phí

## Cách Khác: Deploy Lên Server
Nếu muốn dùng lâu dài, có thể deploy lên:
- Railway (miễn phí)
- Render (miễn phí)
- Heroku (có phí)

Nhưng ngrok là cách nhanh nhất để test!

