# 🚀 Script Upload Code Lên Nhiều Tài Khoản GitHub

Script Python để upload code lên nhiều tài khoản GitHub cùng lúc.

## 🎨 Có 2 phiên bản:

1. **GUI Version** (Giao diện đồ họa) - Dễ sử dụng nhất ✨
2. **CLI Version** (Dòng lệnh) - Cho người dùng quen terminal

---

## 🖥️ PHIÊN BẢN GUI (Khuyến nghị)

### Chạy GUI:

```bash
python multi_github_upload_gui.py
```

Hoặc double-click: `run_gui.bat`

### Tính năng GUI:

- ✅ **Tab Remotes**: Quản lý remotes với giao diện trực quan
  - Thêm remote mới với nhập token/password
  - Xem danh sách remotes
  - Xóa remote
  
- ✅ **Tab Files & Commit**: Chọn file và commit
  - Xem danh sách file đã thay đổi
  - Click để chọn/bỏ chọn file
  - Chọn tất cả / Bỏ chọn tất cả
  - Nhập commit message và commit
  
- ✅ **Tab Push**: Push code lên GitHub
  - Chọn remote và branch
  - Push lên một remote
  - Push lên tất cả remotes
  - Progress bar hiển thị tiến trình
  
- ✅ **Tab Log**: Xem log chi tiết
  - Tất cả thao tác được ghi log
  - Dễ dàng debug khi có lỗi

---

## 💻 PHIÊN BẢN CLI (Dòng lệnh)

## 📋 Tính năng

- ✅ Thêm nhiều remote repositories
- ✅ **Nhập tài khoản/mật khẩu hoặc token khi thêm remote**
- ✅ **Chọn file cụ thể để commit và push**
- ✅ Push code lên một hoặc nhiều remotes
- ✅ Quản lý remotes dễ dàng
- ✅ Menu tương tác dễ sử dụng

### 1. Chạy script

```bash
python multi_github_upload.py
```

Hoặc double-click: `run_upload.bat`

### 2. Thêm remote mới (có nhập tài khoản)

Chọn option `2` và nhập:
- **Tên remote**: ví dụ `github2`, `backup`, `mirror`
- **URL GitHub**: ví dụ `https://github.com/username/repo.git`
- **Authentication** (chọn 1 trong 3):
  - `1`: Nhập **Personal Access Token** (khuyến nghị)
  - `2`: Nhập **Username/Password**
  - `3`: Không dùng (sẽ hỏi khi push)

### 3. Chọn file và commit

Chọn option `3` để:
- Xem danh sách file đã thay đổi
- Chọn file cụ thể để commit:
  - Nhập số (ví dụ: `1,2,3` hoặc `1-3`)
  - Nhập `all` để chọn tất cả
  - Nhập `path` để nhập đường dẫn file/folder
- Nhập commit message
- Tự động commit các file đã chọn

### 4. Push lên một remote

Chọn option `4` và chọn remote muốn push.

### 5. Push lên TẤT CẢ remotes

Chọn option `5` để push code lên tất cả remotes đã cấu hình.

## 📝 Ví dụ sử dụng

### Ví dụ 1: Thêm remote với token

```
Chọn option 2
Nhập tên remote: github2
Nhập URL: https://github.com/user2/repo2.git
Chọn authentication: 1 (Token)
Nhập token: ghp_xxxxxxxxxxxxx
✅ Đã thêm remote thành công!
```

### Ví dụ 2: Chọn file cụ thể để commit

```
Chọn option 3
📋 Danh sách file thay đổi:
  1. src/main.py
  2. config.json
  3. README.md

Nhập: 1,3  (chọn file 1 và 3)
Nhập commit message: Update main.py and README
✅ Đã commit thành công!
```

### Ví dụ 3: Push lên tất cả remotes

```
Chọn option 5
Nhập branch: main
Xác nhận: yes
📤 Đang push lên origin...
✅ Thành công
📤 Đang push lên github2...
✅ Thành công
📊 KẾT QUẢ: ✅ 2/2 thành công
```

## ⚙️ Cấu hình Git Credentials

### Cách 1: Sử dụng script (Khuyến nghị) ✨

Khi thêm remote mới (option 2), script sẽ hỏi bạn:
- **Personal Access Token**: An toàn nhất, khuyến nghị dùng
- **Username/Password**: Nhập trực tiếp trong script
- **Không dùng**: Git sẽ hỏi khi push

### Cách 2: Tạo Personal Access Token

1. Vào GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Chọn quyền: `repo` (full control)
4. Copy token và dán vào script khi thêm remote

### Cách 3: Sử dụng SSH

```bash
git remote set-url origin git@github.com:username/repo.git
```

### Cách 4: Cấu hình credential helper

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

