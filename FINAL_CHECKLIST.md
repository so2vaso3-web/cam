# Checklist Hoàn Thành Referral System

## ✅ Đã Hoàn Thành

### 1. Database Schema
- [x] Bảng `referrals` - quan hệ giới thiệu
- [x] Bảng `referral_earnings` - lịch sử hoa hồng
- [x] Bảng `kyc_data` - dữ liệu KYC với OCR
- [x] Bảng `withdrawal_requests` - yêu cầu rút tiền với lock
- [x] Bảng `referral_bonuses` - bonus đăng ký
- [x] Bảng `user_blocks` - chặn user fake
- [x] Cột mới trong `users`: referral_code, referred_by, referral_level, etc.

### 2. Backend Logic
- [x] Referral system module (`referral-system.js`)
  - Unlimited levels, reward 5 tiers (F1-F5: 10%, 5%, 7%, 5%, 3%)
  - Bonus đăng ký: 30K cho người được mời, 20K cho người mời
  - Hoa hồng từ task completion
  - Hoa hồng từ withdrawal
  - Withdrawal lock: 10/20/50 người mời
- [x] OCR Service (`ocr-service.js`)
  - Tesseract.js integration
  - Google Vision API support
  - Parse CCCD info (số, tên, ngày sinh, địa chỉ)
  - Save to database
- [x] Anti-Fake System (`anti-fake.js`)
  - 1 CCCD = 1 account
  - 1 Phone = 1 account
  - Duplicate check
  - Block suspicious users

### 3. API Endpoints
- [x] `/api/register` - Đăng ký với referral code
- [x] `/api/referral/info` - Thông tin referral
- [x] `/api/referral/chain` - Cây giới thiệu F1-F5
- [x] `/api/referral/earnings` - Lịch sử hoa hồng
- [x] `/api/referral/bonuses` - Lịch sử bonus
- [x] `/api/referral/withdrawal-unlock` - Check unlock status
- [x] `/api/verification/upload` - Upload KYC với OCR
- [x] `/api/withdraw` - Rút tiền với lock check
- [x] `/api/admin/referral/tree/:userId` - Admin: Cây giới thiệu
- [x] `/api/admin/kyc-data` - Admin: Dữ liệu KYC
- [x] `/api/admin/kyc-data/export` - Admin: Export Excel

### 4. Frontend Components
- [x] `referral.js` - Referral UI
  - Hiển thị mã giới thiệu
  - Copy mã
  - Hiển thị số người đã mời
  - Hiển thị hoa hồng
  - Hiển thị trạng thái unlock
  - Popup lock khi chưa unlock
  - Cây giới thiệu F1-F5
  - Lịch sử hoa hồng
- [x] Form đăng ký có input mã giới thiệu
- [x] Withdrawal form check unlock trước khi hiển thị

### 5. Admin Dashboard
- [x] `admin-referral.js` - Admin referral functions
- [x] Tab "Cây Giới Thiệu" - Xem cây 10 tầng
- [x] Tab "Dữ Liệu KYC" - Xem tất cả KYC data
  - Tìm kiếm theo CCCD, phone, email, tên
  - Lọc theo trạng thái
  - Export Excel
  - Hiển thị OCR data
  - Hiển thị ảnh CCCD và face photo

### 6. Integration
- [x] `server-referral-integration.js` - Code để tích hợp vào server.js
- [x] `REFERRAL_INTEGRATION.md` - Hướng dẫn tích hợp
- [x] `COMPLETE_SETUP.md` - Hướng dẫn setup hoàn chỉnh
- [x] `GROWTH_STRATEGY.md` - Chiến lược growth 30 ngày

## ⚠️ Cần Tích Hợp Vào server.js

### Bước 1: Thêm requires
```javascript
const referralSystem = require('./referral-system');
const referralAPI = require('./referral-api');
const ocrService = require('./ocr-service');
const antiFake = require('./anti-fake');
```

### Bước 2: Thay thế các endpoints
- Copy code từ `server-referral-integration.js` vào `server.js`
- Hoặc xem `REFERRAL_INTEGRATION.md` để biết chi tiết

### Bước 3: Khởi tạo database
```bash
node init-referral-db.js
```

## 📋 Test Checklist

### Test Registration
- [ ] Đăng ký không có mã → Nhận 30K
- [ ] Đăng ký có mã → Người mời nhận 20K, người được mời nhận 30K
- [ ] Đăng ký với phone đã tồn tại → Bị chặn
- [ ] Đăng ký với email đã tồn tại → Bị chặn

### Test Referral Commission
- [ ] F1 làm task 10K → F0 nhận 1K (10%)
- [ ] F2 làm task 10K → F0 nhận 0.5K (5%)
- [ ] F1 rút 100K → F0 nhận 10K (10%)

### Test Withdrawal Lock
- [ ] Chưa mời ai → Không thể rút, hiện popup
- [ ] Mời 10 người → Rút được 100K
- [ ] Mời 20 người → Rút không giới hạn
- [ ] Mời 50 người → VIP, rút 10M/ngày

### Test KYC với OCR
- [ ] Upload CCCD mặt trước → OCR extract số CCCD, tên, ngày sinh
- [ ] Upload CCCD đã tồn tại → Bị chặn
- [ ] Admin xem KYC data → Hiển thị đầy đủ
- [ ] Admin export Excel → File Excel có đầy đủ data

### Test Anti-Fake
- [ ] 2 account cùng phone → Bị chặn
- [ ] 2 account cùng CCCD → Bị chặn
- [ ] 1 CCCD = 1 account (enforced)

## 🚀 Deploy

1. Chạy `node init-referral-db.js` để tạo database
2. Tích hợp code vào `server.js` (xem `server-referral-integration.js`)
3. Test tất cả tính năng
4. Deploy lên Railway
5. Test lại trên production

## 📝 Notes

- OCR sử dụng Tesseract.js (local) - có thể chậm
- Có thể upgrade lên Google Vision API cho production
- Referral commission tự động tính khi approve task và withdrawal
- Withdrawal lock được enforce ở cả frontend và backend


