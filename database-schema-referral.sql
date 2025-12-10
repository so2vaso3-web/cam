-- Database Schema for Referral System
-- SQLite3 compatible

-- Add referral columns to users table
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referred_by INTEGER;
ALTER TABLE users ADD COLUMN referral_level INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN active_referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_earnings REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN vip_status INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN withdrawal_unlocked INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN first_withdrawal_limit REAL DEFAULT 100000;
ALTER TABLE users ADD COLUMN daily_withdrawal_limit REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN kyc_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN kyc_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN cccd_number TEXT UNIQUE;
ALTER TABLE users ADD COLUMN cccd_name TEXT;
ALTER TABLE users ADD COLUMN cccd_dob TEXT;
ALTER TABLE users ADD COLUMN cccd_address TEXT;

-- Referrals table - track referral relationships
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id),
    UNIQUE(referrer_id, referred_id)
);

-- Referral earnings table - track all referral commissions
CREATE TABLE IF NOT EXISTS referral_earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    amount REAL NOT NULL,
    source TEXT NOT NULL, -- 'task', 'withdrawal', 'signup'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
);

-- KYC data table - store OCR extracted data
CREATE TABLE IF NOT EXISTS kyc_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    cccd_number TEXT UNIQUE,
    full_name TEXT,
    date_of_birth TEXT,
    address TEXT,
    issue_date TEXT,
    issue_place TEXT,
    cccd_front_path TEXT,
    cccd_back_path TEXT,
    face_video_path TEXT,
    face_photo_path TEXT,
    ocr_data TEXT, -- JSON string of OCR results
    ocr_confidence REAL,
    verification_status TEXT DEFAULT 'pending',
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Withdrawal requests with lock tracking
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL, -- 'momo', 'zalopay', 'bank'
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    referral_count INTEGER DEFAULT 0,
    withdrawal_unlock_level INTEGER DEFAULT 0, -- 0=locked, 1=10 people, 2=20 people, 3=50 people
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Referral bonus transactions
CREATE TABLE IF NOT EXISTS referral_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    referrer_id INTEGER,
    bonus_type TEXT NOT NULL, -- 'signup_referred', 'signup_referrer', 'task_commission', 'withdrawal_commission'
    amount REAL NOT NULL,
    level INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (referrer_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);
CREATE INDEX IF NOT EXISTS idx_kyc_cccd ON kyc_data(cccd_number);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

