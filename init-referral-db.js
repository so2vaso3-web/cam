// Script to initialize referral database tables
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database.db');

// Read and execute SQL schema
const schema = fs.readFileSync('./database-schema-referral.sql', 'utf8');

// Split by semicolons and execute each statement
const statements = schema.split(';').filter(s => s.trim().length > 0);

let completed = 0;
statements.forEach((statement, index) => {
    const trimmed = statement.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('--')) {
        db.run(trimmed, (err) => {
            if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
            } else {
                completed++;
                if (completed === statements.length) {
                    console.log('✓ Referral database initialized successfully');
                    db.close();
                }
            }
        });
    } else {
        completed++;
    }
});

console.log('Initializing referral database...');

