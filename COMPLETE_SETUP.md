# Hướng Dẫn Setup Hoàn Chỉnh Referral System

## Bước 1: Khởi tạo Database

```bash
node init-referral-db.js
```

Script này sẽ:
- Tạo các bảng: `referrals`, `referral_earnings`, `kyc_data`, `withdrawal_requests`, `referral_bonuses`, `user_blocks`
- Thêm các cột mới vào bảng `users` cho referral system

## Bước 2: Tích hợp vào server.js

### 2.1. Thêm requires vào đầu file (sau dòng 11):
```javascript
const referralSystem = require('./referral-system');
const referralAPI = require('./referral-api');
const ocrService = require('./ocr-service');
const antiFake = require('./anti-fake');
```

### 2.2. Thay thế endpoint `/api/register` (dòng ~247):
Copy toàn bộ code từ `server-referral-integration.js` phần "REPLACE REGISTER ENDPOINT"

### 2.3. Thêm các API endpoints mới (sau endpoint `/api/me`):
Copy toàn bộ code từ `server-referral-integration.js` phần "ADD AFTER /api/me ENDPOINT"

### 2.4. Thay thế endpoint `/api/verification/upload`:
Copy code từ `server-referral-integration.js` phần "REPLACE VERIFICATION UPLOAD ENDPOINT"

### 2.5. Thay thế endpoint `/api/withdraw`:
Copy code từ `server-referral-integration.js` phần "REPLACE WITHDRAWAL ENDPOINT"

### 2.6. Tìm endpoint approve submission và thêm:
Sau khi approve và give reward, thêm:
```javascript
// Calculate referral commission
referralSystem.calculateTaskCommission(db, submission.user_id, task.reward);
```

### 2.7. Thêm admin endpoints (cuối file, trước `app.listen`):
Copy code từ `server-referral-integration.js` phần "ADD ADMIN ENDPOINTS"

## Bước 3: Kiểm tra Frontend

### 3.1. Đảm bảo các file được include:
- `index.html` đã có `<script src="referral.js"></script>`
- `admin.html` đã có `<script src="admin-referral.js"></script>`

### 3.2. Test các tính năng:
1. Đăng ký với mã giới thiệu
2. Xem referral info trong profile
3. Test withdrawal lock popup
4. Admin: Xem referral tree
5. Admin: Xem KYC data và export Excel

## Bước 4: Cấu hình OCR (Optional)

### Option 1: Tesseract.js (Default - không cần API key)
Đã được cài đặt sẵn, hoạt động ngay.

### Option 2: Google Vision API (Chính xác hơn)
1. Tạo Google Cloud project
2. Enable Vision API
3. Tạo service account key
4. Download JSON key file
5. Set environment variable: `GOOGLE_VISION_KEY_FILE=./google-vision-key.json`
6. Set `OCR_PROVIDER=google` trong `.env`

## Bước 5: Test Toàn Bộ Hệ Thống

### Test Cases:

1. **Registration với referral code:**
   - Đăng ký user A (không có mã)
   - Đăng ký user B với mã của A
   - Kiểm tra: B nhận 30K, A nhận 20K

2. **Task commission:**
   - User B làm task, nhận 10K
   - Kiểm tra: User A nhận 10% = 1K hoa hồng

3. **Withdrawal lock:**
   - User A (chưa mời ai) → Không thể rút
   - User A mời 10 người → Rút được 100K
   - User A mời 20 người → Rút không giới hạn
   - User A mời 50 người → VIP, rút 10M/ngày

4. **KYC với OCR:**
   - Upload CCCD mặt trước
   - Kiểm tra OCR extract được số CCCD, tên, ngày sinh
   - Kiểm tra duplicate CCCD bị chặn

5. **Anti-fake:**
   - Đăng ký 2 account cùng phone → Bị chặn
   - Đăng ký 2 account cùng CCCD → Bị chặn

## Bước 6: Deploy

1. Commit và push code
2. Railway sẽ tự động rebuild
3. Chạy `node init-referral-db.js` trên server (hoặc tạo migration script)

## Lưu Ý Quan Trọng

1. **Database Migration:**
   - Script `init-referral-db.js` sử dụng `ALTER TABLE` - an toàn cho production
   - Nếu có lỗi "duplicate column", bỏ qua (đã tồn tại)

2. **OCR Performance:**
   - Tesseract.js chạy trên server, có thể chậm
   - Nên dùng Google Vision API cho production

3. **Referral Commission:**
   - Tự động tính khi approve task
   - Tự động tính khi user rút tiền
   - Chỉ tính F1-F5 (5 tầng)

4. **Withdrawal Lock:**
   - Lock được check trước khi cho phép rút
   - Popup hiển thị nếu bị lock
   - User phải mời đủ người mới rút được

5. **Anti-Fake:**
   - 1 CCCD = 1 account (enforced)
   - 1 Phone = 1 account (enforced)
   - Duplicate check khi đăng ký và KYC

## Troubleshooting

### Lỗi "Cannot find module 'referral-system'"
→ Đảm bảo đã require đúng path

### OCR không extract được
→ Kiểm tra ảnh có rõ nét không
→ Thử dùng Google Vision API

### Referral commission không tính
→ Kiểm tra đã gọi `calculateTaskCommission` sau khi approve task
→ Kiểm tra referral relationship đã được tạo chưa

### Withdrawal vẫn rút được khi chưa mời đủ
→ Kiểm tra đã tích hợp `checkWithdrawalUnlock` vào endpoint chưa
→ Kiểm tra `active_referrals` có được update không

