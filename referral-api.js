// Referral API Endpoints
// This file contains all referral-related API routes

const referralSystem = require('./referral-system');

// Register with referral code
function registerWithReferralAPI(db, req, res) {
  const { username, email, password, phone, referral_code } = req.body;

  if (!username || !email || !password || !phone) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  // Validate phone number (Vietnamese format)
  const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  const cleanPhone = phone.replace(/\s/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  const hashedPassword = require('bcryptjs').hashSync(password, 10);

  referralSystem.registerWithReferral(db, {
    username,
    email,
    password: hashedPassword,
    phone: cleanPhone
  }, referral_code)
    .then(({ userId, referralCode, referredBy }) => {
      const token = require('jsonwebtoken').sign(
        { id: userId, username, role: 'user' },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );
      
      res.json({
        token,
        user: {
          id: userId,
          username,
          email,
          balance: referralSystem.SIGNUP_BONUS_REFERRED,
          referral_code: referralCode
        },
        referred_by: referredBy,
        signup_bonus: referralSystem.SIGNUP_BONUS_REFERRED
      });
    })
    .catch(err => {
      console.error('Registration error:', err);
      console.error('Error stack:', err.stack);
      
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username hoặc email đã tồn tại' });
      }
      
      if (err.message && (err.message.includes('no such column') || err.message.includes('no such table'))) {
        console.error('Database schema error detected. Please run: npm run init-db');
        return res.status(500).json({ error: 'Lỗi cơ sở dữ liệu. Vui lòng liên hệ quản trị viên.' });
      }
      
      res.status(500).json({ error: 'Lỗi đăng ký: ' + (err.message || 'Unknown error') });
    });
}

// Get referral info
function getReferralInfoAPI(db, req, res) {
  const userId = req.user.id;

  db.get(
    `SELECT referral_code, active_referrals, total_referrals, referral_earnings, 
            withdrawal_unlocked, vip_status, referral_level
     FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error fetching user referral info:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if referral_code exists, if not generate one
      if (!user.referral_code) {
        const referralSystem = require('./referral-system');
        const crypto = require('crypto');
        const newCode = crypto.createHash('md5').update(`${userId}-${Date.now()}`).digest('hex').substring(0, 8).toUpperCase();
        
        db.run('UPDATE users SET referral_code = ? WHERE id = ?', [newCode, userId], (updateErr) => {
          if (updateErr) {
            console.error('Error generating referral code:', updateErr);
          } else {
            user.referral_code = newCode;
          }
          
          // Continue with unlock check
          checkUnlockAndRespond();
        });
      } else {
        checkUnlockAndRespond();
      }
      
      function checkUnlockAndRespond() {
        referralSystem.checkWithdrawalUnlock(db, userId)
          .then(unlockInfo => {
            res.json({
              referral_code: user.referral_code || 'N/A',
              active_referrals: user.active_referrals || 0,
              total_referrals: user.total_referrals || 0,
              referral_earnings: user.referral_earnings || 0,
              withdrawal_unlock: unlockInfo,
              vip_status: user.vip_status || 0,
              referral_level: user.referral_level || 0
            });
          })
          .catch(err => {
            console.error('Error checking unlock:', err);
            // Return basic info even if unlock check fails
            res.json({
              referral_code: user.referral_code || 'N/A',
              active_referrals: user.active_referrals || 0,
              total_referrals: user.total_referrals || 0,
              referral_earnings: user.referral_earnings || 0,
              withdrawal_unlock: {
                unlocked: false,
                referrals: user.active_referrals || 0,
                message: 'Chưa mở khóa rút tiền'
              },
              vip_status: user.vip_status || 0,
              referral_level: user.referral_level || 0
            });
          });
      }
    }
  );
}

// Get referral chain (F1-F5)
function getReferralChainAPI(db, req, res) {
  const userId = req.user.id;

  referralSystem.getReferralChain(db, userId, 5)
    .then(chain => {
      res.json({ chain });
    })
    .catch(err => {
      console.error('Error getting referral chain:', err);
      res.status(500).json({ error: 'Error getting referral chain' });
    });
}

// Get referral earnings history
function getReferralEarningsAPI(db, req, res) {
  const userId = req.user.id;

  db.all(
    `SELECT re.*, u.username as referred_username, u.email as referred_email
     FROM referral_earnings re
     JOIN users u ON re.referred_id = u.id
     WHERE re.referrer_id = ?
     ORDER BY re.created_at DESC
     LIMIT 100`,
    [userId],
    (err, earnings) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ earnings: earnings || [] });
    }
  );
}

// Get referral bonuses
function getReferralBonusesAPI(db, req, res) {
  const userId = req.user.id;

  db.all(
    `SELECT * FROM referral_bonuses
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId],
    (err, bonuses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ bonuses: bonuses || [] });
    }
  );
}

// Admin: Get referral tree
function getReferralTreeAPI(db, req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const userId = parseInt(req.params.userId) || req.query.userId;
  const maxDepth = parseInt(req.query.depth) || 10;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  referralSystem.getReferralTree(db, userId, maxDepth)
    .then(tree => {
      res.json({ tree });
    })
    .catch(err => {
      console.error('Error getting referral tree:', err);
      res.status(500).json({ error: 'Error getting referral tree' });
    });
}

// Check withdrawal unlock status
function checkWithdrawalUnlockAPI(db, req, res) {
  const userId = req.user.id;

  referralSystem.checkWithdrawalUnlock(db, userId)
    .then(unlockInfo => {
      res.json(unlockInfo);
    })
    .catch(err => {
      console.error('Error checking unlock:', err);
      res.status(500).json({ error: 'Error checking unlock status' });
    });
}

module.exports = {
  registerWithReferralAPI,
  getReferralInfoAPI,
  getReferralChainAPI,
  getReferralEarningsAPI,
  getReferralBonusesAPI,
  getReferralTreeAPI,
  checkWithdrawalUnlockAPI
};

