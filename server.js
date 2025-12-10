const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sampleTasks = require('./tasks-data');
const referralSystem = require('./referral-system');
const referralAPI = require('./referral-api');
const ocrService = require('./ocr-service');
const antiFake = require('./anti-fake');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// HTTPS Redirect Middleware (for Railway/production)
app.use((req, res, next) => {
  // Check if request is HTTP and not localhost
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Security headers
app.use((req, res, next) => {
  // Force HTTPS
  if (req.header('x-forwarded-proto') === 'https' || process.env.NODE_ENV !== 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Prevent mixed content
  res.setHeader('Content-Security-Policy', "upgrade-insecure-requests");
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false
}));

// Database setup
const dbPath = process.env.DATABASE_PATH || './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log(`Connected to SQLite database: ${dbPath}`);
  }
});

// Export db for init script
module.exports.getDatabase = () => db;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware to extract user from token for file uploads
const extractUserFromToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token invalid, but continue for file upload
    }
  }
  next();
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user.id : 'temp';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for high quality videos
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|mp4|webm|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh (jpg, png) hoặc video (mp4, webm, mov)'));
    }
  }
});

// Initialize database
db.serialize(() => {
  // Users table - MUST CREATE FIRST
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    balance REAL DEFAULT 0,
    role TEXT DEFAULT 'user',
    cccd_front TEXT,
    cccd_back TEXT,
    face_video TEXT,
    face_photo TEXT,
    verification_status TEXT DEFAULT 'pending',
    verification_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Add columns if they don't exist (for existing databases)
  // Check and add columns one by one
  db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding phone column:', err);
    }
  });
  db.run(`ALTER TABLE users ADD COLUMN cccd_front TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding cccd_front column:', err);
    }
  });
  db.run(`ALTER TABLE users ADD COLUMN cccd_back TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding cccd_back column:', err);
    }
  });
  db.run(`ALTER TABLE users ADD COLUMN face_video TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding face_video column:', err);
    }
  });
  db.run(`ALTER TABLE users ADD COLUMN face_photo TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding face_photo column:', err);
    }
  });
  db.run(`ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'pending'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding verification_status column:', err);
    } else {
      // Update all existing users to have 'pending' status if NULL
      db.run(`UPDATE users SET verification_status = 'pending' WHERE verification_status IS NULL`, (updateErr) => {
        if (updateErr) {
          console.error('Error updating verification_status:', updateErr);
        }
      });
    }
  });
  db.run(`ALTER TABLE users ADD COLUMN verification_notes TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding verification_notes column:', err);
    }
  });

  // Add referral columns if they don't exist
  const referralColumns = [
    { name: 'referral_code', type: 'TEXT' },
    { name: 'referred_by', type: 'INTEGER' },
    { name: 'referral_level', type: 'INTEGER DEFAULT 0' },
    { name: 'total_referrals', type: 'INTEGER DEFAULT 0' },
    { name: 'active_referrals', type: 'INTEGER DEFAULT 0' },
    { name: 'referral_earnings', type: 'REAL DEFAULT 0' },
    { name: 'withdrawal_unlocked', type: 'INTEGER DEFAULT 0' },
    { name: 'vip_status', type: 'INTEGER DEFAULT 0' }
  ];

  referralColumns.forEach(col => {
    db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error(`Error adding ${col.name} column:`, err);
      }
    });
  });

  // Tasks table
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward REAL NOT NULL,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // Submissions table
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Transactions table
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  
  // Auto-initialize referral system AFTER all base tables are created
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='referrals'", (err, row) => {
    if (err) {
      console.error('Error checking referral tables:', err);
    } else if (!row) {
      console.log('⚠️  Referral tables not found. Running initialization...');
      // Import and run init
      const initReferralDB = require('./init-referral-db');
      if (initReferralDB && initReferralDB.initReferralDB) {
        initReferralDB.initReferralDB(db);
      } else {
        // Fallback: run as script
        setTimeout(() => {
          const { execSync } = require('child_process');
          try {
            execSync('node init-referral-db.js', { stdio: 'inherit', cwd: __dirname });
            console.log('✅ Database initialized successfully');
          } catch (error) {
            console.error('❌ Auto-init failed. Please run: npm run init-db');
          }
        }, 1000);
      }
    } else {
      console.log('✅ Referral system tables already exist');
    }
  });

  // Create default admin user and sample tasks
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
    VALUES ('admin', 'admin@example.com', ?, 'admin')`, [adminPassword]);
  
  // Get admin user ID and create sample tasks
  db.get(`SELECT id FROM users WHERE username = 'admin'`, (err, admin) => {
    if (err || !admin) return;
    
    const adminId = admin.id;
    
    // Insert sample tasks (only if they don't exist)
    sampleTasks.forEach(task => {
      db.run(`INSERT OR IGNORE INTO tasks (title, description, reward, created_by, status) 
        VALUES (?, ?, ?, ?, 'active')`, 
        [task.title, task.description, task.reward, adminId]);
    });
  });
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register with referral support
app.post('/api/register', async (req, res) => {
  const { username, email, password, phone, referral_code } = req.body;

  if (!username || !email || !password || !phone) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  // Anti-fake: Validate registration
  try {
    const validation = await antiFake.validateRegistration(db, { phone, email });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }
  } catch (err) {
    console.error('Validation error:', err);
    return res.status(500).json({ error: 'Lỗi kiểm tra thông tin' });
  }

  // Validate phone number (Vietnamese format)
  const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  const cleanPhone = phone.replace(/\s/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 số)' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  // Use referral system to register
  referralAPI.registerWithReferralAPI(db, req, res);
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        balance: user.balance,
        role: user.role
      } 
    });
  });
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, email, balance, role, cccd_front, cccd_back, face_video, face_photo, verification_status, verification_notes FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ user });
  });
});

// ========== REFERRAL ENDPOINTS ==========

// Referral Info
app.get('/api/referral/info', authenticateToken, (req, res) => {
  referralAPI.getReferralInfoAPI(db, req, res);
});

// Referral Chain (F1-F5)
app.get('/api/referral/chain', authenticateToken, (req, res) => {
  referralAPI.getReferralChainAPI(db, req, res);
});

// Referral Earnings
app.get('/api/referral/earnings', authenticateToken, (req, res) => {
  referralAPI.getReferralEarningsAPI(db, req, res);
});

// Referral Bonuses
app.get('/api/referral/bonuses', authenticateToken, (req, res) => {
  referralAPI.getReferralBonusesAPI(db, req, res);
});

// Check Withdrawal Unlock
app.get('/api/referral/withdrawal-unlock', authenticateToken, (req, res) => {
  referralAPI.checkWithdrawalUnlockAPI(db, req, res);
});

// Upload verification documents with OCR
app.post('/api/verification/upload', extractUserFromToken, authenticateToken, upload.fields([
  { name: 'cccd_front', maxCount: 1 },
  { name: 'cccd_back', maxCount: 1 },
  { name: 'face_video', maxCount: 1 },
  { name: 'face_photo', maxCount: 1 }
]), async (req, res) => {
  const userId = req.user.id;
  const updates = [];
  const values = [];
  const imagePaths = {};

  if (req.files.cccd_front) {
    updates.push('cccd_front = ?');
    values.push(req.files.cccd_front[0].filename);
    imagePaths.cccd_front = path.join(uploadsDir, req.files.cccd_front[0].filename);
  }

  if (req.files.cccd_back) {
    updates.push('cccd_back = ?');
    values.push(req.files.cccd_back[0].filename);
    imagePaths.cccd_back = path.join(uploadsDir, req.files.cccd_back[0].filename);
  }

  if (req.files.face_video) {
    updates.push('face_video = ?');
    values.push(req.files.face_video[0].filename);
    imagePaths.face_video = path.join(uploadsDir, req.files.face_video[0].filename);
  }

  if (req.files.face_photo) {
    updates.push('face_photo = ?');
    values.push(req.files.face_photo[0].filename);
    imagePaths.face_photo = path.join(uploadsDir, req.files.face_photo[0].filename);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Không có file nào được upload' });
  }

  // OCR Extraction from CCCD front
  let ocrResult = null;
  if (imagePaths.cccd_front && fs.existsSync(imagePaths.cccd_front)) {
    try {
      ocrResult = await ocrService.extractCCCDInfo(imagePaths.cccd_front);
      if (ocrResult.success && ocrResult.data.cccd_number) {
        // Anti-fake: Check duplicate CCCD
        const kycValidation = await antiFake.validateKYC(db, userId, ocrResult.data.cccd_number);
        if (!kycValidation.valid) {
          // Delete uploaded files
          Object.values(imagePaths).forEach(filePath => {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
          return res.status(400).json({ 
            error: kycValidation.errors.join(', '),
            duplicate: true,
            existing_user: kycValidation.duplicate_info
          });
        }

        // Save OCR data
        await ocrService.saveOCRData(db, userId, ocrResult.data, imagePaths, ocrResult);
      }
    } catch (err) {
      console.error('OCR error:', err);
      // Continue even if OCR fails
    }
  }

  // Set status to pending if not already approved
  updates.push('verification_status = ?');
  values.push('pending');
  values.push(userId);

  const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  console.log('Verification upload query:', updateQuery);
  console.log('Values:', values);

  db.run(updateQuery, values, (err) => {
    if (err) {
      console.error('Error updating verification:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    console.log(`Verification files uploaded for user ${userId}`);
    res.json({ 
      message: 'Upload thành công! Đang chờ duyệt.',
      ocr_extracted: ocrResult?.success || false
    });
  });
});

// Get verification status
app.get('/api/verification/status', authenticateToken, (req, res) => {
  db.get('SELECT cccd_front, cccd_back, face_video, face_photo, verification_status, verification_notes FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Check if user has submitted any files
    const hasFiles = user.cccd_front || user.cccd_back || user.face_video || user.face_photo;
    
    // If no files uploaded, status should be 'not_submitted'
    let status = user.verification_status || 'not_submitted';
    if (!hasFiles && status === 'pending') {
      status = 'not_submitted';
    }
    
    res.json({ 
      cccd_front: user.cccd_front,
      cccd_back: user.cccd_back,
      face_video: user.face_video,
      face_photo: user.face_photo,
      verification_status: status,
      verification_notes: user.verification_notes
    });
  });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  db.all(`SELECT t.*, u.username as creator_name 
    FROM tasks t 
    LEFT JOIN users u ON t.created_by = u.id 
    WHERE t.status = 'active'
    ORDER BY t.created_at DESC`, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ tasks });
  });
});

// Get task by ID
app.get('/api/tasks/:id', (req, res) => {
  db.get(`SELECT t.*, u.username as creator_name 
    FROM tasks t 
    LEFT JOIN users u ON t.created_by = u.id 
    WHERE t.id = ?`, [req.params.id], (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task });
  });
});

// Create task (Admin only)
app.post('/api/tasks', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { title, description, reward } = req.body;

  if (!title || !description || !reward) {
    return res.status(400).json({ error: 'All fields required' });
  }

  db.run(
    'INSERT INTO tasks (title, description, reward, created_by) VALUES (?, ?, ?, ?)',
    [title, description, reward, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Task created successfully' });
    }
  );
});

// Submit task
app.post('/api/tasks/:id/submit', authenticateToken, (req, res) => {
  const { content } = req.body;
  const taskId = req.params.id;

  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }

  // Check if task exists
  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if already submitted
    db.get('SELECT * FROM submissions WHERE task_id = ? AND user_id = ?', 
      [taskId, req.user.id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (existing) {
        return res.status(400).json({ error: 'Already submitted' });
      }

      // Create submission
      db.run(
        'INSERT INTO submissions (task_id, user_id, content) VALUES (?, ?, ?)',
        [taskId, req.user.id, content],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ id: this.lastID, message: 'Submission created successfully' });
        }
      );
    });
  });
});

// Get user submissions
app.get('/api/my-submissions', authenticateToken, (req, res) => {
  db.all(`SELECT s.*, t.title as task_title, t.reward 
    FROM submissions s 
    JOIN tasks t ON s.task_id = t.id 
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC`, [req.user.id], (err, submissions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ submissions });
  });
});

// Admin: Get all submissions
app.get('/api/admin/submissions', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all(`SELECT s.*, t.title as task_title, t.reward, u.username as user_name 
    FROM submissions s 
    JOIN tasks t ON s.task_id = t.id 
    JOIN users u ON s.user_id = u.id 
    ORDER BY s.created_at DESC`, (err, submissions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ submissions });
  });
});

// Admin: Approve/Reject submission
app.post('/api/admin/submissions/:id/review', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { status } = req.body; // 'approved' or 'rejected'

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.get('SELECT * FROM submissions WHERE id = ?', [req.params.id], (err, submission) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    db.run('UPDATE submissions SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.params.id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // If approved, add reward to user balance
      if (status === 'approved') {
        db.get('SELECT reward FROM tasks WHERE id = ?', [submission.task_id], (err, task) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Update user balance
          db.run('UPDATE users SET balance = balance + ? WHERE id = ?',
            [task.reward, submission.user_id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Create transaction record
            db.run('INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
              [submission.user_id, task.reward, 'credit', `Phần thưởng nhiệm vụ: ${task.reward} ₫`],
              () => {
                // Calculate referral commission
                referralSystem.calculateTaskCommission(db, submission.user_id, task.reward);
                
                res.json({ message: 'Submission reviewed and reward added' });
              });
          });
        });
      } else {
        res.json({ message: 'Submission rejected' });
      }
    });
  });
});

// Get transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id], (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ transactions });
  });
});

// Withdraw request
app.post('/api/withdraw', authenticateToken, async (req, res) => {
  const { amount, payment_method, account_info } = req.body;

  if (!amount || !payment_method || !account_info) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  // Check withdrawal unlock first
  try {
    const unlockInfo = await referralSystem.checkWithdrawalUnlock(db, req.user.id);
    
    if (!unlockInfo.unlocked) {
      return res.status(403).json({
        error: unlockInfo.message,
        requires_referrals: true,
        needed: unlockInfo.referrals < 10 ? 10 - unlockInfo.referrals : 
                unlockInfo.referrals < 20 ? 20 - unlockInfo.referrals : 
                unlockInfo.referrals < 50 ? 50 - unlockInfo.referrals : 0,
        current_referrals: unlockInfo.referrals
      });
    }

    // Check amount limits
    if (unlockInfo.maxAmount && amount > unlockInfo.maxAmount) {
      return res.status(400).json({
        error: `Số tiền rút tối đa là ${unlockInfo.maxAmount.toLocaleString('vi-VN')} ₫`
      });
    }

    // Check daily limit for VIP
    if (unlockInfo.dailyLimit) {
      // Check today's withdrawals
      const today = new Date().toISOString().split('T')[0];
      db.get(
        `SELECT SUM(amount) as total FROM withdrawal_requests 
         WHERE user_id = ? AND DATE(created_at) = ? AND status = 'approved'`,
        [req.user.id, today],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          const todayTotal = result.total || 0;
          if (todayTotal + amount > unlockInfo.dailyLimit) {
            return res.status(400).json({
              error: `Đã vượt quá giới hạn rút trong ngày (${unlockInfo.dailyLimit.toLocaleString('vi-VN')} ₫)`
            });
          }
          continueWithdrawal();
        }
      );
    } else {
      continueWithdrawal();
    }

    function continueWithdrawal() {
      // Check if user is verified
      db.get('SELECT balance, verification_status, active_referrals FROM users WHERE id = ?', 
        [req.user.id], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Check verification status
        const verificationStatus = user.verification_status || 'pending';
        if (verificationStatus !== 'approved') {
          return res.status(403).json({ 
            error: 'Bạn cần xác minh danh tính trước khi rút tiền',
            requires_verification: true
          });
        }

        if (user.balance < amount) {
          return res.status(400).json({ error: 'Số dư không đủ' });
        }

        // Update balance FIRST
        db.run('UPDATE users SET balance = balance - ? WHERE id = ?', 
          [amount, req.user.id], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Create withdrawal request
          db.run(
            `INSERT INTO withdrawal_requests 
             (user_id, amount, method, account_number, account_name, status, referral_count, withdrawal_unlock_level)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [req.user.id, amount, payment_method, account_info.account_number || account_info, 
             account_info.account_name || 'N/A', user.active_referrals || 0, unlockInfo.unlockLevel],
            function(err) {
              if (err) {
                // Rollback balance
                db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.id], () => {});
                return res.status(500).json({ error: 'Database error' });
              }

              // Create transaction record
              const methodNames = {
                'bank': 'Chuyển khoản ngân hàng',
                'momo': 'Ví MoMo',
                'zalo': 'Ví ZaloPay'
              };
              const methodName = methodNames[payment_method] || payment_method;
              
              db.run('INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
                [req.user.id, -amount, 'withdrawal', `Yêu cầu rút tiền: ${methodName} - ${account_info}`], 
                (err) => {
                  if (err) {
                    console.error('Error creating transaction:', err);
                  }
                }
              );

              // Calculate referral commission
              referralSystem.calculateWithdrawalCommission(db, req.user.id, amount);

              res.json({ 
                message: 'Yêu cầu rút tiền đã được gửi',
                withdrawal_id: this.lastID
              });
            }
          );
        });
      });
    }
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Lỗi xử lý yêu cầu rút tiền' });
  }
});

// ========== ADMIN ENDPOINTS ==========

// Admin: Update task
app.put('/api/admin/tasks/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { title, description, reward, status } = req.body;
  const taskId = req.params.id;

  // Build update query dynamically
  const updates = [];
  const values = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (reward !== undefined) {
    updates.push('reward = ?');
    values.push(reward);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(taskId);

  db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Task updated successfully' });
  });
});

// Admin: Delete task
app.delete('/api/admin/tasks/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// Admin: Get all users
app.get('/api/admin/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all(`SELECT id, username, email, balance, role, created_at FROM users ORDER BY created_at DESC`,
    (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ users });
  });
});

// Admin: Update user
app.put('/api/admin/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { balance, role } = req.body;
  const userId = req.params.id;

  const updates = [];
  const values = [];

  if (balance !== undefined) {
    updates.push('balance = ?');
    values.push(balance);
  }
  if (role !== undefined) {
    updates.push('role = ?');
    values.push(role);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(userId);

  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User updated successfully' });
  });
});

// Admin: Get all withdrawals
app.get('/api/admin/withdrawals', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all(`SELECT t.*, u.username, u.email 
    FROM transactions t 
    JOIN users u ON t.user_id = u.id 
    WHERE t.type = 'withdrawal'
    ORDER BY t.created_at DESC`, (err, withdrawals) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ withdrawals });
  });
});

// Admin: Get all transactions
app.get('/api/admin/transactions', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all(`SELECT t.*, u.username, u.email 
    FROM transactions t 
    JOIN users u ON t.user_id = u.id 
    ORDER BY t.created_at DESC 
    LIMIT 100`, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ transactions });
  });
});

// Admin: Get user details
app.get('/api/admin/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  db.get('SELECT id, username, email, phone, balance, verification_status, created_at FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  });
});

// Admin: Get referral tree
app.get('/api/admin/referral/tree/:userId', authenticateToken, (req, res) => {
  referralAPI.getReferralTreeAPI(db, req, res);
});

// Admin: Get all KYC data
app.get('/api/admin/kyc-data', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { search, status } = req.query;
  let query = `
    SELECT k.*, u.username, u.email, u.phone, u.created_at as user_created_at
    FROM kyc_data k
    JOIN users u ON k.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (k.cccd_number LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR k.full_name LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (status) {
    query += ` AND k.verification_status = ?`;
    params.push(status);
  }

  query += ` ORDER BY k.created_at DESC LIMIT 1000`;

  db.all(query, params, (err, kycData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ kyc_data: kycData || [] });
  });
});

// Admin: Export KYC data to Excel
app.get('/api/admin/kyc-data/export', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const XLSX = require('xlsx');
  
  db.all(
    `SELECT k.*, u.username, u.email, u.phone, u.balance, u.created_at as user_created_at
     FROM kyc_data k
     JOIN users u ON k.user_id = u.id
     ORDER BY k.created_at DESC`,
    [],
    (err, kycData) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(kycData.map(item => ({
        'User ID': item.user_id,
        'Username': item.username,
        'Email': item.email,
        'Phone': item.phone,
        'CCCD Number': item.cccd_number,
        'Full Name': item.full_name,
        'Date of Birth': item.date_of_birth,
        'Address': item.address,
        'Issue Date': item.issue_date,
        'Issue Place': item.issue_place,
        'Verification Status': item.verification_status,
        'OCR Confidence': item.ocr_confidence,
        'User Balance': item.balance,
        'Created At': item.user_created_at
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'KYC Data');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=kyc-data.xlsx');
      res.send(excelBuffer);
    }
  );
});

// Admin: Get all verifications
app.get('/api/admin/verifications', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Get ALL users with verification files - SIMPLIFIED QUERY
  const query = `SELECT id, username, email, cccd_front, cccd_back, face_video, face_photo, verification_status, verification_notes, created_at
    FROM users 
    WHERE (cccd_front IS NOT NULL AND cccd_front != '') 
       OR (cccd_back IS NOT NULL AND cccd_back != '') 
       OR (face_video IS NOT NULL AND face_video != '')
       OR (face_photo IS NOT NULL AND face_photo != '')
    ORDER BY created_at DESC`;
  
  console.log('Admin verifications query:', query);
  
  db.all(query, (err, verifications) => {
    if (err) {
      console.error('Error fetching verifications:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    console.log(`Found ${verifications.length} verifications`);
    console.log('Sample verification:', verifications[0]);
    res.json({ verifications: verifications || [] });
  });
});

// TEST ENDPOINT: Get all users with any verification data (for debugging)
app.get('/api/admin/verifications/test', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Get ALL users first
  db.all('SELECT id, username, email, cccd_front, cccd_back, face_video, face_photo, verification_status FROM users', (err, allUsers) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    // Get users with verification files
    db.all(`SELECT id, username, email, cccd_front, cccd_back, face_video, face_photo, verification_status, verification_notes, created_at
      FROM users 
      WHERE (cccd_front IS NOT NULL AND cccd_front != '') 
         OR (cccd_back IS NOT NULL AND cccd_back != '') 
         OR (face_video IS NOT NULL AND face_video != '')
         OR (face_photo IS NOT NULL AND face_photo != '')
      ORDER BY created_at DESC`, (err, verifications) => {
      if (err) {
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      res.json({ 
        allUsersCount: allUsers.length,
        allUsers: allUsers,
        verificationsCount: verifications.length,
        verifications: verifications 
      });
    });
  });
});

// Admin: Review verification
app.post('/api/admin/verifications/:id/review', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const userId = req.params.id;
  const { status, notes } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(`UPDATE users SET verification_status = ?, verification_notes = ? WHERE id = ?`, 
    [status, notes || null, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Verification reviewed successfully' });
  });
});

// Admin: Get statistics
app.get('/api/admin/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.get('SELECT COUNT(*) as total_users FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT COUNT(*) as total_tasks FROM tasks', (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      db.get(`SELECT COUNT(*) as pending_submissions FROM submissions WHERE status = 'pending'`, 
        (err, pending) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        db.get(`SELECT SUM(amount) as total_paid FROM transactions WHERE type = 'credit'`, 
          (err, paid) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          db.get(`SELECT SUM(amount) as total_withdrawn FROM transactions WHERE type = 'withdrawal'`, 
            (err, withdrawn) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            db.get(`SELECT SUM(balance) as total_balance FROM users`, 
              (err, balance) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              res.json({
                total_users: users.total_users,
                total_tasks: tasks.total_tasks,
                pending_submissions: pending.pending_submissions,
                total_paid: paid.total_paid || 0,
                total_withdrawn: Math.abs(withdrawn.total_withdrawn || 0),
                total_balance: balance.total_balance || 0
              });
            });
          });
        });
      });
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Access from other devices: http://192.168.1.10:${PORT}`);
  console.log(`Make sure your phone is on the same WiFi network!`);
});

