# Web Application

Ứng dụng web đơn giản với Python backend và HTML/CSS/JavaScript frontend.

## 🚀 Chạy trên Localhost

### Yêu cầu
- Python 3.6 trở lên

### Cách chạy

1. Mở terminal/command prompt trong thư mục dự án

2. Chạy server:
```bash
python server.py
```

3. Mở trình duyệt và truy cập:
```
http://localhost:8000
```

Server sẽ chạy trên port 8000 (hoặc port khác nếu 8000 đã được sử dụng).

## 📦 Deploy lên GitHub

1. Khởi tạo git repository (nếu chưa có):
```bash
git init
```

2. Thêm tất cả các file:
```bash
git add .
```

3. Commit:
```bash
git commit -m "Initial commit"
```

4. Tạo repository mới trên GitHub, sau đó:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 🚂 Deploy lên Railway

### Cách 1: Deploy từ GitHub (Khuyến nghị)

1. Push code lên GitHub (xem phần trên)

2. Đăng nhập vào [Railway](https://railway.app)

3. Tạo project mới và chọn "Deploy from GitHub repo"

4. Chọn repository của bạn

5. Railway sẽ tự động detect Python và deploy

6. Railway sẽ tự động tạo URL cho ứng dụng của bạn

### Cách 2: Deploy trực tiếp

1. Cài đặt Railway CLI:
```bash
npm i -g @railway/cli
```

2. Đăng nhập:
```bash
railway login
```

3. Khởi tạo project:
```bash
railway init
```

4. Deploy:
```bash
railway up
```

### Lưu ý cho Railway

- Railway sẽ tự động detect Python từ `requirements.txt` và `Procfile`
- Port sẽ được tự động set từ environment variable `PORT`
- Server đã được cấu hình để sử dụng PORT từ environment variable

## 📁 Cấu trúc dự án

```
.
├── index.html      # Trang chủ
├── admin.html      # Trang admin
├── setup.html      # Trang setup
├── style.css       # Stylesheet
├── script.js       # JavaScript logic
├── server.py       # Python HTTP server
├── requirements.txt # Python dependencies
├── Procfile        # Railway deployment config
└── README.md       # File này
```

## 🔧 Cấu hình

- **Port mặc định**: 8000 (local)
- **Port trên Railway**: Tự động từ environment variable

## 📝 Ghi chú

- Server sử dụng Python's built-in `http.server` module
- Không cần cài đặt thêm package nào (chỉ dùng standard library)
- File `requirements.txt` được giữ lại để Railway nhận diện đây là Python project



