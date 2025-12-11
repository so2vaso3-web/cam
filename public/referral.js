// Frontend Referral System
let referralInfo = null;
let referralChain = [];

// Get current token
function getCurrentToken() {
    // Try to get from global variable first (from app.js)
    if (typeof window !== 'undefined' && typeof window.currentToken !== 'undefined' && window.currentToken) {
        return window.currentToken;
    }
    // Try to get from app.js's currentToken if in same scope
    try {
        if (typeof currentToken !== 'undefined' && currentToken) {
            return currentToken;
        }
    } catch(e) {
        // currentToken not in scope, continue
    }
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            // Also try to sync with global if possible
            try {
                if (typeof window !== 'undefined') {
                    window.currentToken = token;
                }
            } catch(e) {
                // Ignore
            }
            return token;
        }
    }
    return null;
}

// Load referral info
async function loadReferralInfo() {
    const token = getCurrentToken();
    console.log('Loading referral info, token exists:', !!token);
    
    if (!token) {
        console.warn('No token found, skipping referral info load');
        const referralSection = document.getElementById('referral-section');
        if (referralSection) {
            referralSection.innerHTML = '<div style="padding: 1rem; text-align: center; color: #ffa502;">Vui lòng đăng nhập để xem thông tin giới thiệu</div>';
        }
        return;
    }
    
    try {
        console.log('Fetching referral info with token:', token.substring(0, 20) + '...');
        const response = await fetch('/api/referral/info', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Referral info response status:', response.status);

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
            const errorData = await response.json().catch(() => {
                return { error: `HTTP ${response.status}: ${response.statusText}` };
            });
            console.error('Error loading referral info:', response.status, errorData);
            
            // Handle specific errors
            let errorMessage = errorData.error || 'Unknown error';
            if (response.status === 401 || response.status === 403) {
                errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                // Clear invalid token
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('token');
                }
                if (typeof window !== 'undefined' && window.currentToken) {
                    window.currentToken = null;
                }
            } else if (response.status === 404 && errorData.error && errorData.error.toLowerCase().includes('user not found')) {
                errorMessage = 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';
            }
            
            // Show error message
            const referralSection = document.getElementById('referral-section');
            if (referralSection) {
                referralSection.innerHTML = `<div style="padding: 1rem; text-align: center; color: #ff4757;">Lỗi tải thông tin giới thiệu: ${errorMessage}</div>`;
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
        <div class="referral-card" style="background: #1a1a1a; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #333;">
            <h3 style="color: #e0e0e0; margin-bottom: 0.75rem; font-size: 1rem; line-height: 1.25;">Mã Giới Thiệu Của Bạn</h3>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                <input type="text" id="referral-code-display" value="${referralInfo.referral_code || 'N/A'}" 
                       readonly style="flex: 1; padding: 0.6rem; background: #2d2d2d; border: 1px solid #404040; border-radius: 8px; color: #e0e0e0; font-size: 1rem; font-weight: 600; text-align: center;">
                <button type="button" onclick="copyReferralCode()" style="padding: 0.6rem 1.1rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                    Sao Chép
                </button>
            </div>
            
            <div style="margin-top: 1rem;">
                <label style="color: #999; font-size: 0.9rem; margin-bottom: 0.35rem; display: block;">Link Giới Thiệu:</label>
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                    <input type="text" id="referral-link-display" value="${referralLink}" 
                           readonly style="flex: 1; padding: 0.6rem; background: #2d2d2d; border: 1px solid #404040; border-radius: 8px; color: #e0e0e0; font-size: 0.82rem; word-break: break-all;">
                    <button type="button" onclick="copyReferralLink()" style="padding: 0.6rem 1rem; background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; white-space: nowrap;">
                        Sao Chép Link
                    </button>
                </div>
                <p style="color: #999; font-size: 0.78rem; margin-top: 0.35rem; line-height: 1.3;">
                    Gửi link này cho bạn bè. Khi họ đăng ký, cả 2 bạn đều nhận phần thưởng!
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                <div style="text-align: center; padding: 0.75rem; background: #2d2d2d; border-radius: 8px;">
                    <div style="color: #999; font-size: 0.8rem; margin-bottom: 0.4rem;">Đã Mời</div>
                    <div style="color: #2ed573; font-size: 1.25rem; font-weight: 600;">${referralInfo.active_referrals || 0}</div>
                </div>
                <div style="text-align: center; padding: 0.75rem; background: #2d2d2d; border-radius: 8px;">
                    <div style="color: #999; font-size: 0.8rem; margin-bottom: 0.4rem;">Hoa Hồng</div>
                    <div style="color: #ffaa00; font-size: 1.25rem; font-weight: 600;">${formatCurrency(referralInfo.referral_earnings || 0)}</div>
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

    // Attach event listeners as backup (in case inline onclick doesn't work)
    setTimeout(() => {
        const copyCodeBtn = referralSection.querySelector('button[onclick="copyReferralCode()"]');
        const copyLinkBtn = referralSection.querySelector('button[onclick="copyReferralLink()"]');
        
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyReferralCode();
            });
        }
        
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyReferralLink();
            });
        }
    }, 100);

    loadReferralChain();
    loadReferralEarnings();
}

// ========== COPY FUNCTIONS ==========

async function copyToClipboard(text) {
    // Try modern Clipboard API first (works on HTTPS/localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback:', err);
        }
    }
    
    // Fallback: Use execCommand with temporary textarea
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        return successful;
    } catch (err) {
        console.error('execCommand copy failed:', err);
        return false;
    }
}

window.copyReferralCode = async function() {
    console.log('copyReferralCode called');
    const el = document.getElementById('referral-code-display');
    if (!el) {
        console.error('Element not found');
        displayMsg('Không tìm thấy mã!', true);
        return;
    }
    
    const text = el.value || el.textContent || '';
    if (!text || text.trim() === '') {
        displayMsg('Mã giới thiệu trống!', true);
        return;
    }
    
    console.log('Text to copy:', text);
    
    const success = await copyToClipboard(text);
    
    if (success) {
        console.log('Copy successful');
        displayMsg('Đã sao chép mã giới thiệu!');
    } else {
        console.error('Copy failed');
        // Fallback: Select text in input for manual copy
        el.focus();
        el.select();
        el.setSelectionRange(0, text.length);
        displayMsg('Vui lòng nhấn Ctrl+C để copy', true);
    }
};

window.copyReferralLink = async function() {
    console.log('copyReferralLink called');
    const el = document.getElementById('referral-link-display');
    if (!el) {
        console.error('Element not found');
        displayMsg('Không tìm thấy link!', true);
        return;
    }
    
    const text = el.value || el.textContent || '';
    if (!text || text.trim() === '') {
        displayMsg('Link giới thiệu trống!', true);
        return;
    }
    
    console.log('Text to copy:', text);
    
    const success = await copyToClipboard(text);
    
    if (success) {
        console.log('Copy successful');
        displayMsg('Đã sao chép link giới thiệu!');
    } else {
        console.error('Copy failed');
        // Fallback: Select text in input for manual copy
        el.focus();
        el.select();
        el.setSelectionRange(0, text.length);
        displayMsg('Vui lòng nhấn Ctrl+C để copy', true);
    }
};

function displayMsg(text, error) {
    console.log('Displaying message:', text, error);
    
    // Remove old
    const old = document.querySelector('.copy-notif');
    if (old) {
        old.remove();
    }
    
    // Create new
    const box = document.createElement('div');
    box.className = 'copy-notif';
    box.textContent = text;
    box.style.cssText = `
        position: fixed !important;
        top: 100px !important;
        right: 20px !important;
        background: ${error ? '#ff4757' : '#2ed573'} !important;
        color: white !important;
        padding: 16px 24px !important;
        border-radius: 10px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        z-index: 999999 !important;
        box-shadow: 0 6px 25px rgba(0,0,0,0.5) !important;
        min-width: 220px !important;
        text-align: center !important;
        pointer-events: none !important;
    `;
    
    document.body.appendChild(box);
    console.log('Message displayed');
    
    // Remove after 3s
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            if (box.parentNode) {
                box.remove();
            }
        }, 300);
    }, 3000);
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

