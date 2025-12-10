const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Referral commission rates by level (F1-F5)
const REFERRAL_COMMISSION_RATES = {
    1: 0.10, // 10% for F1
    2: 0.05, // 5% for F2
    3: 0.07, // 7% for F3
    4: 0.05, // 5% for F4
    5: 0.03  // 3% for F5
};

// Bonus amounts
const SIGNUP_BONUS_REFERRED = 30000; // Người được mời
const SIGNUP_BONUS_REFERRER = 20000; // Người mời

// Withdrawal unlock requirements
const WITHDRAWAL_UNLOCK_LEVELS = {
    1: { min_referrals: 10, max_amount: 100000, description: 'Mời đủ 10 người - Rút tối đa 100.000 ₫' },
    2: { min_referrals: 20, max_amount: null, description: 'Mời đủ 20 người - Rút không giới hạn' },
    3: { min_referrals: 50, max_amount: null, daily_limit: 10000000, description: 'Mời đủ 50 người - VIP, rút tối đa 10.000.000 ₫/ngày' }
};

// Generate unique referral code
function generateReferralCode(userId) {
    const hash = crypto.createHash('md5').update(`${userId}-${Date.now()}`).digest('hex');
    return hash.substring(0, 8).toUpperCase();
}

// Initialize referral for new user
function initializeReferral(db, userId, referralCode = null) {
    return new Promise((resolve, reject) => {
        if (!referralCode) {
            referralCode = generateReferralCode(userId);
        }
        
        db.run(
            'UPDATE users SET referral_code = ? WHERE id = ?',
            [referralCode, userId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(referralCode);
                }
            }
        );
    });
}

// Register new user with referral
function registerWithReferral(db, userData, referralCode = null) {
    return new Promise((resolve, reject) => {
        let referredBy = null;
        let referralLevel = 0;
        
        // If referral code provided, find referrer
        if (referralCode) {
            db.get(
                'SELECT id FROM users WHERE referral_code = ?',
                [referralCode],
                (err, referrer) => {
                    if (err) {
                        return reject(err);
                    }
                    
                    if (referrer) {
                        referredBy = referrer.id;
                        referralLevel = 1;
                    }
                    
                    // Create user
                    createUserWithReferral(db, userData, referredBy, referralLevel, resolve, reject);
                }
            );
        } else {
            createUserWithReferral(db, userData, null, 0, resolve, reject);
        }
    });
}

function createUserWithReferral(db, userData, referredBy, referralLevel, resolve, reject) {
    const referralCode = generateReferralCode(Date.now());
    
    db.run(
        `INSERT INTO users (username, email, password, phone, referral_code, referred_by, referral_level, balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userData.username,
            userData.email,
            userData.password,
            userData.phone,
            referralCode,
            referredBy,
            referralLevel,
            SIGNUP_BONUS_REFERRED // Give signup bonus
        ],
        function(err) {
            if (err) {
                return reject(err);
            }
            
            const userId = this.lastID;
            
            // If referred, create referral relationship and give bonuses
            if (referredBy) {
                createReferralRelationship(db, referredBy, userId, 1)
                    .then(() => {
                        // Give signup bonus to referrer
                        giveSignupBonus(db, referredBy, userId);
                        // Update referral counts
                        updateReferralCounts(db, referredBy);
                        resolve({ userId, referralCode, referredBy });
                    })
                    .catch(reject);
            } else {
                resolve({ userId, referralCode, referredBy: null });
            }
        }
    );
}

// Create referral relationship
function createReferralRelationship(db, referrerId, referredId, level) {
    return new Promise((resolve, reject) => {
        // Get referrer's level to calculate new level
        db.get(
            'SELECT referral_level FROM users WHERE id = ?',
            [referrerId],
            (err, referrer) => {
                if (err) return reject(err);
                
                const newLevel = (referrer?.referral_level || 0) + level;
                
                db.run(
                    'INSERT INTO referrals (referrer_id, referred_id, level) VALUES (?, ?, ?)',
                    [referrerId, referredId, newLevel],
                    (err) => {
                        if (err) return reject(err);
                        
                        // Update referred user's level
                        db.run(
                            'UPDATE users SET referral_level = ? WHERE id = ?',
                            [newLevel, referredId],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            }
                        );
                    }
                );
            }
        );
    });
}

// Give signup bonus
function giveSignupBonus(db, referrerId, referredId) {
    // Bonus for referred user (already given in balance)
    // Bonus for referrer
    db.run(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [SIGNUP_BONUS_REFERRER, referrerId],
        (err) => {
            if (!err) {
                // Record bonus transaction for referrer
                db.run(
                    `INSERT INTO referral_bonuses (user_id, referrer_id, bonus_amount, type)
                     VALUES (?, ?, ?, ?)`,
                    [referrerId, null, SIGNUP_BONUS_REFERRER, 'referral_bonus'],
                    (err) => {
                        if (!err) {
                            // Record transaction for referrer
                            db.run(
                                `INSERT INTO transactions (user_id, amount, type, description)
                                 VALUES (?, ?, ?, ?)`,
                                [referrerId, SIGNUP_BONUS_REFERRER, 'credit', 'Thưởng mời người mới đăng ký']
                            );
                        }
                    }
                );
                
                // Record bonus transaction for referred user
                db.run(
                    `INSERT INTO referral_bonuses (user_id, referrer_id, bonus_amount, type)
                     VALUES (?, ?, ?, ?)`,
                    [referredId, referrerId, SIGNUP_BONUS_REFERRED, 'signup_bonus'],
                    (err) => {
                        if (!err) {
                            // Record transaction for referred user
                            db.run(
                                `INSERT INTO transactions (user_id, amount, type, description)
                                 VALUES (?, ?, ?, ?)`,
                                [referredId, SIGNUP_BONUS_REFERRED, 'credit', 'Thưởng đăng ký bằng mã giới thiệu']
                            );
                        }
                    }
                );
            }
        }
    );
}

// Update referral counts
function updateReferralCounts(db, referrerId) {
    db.get(
        'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?',
        [referrerId],
        (err, result) => {
            if (!err && result) {
                const count = result.count || 0;
                db.run(
                    'UPDATE users SET total_referrals = ?, active_referrals = ? WHERE id = ?',
                    [count, count, referrerId],
                    (err) => {
                        if (err) {
                            console.error('Error updating referral counts:', err);
                        }
                    }
                );
            }
        }
    );
}

// Calculate referral commission for task completion
function calculateTaskCommission(db, userId, taskReward) {
    getReferralChain(db, userId, 5).then(chain => {
        chain.forEach((referrer, index) => {
            const level = index + 1;
            if (level <= 5 && REFERRAL_COMMISSION_RATES[level]) {
                const commission = taskReward * REFERRAL_COMMISSION_RATES[level];
                
                // Add commission to referrer's balance
                db.run(
                    'UPDATE users SET balance = balance + ?, referral_earnings = referral_earnings + ? WHERE id = ?',
                    [commission, commission, referrer.id],
                    (err) => {
                        if (!err) {
                            // Record earnings
                            db.run(
                                `INSERT INTO referral_earnings (referrer_id, referred_id, level, amount, source, description)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [referrer.id, userId, level, commission, 'task', `Hoa hồng F${level} từ task`]
                            );
                            
                            // Record bonus transaction
                            db.run(
                                `INSERT INTO referral_bonuses (user_id, referrer_id, bonus_type, amount, level, description)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [referrer.id, userId, 'task_commission', commission, level, `Hoa hồng F${level} từ task`]
                            );
                        }
                    }
                );
            }
        });
    });
}

// Calculate referral commission for withdrawal
function calculateWithdrawalCommission(db, userId, withdrawalAmount) {
    getReferralChain(db, userId, 5).then(chain => {
        chain.forEach((referrer, index) => {
            const level = index + 1;
            if (level <= 5 && REFERRAL_COMMISSION_RATES[level]) {
                const commission = withdrawalAmount * REFERRAL_COMMISSION_RATES[level];
                
                // Add commission to referrer's balance
                db.run(
                    'UPDATE users SET balance = balance + ?, referral_earnings = referral_earnings + ? WHERE id = ?',
                    [commission, commission, referrer.id],
                    (err) => {
                        if (!err) {
                            // Record earnings
                            db.run(
                                `INSERT INTO referral_earnings (referrer_id, referred_id, source_type, source_id, amount, commission_percent, level)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [referrer.id, userId, 'withdrawal', 0, commission, REFERRAL_COMMISSION_RATES[level] * 100, level]
                            );
                            
                            // Record transaction
                            db.run(
                                `INSERT INTO transactions (user_id, amount, type, description)
                                 VALUES (?, ?, ?, ?)`,
                                [referrer.id, commission, 'credit', `Hoa hồng F${level} từ rút tiền`]
                            );
                            
                            // Record bonus transaction
                            db.run(
                                `INSERT INTO referral_bonuses (user_id, referrer_id, bonus_type, amount, level, description)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [referrer.id, userId, 'withdrawal_commission', commission, level, `Hoa hồng F${level} từ rút tiền`]
                            );
                        }
                    }
                );
            }
        });
    });
}

// Get referral chain (up to 5 levels)
function getReferralChain(db, userId, maxLevel = 5) {
    return new Promise((resolve, reject) => {
        const chain = [];
        let currentUserId = userId;
        let level = 0;
        
        function getNextReferrer() {
            if (level >= maxLevel) {
                return resolve(chain);
            }
            
            db.get(
                'SELECT referred_by FROM users WHERE id = ?',
                [currentUserId],
                (err, user) => {
                    if (err) return reject(err);
                    
                    if (!user || !user.referred_by) {
                        return resolve(chain);
                    }
                    
                    db.get(
                        'SELECT id, username, email FROM users WHERE id = ?',
                        [user.referred_by],
                        (err, referrer) => {
                            if (err) return reject(err);
                            
                            if (referrer) {
                                chain.push(referrer);
                                currentUserId = referrer.id;
                                level++;
                                getNextReferrer();
                            } else {
                                resolve(chain);
                            }
                        }
                    );
                }
            );
        }
        
        getNextReferrer();
    });
}

// Check withdrawal unlock status
function checkWithdrawalUnlock(db, userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT active_referrals, withdrawal_unlocked, vip_status FROM users WHERE id = ?',
            [userId],
            (err, user) => {
                if (err) return reject(err);
                
                if (!user) return reject(new Error('User not found'));
                
                const referrals = user.active_referrals || 0;
                let unlockLevel = 0;
                let maxAmount = null;
                let dailyLimit = null;
                let message = '';
                
                if (referrals >= 50) {
                    unlockLevel = 3;
                    dailyLimit = 10000000;
                    message = 'VIP - Rút tối đa 10.000.000 ₫/ngày';
                } else if (referrals >= 20) {
                    unlockLevel = 2;
                    message = 'Rút không giới hạn';
                } else if (referrals >= 10) {
                    unlockLevel = 1;
                    maxAmount = 100000;
                    message = 'Rút tối đa 100.000 ₫';
                } else {
                    const needed = 10 - referrals;
                    message = `Mời thêm ${needed} người nữa để mở khóa rút tiền`;
                }
                
                resolve({
                    unlocked: unlockLevel > 0,
                    unlockLevel,
                    maxAmount,
                    dailyLimit,
                    referrals,
                    message,
                    vip: unlockLevel === 3
                });
            }
        );
    });
}

// Get referral tree (for admin)
function getReferralTree(db, userId, maxDepth = 10) {
    return new Promise((resolve, reject) => {
        function buildTree(userId, depth) {
            if (depth > maxDepth) {
                return null;
            }
            
            return new Promise((resolveNode, rejectNode) => {
                db.get(
                    'SELECT id, username, email, referral_code, active_referrals, referral_earnings, created_at FROM users WHERE id = ?',
                    [userId],
                    (err, user) => {
                        if (err) return rejectNode(err);
                        if (!user) return resolveNode(null);
                        
                        // Get direct referrals
                        db.all(
                            'SELECT referred_id FROM referrals WHERE referrer_id = ? AND level = 1',
                            [userId],
                            (err, referrals) => {
                                if (err) return rejectNode(err);
                                
                                const childrenPromises = (referrals || []).map(ref => 
                                    buildTree(ref.referred_id, depth + 1)
                                );
                                
                                Promise.all(childrenPromises).then(children => {
                                    resolveNode({
                                        ...user,
                                        children: children.filter(c => c !== null)
                                    });
                                }).catch(rejectNode);
                            }
                        );
                    }
                );
            });
        }
        
        buildTree(userId, 0).then(resolve).catch(reject);
    });
}

module.exports = {
    initializeReferral,
    registerWithReferral,
    calculateTaskCommission,
    calculateWithdrawalCommission,
    checkWithdrawalUnlock,
    getReferralChain,
    getReferralTree,
    updateReferralCounts,
    REFERRAL_COMMISSION_RATES,
    SIGNUP_BONUS_REFERRED,
    SIGNUP_BONUS_REFERRER,
    WITHDRAWAL_UNLOCK_LEVELS
};

