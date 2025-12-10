// Integration code to add to server.js
// Copy and paste these sections into your existing server.js

// ========== ADD TO TOP OF FILE (after other requires) ==========
const referralSystem = require('./referral-system');
const referralAPI = require('./referral-api');
const ocrService = require('./ocr-service');
const antiFake = require('./anti-fake');

// ========== REPLACE REGISTER ENDPOINT (around line 247) ==========
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

  // Use referral system to register
  referralAPI.registerWithReferralAPI(db, req, res);
});

// ========== ADD AFTER /api/me ENDPOINT ==========
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

// ========== REPLACE VERIFICATION UPLOAD ENDPOINT ==========
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
  if (imagePaths.cccd_front) {
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

// ========== REPLACE WITHDRAWAL ENDPOINT ==========
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

// ========== ADD AFTER APPROVE SUBMISSION ==========
// In the approve submission endpoint, after giving reward:
// referralSystem.calculateTaskCommission(db, submission.user_id, task.reward);

// ========== ADD ADMIN ENDPOINTS ==========
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

