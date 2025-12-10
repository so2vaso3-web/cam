# Fix Database Persistence trên Railway

## Vấn đề
Railway mặc định không persist files trong project directory. Mỗi lần deploy, database.db sẽ bị reset.

## Giải pháp

### Option 1: Railway Volumes (Recommended)
1. Vào Railway dashboard
2. Chọn service của bạn
3. Tab "Volumes"
4. Click "Add Volume"
5. Mount path: `/app/database.db` hoặc `/app/data`
6. Database sẽ được lưu trong volume và persist qua các deployments

### Option 2: Railway PostgreSQL (Production)
1. Vào Railway dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Copy connection string
4. Update `server.js` để dùng PostgreSQL thay vì SQLite
5. Install: `npm install pg`

### Option 3: Auto-backup to Cloud Storage
- Tự động backup database.db lên Google Drive/S3 mỗi giờ
- Restore khi cần

## Quick Fix cho hiện tại

Thêm vào `server.js` sau khi tạo database:

```javascript
// Auto-initialize referral system on startup
db.serialize(() => {
  // Check if referral tables exist
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='referrals'", (err, row) => {
    if (!row) {
      console.log('Initializing referral system database...');
      // Run init script
      const { exec } = require('child_process');
      exec('node init-referral-db.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Error initializing database:', error);
        } else {
          console.log('Database initialized:', stdout);
        }
      });
    }
  });
});
```

## Khuyến nghị
- **Development**: Dùng Railway Volumes
- **Production**: Dùng PostgreSQL addon


