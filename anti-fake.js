// Anti-Fake System
// Prevents duplicate accounts, fake CCCD, and fraud

const crypto = require('crypto');

// Check if CCCD number is already registered
function checkDuplicateCCCD(db, cccdNumber, excludeUserId = null) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT user_id, username, email FROM kyc_data WHERE cccd_number = ?';
        const params = [cccdNumber];

        if (excludeUserId) {
            query += ' AND user_id != ?';
            params.push(excludeUserId);
        }

        db.get(query, params, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result ? {
                duplicate: true,
                existing_user: result
            } : {
                duplicate: false
            });
        });
    });
}

// Check if phone number is already registered
function checkDuplicatePhone(db, phone, excludeUserId = null) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT id, username, email FROM users WHERE phone = ?';
        const params = [phone];

        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }

        db.get(query, params, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result ? {
                duplicate: true,
                existing_user: result
            } : {
                duplicate: false
            });
        });
    });
}

// Check if email is already registered
function checkDuplicateEmail(db, email, excludeUserId = null) {
    return new Promise((resolve, reject) => {
        let query = 'SELECT id, username FROM users WHERE email = ?';
        const params = [email];

        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }

        db.get(query, params, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result ? {
                duplicate: true,
                existing_user: result
            } : {
                duplicate: false
            });
        });
    });
}

// Validate CCCD number format (12 digits)
function validateCCCDFormat(cccdNumber) {
    if (!cccdNumber) return false;
    const cleaned = cccdNumber.replace(/\s/g, '');
    return /^\d{12}$/.test(cleaned);
}

// Validate phone number format (Vietnamese)
function validatePhoneFormat(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\s/g, '');
    return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleaned);
}

// Check for suspicious patterns (multiple accounts from same IP, device, etc.)
function checkSuspiciousActivity(db, userId, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
        // This would require a logs/activity table
        // For now, we'll check for multiple accounts with same phone/email pattern
        db.get(
            `SELECT COUNT(*) as count FROM users 
             WHERE phone LIKE ? OR email LIKE ?`,
            [`%${ipAddress}%`, `%${ipAddress}%`],
            (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve({
                    suspicious: (result.count || 0) > 3,
                    account_count: result.count || 0
                });
            }
        );
    });
}

// Verify face photo matches (basic check - would need AI for real verification)
function verifyFacePhoto(photoPath1, photoPath2) {
    // This is a placeholder - real implementation would use:
    // - Face++ API
    // - AWS Rekognition
    // - Google Vision Face Detection
    // - Custom ML model
    
    // For now, return true (would need actual AI service)
    return Promise.resolve({
        match: true,
        confidence: 0.85,
        note: 'Face verification requires AI service integration'
    });
}

// Comprehensive anti-fake check before registration
async function validateRegistration(db, userData) {
    const errors = [];

    // Check phone
    const phoneCheck = await checkDuplicatePhone(db, userData.phone);
    if (phoneCheck.duplicate) {
        errors.push('Số điện thoại đã được sử dụng');
    }

    if (!validatePhoneFormat(userData.phone)) {
        errors.push('Số điện thoại không hợp lệ');
    }

    // Check email
    const emailCheck = await checkDuplicateEmail(db, userData.email);
    if (emailCheck.duplicate) {
        errors.push('Email đã được sử dụng');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Comprehensive anti-fake check before KYC submission
async function validateKYC(db, userId, cccdNumber) {
    const errors = [];

    // Check CCCD format
    if (!validateCCCDFormat(cccdNumber)) {
        errors.push('Số CCCD không hợp lệ (phải có 12 chữ số)');
    }

    // Check duplicate CCCD
    const cccdCheck = await checkDuplicateCCCD(db, cccdNumber, userId);
    if (cccdCheck.duplicate) {
        errors.push(`Số CCCD đã được đăng ký bởi tài khoản khác (${cccdCheck.existing_user.username})`);
    }

    return {
        valid: errors.length === 0,
        errors,
        duplicate_info: cccdCheck.duplicate ? cccdCheck.existing_user : null
    };
}

// Block user account (mark as suspicious)
function blockUser(db, userId, reason) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET role = ?, verification_status = ? WHERE id = ?',
            ['blocked', 'rejected', userId],
            (err) => {
                if (err) {
                    return reject(err);
                }

                // Log the block
                db.run(
                    'INSERT INTO user_blocks (user_id, reason, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                    [userId, reason],
                    (err) => {
                        if (err) {
                            console.error('Error logging block:', err);
                        }
                        resolve();
                    }
                );
            }
        );
    });
}

module.exports = {
    checkDuplicateCCCD,
    checkDuplicatePhone,
    checkDuplicateEmail,
    validateCCCDFormat,
    validatePhoneFormat,
    validateRegistration,
    validateKYC,
    verifyFacePhoto,
    blockUser,
    checkSuspiciousActivity
};

