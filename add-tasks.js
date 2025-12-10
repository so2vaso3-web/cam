const sqlite3 = require('sqlite3').verbose();
const sampleTasks = require('./tasks-data');

const db = new sqlite3.Database('./database.db');

// Get admin user ID
db.get(`SELECT id FROM users WHERE username = 'admin'`, (err, admin) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!admin) {
    console.log('Admin user not found. Please run the server first to create admin user.');
    db.close();
    return;
  }

  const adminId = admin.id;
  
  let added = 0;
  let skipped = 0;
  
  // Insert sample tasks
  sampleTasks.forEach((task, index) => {
    db.run(`INSERT OR IGNORE INTO tasks (title, description, reward, created_by, status) 
      VALUES (?, ?, ?, ?, 'active')`, 
      [task.title, task.description, task.reward, adminId], function(err) {
      if (err) {
        console.error(`Error adding task "${task.title}":`, err);
      } else {
        if (this.changes > 0) {
          added++;
          console.log(`✅ Đã thêm: ${task.title} - ${task.reward.toLocaleString('vi-VN')}₫`);
        } else {
          skipped++;
          console.log(`⏭️  Đã tồn tại: ${task.title}`);
        }
      }
      
      // When all tasks are processed
      if (index === sampleTasks.length - 1) {
        console.log(`\n📊 Tổng kết: Đã thêm ${added} nhiệm vụ mới, ${skipped} nhiệm vụ đã tồn tại.`);
        db.close();
      }
    });
  });
});
