# Sửa lỗi đăng ký và đăng nhập

## Vấn đề đã phát hiện

Regex validation số điện thoại có lỗi trong tất cả các file:
- `[3|5|7|8|9]` trong character class sẽ match với ký tự `|` (pipe), không phải là OR operator
- Điều này khiến validation số điện thoại luôn fail, ngăn không cho đăng ký

## Các file đã sửa

1. ✅ `anti-fake.js` - Sửa regex trong `validatePhoneFormat()`
2. ✅ `server.js` - Sửa regex trong endpoint `/api/register`
3. ✅ `referral-api.js` - Sửa regex trong `registerWithReferralAPI()`
4. ✅ `public/app.js` - Sửa regex trong frontend validation

## Thay đổi

**Trước:**
```javascript
const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
```

**Sau:**
```javascript
const phoneRegex = /^(0|\+84)[35789][0-9]{8}$/;
```

## Cách test

1. Khởi động lại server:
   ```bash
   npm start
   ```

2. Test đăng ký với số điện thoại hợp lệ:
   - `0912345678` ✅
   - `0987654321` ✅
   - `+84912345678` ✅

3. Test đăng nhập với tài khoản đã có

## Lưu ý

- Regex mới sẽ chấp nhận số điện thoại bắt đầu bằng: 03, 05, 07, 08, 09
- Format: `0[35789]xxxxxxxx` (10 số) hoặc `+84[35789]xxxxxxxx` (11 số với +84)

