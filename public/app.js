let currentUser = null;
let currentToken = null;
let currentTaskId = null;

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
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
}

// Show main content
function showMainContent() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('bottomNav').style.display = 'flex';
    loadTasks();
    loadBalance();
    // Set first tab as active
    const firstTab = document.querySelector('.bottom-nav .nav-item');
    if (firstTab) {
        setActiveTab(firstTab);
    }
    // Show tasks section by default
    showSection('tasks');
}

// Auth tabs
function showAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    }
}

// Register
async function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');

    if (!username || !email || !phone || !password) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
        return;
    }

    // Validate phone number
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        errorDiv.textContent = 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 số)';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, phone: cleanPhone, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentToken = data.token;
            currentUser = data.user;
            showMainContent();
            errorDiv.textContent = '';
        } else {
            errorDiv.textContent = data.error || 'Đăng ký thất bại';
        }
    } catch (error) {
        errorDiv.textContent = 'Lỗi kết nối';
    }
}

// Login
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

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
            showMainContent();
            errorDiv.textContent = '';
        } else {
            errorDiv.textContent = data.error || 'Đăng nhập thất bại';
        }
    } catch (error) {
        errorDiv.textContent = 'Lỗi kết nối';
    }
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            alert('Nộp nhiệm vụ thành công! Vui lòng chờ admin duyệt.');
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
                alert('Bạn cần xác minh danh tính trước khi rút tiền. Vui lòng hoàn thành xác minh danh tính.');
                
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
                alert('Yêu cầu rút tiền đã được gửi!');
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
            } else {
                errorDiv.textContent = (data && data.error) || 'Rút tiền thất bại';
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
            document.getElementById('profile-username').textContent = user.username;
            document.getElementById('profile-email').textContent = user.email;
            document.getElementById('profile-balance').textContent = formatCurrency(user.balance);
            
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
                
                document.getElementById('profile-tasks-completed').textContent = completed;
                document.getElementById('profile-tasks-pending').textContent = pending;
                document.getElementById('profile-total-earned').textContent = formatCurrency(totalEarned);
            }
            
            // Load verification status
            loadVerificationStatus();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
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

// Instructions for face verification (like banks)
const instructions = [
    { text: 'Nhìn thẳng vào camera', duration: 2 },
    { text: 'Xoay mặt sang trái', duration: 1.5 },
    { text: 'Xoay mặt sang phải', duration: 1.5 },
    { text: 'Ngước mặt lên', duration: 1.5 },
    { text: 'Cúi mặt xuống', duration: 1.5 }
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
            recordedVideo.style.display = 'block';
            
            // Create file from blob
            const file = new File([blob], 'face-video.webm', { type: 'video/webm' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('face-video').files = dataTransfer.files;
            
            // Capture photo from video stream
            capturePhoto();
            
            // Show submit button after video is completed
            setTimeout(() => {
                document.getElementById('submit-section').style.display = 'block';
                document.getElementById('step-3-indicator').classList.add('completed');
            }, 500);
        };
        
        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        
        // Initialize countdown and instructions
        currentTime = 8;
        currentInstruction = 0;
        
        // Start countdown
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        
        // Start instructions
        showInstruction(0);
        let instructionTime = 0;
        instructionInterval = setInterval(() => {
            instructionTime += 0.1;
            let totalDuration = 0;
            
            for (let i = 0; i < instructions.length; i++) {
                totalDuration += instructions[i].duration;
                if (instructionTime < totalDuration) {
                    if (i !== currentInstruction) {
                        currentInstruction = i;
                        showInstruction(i);
                    }
                    break;
                }
            }
        }, 100);
        
        // Auto stop after 8 seconds
        recordingTimer = setTimeout(() => {
            stopVideo();
        }, 8000);
        
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

// Capture photo from video stream
function capturePhoto() {
    const videoPreview = document.getElementById('video-preview');
    const capturedPhoto = document.getElementById('captured-photo');
    const capturedPhotoContainer = document.getElementById('captured-photo-container');
    const facePhotoInput = document.getElementById('face-photo');
    
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
        
        // Draw video frame to canvas
        ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob with maximum quality
        canvas.toBlob((blob) => {
            if (blob) {
                // Create object URL for preview
                const photoUrl = URL.createObjectURL(blob);
                capturedPhoto.src = photoUrl;
                capturedPhotoContainer.style.display = 'block';
                
                // Create file from blob with high quality
                const file = new File([blob], 'face-photo.jpg', { type: 'image/jpeg' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                facePhotoInput.files = dataTransfer.files;
            }
        }, 'image/jpeg', 1.0); // Maximum quality (1.0 = 100%)
    }
    
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
                'rejected': { text: 'Đã từ chối', class: 'status-rejected' }
            };
            
            const statusInfo = statusMap[data.verification_status] || statusMap['not_submitted'];
            statusBadge.className = `status-badge ${statusInfo.class}`;
            statusBadge.querySelector('span').textContent = statusInfo.text;
            
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
    // Map type to modal ID (cccd-front -> front, cccd-back -> back)
    const modalId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    const modal = document.getElementById(`camera-modal-${modalId}`);
    const videoId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    const video = document.getElementById(`camera-preview-${videoId}`);
    
    // Check if getUserMedia is supported (with fallback for older browsers)
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
        // Request camera access with explicit permission request
        let streamPromise;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            streamPromise = navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
        } else {
            // Fallback for older browsers
            streamPromise = new Promise((resolve, reject) => {
                getUserMedia({
                    video: {
                        facingMode: 'environment'
                    }
                }, resolve, reject);
            });
        }
        
        cameraStream = await streamPromise;
        
        if (!modal || !video) {
            throw new Error('Modal or video element not found');
        }
        
        video.srcObject = cameraStream;
        modal.style.display = 'flex';
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            video.play().catch(err => {
                console.error('Error playing video:', err);
            });
        };
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

// Capture photo from camera
function capturePhotoFromCamera(type) {
    console.log('capturePhotoFromCamera called with type:', type);
    
    // Map type to video/canvas ID (cccd-front -> front, cccd-back -> back)
    const videoId = type === 'cccd-front' ? 'front' : type === 'cccd-back' ? 'back' : type;
    const video = document.getElementById(`camera-preview-${videoId}`);
    const canvas = document.getElementById(`camera-canvas-${videoId}`);
    // Input ID is already correct: cccd-front or cccd-back
    const input = document.getElementById(type);
    
    console.log('Elements found:', { video: !!video, canvas: !!canvas, input: !!input });
    
    if (!video) {
        alert('Không tìm thấy video element');
        return;
    }
    
    if (!canvas) {
        alert('Không tìm thấy canvas element');
        return;
    }
    
    if (!input) {
        alert('Không tìm thấy input element');
        return;
    }
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `cccd-${type}.jpg`, { type: 'image/jpeg' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                
                console.log('File created, validating...');
                
                // Validate and show preview
                validateCCCDImage(file, `cccd-${type}-preview`, `cccd-${type}-error`, (isValid) => {
                    if (isValid) {
                        console.log('Image validated, closing camera...');
                        closeCameraCapture(type);
                        // Auto go to next step after 1 second
                        setTimeout(() => {
                            if (type === 'cccd-front') {
                                goToNextStep();
                            } else if (type === 'cccd-back') {
                                goToNextStep();
                            }
                        }, 1000);
                    } else {
                        console.log('Image validation failed');
                    }
                });
            } else {
                alert('Không thể tạo file ảnh. Vui lòng thử lại.');
            }
        }, 'image/jpeg', 1.0);
    } else {
        alert('Camera chưa sẵn sàng. Vui lòng đợi một chút và thử lại.');
    }
}

function initFileHandlers() {
    const cccdFront = document.getElementById('cccd-front');
    const cccdBack = document.getElementById('cccd-back');
    
    if (cccdFront) {
        cccdFront.addEventListener('change', (e) => {
            if (e.target.files[0]) {
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
            if (e.target.files[0]) {
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
    const arrow = document.getElementById('verification-arrow');
    
    if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
        // Scroll to form
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        container.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Submit verification
async function submitVerification() {
    const cccdFront = document.getElementById('cccd-front').files[0];
    const cccdBack = document.getElementById('cccd-back').files[0];
    const faceVideo = document.getElementById('face-video').files[0];
    
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

// Initialize
checkAuth();

