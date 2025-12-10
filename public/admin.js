let currentToken = localStorage.getItem('token');
let currentTaskId = null;
let currentUserId = null;
let allTasks = [];
let allSubmissions = [];
let allUsers = [];
let allWithdrawals = [];
let allTransactions = [];

// Check admin access
async function checkAdmin() {
    if (!currentToken) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        if (!data.user || data.user.role !== 'admin') {
            alert('Bạn không có quyền truy cập trang admin!');
            window.location.href = 'index.html';
            return;
        }

        loadAdminData();
    } catch (error) {
        console.error('Error checking admin:', error);
        window.location.href = 'index.html';
    }
}

function showAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    
    event.target.classList.add('active');
    const section = document.getElementById(`${tab}-section`);
    if (section) {
        section.style.display = 'block';
        section.classList.add('active');
    }
    
    // Load data when tab is shown
    if (tab === 'tasks') {
        loadTasks();
    } else if (tab === 'submissions') {
        loadSubmissions();
    } else if (tab === 'verifications') {
        console.log('Verifications tab clicked, loading data...');
        loadVerifications();
    } else if (tab === 'users') {
        loadUsers();
    } else if (tab === 'withdrawals') {
        loadWithdrawals();
    } else if (tab === 'transactions') {
        loadTransactions();
    } else if (tab === 'stats') {
        loadStats();
    }
}

// ========== TASKS MANAGEMENT ==========

async function createTask() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const reward = parseFloat(document.getElementById('task-reward').value);
    const status = document.getElementById('task-status').value;
    const errorDiv = document.getElementById('create-task-error');
    const successDiv = document.getElementById('create-task-success');

    if (!title || !description || !reward) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
        return;
    }

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ title, description, reward, status })
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = 'Tạo nhiệm vụ thành công!';
            successDiv.style.display = 'block';
            errorDiv.textContent = '';
            
            document.getElementById('task-title').value = '';
            document.getElementById('task-description').value = '';
            document.getElementById('task-reward').value = '';
            
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
            
            loadTasks();
        } else {
            errorDiv.textContent = data.error || 'Tạo nhiệm vụ thất bại';
            successDiv.style.display = 'none';
        }
    } catch (error) {
        errorDiv.textContent = 'Lỗi kết nối';
    }
}

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();

        allTasks = data.tasks || [];
        displayTasks(allTasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function displayTasks(tasks) {
    const tasksList = document.getElementById('admin-tasks-list');
    tasksList.innerHTML = '';

    if (tasks.length === 0) {
        tasksList.innerHTML = '<p>Chưa có nhiệm vụ nào.</p>';
        return;
    }

    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h3>${task.title}</h3>
                <span class="badge ${task.status === 'active' ? 'badge-success' : 'badge-warning'}">
                    ${task.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                </span>
            </div>
            <p style="color: #666; margin-bottom: 1rem; white-space: pre-line; max-height: 150px; overflow: hidden;">
                ${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}
            </p>
            <div class="task-reward">
                <span class="icon-inline" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                </span>
                ${formatCurrency(task.reward)}
            </div>
            <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem;">
                Tạo bởi: ${task.creator_name || 'Admin'}
            </p>
            <div class="btn-group" style="margin-top: 1rem;">
                <button class="btn-edit" onclick="openEditTask(${task.id})">
                    <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </span>
                    Sửa
                </button>
                <button class="btn-status ${task.status === 'active' ? 'active' : 'inactive'}" 
                    onclick="toggleTaskStatus(${task.id}, '${task.status}')">
                    <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                        ${task.status === 'active' ? 
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>' :
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
                        }
                    </span>
                    ${task.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                </button>
                <button class="btn-delete" onclick="deleteTask(${task.id})">
                    <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </span>
                    Xóa
                </button>
            </div>
        `;
        tasksList.appendChild(taskCard);
    });
}

function filterTasks() {
    const search = document.getElementById('task-search').value.toLowerCase();
    const statusFilter = document.getElementById('task-status-filter').value;
    
    let filtered = allTasks.filter(task => {
        const matchSearch = task.title.toLowerCase().includes(search) || 
                          task.description.toLowerCase().includes(search);
        const matchStatus = !statusFilter || task.status === statusFilter;
        return matchSearch && matchStatus;
    });
    
    displayTasks(filtered);
}

async function openEditTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    currentTaskId = taskId;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description;
    document.getElementById('edit-task-reward').value = task.reward;
    document.getElementById('edit-task-status').value = task.status;
    document.getElementById('editTaskModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editTaskModal').style.display = 'none';
    currentTaskId = null;
}

async function saveTask() {
    const title = document.getElementById('edit-task-title').value;
    const description = document.getElementById('edit-task-description').value;
    const reward = parseFloat(document.getElementById('edit-task-reward').value);
    const status = document.getElementById('edit-task-status').value;
    const errorDiv = document.getElementById('edit-task-error');

    if (!title || !description || !reward) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
        return;
    }

    try {
        const response = await fetch(`/api/admin/tasks/${currentTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ title, description, reward, status })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Cập nhật nhiệm vụ thành công!');
            closeEditModal();
            loadTasks();
        } else {
            errorDiv.textContent = data.error || 'Cập nhật thất bại';
        }
    } catch (error) {
        errorDiv.textContent = 'Lỗi kết nối';
    }
}

async function toggleTaskStatus(taskId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await fetch(`/api/admin/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadTasks();
        } else {
            alert('Có lỗi xảy ra');
        }
    } catch (error) {
        alert('Lỗi kết nối');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Bạn chắc chắn muốn xóa nhiệm vụ này?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            alert('Xóa nhiệm vụ thành công!');
            loadTasks();
        } else {
            alert('Có lỗi xảy ra');
        }
    } catch (error) {
        alert('Lỗi kết nối');
    }
}

// ========== SUBMISSIONS ==========

async function loadSubmissions() {
    try {
        const response = await fetch('/api/admin/submissions', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        allSubmissions = data.submissions || [];
        displaySubmissions(allSubmissions);
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

function displaySubmissions(submissions) {
    const submissionsList = document.getElementById('admin-submissions-list');
    submissionsList.innerHTML = '';

    if (submissions.length === 0) {
        submissionsList.innerHTML = '<p>Chưa có bài nộp nào.</p>';
        return;
    }

    submissions.forEach(submission => {
        const item = document.createElement('div');
        item.className = `submission-item ${submission.status}`;
        item.innerHTML = `
            <div class="submission-header">
                <div>
                    <h3>${submission.task_title}</h3>
                    <p style="color: #666; margin-top: 0.25rem;">
                        Người nộp: <strong>${submission.user_name}</strong> | 
                        Phần thưởng: <strong>${formatCurrency(submission.reward)}</strong>
                    </p>
                </div>
                <span class="submission-status ${submission.status}">${getStatusText(submission.status)}</span>
            </div>
            <p><strong>Nội dung:</strong></p>
            <p style="background: #404040; padding: 1rem; border-radius: 5px; margin-top: 0.5rem; white-space: pre-line; color: #e0e0e0;">
                ${submission.content}
            </p>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                Ngày nộp: ${new Date(submission.created_at).toLocaleString('vi-VN')}
            </p>
            ${submission.status === 'pending' ? `
                <div class="submission-actions">
                    <button class="btn-approve" onclick="reviewSubmission(${submission.id}, 'approved')">
                        <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </span>
                        Duyệt
                    </button>
                    <button class="btn-reject" onclick="reviewSubmission(${submission.id}, 'rejected')">
                        <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </span>
                        Từ Chối
                    </button>
                </div>
            ` : ''}
        `;
        submissionsList.appendChild(item);
    });
}

function filterSubmissions() {
    const search = document.getElementById('submission-search').value.toLowerCase();
    const statusFilter = document.getElementById('submission-status-filter').value;
    
    let filtered = allSubmissions.filter(sub => {
        const matchSearch = sub.task_title.toLowerCase().includes(search) || 
                          sub.user_name.toLowerCase().includes(search) ||
                          sub.content.toLowerCase().includes(search);
        const matchStatus = !statusFilter || sub.status === statusFilter;
        return matchSearch && matchStatus;
    });
    
    displaySubmissions(filtered);
}

async function reviewSubmission(submissionId, status) {
    if (!confirm(`Bạn chắc chắn muốn ${status === 'approved' ? 'duyệt' : 'từ chối'} bài nộp này?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/submissions/${submissionId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (response.ok) {
            alert(status === 'approved' ? 'Đã duyệt bài nộp và cộng tiền thưởng!' : 'Đã từ chối bài nộp');
            loadSubmissions();
            loadStats();
        } else {
            alert(data.error || 'Có lỗi xảy ra');
        }
    } catch (error) {
        alert('Lỗi kết nối');
    }
}

// ========== USERS MANAGEMENT ==========

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        allUsers = data.users || [];
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${formatCurrency(user.balance)}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-info'}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
            <td>
                <button class="btn-edit" onclick="openEditUser(${user.id})">
                    <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </span>
                    Sửa
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    
    let filtered = allUsers.filter(user => {
        return user.username.toLowerCase().includes(search) || 
               user.email.toLowerCase().includes(search);
    });
    
    displayUsers(filtered);
}

async function openEditUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    currentUserId = userId;
    document.getElementById('edit-user-balance').value = user.balance;
    document.getElementById('edit-user-role').value = user.role;
    document.getElementById('editUserModal').style.display = 'block';
}

function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
    currentUserId = null;
}

async function saveUser() {
    const balance = parseFloat(document.getElementById('edit-user-balance').value);
    const role = document.getElementById('edit-user-role').value;
    const errorDiv = document.getElementById('edit-user-error');

    try {
        const response = await fetch(`/api/admin/users/${currentUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ balance, role })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Cập nhật người dùng thành công!');
            closeEditUserModal();
            loadUsers();
            loadStats();
        } else {
            errorDiv.textContent = data.error || 'Cập nhật thất bại';
        }
    } catch (error) {
        errorDiv.textContent = 'Lỗi kết nối';
    }
}

// ========== WITHDRAWALS ==========

async function loadWithdrawals() {
    try {
        const response = await fetch('/api/admin/withdrawals', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        allWithdrawals = data.withdrawals || [];
        displayWithdrawals(allWithdrawals);
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

function displayWithdrawals(withdrawals) {
    const tbody = document.getElementById('withdrawals-tbody');
    tbody.innerHTML = '';

    if (withdrawals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Chưa có yêu cầu rút tiền nào.</td></tr>';
        return;
    }

    withdrawals.forEach(w => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${w.id}</td>
            <td>${w.username} (${w.email})</td>
            <td style="color: #ff4757; font-weight: bold;">${formatCurrency(Math.abs(w.amount))}</td>
            <td>${w.description}</td>
            <td>${new Date(w.created_at).toLocaleString('vi-VN')}</td>
            <td>
                <button class="btn-approve" onclick="approveWithdrawal(${w.id}, ${w.user_id}, ${Math.abs(w.amount)})">
                    <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </span>
                    Duyệt
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function approveWithdrawal(transactionId, userId, amount) {
    if (!confirm(`Xác nhận đã chuyển ${formatCurrency(amount)} cho người dùng?`)) {
        return;
    }

    // Note: In real app, you would update transaction status
    // For now, we'll just show a message
    alert('Đã ghi nhận yêu cầu rút tiền. Vui lòng chuyển tiền cho người dùng.');
    loadWithdrawals();
    loadStats();
}

// ========== TRANSACTIONS ==========

async function loadTransactions() {
    try {
        const response = await fetch('/api/admin/transactions', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        allTransactions = data.transactions || [];
        displayTransactions(allTransactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Chưa có giao dịch nào.</td></tr>';
        return;
    }

    transactions.forEach(t => {
        const isCredit = t.amount > 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.id}</td>
            <td>${t.username} (${t.email})</td>
            <td style="color: ${isCredit ? '#2ed573' : '#ff4757'}; font-weight: bold;">
                ${isCredit ? '+' : ''}${formatCurrency(t.amount)}
            </td>
            <td><span class="badge ${isCredit ? 'badge-success' : 'badge-danger'}">${t.type}</span></td>
            <td>${t.description || '-'}</td>
            <td>${new Date(t.created_at).toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterTransactions() {
    const search = document.getElementById('transaction-search').value.toLowerCase();
    const typeFilter = document.getElementById('transaction-type-filter').value;
    
    let filtered = allTransactions.filter(t => {
        const matchSearch = t.username.toLowerCase().includes(search) || 
                          t.email.toLowerCase().includes(search) ||
                          (t.description && t.description.toLowerCase().includes(search));
        const matchType = !typeFilter || t.type === typeFilter;
        return matchSearch && matchType;
    });
    
    displayTransactions(filtered);
}

// ========== STATISTICS ==========

async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();
        document.getElementById('total-users').textContent = data.total_users || 0;
        document.getElementById('total-tasks').textContent = data.total_tasks || 0;
        document.getElementById('pending-submissions').textContent = data.pending_submissions || 0;
        document.getElementById('total-paid').textContent = formatCurrency(data.total_paid || 0);
        document.getElementById('total-withdrawn').textContent = formatCurrency(data.total_withdrawn || 0);
        document.getElementById('total-balance').textContent = formatCurrency(data.total_balance || 0);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function loadAdminData() {
    loadTasks();
    loadSubmissions();
    loadUsers();
    loadWithdrawals();
    loadTransactions();
    loadStats();
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

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

// Close modals when clicking outside
window.onclick = function(event) {
    const editModal = document.getElementById('editTaskModal');
    const userModal = document.getElementById('editUserModal');
    if (event.target == editModal) {
        closeEditModal();
    }
    if (event.target == userModal) {
        closeEditUserModal();
    }
}

// Load verifications
async function loadVerifications() {
    console.log('Loading verifications...');
    const list = document.getElementById('verifications-list');
    if (list) {
        list.innerHTML = '<p>Đang tải...</p>';
    }
    
    try {
        const response = await fetch('/api/admin/verifications', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Verifications data:', data);
        
        if (response.ok) {
            console.log('Found verifications:', data.verifications?.length || 0);
            displayVerifications(data.verifications || []);
        } else {
            console.error('Error loading verifications:', data.error);
            if (list) {
                list.innerHTML = `<p style="color: #ff4444;">Lỗi: ${data.error || 'Không thể tải danh sách'}</p>`;
            }
        }
    } catch (error) {
        console.error('Error loading verifications:', error);
        if (list) {
            list.innerHTML = `<p style="color: #ff4444;">Lỗi kết nối: ${error.message}</p>`;
        }
    }
}

// Display verifications
function displayVerifications(verifications) {
    console.log('=== DISPLAY VERIFICATIONS ===');
    console.log('Count:', verifications?.length || 0);
    console.log('Data:', verifications);
    
    const list = document.getElementById('verifications-list');
    if (!list) {
        console.error('❌ verifications-list element not found!');
        alert('Lỗi: Không tìm thấy element verifications-list');
        return;
    }
    
    list.innerHTML = '';
    
    if (!verifications || verifications.length === 0) {
        list.innerHTML = '<p style="padding: 2rem; text-align: center; color: #999;">Chưa có yêu cầu xác minh nào.</p>';
        console.log('No verifications to display');
        return;
    }
    
    console.log('Rendering', verifications.length, 'verification items');
    
    verifications.forEach((verification, index) => {
        console.log(`Rendering verification ${index + 1}:`, {
            id: verification.id,
            username: verification.username,
            email: verification.email,
            status: verification.verification_status,
            cccd_front: verification.cccd_front,
            cccd_back: verification.cccd_back,
            face_video: verification.face_video
        });
        const item = document.createElement('div');
        item.className = `verification-item ${verification.verification_status || 'pending'}`;
        item.style.cssText = 'padding: 1.5rem; margin-bottom: 1.5rem; background: #1a1a1a; border-radius: 12px; border: 1px solid #333;';
        
        const statusText = verification.verification_status === 'pending' ? 'Đang chờ' : 
                          verification.verification_status === 'approved' ? 'Đã duyệt' : 
                          verification.verification_status === 'rejected' ? 'Đã từ chối' : 'Chưa xác định';
        const statusColor = verification.verification_status === 'pending' ? '#ffaa00' : 
                           verification.verification_status === 'approved' ? '#2ed573' : '#ff4444';
        
        const createdDate = verification.created_at ? new Date(verification.created_at).toLocaleString('vi-VN') : 'N/A';
        
        item.innerHTML = `
            <div class="verification-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #333;">
                <div style="flex: 1;">
                    <h3 style="color: #e0e0e0; margin-bottom: 0.5rem; font-size: 1.2rem;">${verification.username || 'N/A'} (${verification.email || 'N/A'})</h3>
                    <p style="color: #999; font-size: 0.85rem; margin-bottom: 0.25rem;">ID: ${verification.id} | Ngày tạo: ${createdDate}</p>
                    <p style="color: #999; font-size: 0.85rem;">Trạng thái: 
                        <span class="status-badge" style="padding: 0.25rem 0.75rem; border-radius: 4px; background: ${statusColor}; color: white; font-weight: 600; font-size: 0.85rem;">
                            ${statusText}
                        </span>
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="viewUserDetails(${verification.id})" style="padding: 0.5rem 1rem; background: #404040; color: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                        Chi tiết
                    </button>
                </div>
            </div>
            
            <div class="verification-files" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <div class="verification-file-item" style="background: #2d2d2d; padding: 1rem; border-radius: 8px; border: 1px solid #404040;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <label style="color: #e0e0e0; font-weight: 600; font-size: 0.9rem;">CCCD Mặt Trước</label>
                        ${verification.cccd_front ? 
                            `<button onclick="downloadFile('/uploads/${verification.cccd_front}', 'cccd-front-${verification.id}')" style="padding: 0.25rem 0.5rem; background: #404040; color: #e0e0e0; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Tải</button>` : ''}
                    </div>
                    ${verification.cccd_front ? 
                        `<div style="position: relative;">
                            <img src="/uploads/${verification.cccd_front}" alt="CCCD Front" class="verification-image" onclick="openImageModal('/uploads/${verification.cccd_front}')" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 6px; cursor: pointer; border: 1px solid #404040;">
                            <button onclick="openImageModal('/uploads/${verification.cccd_front}')" style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>` : 
                        '<span style="color: #999; font-size: 0.85rem;">Chưa upload</span>'}
                </div>
                
                <div class="verification-file-item" style="background: #2d2d2d; padding: 1rem; border-radius: 8px; border: 1px solid #404040;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <label style="color: #e0e0e0; font-weight: 600; font-size: 0.9rem;">CCCD Mặt Sau</label>
                        ${verification.cccd_back ? 
                            `<button onclick="downloadFile('/uploads/${verification.cccd_back}', 'cccd-back-${verification.id}')" style="padding: 0.25rem 0.5rem; background: #404040; color: #e0e0e0; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Tải</button>` : ''}
                    </div>
                    ${verification.cccd_back ? 
                        `<div style="position: relative;">
                            <img src="/uploads/${verification.cccd_back}" alt="CCCD Back" class="verification-image" onclick="openImageModal('/uploads/${verification.cccd_back}')" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 6px; cursor: pointer; border: 1px solid #404040;">
                            <button onclick="openImageModal('/uploads/${verification.cccd_back}')" style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>` : 
                        '<span style="color: #999; font-size: 0.85rem;">Chưa upload</span>'}
                </div>
                
                <div class="verification-file-item" style="background: #2d2d2d; padding: 1rem; border-radius: 8px; border: 1px solid #404040;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <label style="color: #e0e0e0; font-weight: 600; font-size: 0.9rem;">Video Quay Mặt</label>
                        ${verification.face_video ? 
                            `<button onclick="downloadFile('/uploads/${verification.face_video}', 'face-video-${verification.id}')" style="padding: 0.25rem 0.5rem; background: #404040; color: #e0e0e0; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Tải</button>` : ''}
                    </div>
                    ${verification.face_video ? 
                        `<div style="position: relative;">
                            <video src="/uploads/${verification.face_video}" controls class="verification-video" style="width: 100%; max-height: 200px; border-radius: 6px; border: 1px solid #404040;"></video>
                            <button onclick="openVideoModal('/uploads/${verification.face_video}')" style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </button>
                        </div>` : 
                        '<span style="color: #999; font-size: 0.85rem;">Chưa upload</span>'}
                </div>
                
                <div class="verification-file-item" style="background: #2d2d2d; padding: 1rem; border-radius: 8px; border: 1px solid #404040;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <label style="color: #e0e0e0; font-weight: 600; font-size: 0.9rem;">Ảnh Đã Chụp</label>
                        ${verification.face_photo ? 
                            `<button onclick="downloadFile('/uploads/${verification.face_photo}', 'face-photo-${verification.id}')" style="padding: 0.25rem 0.5rem; background: #404040; color: #e0e0e0; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Tải</button>` : ''}
                    </div>
                    ${verification.face_photo ? 
                        `<div style="position: relative;">
                            <img src="/uploads/${verification.face_photo}" alt="Face Photo" class="verification-image" onclick="openImageModal('/uploads/${verification.face_photo}')" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 6px; cursor: pointer; border: 1px solid #404040;">
                            <button onclick="openImageModal('/uploads/${verification.face_photo}')" style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>` : 
                        '<span style="color: #999; font-size: 0.85rem;">Chưa upload</span>'}
                </div>
            </div>
            
            ${verification.verification_notes ? 
                `<div class="verification-notes" style="margin-top: 1rem; padding: 1rem; background: #2d2d2d; border-radius: 8px; border-left: 3px solid #667eea;">
                    <strong style="color: #e0e0e0;">Ghi chú:</strong> 
                    <span style="color: #999; margin-left: 0.5rem;">${verification.verification_notes}</span>
                </div>` : ''}
            
            <div class="verification-actions" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #333; display: flex; gap: 1rem; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.75rem;">
                    ${verification.verification_status === 'pending' ? `
                        <button class="btn-approve" onclick="reviewVerification(${verification.id}, 'approved')" style="padding: 0.75rem 1.5rem; background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Duyệt
                        </button>
                        <button class="btn-reject" onclick="openRejectVerificationModal(${verification.id})" style="padding: 0.75rem 1.5rem; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            Từ Chối
                        </button>
                    ` : `
                        <span style="color: #999; font-size: 0.9rem;">Đã ${verification.verification_status === 'approved' ? 'duyệt' : 'từ chối'} vào ${createdDate}</span>
                    `}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="exportVerificationData(${verification.id})" style="padding: 0.5rem 1rem; background: #404040; color: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                        Xuất dữ liệu
                    </button>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

// Review verification
async function reviewVerification(userId, status, notes = '') {
    try {
        const response = await fetch(`/api/admin/verifications/${userId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status, notes })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(status === 'approved' ? 'Đã duyệt xác minh!' : 'Đã từ chối xác minh');
            loadVerifications();
        } else {
            alert(data.error || 'Có lỗi xảy ra');
        }
    } catch (error) {
        console.error('Error reviewing verification:', error);
        alert('Lỗi kết nối');
    }
}

// Open reject modal
function openRejectVerificationModal(userId) {
    const notes = prompt('Nhập lý do từ chối:');
    if (notes !== null && notes.trim() !== '') {
        reviewVerification(userId, 'rejected', notes.trim());
    }
}

// Open image modal
function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
    `;
    
    modal.appendChild(img);
    modal.onclick = () => document.body.removeChild(modal);
    document.body.appendChild(modal);
}

// Filter verifications
function filterVerifications() {
    const search = document.getElementById('verification-search').value.toLowerCase();
    const statusFilter = document.getElementById('verification-status-filter').value;
    const items = document.querySelectorAll('.verification-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const status = item.classList.contains('pending') ? 'pending' : 
                      item.classList.contains('approved') ? 'approved' : 'rejected';
        
        const matchesSearch = !search || text.includes(search);
        const matchesStatus = !statusFilter || status === statusFilter;
        
        item.style.display = (matchesSearch && matchesStatus) ? 'block' : 'none';
    });
}

// Initialize
checkAdmin();

