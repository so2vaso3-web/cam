const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create backups directory
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'database.db');
const backupPath = path.join(backupsDir, `db-backup-${Date.now()}.db`);

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  process.exit(1);
}

// Copy database file
fs.copyFileSync(dbPath, backupPath);
console.log('✓ Database backed up to:', backupPath);

// Keep only last 10 backups
const backups = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('db-backup-'))
  .map(f => ({
    name: f,
    path: path.join(backupsDir, f),
    time: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);

// Delete old backups (keep last 10)
if (backups.length > 10) {
  backups.slice(10).forEach(backup => {
    fs.unlinkSync(backup.path);
    console.log('Deleted old backup:', backup.name);
  });
}

console.log(`✓ Total backups: ${backups.length}`);
process.exit(0);



