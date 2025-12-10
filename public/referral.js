// Frontend Referral System
let referralInfo = null;
let referralChain = [];

// Get current token
function getCurrentToken() {
    if (typeof currentToken !== 'undefined' && currentToken) {
        return currentToken;
    }
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
}

// Load referral info
async function loadReferralInfo() {
    const token = getCurrentToken();
    if (!token) {
        console.log('No token found, skipping referral info load');
        return;
    }
    
    try {
        const response = await fetch('/api/referral/info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            referralInfo = await response.json();
            if (referralInfo && referralInfo.referral_code) {
                displayReferralInfo();
                checkWithdrawalUnlock();
            } else {
                console.warn('Referral info loaded but no referral_code found');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error loading referral info:', response.status, errorData);
        }
    } catch (error) {
        console.error('Error loading referral info:', error);
    }
}

// Display referral info
function displayReferralInfo() {
    if (!referralInfo || !referralInfo.referral_code) {
        console.log('Referral info or code not available');
        return;
    }

    const referralSection = document.getElementById('referral-section');
    if (!referralSection) {
        console.error('Referral section element not found!');
        return;
    }

    const unlockInfo = referralInfo.withdrawal_unlock || {};
    const needed = unlockInfo.referrals < 10 ? 10 - unlockInfo.referrals :
                   unlockInfo.referrals < 20 ? 20 - unlockInfo.referrals :
                   unlockInfo.referrals < 50 ? 50 - unlockInfo.referrals : 0;

    // Get current URL for referral link
    const currentUrl = window.location.origin + window.location.pathname;
    const referralLink = `${currentUrl}?ref=${referralInfo.referral_code || ''}`;

    referralSection.innerHTML = `
        <div class="referral-card" style="background: #1a1a1a; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #333;">
            <h3 style="color: #e0e0e0; margin-bottom: 1rem;">Mã Giới Thiệu Của Bạn</h3>
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <input type="text" id="referral-code-display" value="${referralInfo.referral_code || 'N/A'}" 
                       readonly style="flex: 1; padding: 0.75rem; background: #2d2d2d; border: 1px solid #404040; border-radius: 8px; color: #e0e0e0; font-size: 1.1rem; font-weight: 600; text-align: center;">
                <button onclick="copyReferralCode()" style="padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Sao Chép
                </button>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <label style="color: #999; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">Link Giới Thiệu:</label>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <input type="text" id="referral-link-display" value="${referralLink}" 
                           readonly style="flex: 1; padding: 0.75rem; background: #2d2d2d; border: 1px solid #404040; border-radius: 8px; color: #e0e0e0; font-size: 0.9rem; word-break: break-all;">
                    <button onclick="copyReferralLink()" style="padding: 0.75rem 1.5rem; background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                        Sao Chép Link
                    </button>
                </div>
                <p style="color: #999; font-size: 0.8rem; margin-top: 0.5rem;">
                    Gửi link này cho bạn bè. Khi họ đăng ký, cả 2 bạn đều nhận phần thưởng!
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
                <div style="text-align: center; padding: 1rem; background: #2d2d2d; border-radius: 8px;">
                    <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.5rem;">Đã Mời</div>
                    <div style="color: #2ed573; font-size: 1.5rem; font-weight: 600;">${referralInfo.active_referrals || 0}</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #2d2d2d; border-radius: 8px;">
                    <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.5rem;">Hoa Hồng</div>
                    <div style="color: #ffaa00; font-size: 1.5rem; font-weight: 600;">${formatCurrency(referralInfo.referral_earnings || 0)}</div>
                </div>
            </div>

            ${!unlockInfo.unlocked ? `
                <div style="margin-top: 1.5rem; padding: 1rem; background: #ff4444; border-radius: 8px; border-left: 4px solid #ff0000;">
                    <div style="color: white; font-weight: 600; margin-bottom: 0.5rem;">🔒 Rút Tiền Bị Khóa</div>
                    <div style="color: #ffe0e0; font-size: 0.9rem;">
                        ${unlockInfo.message || 'Mời thêm người để mở khóa rút tiền'}
                    </div>
                    ${needed > 0 ? `
                        <div style="margin-top: 1rem;">
                            <div style="color: white; font-size: 0.85rem; margin-bottom: 0.5rem;">
                                Còn thiếu: <strong>${needed} người</strong>
                            </div>
                            <div style="background: rgba(255,255,255,0.2); border-radius: 4px; height: 8px; overflow: hidden;">
                                <div style="background: white; height: 100%; width: ${((referralInfo.active_referrals || 0) / (referralInfo.active_referrals + needed) * 100)}%; transition: width 0.3s;"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div style="margin-top: 1.5rem; padding: 1rem; background: #2ed573; border-radius: 8px;">
                    <div style="color: white; font-weight: 600;">✅ Rút Tiền Đã Mở Khóa</div>
                    <div style="color: #e0ffe0; font-size: 0.9rem; margin-top: 0.5rem;">
                        ${unlockInfo.message || 'Bạn có thể rút tiền bây giờ'}
                    </div>
                    ${unlockInfo.vip ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.2); border-radius: 4px; color: white; font-weight: 600;">
                            👑 VIP - Rút tối đa 10.000.000 ₫/ngày
                        </div>
                    ` : ''}
                </div>
            `}
        </div>

        <div class="referral-chain-card" style="background: #1a1a1a; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #333;">
            <h3 style="color: #e0e0e0; margin-bottom: 1rem;">Cây Giới Thiệu (F1-F5)</h3>
            <div id="referral-chain-list"></div>
        </div>

        <div class="referral-earnings-card" style="background: #1a1a1a; padding: 1.5rem; border-radius: 12px; border: 1px solid #333;">
            <h3 style="color: #e0e0e0; margin-bottom: 1rem;">Lịch Sử Hoa Hồng</h3>
            <div id="referral-earnings-list"></div>
        </div>
    `;

    loadReferralChain();
    loadReferralEarnings();
}

// Copy referral code
function copyReferralCode() {
    const codeInput = document.getElementById('referral-code-display');
    if (codeInput) {
        codeInput.select();
        document.execCommand('copy');
        showNotification('Đã sao chép mã giới thiệu!', false);
    }
}

// Copy referral link
function copyReferralLink() {
    const linkInput = document.getElementById('referral-link-display');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        showNotification('Đã sao chép link giới thiệu!', false);
    }
}

// Load referral chain
async function loadReferralChain() {
    const token = getCurrentToken();
    if (!token) return;
    
    try {
        const response = await fetch('/api/referral/chain', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            referralChain = data.chain || [];
            displayReferralChain();
        }
    } catch (error) {
        console.error('Error loading referral chain:', error);
    }
}

// Display referral chain
function displayReferralChain() {
    const list = document.getElementById('referral-chain-list');
    if (!list) return;

    if (referralChain.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">Chưa có người được mời</p>';
        return;
    }

    const commissionRates = { 1: '10%', 2: '5%', 3: '7%', 4: '5%', 5: '3%' };

    list.innerHTML = referralChain.map((ref, index) => {
        const level = index + 1;
        return `
            <div style="padding: 1rem; background: #2d2d2d; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid #667eea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #e0e0e0; font-weight: 600;">F${level}: ${ref.username || 'N/A'}</div>
                        <div style="color: #999; font-size: 0.85rem; margin-top: 0.25rem;">${ref.email || 'N/A'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #2ed573; font-weight: 600;">Hoa hồng: ${commissionRates[level] || '0%'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load referral earnings
async function loadReferralEarnings() {
    const token = getCurrentToken();
    if (!token) return;
    
    try {
        const response = await fetch('/api/referral/earnings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayReferralEarnings(data.earnings || []);
        }
    } catch (error) {
        console.error('Error loading referral earnings:', error);
    }
}

// Display referral earnings
function displayReferralEarnings(earnings) {
    const list = document.getElementById('referral-earnings-list');
    if (!list) return;

    if (earnings.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">Chưa có hoa hồng</p>';
        return;
    }

    list.innerHTML = earnings.slice(0, 10).map(earning => {
        return `
            <div style="padding: 1rem; background: #2d2d2d; border-radius: 8px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="color: #e0e0e0; font-weight: 600;">F${earning.level}: ${earning.description || earning.source}</div>
                    <div style="color: #999; font-size: 0.85rem; margin-top: 0.25rem;">
                        Từ: ${earning.referred_username || 'N/A'} - ${new Date(earning.created_at).toLocaleString('vi-VN')}
                    </div>
                </div>
                <div style="color: #2ed573; font-weight: 600; font-size: 1.1rem;">
                    +${formatCurrency(earning.amount)}
                </div>
            </div>
        `;
    }).join('');
}

// Check withdrawal unlock and show popup if locked
async function checkWithdrawalUnlock() {
    const token = getCurrentToken();
    if (!token) return;
    
    try {
        const response = await fetch('/api/referral/withdrawal-unlock', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const unlockInfo = await response.json();
            
            // Store in global for withdrawal form
            window.withdrawalUnlockInfo = unlockInfo;

            // Show popup if locked
            if (!unlockInfo.unlocked) {
                showWithdrawalLockPopup(unlockInfo);
            }
        }
    } catch (error) {
        console.error('Error checking withdrawal unlock:', error);
    }
}

// Show withdrawal lock popup
function showWithdrawalLockPopup(unlockInfo) {
    // Remove existing popup
    const existing = document.getElementById('withdrawal-lock-popup');
    if (existing) {
        existing.remove();
    }

    const needed = unlockInfo.referrals < 10 ? 10 - unlockInfo.referrals :
                   unlockInfo.referrals < 20 ? 20 - unlockInfo.referrals :
                   unlockInfo.referrals < 50 ? 50 - unlockInfo.referrals : 0;

    const popup = document.createElement('div');
    popup.id = 'withdrawal-lock-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    `;

    popup.innerHTML = `
        <div style="background: #1a1a1a; padding: 2rem; border-radius: 12px; max-width: 500px; width: 100%; border: 2px solid #ff4444;">
            <h2 style="color: #ff4444; margin-bottom: 1rem; text-align: center;">🔒 Rút Tiền Bị Khóa</h2>
            <p style="color: #e0e0e0; margin-bottom: 1.5rem; text-align: center;">
                ${unlockInfo.message}
            </p>
            ${needed > 0 ? `
                <div style="margin-bottom: 1.5rem;">
                    <div style="color: #999; font-size: 0.9rem; margin-bottom: 0.5rem;">
                        Đã mời: <strong style="color: #2ed573;">${unlockInfo.referrals}</strong> / 
                        ${unlockInfo.referrals + needed} người
                    </div>
                    <div style="background: #2d2d2d; border-radius: 4px; height: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #2ed573, #667eea); height: 100%; width: ${(unlockInfo.referrals / (unlockInfo.referrals + needed) * 100)}%; transition: width 0.3s;"></div>
                    </div>
                </div>
            ` : ''}
            <div style="background: #2d2d2d; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <div style="color: #e0e0e0; font-weight: 600; margin-bottom: 0.75rem;">Yêu cầu mở khóa:</div>
                <div style="color: #999; font-size: 0.9rem; line-height: 1.6;">
                    • Mời 10 người → Rút tối đa 100.000 ₫<br>
                    • Mời 20 người → Rút không giới hạn<br>
                    • Mời 50 người → VIP, rút 10.000.000 ₫/ngày
                </div>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button onclick="closeWithdrawalLockPopup()" style="flex: 1; padding: 0.75rem; background: #404040; color: #e0e0e0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Đóng
                </button>
                <button onclick="goToReferralSection()" style="flex: 1; padding: 0.75rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Xem Mã Giới Thiệu
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);
}

// Close withdrawal lock popup
function closeWithdrawalLockPopup() {
    const popup = document.getElementById('withdrawal-lock-popup');
    if (popup) {
        popup.remove();
    }
}

// Go to referral section
function goToReferralSection() {
    closeWithdrawalLockPopup();
    // Switch to profile tab and scroll to referral section
    if (typeof showProfileTab === 'function') {
        showProfileTab();
    }
    setTimeout(() => {
        const section = document.getElementById('referral-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Initialize on page load - will be called from app.js when profile is shown
// Don't auto-load here, wait for explicit call

