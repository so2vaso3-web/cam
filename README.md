# Task Earning Platform

Nền tảng làm nhiệm vụ kiếm tiền - Web application cho phép người dùng làm nhiệm vụ và kiếm tiền.

## Công nghệ

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Frontend**: HTML/CSS/JavaScript (Vanilla)
- **Authentication**: JWT
- **File Upload**: Multer

## Cài đặt

```bash
npm install
```

## Chạy Development

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## Chạy Production

```bash
npm start
```

## Cấu trúc

```
├── server.js          # Backend Express server
├── package.json       # Dependencies
├── database.db        # SQLite database (tự động tạo)
├── public/            # Frontend files
│   ├── index.html     # User interface
│   ├── admin.html     # Admin panel
│   ├── app.js         # Frontend logic
│   └── style.css      # Styles
└── uploads/           # Uploaded files (CCCD, videos)
```

## Tính năng

- ✅ Đăng ký/Đăng nhập
- ✅ Quản lý nhiệm vụ
- ✅ Nộp bài và duyệt bài
- ✅ Rút tiền
- ✅ Xác minh danh tính (CCCD + Video mặt)
- ✅ Admin panel đầy đủ

## Default Admin

- Username: `admin`
- Password: `admin123`

## Lưu ý

- Đổi JWT_SECRET trong production
- Đổi session secret trong production
- Backup database thường xuyên
