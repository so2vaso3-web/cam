// Initialize Referral System Database
// Run this script once to set up all referral tables and columns

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Allow passing db instance or path
let db;
let shouldClose = false;

// Initialize database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
db = new sqlite3.Database(dbPath);
shouldClose = true;

console.log('🚀 Initializing Referral System Database...\n');

function runInit() {
// Add referral columns to users table (without UNIQUE constraint first)
const alterUsersQueries = [
  `ALTER TABLE users ADD COLUMN referral_code TEXT`,
  `ALTER TABLE users ADD COLUMN referred_by INTEGER`,
  `ALTER TABLE users ADD COLUMN referral_level INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN total_referrals INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN active_referrals INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN referral_earnings REAL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN cccd_number TEXT`,
  `ALTER TABLE users ADD COLUMN cccd_name TEXT`,
  `ALTER TABLE users ADD COLUMN cccd_dob TEXT`,
  `ALTER TABLE users ADD COLUMN cccd_address TEXT`,
  `ALTER TABLE users ADD COLUMN kyc_completed INTEGER DEFAULT 0`
];

console.log('📝 Adding columns to users table...');
alterUsersQueries.forEach((query, index) => {
  db.run(query, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error(`  ❌ Error adding column ${index + 1}:`, err.message);
    } else if (!err || err.message.includes('duplicate column')) {
      console.log(`  ✅ Column ${index + 1} added or already exists`);
    }
  });
});

// Create referrals table
db.run(`
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL UNIQUE,
    level INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('  ❌ Error creating referrals table:', err.message);
  } else {
    console.log('  ✅ Referrals table created or already exists');
  }
});

// Create referral_earnings table
db.run(`
  CREATE TABLE IF NOT EXISTS referral_earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    commission_percent REAL NOT NULL,
    level INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('  ❌ Error creating referral_earnings table:', err.message);
  } else {
    console.log('  ✅ Referral_earnings table created or already exists');
  }
});

// Create kyc_data table
db.run(`
  CREATE TABLE IF NOT EXISTS kyc_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    cccd_number TEXT,
    full_name TEXT,
    date_of_birth TEXT,
    address TEXT,
    issue_date TEXT,
    issue_place TEXT,
    cccd_front_path TEXT,
    cccd_back_path TEXT,
    face_video_path TEXT,
    face_photo_path TEXT,
    ocr_data TEXT,
    ocr_confidence REAL DEFAULT 0,
    verification_status TEXT DEFAULT 'pending',
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('  ❌ Error creating kyc_data table:', err.message);
  } else {
    console.log('  ✅ KYC_data table created or already exists');
  }
});

// Create withdrawal_requests table
db.run(`
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    referral_count INTEGER DEFAULT 0,
    withdrawal_unlock_level INTEGER DEFAULT 0,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    admin_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('  ❌ Error creating withdrawal_requests table:', err.message);
  } else {
    console.log('  ✅ Withdrawal_requests table created or already exists');
  }
});

// Create referral_bonuses table
db.run(`
  CREATE TABLE IF NOT EXISTS referral_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    referrer_id INTEGER,
    bonus_amount REAL NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (referrer_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('  ❌ Error creating referral_bonuses table:', err.message);
  } else {
    console.log('  ✅ Referral_bonuses table created or already exists');
    // Fix schema if using old column names
    db.run(`ALTER TABLE referral_bonuses ADD COLUMN bonus_amount REAL`, (e) => {
      if (e && !e.message.includes('duplicate column')) {
        console.error('  ⚠️  Error adding bonus_amount column:', e.message);
      }
    });
    db.run(`ALTER TABLE referral_bonuses ADD COLUMN type TEXT`, (e) => {
      if (e && !e.message.includes('duplicate column')) {
        console.error('  ⚠️  Error adding type column:', e.message);
      }
    });
  }
});

// Create user_blocks table
db.run(`
  CREATE TABLE IF NOT EXISTS user_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('  ❌ Error creating user_blocks table:', err.message);
  } else {
    console.log('  ✅ User_blocks table created or already exists');
  }
});

// Create indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)',
  'CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id)',
  'CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level)',
  'CREATE INDEX IF NOT EXISTS idx_kyc_cccd ON kyc_data(cccd_number)',
  'CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)',
  'CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)',
  'CREATE INDEX IF NOT EXISTS idx_users_cccd_number ON users(cccd_number)',
  'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)'
];

console.log('\n📊 Creating indexes...');
indexes.forEach((query, index) => {
  db.run(query, (err) => {
    if (err) {
      console.error(`  ❌ Error creating index ${index + 1}:`, err.message);
    } else {
      console.log(`  ✅ Index ${index + 1} created or already exists`);
    }
  });
});

// Generate referral codes for existing users
setTimeout(() => {
  console.log('\n🔑 Generating referral codes for existing users...');
  // First check if column exists
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error('  ❌ Error checking columns:', err.message);
      finish();
      return;
    }
    
    const hasReferralCode = columns.some(col => col.name === 'referral_code');
    if (!hasReferralCode) {
      console.log('  ⚠️  referral_code column not found, skipping code generation');
      finish();
      return;
    }

    db.all('SELECT id, username FROM users WHERE referral_code IS NULL OR referral_code = ""', [], (err, users) => {
      if (err) {
        console.error('  ❌ Error fetching users:', err.message);
        finish();
        return;
      }

      if (users.length === 0) {
        console.log('  ✅ No users need referral codes');
        finish();
        return;
      }

      console.log(`  📝 Generating codes for ${users.length} users...`);
      let processed = 0;
      users.forEach(user => {
        const referralCode = `REF${user.id}${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        db.run('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, user.id], (err) => {
          if (err) {
            console.error(`  ❌ Error generating code for user ${user.id}:`, err.message);
          } else {
            console.log(`  ✅ Generated code for ${user.username}: ${referralCode}`);
          }
          processed++;
          if (processed === users.length) {
            finish();
          }
        });
      });
    });
  });
}, 2000);

} // Close runInit() function

function finish() {
  console.log('\n✅ Database initialization complete!');
  console.log('\n📋 Next steps:');
  console.log('  1. Restart your server');
  console.log('  2. Test referral registration');
  console.log('  3. Check admin panel for referral tree');
  console.log('\n');
  if (shouldClose) {
    db.close();
  }
}

// Export for use in server.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    initReferralDB: function(dbInstance) {
      db = dbInstance;
      shouldClose = false;
      // Check if users table exists first
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, usersTable) => {
        if (err || !usersTable) {
          console.error('❌ Users table not found! Please ensure server.js has created the users table first.');
          return;
        }
        // Run initialization
        runInit();
      });
    }
  };
}

// If run directly (not imported), check users table first
if (require.main === module) {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, usersTable) => {
    if (err || !usersTable) {
      console.error('❌ Users table not found! Please ensure server.js has created the users table first.');
      if (shouldClose) db.close();
      return;
    }
    runInit();
  });
}
