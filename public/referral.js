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
            console.log('Referral info loaded:', referralInfo);
            if (referralInfo && referralInfo.referral_code) {
                displayReferralInfo();
                checkWithdrawalUnlock();
            } else {
                console.warn('Referral info loaded but no referral_code found:', referralInfo);
                // Show placeholder if no code
                const referralSection = document.getElementById('referral-section');
                if (referralSection) {
                    referralSection.innerHTML = '<div style="padding: 1rem; text-align: center; color: #999;">Đang tải thông tin giới thiệu...</div>';
                }
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error loading referral info:', response.status, errorData);
            // Show error message
            const referralSection = document.getElementById('referral-section');
            if (referralSection) {
                referralSection.innerHTML = `<div style="padding: 1rem; text-align: center; color: #ff4757;">Lỗi tải thông tin giới thiệu: ${errorData.error || 'Unknown error'}</div>`;
            }
        }
    } catch (error) {
        console.error('Error loading referral info:', error);
        const referralSection = document.getElementById('referral-section');
        if (referralSection) {
            referralSection.innerHTML = '<div style="padding: 1rem; text-align: center; color: #ff4757;">Lỗi kết nối khi tải thông tin giới thiệu</div>';
        }
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
                <div class="withdrawal-lock-card">
                    <div class="lock-title">Rút Tiền Bị Khóa</div>
                    <div class="lock-message">${unlockInfo.message || 'Mời thêm người để mở khóa rút tiền'}</div>
                    ${needed > 0 ? `
                        <div class="lock-progress">
                            <div class="lock-progress-text">Đã mời: <strong style="color: #2ed573;">${referralInfo.active_referrals || 0}</strong> / ${referralInfo.active_referrals + needed} người</div>
                            <div class="lock-progress-bar">
                                <div class="lock-progress-fill" style="width: ${((referralInfo.active_referrals || 0) / (referralInfo.active_referrals + needed) * 100)}%;"></div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="lock-requirements">
                        <div class="lock-requirements-title">Yêu cầu mở khóa:</div>
                        <div class="lock-requirements-list">
                            <div>• Mời 10 người → Rút tối đa 100.000 ₫</div>
                            <div>• Mời 20 người → Rút không giới hạn</div>
                            <div>• Mời 50 người → VIP, rút 10.000.000 ₫/ngày</div>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="withdrawal-unlock-card">
                    <div class="unlock-title">Rút Tiền Đã Mở Khóa</div>
                    <div class="unlock-message">${unlockInfo.message || 'Bạn có thể rút tiền bây giờ'}</div>
                    ${unlockInfo.vip ? `
                        <div class="vip-badge">VIP - Rút tối đa 10.000.000 ₫/ngày</div>
                    ` : ''}
                </div>
            `}
        </div>

        <div class="referral-chain-card-new">
            <h3 class="referral-chain-title">Cây Giới Thiệu (F1-F5)</h3>
            <div id="referral-chain-list"></div>
        </div>

        <div class="referral-earnings-card-new">
            <h3 class="referral-earnings-title">Lịch Sử Hoa Hồng</h3>
            <div id="referral-earnings-list"></div>
        </div>
    `;

    loadReferralChain();
    loadReferralEarnings();
}

// Copy referral code - Use modern Clipboard API (GLOBAL)
window.copyReferralCode = function() {
    const codeInput = document.getElementById('referral-code-display');
    if (!codeInput) {
        console.error('Referral code input not found');
        return;
    }
    
    const code = codeInput.value;
    
    // Check if we're on localhost or non-HTTPS - use fallback immediately
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHTTPS = window.location.protocol === 'https:';
    
    // Use modern Clipboard API only on HTTPS (not localhost)
    if (!isLocalhost && isHTTPS && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showSimpleNotification('Đã sao chép mã giới thiệu!', false);
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback to old method
            fallbackCopy(code);
        });
    } else {
        // Always use fallback on localhost or non-HTTPS
        fallbackCopy(code);
    }
};

// Copy referral link - Use modern Clipboard API (GLOBAL)
window.copyReferralLink = function() {
    const linkInput = document.getElementById('referral-link-display');
    if (!linkInput) {
        console.error('Referral link input not found');
        return;
    }
    
    const link = linkInput.value;
    
    // Check if we're on localhost or non-HTTPS - use fallback immediately
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHTTPS = window.location.protocol === 'https:';
    
    // Use modern Clipboard API only on HTTPS (not localhost)
    if (!isLocalhost && isHTTPS && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showSimpleNotification('Đã sao chép link giới thiệu!', false);
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback to old method
            fallbackCopy(link);
        });
    } else {
        // Always use fallback on localhost or non-HTTPS
        fallbackCopy(link);
    }
};

// Simple notification function if not exists
function showSimpleNotification(message, isError) {
    // Try to use existing showNotification
    if (typeof showNotification === 'function') {
        showNotification(message, isError);
        return;
    }
    
    // Create simple toast notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? '#ff4444' : '#4CAF50'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    if (!document.getElementById('notification-style')) {
        style.id = 'notification-style';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fallback copy method for older browsers
function fallbackCopy(text) {
    // Try multiple methods
    let copied = false;
    
    // Method 1: textarea + execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '2em';
        textarea.style.height = '2em';
        textarea.style.padding = '0';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        textarea.style.opacity = '0';
        textarea.style.zIndex = '-1';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        if (document.execCommand('copy')) {
            copied = true;
        }
        document.body.removeChild(textarea);
    } catch (err) {
        console.error('Method 1 failed:', err);
    }
    
    // Method 2: Select input field if exists
    if (!copied) {
        try {
            const codeInput = document.getElementById('referral-code-display');
            const linkInput = document.getElementById('referral-link-display');
            const input = codeInput || linkInput;
            
            if (input) {
                input.select();
                input.setSelectionRange(0, 99999); // For mobile
                if (document.execCommand('copy')) {
                    copied = true;
                }
            }
        } catch (err) {
            console.error('Method 2 failed:', err);
        }
    }
    
    if (copied) {
        showSimpleNotification('Đã sao chép!', false);
    } else {
        // Last resort: Show text in alert for manual copy
        showSimpleNotification('Không thể sao chép tự động. Vui lòng chọn và copy thủ công.', true);
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

// Check withdrawal unlock status (no popup, info is shown in profile)
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
            
            // Info is already displayed in referral section, no popup needed
        }
    } catch (error) {
        console.error('Error checking withdrawal unlock:', error);
    }
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

