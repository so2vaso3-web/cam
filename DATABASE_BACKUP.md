# Database Backup Guide

## Vấn đề mất dữ liệu

Database SQLite (`database.db`) có thể bị mất khi:
1. Railway rebuild/redeploy
2. Server restart mà không có persistent storage
3. Database file không được backup

## Giải pháp

### 1. Railway Persistent Storage
Railway tự động persist files trong project directory, nhưng cần đảm bảo:
- Database file `database.db` nằm trong project root
- Không có `.gitignore` loại trừ `database.db` (chỉ ignore trong local dev)

### 2. Backup Database
Tạo script backup định kỳ:

```bash
# backup-db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./database.db');
const backupPath = `./backups/db-${Date.now()}.db`;

if (!fs.existsSync('./backups')) {
  fs.mkdirSync('./backups', { recursive: true });
}

db.backup(backupPath)
  .then(() => {
    console.log('Backup created:', backupPath);
    process.exit(0);
  })
  .catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
```

### 3. Kiểm tra Database
- Database file: `./database.db`
- Uploads folder: `./uploads/`
- Cả 2 đều phải được persist trên Railway

## Lưu ý quan trọng

⚠️ **KHÔNG BAO GIỜ** commit `database.db` vào Git (chứa thông tin nhạy cảm)
⚠️ **NHƯNG** Railway cần file này tồn tại trong project để persist

## Giải pháp tốt nhất cho Production

1. **Sử dụng PostgreSQL trên Railway** (recommended)
   - Railway cung cấp PostgreSQL addon
   - Tự động backup và persistent
   - Không lo mất dữ liệu

2. **Hoặc dùng Railway Volumes**
   - Mount volume cho database và uploads
   - Data sẽ persist qua mọi deploy



