# Hướng Dẫn Tích Hợp Referral System

## 1. Khởi tạo Database

Chạy script để tạo các bảng referral:
```bash
node init-referral-db.js
```

## 2. Tích hợp vào server.js

### Thêm vào đầu file server.js:
```javascript
const referralSystem = require('./referral-system');
const referralAPI = require('./referral-api');
```

### Sửa endpoint Register (dòng ~247):
Thay thế toàn bộ endpoint `/api/register` bằng:
```javascript
app.post('/api/register', async (req, res) => {
  referralAPI.registerWithReferralAPI(db, req, res);
});
```

### Thêm các API endpoints mới (sau endpoint `/api/me`):
```javascript
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

// Admin: Referral Tree
app.get('/api/admin/referral/tree/:userId', authenticateToken, (req, res) => {
  referralAPI.getReferralTreeAPI(db, req, res);
});
```

### Sửa endpoint Withdrawal (dòng ~598):
Thêm logic kiểm tra unlock trước khi cho phép rút:
```javascript
app.post('/api/withdraw', authenticateToken, (req, res) => {
  const { amount, payment_method, account_info } = req.body;

  // Check withdrawal unlock first
  referralSystem.checkWithdrawalUnlock(db, req.user.id)
    .then(unlockInfo => {
      if (!unlockInfo.unlocked) {
        return res.status(403).json({
          error: unlockInfo.message,
          requires_referrals: true,
          needed: unlockInfo.referrals < 10 ? 10 - unlockInfo.referrals : 
                  unlockInfo.referrals < 20 ? 20 - unlockInfo.referrals : 
                  unlockInfo.referrals < 50 ? 50 - unlockInfo.referrals : 0
        });
      }

      // Check amount limits
      if (unlockInfo.maxAmount && amount > unlockInfo.maxAmount) {
        return res.status(400).json({
          error: `Số tiền rút tối đa là ${unlockInfo.maxAmount.toLocaleString('vi-VN')} ₫`
        });
      }

      // Continue with existing withdrawal logic...
      // (giữ nguyên code hiện tại)
    })
    .catch(err => {
      console.error('Error checking unlock:', err);
      res.status(500).json({ error: 'Error checking withdrawal unlock' });
    });
});
```

### Sửa endpoint Approve Submission (tìm endpoint approve submission):
Sau khi approve submission, thêm logic tính hoa hồng:
```javascript
// After approving submission and giving reward
referralSystem.calculateTaskCommission(db, submission.user_id, task.reward);
```

### Sửa endpoint Withdrawal (sau khi trừ balance):
Sau khi trừ balance, thêm logic tính hoa hồng:
```javascript
// After successful withdrawal
referralSystem.calculateWithdrawalCommission(db, req.user.id, amount);
```

## 3. Cập nhật Frontend

### Thêm vào index.html (trong phần profile):
- Hiển thị mã giới thiệu
- Hiển thị số người đã mời
- Hiển thị hoa hồng đã kiếm
- Hiển thị trạng thái unlock rút tiền

### Thêm vào form đăng ký:
- Input field cho mã giới thiệu (optional)

### Sửa form rút tiền:
- Kiểm tra unlock status trước khi hiển thị form
- Hiển thị thông báo nếu chưa unlock

## 4. Cập nhật Admin Panel

Thêm tab "Referral Tree" để xem cây referral của từng user.

## 5. Testing

1. Test đăng ký với mã giới thiệu
2. Test bonus đăng ký
3. Test hoa hồng từ task
4. Test hoa hồng từ withdrawal
5. Test lock mechanism (10/20/50 người)
6. Test unlock withdrawal


