# 🚀 Script Upload Code Lên Nhiều Tài Khoản GitHub

Script Python để upload code lên nhiều tài khoản GitHub cùng lúc.

## 📋 Tính năng

- ✅ Thêm nhiều remote repositories
- ✅ Push code lên một hoặc nhiều remotes
- ✅ Quản lý remotes dễ dàng
- ✅ Tự động commit nếu có thay đổi

## 🛠️ Cách sử dụng

### 1. Chạy script

```bash
python multi_github_upload.py
```

### 2. Thêm remote mới

Chọn option `2` và nhập:
- **Tên remote**: ví dụ `github2`, `backup`, `mirror`
- **URL GitHub**: ví dụ `https://github.com/username/repo.git`

### 3. Push lên một remote

Chọn option `3` và chọn remote muốn push.

### 4. Push lên TẤT CẢ remotes

Chọn option `4` để push code lên tất cả remotes đã cấu hình.

## 📝 Ví dụ

### Thêm nhiều remotes:

```bash
# Remote 1 (đã có sẵn)
origin: https://github.com/so2vaso3-web/cam.git

# Thêm remote 2
git remote add github2 https://github.com/username2/repo2.git

# Thêm remote 3
git remote add backup https://github.com/username3/repo3.git
```

### Push lên tất cả:

Script sẽ tự động push lên tất cả remotes:
- origin
- github2
- backup

## ⚙️ Cấu hình Git Credentials

Nếu push lên nhiều tài khoản, bạn cần cấu hình credentials:

### Cách 1: Sử dụng Personal Access Token

```bash
git remote set-url origin https://TOKEN@github.com/username/repo.git
```

### Cách 2: Sử dụng SSH

```bash
git remote set-url origin git@github.com:username/repo.git
```

### Cách 3: Cấu hình credential helper

```bash
git config --global credential.helper store
```

## 🔐 Lưu ý bảo mật

- ⚠️ Không commit token/password vào code
- ⚠️ Sử dụng Personal Access Token thay vì password
- ⚠️ Thêm `.git/config` vào `.gitignore` nếu chứa thông tin nhạy cảm

## 📚 Lệnh Git hữu ích

```bash
# Xem tất cả remotes
git remote -v

# Xóa remote
git remote remove <name>

# Đổi URL remote
git remote set-url <name> <new-url>

# Push lên remote cụ thể
git push <remote-name> <branch>
```

## 🐛 Xử lý lỗi

### Lỗi authentication:
- Kiểm tra token/password
- Sử dụng SSH key thay vì HTTPS

### Lỗi branch không tồn tại:
- Tạo branch trước: `git checkout -b <branch-name>`
- Hoặc push branch hiện tại

### Lỗi conflict:
- Pull code trước: `git pull <remote-name> <branch>`
- Resolve conflict và commit lại

