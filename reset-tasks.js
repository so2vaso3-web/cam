// Reset tasks table and seed with curated tasks
// Usage: node reset-tasks.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const tasks = require('./tasks-data');

const dbPath = process.env.DATABASE_PATH || './database.db';
const db = new sqlite3.Database(dbPath);

function run() {
  db.serialize(() => {
    console.log(`🔄 Resetting tasks in ${dbPath}`);
    db.run('DELETE FROM submissions', [], function (err) {
      if (err) {
        console.error('Failed to clear submissions:', err.message);
        process.exit(1);
      }
      db.run('DELETE FROM tasks', [], function (err2) {
        if (err2) {
          console.error('Failed to clear tasks:', err2.message);
          process.exit(1);
        }
        console.log('✅ Cleared tasks and submissions');
        const stmt = db.prepare('INSERT INTO tasks (title, description, reward, status) VALUES (?, ?, ?, "active")');
        tasks.forEach(t => {
          stmt.run(t.title, t.description, t.reward);
        });
        stmt.finalize(() => {
          console.log(`✅ Seeded ${tasks.length} tasks`);
          db.close();
        });
      });
    });
  });
}

run();
