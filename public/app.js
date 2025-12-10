let currentUser = null;
let currentToken = null;
let currentTaskId = null;

// ============================================
// AUTH SYSTEM - COMPLETELY REBUILT FROM SCRATCH
// ============================================

// Check for referral code in URL
const urlParams = new URLSearchParams(window.location.search);
const referralCodeFromUrl = urlParams.get('ref');
if (referralCodeFromUrl) {
    sessionStorage.setItem('referral_code', referralCodeFromUrl);
}

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        currentToken = token;
        fetchUserInfo();
    } else {
        showAuthSection();
    }
}

// Show auth section
function showAuthSection() {
    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    const logoutBtn = document.getElementById('logoutBtn');
    const bottomNav = document.getElementById('bottomNav');
    
    if (authSection) authSection.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
}

// Show main content
function showMainContent() {
    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    const logoutBtn = document.getElementById('logoutBtn');
    const bottomNav = document.getElementById('bottomNav');
    
    if (authSection) authSection.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'flex';
    
    loadTasks();
    loadBalance();
    
    const firstTab = document.querySelector('.bottom-nav .nav-item');
    if (firstTab) {
        setActiveTab(firstTab);
    }
    showSection('tasks');
}

// Switch auth tabs
function showAuthTab(tab) {
    // Update buttons
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Update forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (tab === 'login') {
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
    } else {
        if (loginForm) loginForm.classList.remove('active');
        if (registerForm) registerForm.classList.add('active');
        
        // Pre-fill referral code if from URL
        if (referralCodeFromUrl) {
            setTimeout(() => {
                const refInput = document.getElementById('register-referral-code');
                if (refInput) {
                    refInput.value = referralCodeFromUrl;
                    refInput.readOnly = true;
                    refInput.style.background = '#1a1a1a';
                    refInput.style.color = '#667eea';
                    refInput.style.fontWeight = '600';
                }
            }, 50);
        }
    }
}

// Login function
async function login() {
    const usernameEl = document.getElementById('login-username');
    const passwordEl = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');

    if (!usernameEl || !passwordEl || !errorDiv) {
        console.error('Login form elements not found');
        return;
    }

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    if (!username || !password) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentToken = data.token;
            currentUser = data.user;
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
            showMainContent();
        } else {
            errorDiv.textContent = data.error || 'Đăng nhập thất bại';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
        errorDiv.style.display = 'block';
    }
}

// Register function
async function register() {
    const usernameEl = document.getElementById('register-username');
    const emailEl = document.getElementById('register-email');
    const phoneEl = document.getElementById('register-phone');
    const passwordEl = document.getElementById('register-password');
    const errorDiv = document.getElementById('register-error');

    if (!usernameEl || !emailEl || !phoneEl || !passwordEl || !errorDiv) {
        console.error('Register form elements not found');
        return;
    }

    const username = usernameEl.value.trim();
    const email = emailEl.value.trim();
    const phone = phoneEl.value.trim();
    const password = passwordEl.value;

    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    if (!username || !email || !phone || !password) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
        errorDiv.style.display = 'block';
        return;
    }

    const phoneRegex = /^(0|\+84)[35789][0-9]{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errorDiv.textContent = 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 số)';
      errorDiv.style.display = 'block';
      return;
    }

    const refInput = document.getElementById('register-referral-code');
    const referralCode = refInput?.value?.trim() || sessionStorage.getItem('referral_code') || null;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, phone: cleanPhone, password, referral_code: referralCode })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentToken = data.token;
            currentUser = data.user;
            
            if (sessionStorage.getItem('referral_code')) {
                sessionStorage.removeItem('referral_code');
            }
            
            const bonusAmount = data.signup_bonus || 0;
            showNotification(`Đăng ký thành công! Bạn đã nhận ${bonusAmount.toLocaleString('vi-VN')} ₫ tiền thưởng đăng ký!`);
            
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
            showMainContent();
        } else {
            errorDiv.textContent = data.error || 'Đăng ký thất bại';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Register error:', error);
        errorDiv.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
        errorDiv.style.display = 'block';
    }
}

// Initialize auth system - Simple and reliable
function initAuthSystem() {
    console.log('Initializing auth system...');
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.auth-tab-btn');
    console.log('Found tab buttons:', tabButtons.length);
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const tab = this.dataset.tab;
            console.log('Tab button clicked:', tab);
            if (tab) {
                showAuthTab(tab);
            }
        }, { once: false, passive: false });
    });
    
    // Login button
    const loginBtn = document.getElementById('login-btn');
    console.log('Login button found:', !!loginBtn);
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Login button clicked');
            login();
        }, { once: false, passive: false });
        
        // Also set onclick as backup
        loginBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Login button onclick triggered');
            login();
            return false;
        };
    } else {
        console.error('Login button not found!');
    }
    
    // Register button
    const registerBtn = document.getElementById('register-btn');
    console.log('Register button found:', !!registerBtn);
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Register button clicked');
            register();
        }, { once: false, passive: false });
        
        // Also set onclick as backup
        registerBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Register button onclick triggered');
            register();
            return false;
        };
    } else {
        console.error('Register button not found!');
    }
    
    // Enter key support
    ['login-username', 'login-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });
        }
    });
    
    ['register-username', 'register-email', 'register-phone', 'register-password', 'register-referral-code'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    register();
                }
            });
        }
    });
}

// Fetch user info
async function fetchUserInfo() {
    try {
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showMainContent();
        } else {
            localStorage.removeItem('token');
            showAuthSection();
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}

// Load balance
async function loadBalance() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('balanceAmount').textContent = 
                formatCurrency(data.user.balance);
            
            const userInfoDiv = document.getElementById('userInfo');
            userInfoDiv.innerHTML = `
                <span>${data.user.username}</span>
                <span class="user-balance">${formatCurrency(data.user.balance)}</span>
            `;
            
            // Add admin link if user is admin
            if (data.user.role === 'admin') {
                const headerRight = document.querySelector('.header-right');
                if (headerRight) {
                    const adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.textContent = 'Admin';
                    adminLink.style.color = '#ffffff';
                    adminLink.style.fontWeight = 'bold';
                    adminLink.style.padding = '0.5rem 1rem';
                    adminLink.style.borderRadius = '5px';
                    adminLink.style.background = '#555555';
                    adminLink.style.textDecoration = 'none';
                    adminLink.style.fontSize = '0.9rem';
                    headerRight.insertBefore(adminLink, headerRight.firstChild);
                }
            }
        }
    } catch (error) {
        console.error('Error loading balance:', error);
    }
}

// Load tasks
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();

        const tasksList = document.getElementById('tasks-list');
        tasksList.innerHTML = '';

        if (data.tasks && data.tasks.length > 0) {
            data.tasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.innerHTML = `
                    <h3>${task.title}</h3>
                    <p>${task.description}</p>
                    <div class="task-reward">
                        <span style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        </span>
                        ${formatCurrency(task.reward)}
                    </div>
                `;
                taskCard.onclick = () => openTaskModal(task);
                tasksList.appendChild(taskCard);
            });
        } else {
            tasksList.innerHTML = '<p>Hiện tại không có nhiệm vụ nào.</p>';
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Open task modal
function openTaskModal(task) {
    currentTaskId = task.id;
    document.getElementById('modal-task-title').textContent = task.title;
    document.getElementById('modal-task-description').textContent = task.description;
    document.getElementById('modal-task-reward').textContent = formatCurrency(task.reward);
    document.getElementById('submission-content').value = '';
    document.getElementById('submit-error').textContent = '';
    document.getElementById('taskModal').style.display = 'block';
}

// Close task modal
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentTaskId = null;
}

// Submit task
async function submitTask() {
    const content = document.getElementById('submission-content').value;
    const errorDiv = document.getElementById('submit-error');

    if (!content.trim()) {
        errorDiv.textContent = 'Vui lòng nhập nội dung';
        return;
    }

    try {
        const response = await fetch(`/api/tasks/${currentTaskId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (response.ok) {
            closeTaskModal();
            showNotification('Nộp nhiệm vụ thành công! Vui lòng chờ admin duyệt.', false);
            loadTasks();
        } else {
            errorDiv.textContent = data.error || 'Nộp nhiệm vụ thất bại';
        }
    } catch (error) {
        errorDiv.textContent = 'Lỗi kết nối';
    }
}

// Set active tab
function setActiveTab(activeElement) {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (activeElement) {
        activeElement.classList.add('active');
    }
}

// Show section
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    
    // Check verification status when opening withdraw section
    if (section === 'withdraw') {
        checkVerificationStatus();
    }
    
    // Update active tab
    const tabs = document.querySelectorAll('.bottom-nav .nav-item');
    tabs.forEach((tab, index) => {
        tab.classList.remove('active');
        if (
            (section === 'tasks' && index === 0) ||
            (section === 'my-submissions' && index === 1) ||
            (section === 'transactions' && index === 2) ||
            (section === 'withdraw' && index === 3) ||
            (section === 'profile' && index === 4)
        ) {
            tab.classList.add('active');
        }
    });
    
    switch(section) {
        case 'tasks':
            document.getElementById('tasks-section').style.display = 'block';
            loadTasks();
            break;
        case 'my-submissions':
            document.getElementById('my-submissions-section').style.display = 'block';
            loadMySubmissions();
            break;
        case 'transactions':
            document.getElementById('transactions-section').style.display = 'block';
            loadTransactions();
            break;
        case 'withdraw':
            document.getElementById('withdraw-section').style.display = 'block';
            break;
        case 'profile':
            document.getElementById('profile-section').style.display = 'block';
            loadProfile();
            // Always load referral info immediately when profile is shown
            if (typeof loadReferralInfo === 'function') {
                loadReferralInfo().catch(err => {
                    console.error('Error loading referral info:', err);
                    setTimeout(() => loadReferralInfo().catch(e => console.error('Retry failed:', e)), 1000);
                });
            }
            break;
    }
}

// Load my submissions
async function loadMySubmissions() {
    try {
        const response = await fetch('/api/my-submissions', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        const submissionsList = document.getElementById('submissions-list');
        submissionsList.innerHTML = '';

        if (data.submissions && data.submissions.length > 0) {
            data.submissions.forEach(submission => {
                const item = document.createElement('div');
                item.className = `submission-item ${submission.status}`;
                item.innerHTML = `
                    <div class="submission-header">
                        <h3>${submission.task_title}</h3>
                        <span class="submission-status ${submission.status}">${getStatusText(submission.status)}</span>
                    </div>
                    <p><strong>Nội dung:</strong> ${submission.content}</p>
                    <p><strong>Phần thưởng:</strong> ${formatCurrency(submission.reward)}</p>
                    <p><strong>Ngày nộp:</strong> ${new Date(submission.created_at).toLocaleString('vi-VN')}</p>
                `;
                submissionsList.appendChild(item);
            });
        } else {
            submissionsList.innerHTML = '<p>Bạn chưa nộp nhiệm vụ nào.</p>';
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

// Load transactions
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '';

        if (data.transactions && data.transactions.length > 0) {
            data.transactions.forEach(transaction => {
                const item = document.createElement('div');
                item.className = 'transaction-item';
                const isCredit = transaction.amount > 0;
                
                // Format description to Vietnamese if needed
                let description = transaction.description || 'Giao dịch';
                if (description.includes('Reward for task')) {
                    description = description.replace('Reward for task:', 'Phần thưởng nhiệm vụ:');
                }
                if (description.includes('Withdrawal request')) {
                    description = description.replace('Withdrawal request:', 'Yêu cầu rút tiền:');
                }
                
                item.innerHTML = `
                    <div>
                        <strong>${description}</strong>
                        <p style="color: #999; font-size: 0.85rem; margin-top: 0.25rem;">
                            ${new Date(transaction.created_at).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </p>
                    </div>
                    <div class="transaction-amount ${isCredit ? 'credit' : 'debit'}">
                        ${isCredit ? '+' : ''}${formatCurrency(transaction.amount)}
                    </div>
                `;
                transactionsList.appendChild(item);
            });
        } else {
            transactionsList.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Chưa có giao dịch nào.</p>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Withdraw
async function withdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    const account = document.getElementById('withdraw-account').value;
    const errorDiv = document.getElementById('withdraw-error');

    if (!amount || !method || !account) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
        return;
    }

    // CHECK VERIFICATION STATUS FIRST before sending request
    try {
        const verificationCheck = await fetch('/api/verification/status', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (verificationCheck.ok) {
            const verificationData = await verificationCheck.json();
            
            // If not approved, show notice and redirect to verification
            if (!verificationData.verification_status || 
                verificationData.verification_status === 'not_submitted' ||
                verificationData.verification_status !== 'approved') {
                // Show verification notice
                document.getElementById('verification-required-notice').style.display = 'block';
                document.getElementById('withdraw-form').style.display = 'none';
                errorDiv.textContent = '';
                
                // Show alert and redirect to verification
                showNotification('Bạn cần xác minh danh tính trước khi rút tiền. Vui lòng hoàn thành xác minh danh tính.', true);
                
                // Switch to profile tab to show verification
                showSection('profile');
                const profileTab = document.querySelector('.nav-item[onclick*="profile"]');
                if (profileTab) {
                    setActiveTab(profileTab);
                }
                
                // Open verification form
                setTimeout(() => {
                    const verificationCard = document.getElementById('verification-card');
                    if (verificationCard) {
                        verificationCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        toggleVerificationForm();
                    }
                }, 300);
                
                return; // STOP HERE - don't send withdrawal request
            }
        } else {
            // If verification check fails, still try withdrawal (backend will check)
            console.warn('Could not check verification status, proceeding with withdrawal request');
        }
    } catch (error) {
        console.error('Error checking verification:', error);
        // Continue to withdrawal request, backend will check
    }

    // If verified, proceed with withdrawal
    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                amount,
                payment_method: method,
                account_info: account
            })
        });

        // Handle response based on status
        if (response.status === 403) {
            // Verification required - handle immediately
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { requires_verification: true, error: 'Bạn cần xác minh danh tính trước khi rút tiền' };
            }
            
            // Show verification notice
            document.getElementById('verification-required-notice').style.display = 'block';
            document.getElementById('withdraw-form').style.display = 'none';
            errorDiv.textContent = '';
            
            // Show alert and redirect
            alert('Bạn cần xác minh danh tính trước khi rút tiền. Vui lòng hoàn thành xác minh danh tính.');
            
            // Switch to profile tab
            showSection('profile');
            const profileTab = document.querySelector('.nav-item[onclick*="profile"]');
            if (profileTab) {
                setActiveTab(profileTab);
            }
            
            // Open verification form
            setTimeout(() => {
                const verificationCard = document.getElementById('verification-card');
                if (verificationCard) {
                    verificationCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    toggleVerificationForm();
                }
            }, 300);
            return;
        }

        // Try to parse JSON for other responses
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // If response is not JSON
            if (response.ok) {
                // Success but no JSON - treat as success
                showNotification('Yêu cầu rút tiền đã được gửi!', false);
                document.getElementById('withdraw-amount').value = '';
                document.getElementById('withdraw-method').value = '';
                document.getElementById('withdraw-account').value = '';
                errorDiv.textContent = '';
                loadBalance();
            } else {
                errorDiv.textContent = 'Lỗi từ server. Vui lòng thử lại.';
            }
            return;
        }

        if (response.ok) {
            alert('Yêu cầu rút tiền đã được gửi!');
            document.getElementById('withdraw-amount').value = '';
            document.getElementById('withdraw-method').value = '';
            document.getElementById('withdraw-account').value = '';
            errorDiv.textContent = '';
            loadBalance();
        } else {
            // Check if it's a verification error
            if (data && data.requires_verification) {
                // Show verification notice
                document.getElementById('verification-required-notice').style.display = 'block';
                document.getElementById('withdraw-form').style.display = 'none';
                errorDiv.textContent = '';
                
                // Show alert and redirect
                showNotification('Bạn cần xác minh danh tính trước khi rút tiền. Vui lòng hoàn thành xác minh danh tính.', true);
                
                // Switch to profile tab
                showSection('profile');
                const profileTab = document.querySelector('.nav-item[onclick*="profile"]');
                if (profileTab) {
                    setActiveTab(profileTab);
                }
                
                // Open verification form
                setTimeout(() => {
                    const verificationCard = document.getElementById('verification-card');
                    if (verificationCard) {
                        verificationCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        toggleVerificationForm();
                    }
                }, 300);
            } else {
                // Check if it's a referral lock error
                if (data && data.requires_referrals) {
                    // Show notification and redirect to profile
                    showNotification(data.error || 'Bạn cần mời thêm người để rút tiền. Vui lòng xem phần giới thiệu trong hồ sơ.', true);
                    setTimeout(() => {
                        showSection('profile');
                    }, 2000);
                    errorDiv.textContent = '';
                } else {
                    errorDiv.textContent = (data && data.error) || 'Rút tiền thất bại';
                }
            }
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        // Only show connection error if it's actually a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorDiv.textContent = 'Lỗi kết nối. Vui lòng kiểm tra kết nối và thử lại.';
        } else {
            errorDiv.textContent = 'Đã xảy ra lỗi. Vui lòng thử lại.';
        }
    }
}

// Show verification for withdrawal
function showVerificationForWithdraw() {
    // Show verification card
    document.getElementById('verification-card').style.display = 'block';
    // Open verification form
    toggleVerificationForm();
    // Switch to profile tab to show verification
    showSection('profile');
    setActiveTab(document.querySelector('.nav-item[onclick*="profile"]'));
    // Scroll to verification
    setTimeout(() => {
        document.getElementById('verification-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// Check verification status when opening withdraw section
async function checkVerificationStatus() {
    try {
        const response = await fetch('/api/verification/status', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const notice = document.getElementById('verification-required-notice');
            const form = document.getElementById('withdraw-form');
            
            if (data.verification_status !== 'approved') {
                notice.style.display = 'block';
                form.style.display = 'none';
            } else {
                notice.style.display = 'none';
                form.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking verification status:', error);
    }
}

// Load profile
async function loadProfile() {
    if (!currentUser) return;
    
    try {
        // Load user info
        const userRes = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (userRes.ok) {
            const userData = await userRes.json();
            const user = userData.user;
            
            // Update profile info
            const usernameEl = document.getElementById('profile-username');
            const emailEl = document.getElementById('profile-email');
            const balanceEl = document.getElementById('profile-balance');
            
            if (usernameEl) usernameEl.textContent = user.username;
            if (emailEl) emailEl.textContent = user.email;
            if (balanceEl) balanceEl.textContent = formatCurrency(user.balance);
            
            // Avatar initial
            const avatarText = document.getElementById('avatar-text');
            avatarText.textContent = user.username.charAt(0).toUpperCase();
            
            // Load submissions stats
            const submissionsRes = await fetch('/api/my-submissions', {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            
            if (submissionsRes.ok) {
                const submissionsData = await submissionsRes.json();
                const submissions = submissionsData.submissions || [];
                
                const completed = submissions.filter(s => s.status === 'approved').length;
                const pending = submissions.filter(s => s.status === 'pending').length;
                const totalEarned = submissions
                    .filter(s => s.status === 'approved')
                    .reduce((sum, s) => sum + (s.reward || 0), 0);
                
                const completedEl = document.getElementById('profile-tasks-completed');
                const pendingEl = document.getElementById('profile-tasks-pending');
                const earnedEl = document.getElementById('profile-total-earned');
                
                if (completedEl) completedEl.textContent = completed;
                if (pendingEl) pendingEl.textContent = pending;
                if (earnedEl) earnedEl.textContent = formatCurrency(totalEarned);
            }
            
            // Load verification status
            loadVerificationStatus();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
    
    // Always load referral info when profile is shown
    if (typeof loadReferralInfo === 'function') {
        loadReferralInfo().catch(err => {
            console.error('Error loading referral info:', err);
            // Retry after 1 second
            setTimeout(() => {
                loadReferralInfo().catch(e => console.error('Retry failed:', e));
            }, 1000);
        });
    } else {
        console.error('loadReferralInfo function not found!');
    }
}

// Video recording variables
let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let countdownInterval = null;
let instructionInterval = null;
let recordingTimer = null;
let currentTime = 8;
let currentInstruction = 0;

// Instructions for face verification - MUST COMPLETE ALL STEPS
const instructions = [
    { text: 'Nhìn thẳng vào camera', duration: 1.5, capturePhoto: false },
    { text: 'Xoay mặt sang trái', duration: 1.5, capturePhoto: false },
    { text: 'Xoay mặt sang phải', duration: 1.5, capturePhoto: false },
    { text: 'Ngước mặt lên', duration: 1.5, capturePhoto: false },
    { text: 'Cúi mặt xuống', duration: 1.5, capturePhoto: false },
    { text: 'Nhìn thẳng vào camera', duration: 1.0, capturePhoto: true } // Capture photo here (HIDDEN)
];

// Start video recording
async function startVideo() {
    // Check if getUserMedia is supported (with fallback)
    let getUserMedia = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    } else if (navigator.getUserMedia) {
        getUserMedia = navigator.getUserMedia.bind(navigator);
    } else if (navigator.webkitGetUserMedia) {
        getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
    } else if (navigator.mozGetUserMedia) {
        getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    }
    
    if (!getUserMedia) {
        alert('Trình duyệt của bạn không hỗ trợ truy cập camera. Vui lòng sử dụng Chrome, Firefox, Safari hoặc Edge.');
        return;
    }
    
    try {
        let streamPromise;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            streamPromise = navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    frameRate: { ideal: 30, min: 24 }
                }, 
                audio: false 
            });
        } else {
            // Fallback for older browsers
            streamPromise = new Promise((resolve, reject) => {
                getUserMedia({
                    video: {
                        facingMode: 'user'
                    },
                    audio: false
                }, resolve, reject);
            });
        }
        
        stream = await streamPromise;
        
        const videoPreview = document.getElementById('video-preview');
        const recordingContainer = document.getElementById('video-recording-container');
        const startBtn = document.getElementById('start-video-btn');
        const recordedVideo = document.getElementById('recorded-video');
        
        videoPreview.srcObject = stream;
        // Mirror video preview (flip horizontally) so it's not reversed
        videoPreview.style.transform = 'scaleX(-1)';
        recordingContainer.style.display = 'block';
        startBtn.style.display = 'none';
        recordedVideo.style.display = 'none';
        
        recordedChunks = [];
        
        // Try to get best quality codec
        let mimeType = 'video/webm;codecs=vp9';
        const codecs = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        
        for (const codec of codecs) {
            if (MediaRecorder.isTypeSupported(codec)) {
                mimeType = codec;
                break;
            }
        }
        
        const options = {
            mimeType: mimeType,
            videoBitsPerSecond: 5000000 // 5 Mbps for high quality
        };
        
        mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            recordedVideo.src = url;
            // Don't mirror recorded video (keep original orientation)
            recordedVideo.style.transform = '';
            recordedVideo.style.display = 'block';
            
            // Create file from blob
            const file = new File([blob], 'face-video.webm', { type: 'video/webm' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('face-video').files = dataTransfer.files;
            
            // Photo should already be captured during instructions, but ensure it's shown
            const capturedPhotoContainer = document.getElementById('captured-photo-container');
            const facePhotoInput = document.getElementById('face-photo');
            if (!facePhotoInput?.files?.[0] && capturedPhotoContainer) {
                // If photo wasn't captured during instructions, capture it now
                console.log('Photo not captured during instructions, capturing now...');
                capturePhotoSilently();
            } else if (capturedPhotoContainer) {
                // Show the container if photo exists
                capturedPhotoContainer.style.display = 'block';
            }
            
            // Show submit button after video is completed
            setTimeout(() => {
                document.getElementById('submit-section').style.display = 'block';
                document.getElementById('step-3-indicator').classList.add('completed');
            }, 500);
        };
        
        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        
        // Calculate total duration from all instructions
        const totalDurationSeconds = instructions.reduce((sum, inst) => sum + inst.duration, 0);
        
        // Initialize instructions (NO COUNTDOWN - just follow instructions)
        currentInstruction = 0;
        let photoCaptured = false; // Track if photo has been captured
        
        // Hide countdown timer
        const countdownEl = document.getElementById('countdown-timer');
        if (countdownEl) {
            countdownEl.style.display = 'none';
        }
        
        // Start instructions
        showInstruction(0);
        let instructionTime = 0;
        
        instructionInterval = setInterval(() => {
            instructionTime += 0.1;
            let accumulatedDuration = 0;
            
            for (let i = 0; i < instructions.length; i++) {
                accumulatedDuration += instructions[i].duration;
                if (instructionTime < accumulatedDuration) {
                    if (i !== currentInstruction) {
                        currentInstruction = i;
                        showInstruction(i);
                        
                        // Auto capture photo when looking straight (HIDDEN - user won't see)
                        if (instructions[i].capturePhoto && !photoCaptured) {
                            photoCaptured = true;
                            console.log('Auto capturing photo (hidden)...');
                            capturePhotoSilently();
                        }
                    }
                    break;
                }
            }
        }, 100);
        
        // Auto stop after all instructions complete
        recordingTimer = setTimeout(() => {
            stopVideo();
        }, totalDurationSeconds * 1000);
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        let errorMessage = 'Không thể truy cập camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Camera đang được sử dụng bởi ứng dụng khác.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Camera không hỗ trợ yêu cầu này.';
        } else {
            errorMessage += 'Vui lòng thử lại hoặc kiểm tra cài đặt quyền.';
        }
        
        alert(errorMessage);
    }
}

// Update countdown timer
function updateCountdown() {
    const countdownEl = document.getElementById('countdown-timer');
    countdownEl.textContent = currentTime;
    
    if (currentTime <= 0) {
        clearInterval(countdownInterval);
        return;
    }
    
    currentTime--;
}

// Show instruction
function showInstruction(index) {
    if (index >= instructions.length) return;
    
    const instructionEl = document.getElementById('recording-instruction');
    const instructionText = instructionEl.querySelector('.instruction-text');
    instructionText.textContent = instructions[index].text;
    
    // Add animation
    instructionEl.style.opacity = '0';
    setTimeout(() => {
        instructionEl.style.opacity = '1';
    }, 100);
}

// Capture photo from video stream (HIDDEN - user won't see this)
function capturePhotoSilently() {
    const videoPreview = document.getElementById('video-preview');
    const facePhotoInput = document.getElementById('face-photo');
    const capturedPhotoContainer = document.getElementById('captured-photo-container');
    const capturedPhoto = document.getElementById('captured-photo');
    
    if (videoPreview && videoPreview.videoWidth > 0) {
        // Create canvas to capture frame at full resolution
        const canvas = document.createElement('canvas');
        // Use actual video dimensions for maximum quality
        canvas.width = videoPreview.videoWidth;
        canvas.height = videoPreview.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw video frame to canvas (unmirror it since video is mirrored)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoPreview, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Convert canvas to blob with maximum quality
        canvas.toBlob((blob) => {
            if (blob) {
                // Create file from blob with high quality
                const file = new File([blob], 'face-photo.jpg', { type: 'image/jpeg' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                facePhotoInput.files = dataTransfer.files;
                
                // Show preview (but user won't notice since it's at the end)
                const photoUrl = URL.createObjectURL(blob);
                if (capturedPhoto) {
                    capturedPhoto.src = photoUrl;
                }
                if (capturedPhotoContainer) {
                    capturedPhotoContainer.style.display = 'block';
                }
                
                console.log('✓ Photo captured and assigned to input');
            }
        }, 'image/jpeg', 1.0); // Maximum quality (1.0 = 100%)
    }
}

// Capture photo from video stream (OLD - kept for compatibility)
function capturePhoto() {
    capturePhotoSilently();
    
    // Stop stream after capturing photo
    setTimeout(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        // Hide preview container
        const recordingContainer = document.getElementById('video-recording-container');
        if (recordingContainer) {
            recordingContainer.style.display = 'none';
        }
        
        // Show start button
        const startBtn = document.getElementById('start-video-btn');
        if (startBtn) {
            startBtn.style.display = 'inline-block';
        }
    }, 500);
}

// Stop video recording
function stopVideo() {
    // Clear intervals
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    if (instructionInterval) {
        clearInterval(instructionInterval);
        instructionInterval = null;
    }
    
    if (recordingTimer) {
        clearTimeout(recordingTimer);
        recordingTimer = null;
    }
    
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// Load verification status
async function loadVerificationStatus() {
    try {
        const response = await fetch('/api/verification/status', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const statusBadge = document.getElementById('status-badge');
            const notes = document.getElementById('verification-notes');
            
            // Update status badge
            const statusMap = {
                'not_submitted': { text: 'Chưa xác minh', class: 'status-pending' },
                'pending': { text: 'Đang chờ duyệt', class: 'status-pending' },
                'approved': { text: 'Đã xác minh', class: 'status-approved' },
                'rejected': { text: 'Bị từ chối', class: 'status-rejected' }
            };
            
            const statusInfo = statusMap[data.verification_status] || statusMap['not_submitted'];
            if (statusBadge) {
                statusBadge.textContent = statusInfo.text;
                statusBadge.className = 'status-text ' + statusInfo.class;
            }
            
            // Show notes if rejected
            if (data.verification_status === 'rejected' && data.verification_notes) {
                notes.textContent = `Lý do: ${data.verification_notes}`;
                notes.style.display = 'block';
            } else {
                notes.style.display = 'none';
            }
            
            // Show previews if files exist
            if (data.cccd_front) {
                showImagePreview('cccd-front-preview', `/uploads/${data.cccd_front}`);
            }
            if (data.cccd_back) {
                showImagePreview('cccd-back-preview', `/uploads/${data.cccd_back}`);
            }
            if (data.face_video) {
                const videoEl = document.getElementById('recorded-video');
                videoEl.src = `/uploads/${data.face_video}`;
                videoEl.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading verification status:', error);
    }
}

// Validate CCCD image quality and completeness
function validateCCCDImage(file, previewId, errorId, callback) {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
        img.onload = () => {
            const errors = [];
            
            // Check minimum resolution
            const minWidth = 800;
            const minHeight = 600;
            
            if (img.width < minWidth || img.height < minHeight) {
                errors.push(`Độ phân giải quá thấp (${img.width}x${img.height}px). Yêu cầu tối thiểu: ${minWidth}x${minHeight}px`);
            }
            
            // Check aspect ratio - CCCD should be roughly rectangular (not too square, not too wide)
            // Typical CCCD aspect ratio is around 1.5:1 to 1.8:1
            const aspectRatio = img.width / img.height;
            if (aspectRatio < 1.2 || aspectRatio > 2.5) {
                errors.push('Tỷ lệ khung hình không đúng. Có thể ảnh bị cắt góc hoặc chụp không đầy đủ.');
            }
            
            // Check file size (should be reasonable for quality)
            if (file.size < 50 * 1024) {
                errors.push('Ảnh có vẻ bị nén quá mức. Vui lòng chụp lại với chất lượng cao hơn.');
            }
            
            // Check if image has reasonable dimensions (not too small)
            const minArea = minWidth * minHeight;
            const imageArea = img.width * img.height;
            if (imageArea < minArea * 0.8) {
                errors.push('Ảnh quá nhỏ. Vui lòng chụp lại với khoảng cách gần hơn để đảm bảo đầy đủ thông tin.');
            }
            
            if (errors.length > 0) {
                const errorDiv = document.getElementById(errorId);
                if (errorDiv) {
                    errorDiv.innerHTML = '<strong>⚠️ Lỗi:</strong><br>' + errors.join('<br>');
                    errorDiv.style.display = 'block';
                }
                callback(false, errors.join('. '));
                return;
            }
            
            // Hide error if validation passes
            const errorDiv = document.getElementById(errorId);
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
            
            // Show preview with border guide
            showCCCDPreview(previewId, e.target.result, img.width, img.height);
            callback(true, null);
        };
        
        img.onerror = () => {
            callback(false, 'Không thể đọc file ảnh. Vui lòng thử lại.');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        callback(false, 'Lỗi đọc file. Vui lòng thử lại.');
    };
    
    reader.readAsDataURL(file);
}

// Show CCCD preview with guide overlay
function showCCCDPreview(previewId, src, width, height) {
    const preview = document.getElementById(previewId);
    const aspectRatio = width / height;
    
    preview.innerHTML = `
        <div style="position: relative; display: inline-block; margin-top: 0.5rem;">
            <img src="${src}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 3px solid #667eea; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border: 2px dashed rgba(255, 255, 255, 0.5); pointer-events: none; border-radius: 8px;"></div>
            <div style="position: absolute; bottom: -25px; left: 0; right: 0; text-align: center; color: #2ed573; font-size: 0.85rem; font-weight: 600;">
                ✓ Ảnh hợp lệ: ${width}x${height}px
            </div>
        </div>
    `;
}

// Show image preview (for other uses)
function showImagePreview(previewId, src) {
    const preview = document.getElementById(previewId);
    preview.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 0.5rem;">`;
}

// Handle file input changes when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFileHandlers);
} else {
    initFileHandlers();
}

// Camera capture variables
let cameraStream = null;
let currentCameraType = null;

// Open camera capture modal
async function openCameraCapture(type) {
    currentCameraType = type;
    
    // On mobile, use native file input with capture (simpler and more reliable)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Use native file input on mobile - more reliable
        const input = document.getElementById(type);
        if (input) {
            console.log('Mobile detected, using native file input');
            input.click();
            return;
        }
    }
    
    // Map type to modal ID (cccd-front -> front, cccd-back -> back)
    const modalId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    const modal = document.getElementById(`camera-modal-${modalId}`);
    const videoId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    const video = document.getElementById(`camera-preview-${videoId}`);
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to file input if getUserMedia not supported
        const input = document.getElementById(type);
        if (input) {
            input.click();
            return;
        }
        alert('Trình duyệt của bạn không hỗ trợ truy cập camera. Vui lòng sử dụng Chrome, Firefox, Safari hoặc Edge.');
        return;
    }
    
    // Check if we're on HTTPS or localhost
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        // Fallback to file input if not HTTPS
        const input = document.getElementById(type);
        if (input) {
            input.click();
            return;
        }
        showNotification('Camera chỉ hoạt động trên HTTPS hoặc localhost. Vui lòng truy cập qua HTTPS.', true);
        return;
    }
    
    try {
        // Request camera access (STANDARD METHOD)
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Use back camera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        if (!modal || !video) {
            throw new Error('Modal or video element not found');
        }
        
        // Set video source (STANDARD METHOD)
        video.srcObject = cameraStream;
        modal.style.display = 'flex';
        
        // Ensure video attributes for mobile
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.muted = true; // Required for autoplay on mobile
        
        // Wait for video to be ready and play (STANDARD METHOD)
        video.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            video.play().then(() => {
                console.log('✓ Video is playing');
            }).catch(err => {
                console.error('Error playing video:', err);
                alert('Không thể phát video. Vui lòng thử lại.');
            });
        };
        
        video.oncanplay = () => {
            console.log('✓ Video can play, ready for capture');
        };
        
        // Wait for video to be fully ready before allowing capture
        let videoReady = false;
        const checkVideoReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused && !video.ended) {
                videoReady = true;
                console.log('✓ Video is ready for capture:', video.videoWidth, 'x', video.videoHeight);
            } else {
                setTimeout(checkVideoReady, 100);
            }
        };
        checkVideoReady();
        
        // Add click event listener to capture button when modal opens
        setTimeout(() => {
            const captureButton = modal.querySelector('.btn-capture');
            if (captureButton) {
                // Remove onclick attribute and use addEventListener instead (better for mobile)
                captureButton.removeAttribute('onclick');
                
                // Handle capture with both click and touch
                let isCapturing = false;
                
                const handleCapture = (e) => {
                    console.log('=== HANDLE CAPTURE CALLED ===', type, e.type);
                    
                    if (isCapturing) {
                        console.log('Already capturing, ignoring...');
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    isCapturing = true;
                    
                    console.log('=== BUTTON CLICKED ===', type);
                    console.log('Video ready flag:', videoReady);
                    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
                    console.log('Video paused:', video.paused, 'ended:', video.ended);
                    
                    // Check if video is ready - but don't block if dimensions exist
                    if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
                        console.log('Video not ready yet, waiting...');
                        alert('Vui lòng đợi camera sẵn sàng...');
                        isCapturing = false;
                        return;
                    }
                    
                    // Visual feedback
                    captureButton.style.transform = 'scale(0.9)';
                    captureButton.style.opacity = '0.7';
                    setTimeout(() => {
                        captureButton.style.transform = '';
                        captureButton.style.opacity = '1';
                    }, 200);
                    
                    // Call capture function DIRECTLY - no delay
                    console.log('Calling capturePhotoFromCamera NOW...');
                    try {
                        capturePhotoFromCamera(type, e);
                    } catch (err) {
                        console.error('Error calling capturePhotoFromCamera:', err);
                        alert('Lỗi: ' + err.message);
                    }
                    
                    // Reset flag after a delay
                    setTimeout(() => {
                        isCapturing = false;
                    }, 1000);
                };
                
                // Attach multiple event types for maximum compatibility
                captureButton.addEventListener('click', handleCapture, { passive: false });
                captureButton.addEventListener('touchend', handleCapture, { passive: false });
                captureButton.addEventListener('pointerup', handleCapture, { passive: false });
                
                console.log('✓ Capture button event listeners attached for type:', type);
            } else {
                console.error('Capture button not found in modal');
            }
        }, 200);
    } catch (error) {
        console.error('Error accessing camera:', error);
        let errorMessage = 'Không thể truy cập camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Camera đang được sử dụng bởi ứng dụng khác.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Camera không hỗ trợ yêu cầu này.';
        } else {
            errorMessage += 'Vui lòng thử lại hoặc kiểm tra cài đặt quyền.';
        }
        
        alert(errorMessage);
    }
}

// Close camera capture
function closeCameraCapture(type) {
    // Map type to modal ID (cccd-front -> front, cccd-back -> back)
    const modalId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    const modal = document.getElementById(`camera-modal-${modalId}`);
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    currentCameraType = null;
}

// Current verification step
let currentVerificationStep = 1;

// Go to next step
function goToNextStep() {
    if (currentVerificationStep < 3) {
        // Hide current step
        document.getElementById(`step-${currentVerificationStep}`).classList.remove('active');
        document.getElementById(`step-${currentVerificationStep}`).style.display = 'none';
        document.getElementById(`step-${currentVerificationStep}-indicator`).classList.remove('active', 'completed');
        
        // Show next step
        currentVerificationStep++;
        document.getElementById(`step-${currentVerificationStep}`).classList.add('active');
        document.getElementById(`step-${currentVerificationStep}`).style.display = 'block';
        document.getElementById(`step-${currentVerificationStep}-indicator`).classList.add('active');
        
        // Mark previous step as completed
        document.getElementById(`step-${currentVerificationStep - 1}-indicator`).classList.add('completed');
        
        // Show submit button on step 3
        if (currentVerificationStep === 3) {
            // Will show when video is completed
        }
    }
}

// Capture photo from camera - Make sure it's globally accessible
window.capturePhotoFromCamera = function(type, event) {
    console.log('=== CAPTURE PHOTO START ===');
    console.log('Type:', type);
    console.log('Event:', event);
    
    // REMOVED ALERT - function is confirmed working
    
    // Prevent default if event exists
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Map type to video/canvas ID (cccd-front -> front, cccd-back -> back)
    const videoId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    
    // Find elements
    const video = document.getElementById(`camera-preview-${videoId}`);
    const canvas = document.getElementById(`camera-canvas-${videoId}`);
    const input = document.getElementById(type);
    const button = document.querySelector(`#camera-modal-${videoId} .btn-capture`);
    
    console.log('Elements found:', {
        video: !!video,
        canvas: !!canvas,
        input: !!input,
        button: !!button
    });
    
    // Validate elements
    if (!video || !canvas || !input) {
        alert('Lỗi: Không tìm thấy các element cần thiết');
        return;
    }
    
    // Disable button
    if (button) {
        button.disabled = true;
        button.style.opacity = '0.5';
    }
    
    // Find modal and UI elements to hide
    const modal = document.getElementById(`camera-modal-${videoId}`);
    const header = modal?.querySelector('.camera-header');
    const overlay = modal?.querySelector('.camera-overlay-guide');
    const controls = modal?.querySelector('.camera-controls');
    
    // Store original display states
    const originalStates = {
        header: header ? header.style.display : '',
        overlay: overlay ? overlay.style.display : '',
        controls: controls ? controls.style.display : ''
    };
    
    // Function to restore UI
    const restoreUI = () => {
        if (header) header.style.display = originalStates.header || '';
        if (overlay) overlay.style.display = originalStates.overlay || '';
        if (controls) controls.style.display = originalStates.controls || '';
    };
    
    // Function to capture when video is ready - SIMPLIFIED
    const doCapture = () => {
        console.log('=== doCapture called ===');
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('Video paused:', video.paused, 'ended:', video.ended);
        
        // Check if video has valid dimensions
        if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
            console.log('Video not ready, waiting...');
            // Wait a bit and try again (max 10 times = 2 seconds)
            if (doCapture.retryCount === undefined) doCapture.retryCount = 0;
            doCapture.retryCount++;
            if (doCapture.retryCount < 10) {
                setTimeout(doCapture, 200);
            } else {
                alert('Camera chưa sẵn sàng. Vui lòng thử lại.');
                restoreUI();
                if (button) {
                    button.disabled = false;
                    button.style.opacity = '1';
                }
            }
            return;
        }
        
        // Reset retry count
        doCapture.retryCount = 0;
        
        // Check if video is playing - if not, try to play
        if (video.paused || video.ended) {
            console.log('Video not playing, starting playback...');
            video.play().then(() => {
                console.log('Video play() successful');
                setTimeout(doCapture, 200);
            }).catch(err => {
                console.error('Cannot play video:', err);
                alert('Không thể phát video. Vui lòng thử lại.');
                restoreUI();
                if (button) {
                    button.disabled = false;
                    button.style.opacity = '1';
                }
            });
            return;
        }
        
        console.log('✓ Video is ready and playing, proceeding with capture...');
        
        console.log('Video ready, hiding UI and capturing...');
        console.log('Video size:', video.videoWidth, 'x', video.videoHeight);
        
        // HIDE ALL UI OVERLAY BEFORE CAPTURE (to avoid browser blocking)
        if (header) header.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if (controls) controls.style.display = 'none';
        
        // Wait longer for UI to hide completely on mobile (500ms to be safe)
        setTimeout(() => {
            try {
                console.log('=== STARTING CAPTURE PROCESS ===');
                console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
                console.log('Video readyState:', video.readyState);
                console.log('Video currentTime:', video.currentTime);
                
                // Double check video is still playing
                if (video.paused || video.ended) {
                    console.error('Video is paused or ended!');
                    alert('Video đã dừng. Vui lòng thử lại.');
                    restoreUI();
                    if (button) {
                        button.disabled = false;
                        button.style.opacity = '1';
                    }
                    return;
                }
                
                // Set canvas dimensions EXACTLY to video dimensions
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log('Canvas set to:', canvas.width, 'x', canvas.height);
                
                // Get 2D context
                const ctx = canvas.getContext('2d');
                
                // Clear canvas first
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw current video frame to canvas - CRITICAL STEP
                console.log('Drawing video to canvas...');
                try {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    console.log('✓ Frame drawn to canvas');
                } catch (drawError) {
                    console.error('❌ ERROR drawing to canvas:', drawError);
                    alert('Lỗi khi vẽ ảnh: ' + drawError.message);
                    restoreUI();
                    if (button) {
                        button.disabled = false;
                        button.style.opacity = '1';
                    }
                    return;
                }
                
                // Verify canvas has content IMMEDIATELY
                let dataUrl;
                try {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    console.log('Data URL length:', dataUrl.length);
                } catch (dataUrlError) {
                    console.error('❌ ERROR creating data URL:', dataUrlError);
                    alert('Lỗi khi tạo ảnh: ' + dataUrlError.message);
                    restoreUI();
                    if (button) {
                        button.disabled = false;
                        button.style.opacity = '1';
                    }
                    return;
                }
                
                if (!dataUrl || dataUrl.length < 100) {
                    console.error('❌ Canvas data URL too short or empty!');
                    console.error('Data URL:', dataUrl ? dataUrl.substring(0, 50) + '...' : 'null');
                    alert('Ảnh chụp không hợp lệ (rỗng). Vui lòng thử lại.');
                    restoreUI();
                    if (button) {
                        button.disabled = false;
                        button.style.opacity = '1';
                    }
                    return;
                }
                
                console.log('✓ Canvas has valid content, creating blob...');
                
                // Convert canvas to blob (JPEG, quality 0.9) - STANDARD METHOD
                canvas.toBlob((blob) => {
                    console.log('=== toBlob CALLBACK FIRED ===');
                    if (!blob || blob.size === 0) {
                        console.error('Blob is empty or null');
                        alert('Không thể tạo ảnh. Vui lòng thử lại.');
                        restoreUI();
                        if (button) {
                            button.disabled = false;
                            button.style.opacity = '1';
                        }
                        return;
                    }
                    
                    console.log('✓ Blob created, size:', blob.size, 'bytes');
                    
                    // RESTORE UI AFTER CAPTURE
                    restoreUI();
                    
                    // Create File object
                    const fileName = `cccd-${type}-${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { 
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    console.log('File created:', file.name, file.size, 'bytes');
                    
                    // Store file globally for later use
                    if (!window.capturedFiles) {
                        window.capturedFiles = {};
                    }
                    window.capturedFiles[type] = file;
                    console.log('File stored globally:', type);
                    
                    // Create DataTransfer and set file to input (with fallback)
                    try {
                        if (typeof DataTransfer !== 'undefined') {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            input.files = dataTransfer.files;
                            console.log('File assigned to input via DataTransfer, file count:', input.files.length);
                        } else {
                            // Fallback for older browsers
                            console.log('DataTransfer not supported, using alternative method');
                            // Create a new file input and replace
                            const newInput = document.createElement('input');
                            newInput.type = 'file';
                            newInput.id = input.id;
                            newInput.name = input.name;
                            newInput.accept = input.accept;
                            newInput.style.display = 'none';
                            
                            // Use FileList from DataTransfer if available, otherwise store in global
                            const fileList = new DataTransfer();
                            fileList.items.add(file);
                            newInput.files = fileList.files;
                            
                            input.parentNode.replaceChild(newInput, input);
                            console.log('Input replaced with new file');
                        }
                    } catch (e) {
                        console.error('Error setting file to input:', e);
                        // Even if input fails, we have the file in window.capturedFiles
                        console.log('File saved to window.capturedFiles[' + type + ']');
                    }
                    
                    // Verify file is in input
                    if (input.files && input.files.length > 0) {
                        console.log('✓ File successfully in input:', input.files[0].name, input.files[0].size, 'bytes');
                    } else {
                        console.warn('⚠ File not in input, but stored in window.capturedFiles');
                    }
                    
                    // Show preview with CONFIRM/RETAKE buttons (DON'T auto go to next step)
                    const previewId = `cccd-${type}-preview`;
                    let preview = document.getElementById(previewId);
                    
                    // If preview not found, try to find it in the active step
                    if (!preview) {
                        console.log('Preview not found by ID, searching in active step...');
                        const stepId = type === 'cccd-front' ? 'step-1' : type === 'cccd-back' ? 'step-2' : null;
                        if (stepId) {
                            const step = document.getElementById(stepId);
                            if (step) {
                                preview = step.querySelector(`#${previewId}`);
                                console.log('Found preview in step:', !!preview);
                            }
                        }
                    }
                    
                    // If still not found, create it
                    if (!preview) {
                        console.log('Creating preview element...');
                        const stepId = type === 'cccd-front' ? 'step-1' : type === 'cccd-back' ? 'step-2' : null;
                        if (stepId) {
                            const step = document.getElementById(stepId);
                            if (step) {
                                const stepContent = step.querySelector('.step-content');
                                if (stepContent) {
                                    preview = document.createElement('div');
                                    preview.className = 'file-preview';
                                    preview.id = previewId;
                                    stepContent.appendChild(preview);
                                    console.log('✓ Preview element created');
                                }
                            }
                        }
                    }
                    
                    if (preview) {
                        // Ensure step is visible
                        const stepId = type === 'cccd-front' ? 'step-1' : type === 'cccd-back' ? 'step-2' : null;
                        if (stepId) {
                            const step = document.getElementById(stepId);
                            if (step) {
                                step.style.display = 'block';
                                step.classList.add('active');
                                // Scroll preview into view
                                setTimeout(() => {
                                    preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                            }
                        }
                        // Use data URL for preview (faster)
                        const imageUrl = dataUrl || URL.createObjectURL(file);
                        
                        // Create preview HTML
                        const previewHTML = `
                            <div style="text-align: center; padding: 1.5rem; background: #1a1a1a; border-radius: 12px; margin-top: 1rem; border: 2px solid #667eea;">
                                <p style="color: #e0e0e0; margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem;">Xem trước ảnh đã chụp:</p>
                                <img src="${imageUrl}" alt="Ảnh đã chụp" style="max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: contain; border: 2px solid #404040; background: #0a0a0a; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                                <p style="color: #999; margin-top: 1rem; font-size: 0.85rem;">Kiểm tra: Ảnh có rõ nét? Có đầy đủ 4 góc CCCD không?</p>
                                <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
                                    <button id="retake-btn-${type}" style="padding: 0.75rem 2rem; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                                        Chụp Lại
                                    </button>
                                    <button id="confirm-btn-${type}" style="padding: 0.75rem 2rem; background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                                        Xác Nhận
                                    </button>
                                </div>
                            </div>
                        `;
                        preview.innerHTML = previewHTML;
                        console.log('✓ Preview displayed with confirm/retake buttons');
                        
                        // Store data globally for retake/confirm functions
                        if (!window.capturedPhotos) {
                            window.capturedPhotos = {};
                        }
                        window.capturedPhotos[type] = { dataUrl, file, imageUrl };
                        
                        // Attach event listeners to buttons (AFTER innerHTML is set)
                        setTimeout(() => {
                            const retakeBtn = document.getElementById(`retake-btn-${type}`);
                            const confirmBtn = document.getElementById(`confirm-btn-${type}`);
                            
                            if (retakeBtn) {
                                retakeBtn.addEventListener('click', () => {
                                    console.log('Retake button clicked for:', type);
                                    retakePhoto(type);
                                });
                                console.log('✓ Retake button listener attached');
                            } else {
                                console.error('Retake button not found:', `retake-btn-${type}`);
                            }
                            
                            if (confirmBtn) {
                                confirmBtn.addEventListener('click', () => {
                                    console.log('Confirm button clicked for:', type);
                                    confirmPhoto(type);
                                });
                                console.log('✓ Confirm button listener attached');
                            } else {
                                console.error('Confirm button not found:', `confirm-btn-${type}`);
                            }
                        }, 100);
                    } else {
                        console.error('❌ Preview element not found:', previewId);
                        alert('Lỗi: Không tìm thấy preview element');
                    }
                    
                    // Close camera but DON'T go to next step - wait for user to confirm
                    console.log('Closing camera, waiting for user confirmation...');
                    closeCameraCapture(type);
                    
                    console.log('=== CAPTURE PROCESS COMPLETE ===');
                    
                }, 'image/jpeg', 0.9); // JPEG quality 0.9
                
            } catch (error) {
                console.error('Error during capture:', error);
                alert('Lỗi khi chụp ảnh: ' + error.message);
                restoreUI();
                if (button) {
                    button.disabled = false;
                    button.style.opacity = '1';
                }
            }
        }, 150); // Wait 150ms for UI to hide completely
    };
    
    // Start capture process
    doCapture();
    console.log('=== CAPTURE PHOTO END ===');
};

function initFileHandlers() {
    const cccdFront = document.getElementById('cccd-front');
    const cccdBack = document.getElementById('cccd-back');
    
    if (cccdFront) {
        cccdFront.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                console.log('CCCD front file selected:', e.target.files[0].name);
                validateCCCDImage(e.target.files[0], 'cccd-front-preview', 'cccd-front-error', (isValid, error) => {
                    if (!isValid) {
                        e.target.value = '';
                        return;
                    }
                    // Auto go to next step
                    setTimeout(() => {
                        goToNextStep();
                    }, 1000);
                });
            }
        });
    }
    
    if (cccdBack) {
        cccdBack.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                console.log('CCCD back file selected:', e.target.files[0].name);
                validateCCCDImage(e.target.files[0], 'cccd-back-preview', 'cccd-back-error', (isValid, error) => {
                    if (!isValid) {
                        e.target.value = '';
                        return;
                    }
                    // Auto go to next step
                    setTimeout(() => {
                        goToNextStep();
                    }, 1000);
                });
            }
        });
    }
}

// Validate image quality
function validateImageQuality(file, callback) {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
        img.onload = () => {
            // Check minimum resolution
            const minWidth = 800;
            const minHeight = 600;
            
            if (img.width < minWidth || img.height < minHeight) {
                callback(false, `Ảnh phải có độ phân giải tối thiểu ${minWidth}x${minHeight}px. Ảnh hiện tại: ${img.width}x${img.height}px`);
                return;
            }
            
            // Check file size (should be reasonable for quality)
            if (file.size < 50 * 1024) { // Less than 50KB might be too compressed
                callback(false, 'Ảnh có vẻ bị nén quá mức. Vui lòng chụp lại với chất lượng cao hơn.');
                return;
            }
            
            callback(true, null);
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Handle file input changes
document.addEventListener('DOMContentLoaded', () => {
    const cccdFront = document.getElementById('cccd-front');
    const cccdBack = document.getElementById('cccd-back');
    
    if (cccdFront) {
        cccdFront.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                validateImageQuality(e.target.files[0], (isValid, error) => {
                    if (!isValid) {
                        alert(error);
                        e.target.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        showImagePreview('cccd-front-preview', event.target.result);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                });
            }
        });
    }
    
    if (cccdBack) {
        cccdBack.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                validateImageQuality(e.target.files[0], (isValid, error) => {
                    if (!isValid) {
                        alert(error);
                        e.target.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        showImagePreview('cccd-back-preview', event.target.result);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                });
            }
        });
    }
});

// Toggle verification form
function toggleVerificationForm(event) {
    if (event) {
        event.stopPropagation();
    }
    const container = document.getElementById('verification-form-container');
    const card = document.getElementById('verification-card');
    
    if (container && card) {
        if (container.style.display === 'none' || !container.style.display) {
            container.style.display = 'block';
            card.classList.add('expanded');
            // Scroll to form
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            container.style.display = 'none';
            card.classList.remove('expanded');
        }
    }
}

// Submit verification
async function submitVerification() {
    // Get files from input, with fallback to global storage
    const cccdFrontInput = document.getElementById('cccd-front');
    const cccdBackInput = document.getElementById('cccd-back');
    const faceVideoInput = document.getElementById('face-video');
    const facePhotoInput = document.getElementById('face-photo');
    
    const cccdFront = cccdFrontInput?.files?.[0] || window.capturedFiles?.['cccd-front'];
    const cccdBack = cccdBackInput?.files?.[0] || window.capturedFiles?.['cccd-back'];
    const faceVideo = faceVideoInput?.files?.[0] || window.capturedFiles?.['face-video'];
    const facePhoto = facePhotoInput?.files?.[0]; // Get face photo from input
    
    const errorDiv = document.getElementById('verification-error');
    const successDiv = document.getElementById('verification-success');
    
    errorDiv.textContent = '';
    successDiv.style.display = 'none';
    
    if (!cccdFront || !cccdBack || !faceVideo) {
        errorDiv.textContent = 'Vui lòng upload đầy đủ CCCD mặt trước, mặt sau và video quay mặt';
        return;
    }
    
    try {
        const formData = new FormData();
        if (cccdFront) formData.append('cccd_front', cccdFront);
        if (cccdBack) formData.append('cccd_back', cccdBack);
        if (faceVideo) formData.append('face_video', faceVideo);
        if (facePhoto) formData.append('face_photo', facePhoto); // Include face photo
        
        const response = await fetch('/api/verification/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            successDiv.textContent = data.message || 'Gửi xác minh thành công!';
            successDiv.style.display = 'block';
            errorDiv.textContent = '';
            loadVerificationStatus();
        } else {
            errorDiv.textContent = data.error || 'Gửi xác minh thất bại';
        }
    } catch (error) {
        console.error('Error submitting verification:', error);
        errorDiv.textContent = 'Lỗi kết nối';
    }
}

// Retake photo function - GLOBAL
window.retakePhoto = function(type) {
    console.log('=== RETAKE PHOTO ===', type);
    const previewId = `cccd-${type}-preview`;
    const preview = document.getElementById(previewId);
    if (preview) {
        preview.innerHTML = '';
    }
    // Clear stored photo
    if (window.capturedPhotos) {
        delete window.capturedPhotos[type];
    }
    // Clear input
    const input = document.getElementById(type);
    if (input) {
        input.value = '';
    }
    // Reopen camera
    openCameraCapture(type);
};

// Confirm photo and go to next step - GLOBAL
window.confirmPhoto = function(type) {
    console.log('=== CONFIRM PHOTO ===', type);
    const photoData = window.capturedPhotos?.[type];
    if (!photoData || !photoData.file) {
        alert('Không tìm thấy ảnh đã chụp. Vui lòng chụp lại.');
        return;
    }
    
    // Set file to input (if not already set)
    const input = document.getElementById(type);
    if (input && photoData.file) {
        try {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(photoData.file);
            input.files = dataTransfer.files;
            console.log('✓ File confirmed in input');
        } catch (e) {
            console.error('Error setting file:', e);
        }
    }
    
    // Show success message
    const previewId = `cccd-${type}-preview`;
    const preview = document.getElementById(previewId);
    if (preview) {
        preview.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: #1a1a1a; border-radius: 8px; margin-top: 1rem; border: 2px solid #2ed573;">
                <p style="color: #2ed573; font-weight: 600;">✓ Ảnh đã được xác nhận!</p>
            </div>
        `;
    }
    
    // Go to next step
    setTimeout(() => {
        if (type === 'cccd-front' || type === 'cccd-back') {
            goToNextStep();
        }
    }, 500);
};

// Logout
function logout() {
    localStorage.removeItem('token');
    currentToken = null;
    currentUser = null;
    showAuthSection();
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Đang chờ duyệt',
        'approved': 'Đã duyệt',
        'rejected': 'Đã từ chối'
    };
    return statusMap[status] || status;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('taskModal');
    if (event.target == modal) {
        closeTaskModal();
    }
}

// Notification functions
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notification-message');
    if (notification && messageEl) {
        messageEl.textContent = message;
        notification.className = 'notification' + (isError ? ' error' : '');
        notification.classList.add('show');
        setTimeout(() => {
            hideNotification();
        }, 5000);
    }
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('show');
    }
}

// Initialize
// Initialize everything
// Initialize app when DOM is ready
function initApp() {
    console.log('Initializing app...');
    // Wait a bit to ensure DOM is fully ready
    setTimeout(() => {
        // Initialize auth system first
        initAuthSystem();
        // Then check auth status
        checkAuth();
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

