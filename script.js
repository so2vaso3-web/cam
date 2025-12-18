// Lưu dữ liệu form
let formData = {
    firstName: '',
    lastName: '',
    day: '',
    month: '',
    year: '',
    gender: '',
    email: '',
    password: ''
};

let currentStep = 1;
let previousStep = 1;

// Lấy danh sách tài khoản từ localStorage
function getAccounts() {
    const accounts = localStorage.getItem('googleAccounts');
    return accounts ? JSON.parse(accounts) : [];
}

// Lưu danh sách tài khoản vào localStorage
function saveAccounts(accounts) {
    localStorage.setItem('googleAccounts', JSON.stringify(accounts));
}

// Hiển thị danh sách tài khoản
function displayAccounts() {
    const accounts = getAccounts();
    const container = document.getElementById('accountsContainer');
    
    if (accounts.length === 0) {
        container.innerHTML = '<p class="empty-message">Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên!</p>';
        return;
    }
    
    container.innerHTML = accounts.map((account, index) => `
        <div class="account-item">
            <div class="account-info">
                <div class="account-name">${account.firstName} ${account.lastName || ''}</div>
                <div class="account-email">${account.email}${account.password ? '|' + account.password : ''}</div>
            </div>
            <div class="account-actions">
                <button type="button" class="btn-delete" onclick="deleteAccount(${index})">Xóa</button>
            </div>
        </div>
    `).join('');
}

// Xóa tài khoản
function deleteAccount(index) {
    if (confirm('Bạn có chắc muốn xóa tài khoản này?')) {
        const accounts = getAccounts();
        accounts.splice(index, 1);
        saveAccounts(accounts);
        
        if (accounts.length === 0) {
            // Ẩn danh sách nếu không còn tài khoản nào
            document.getElementById('accountsList').style.display = 'none';
        } else {
            displayAccounts();
        }
    }
}

// Hiển thị modal thành công
function showSuccessModal(totalAccounts) {
    const successModal = document.getElementById('successModal');
    const successCountMessage = document.getElementById('successCountMessage');
    
    if (successModal && successCountMessage) {
        successCountMessage.textContent = `Đã tạo thành công ${totalAccounts} tài khoản!`;
        successModal.style.setProperty('display', 'flex', 'important');
        
        // Tự động đóng sau 5 giây (tùy chọn)
        setTimeout(() => {
            closeSuccessModal();
        }, 5000);
    }
}

// Đóng modal thành công
function closeSuccessModal() {
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.style.setProperty('display', 'none', 'important');
    }
}

// Hiển thị modal yêu cầu bản quyền
// Function để hiển thị license card thay vì modal cũ
function showLicenseCard() {
    console.log('=== showLicenseCard được gọi ===');
    
    // Ẩn card setup
    const tabSetup = document.getElementById('tab-setup');
    if (tabSetup) {
        tabSetup.style.setProperty('display', 'none', 'important');
    }
    
    // Ẩn card create
    const tabCreate = document.getElementById('tab-create');
    if (tabCreate) {
        tabCreate.style.setProperty('display', 'none', 'important');
    }
    
    // Hiển thị card license
    const tabLicense = document.getElementById('tab-license');
    if (tabLicense) {
        tabLicense.style.setProperty('display', 'block', 'important');
        
        // Load logo ngay lập tức
        setTimeout(() => {
            if (typeof loadLicenseLogo === 'function') {
                loadLicenseLogo();
            }
        }, 100);
        
        // Scroll đến card license
        setTimeout(() => {
            tabLicense.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
        
        console.log('✅ License card đã được hiển thị');
    } else {
        console.error('❌ Không tìm thấy tab-license element!');
    }
}

// Tải danh sách tài khoản về
function downloadAccounts(format) {
    const accounts = getAccounts();
    
    if (accounts.length === 0) {
        alert('Chưa có tài khoản nào để tải về!');
        return;
    }
    
    let content = '';
    let filename = '';
    let mimeType = '';
    
    if (format === 'text') {
        // Format: email|password
        content = accounts.map(acc => {
            return `${acc.email}|${acc.password}`;
        }).join('\n');
        filename = `accounts_${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
    } else if (format === 'json') {
        content = JSON.stringify(accounts, null, 2);
        filename = `accounts_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
    }
    
    // Tạo blob và download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Quay về Setup Task
function goToSetupTask() {
    // Ẩn tất cả tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.setProperty('display', 'none', 'important');
    });
    
    // Ẩn danh sách tài khoản
    const accountsList = document.getElementById('accountsList');
    if (accountsList) {
        accountsList.style.setProperty('display', 'none', 'important');
    }
    
    // Ẩn tất cả step
    document.querySelectorAll('.step').forEach(step => {
        step.style.setProperty('display', 'none', 'important');
    });
    
    // Hiển thị tab-setup
    const tabSetup = document.getElementById('tab-setup');
    if (tabSetup) {
        tabSetup.style.setProperty('display', 'block', 'important');
    }
    
    // Reset form setup
    const setupForm = document.querySelector('#tab-setup form');
    if (setupForm) {
        setupForm.reset();
    }
    
    // Reset button
    const startBtn = document.querySelector('.btn-start-automation');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = '<span>Start Automation</span>';
    }
    
    // Cập nhật footer visibility
    if (typeof updateFooterVisibility === 'function') {
        updateFooterVisibility();
    }
    
    // Scroll lên đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Điều hướng giữa các bước
function goToStep(step) {
    try {
        console.log(`Chuyển từ step ${currentStep} sang step ${step}`);
        
        // Ẩn TẤT CẢ các step trước
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.style.setProperty('display', 'none', 'important');
        });
        
        previousStep = currentStep;
        currentStep = step;
        
        // Hiển thị step mới
        const nextStepElement = document.getElementById(`step${currentStep}`);
        if (nextStepElement) {
            // Set display block với important để override mọi style khác
            nextStepElement.style.setProperty('display', 'block', 'important');
            console.log(`Đã hiển thị step${currentStep}`);
            
            // Scroll đến step mới
            setTimeout(() => {
                nextStepElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            console.error(`Không tìm thấy element với ID: step${currentStep}`);
            alert(`Lỗi: Không tìm thấy bước ${step}`);
        }
    } catch (error) {
        console.error('Lỗi khi chuyển step:', error);
        alert('Lỗi khi chuyển bước: ' + error.message);
    }
    
    // Nếu đang trong auto mode và chuyển đến step 2, tự động điền
    if (step === 2) {
        const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
        const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
        
        if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
            const account = accountsToCreate[autoCreateIndex];
            setTimeout(() => {
                const dayInput = document.getElementById('day');
                const monthSelect = document.getElementById('month');
                const yearInput = document.getElementById('year');
                const genderSelect = document.getElementById('gender');
                
                if (dayInput) typeText(dayInput, account.day, () => {});
                if (monthSelect) {
                    monthSelect.value = account.month;
                    monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (yearInput) typeText(yearInput, account.year, () => {});
                if (genderSelect) {
                    genderSelect.value = account.gender;
                    genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                setTimeout(() => {
                    console.log('Đã điền xong step 2, gọi handleStep2...');
                    // Đảm bảo giá trị đã được set vào input
                    formData.day = dayInput.value.trim() || account.day;
                    formData.month = monthSelect.value.trim() || account.month;
                    formData.year = yearInput.value.trim() || account.year;
                    formData.gender = genderSelect.value.trim() || account.gender;
                    
                    console.log('formData step 2:', formData);
                    
                    // Gọi handleStep2 trực tiếp để tự động chuyển sang step 3
                    if (typeof handleStep2 === 'function') {
                        handleStep2({ preventDefault: () => {}, stopPropagation: () => {} });
                    } else {
                        console.error('handleStep2 không tồn tại!');
                        goToStep(3);
                    }
                }, 3000);
            }, 800);
        }
    }
    
    // Nếu chuyển đến step 3, tự động chọn email
    if (step === 3) {
        const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
        const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
        
        if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
            const account = accountsToCreate[autoCreateIndex];
            console.log('Auto mode: Điền email cho step 3, account:', account);
            
            setTimeout(() => {
                // Nếu email là @moitasec.com hoặc Gmail đã generate, dùng custom
                if (account.email.includes('@moitasec.com') || (account.email.includes('@gmail.com') && account.email.includes('.'))) {
                    console.log('Dùng custom email:', account.email);
                    const customRadio = document.querySelector('input[value="custom"]');
                    const customEmailGroup = document.getElementById('customEmailGroup');
                    const customEmailInput = document.getElementById('customEmail');
                    
                    if (customRadio && customEmailGroup && customEmailInput) {
                        customRadio.checked = true;
                        customRadio.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        setTimeout(() => {
                            const emailUsername = account.email.split('@')[0];
                            console.log('Điền custom email username:', emailUsername);
                            typeText(customEmailInput, emailUsername, () => {
                                setTimeout(() => {
                                    console.log('Đã điền xong custom email, gọi handleStep3...');
                                    // Đảm bảo giá trị đã được set
                                    formData.email = account.email;
                                    if (typeof handleStep3 === 'function') {
                                        handleStep3({ preventDefault: () => {}, stopPropagation: () => {} });
                                    } else {
                                        console.error('handleStep3 không tồn tại!');
                                        goToStep(4);
                                    }
                                }, 2000);
                            });
                        }, 800);
                    } else {
                        console.error('Không tìm thấy custom email elements!');
                        // Fallback: dùng suggested
                        const suggested1 = document.querySelector('input[value="suggested1"]');
                        if (suggested1) {
                            suggested1.checked = true;
                            formData.email = account.email;
                            setTimeout(() => {
                                if (typeof handleStep3 === 'function') {
                                    handleStep3({ preventDefault: () => {}, stopPropagation: () => {} });
                                } else {
                                    goToStep(4);
                                }
                            }, 1000);
                        }
                    }
                } else {
                    // Dùng suggested email đầu tiên
                    console.log('Dùng suggested email:', account.email);
                    const suggested1 = document.querySelector('input[value="suggested1"]');
                    if (suggested1) {
                        suggested1.checked = true;
                        suggested1.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    setTimeout(() => {
                        console.log('Đã chọn suggested email, gọi handleStep3...');
                        formData.email = account.email;
                        if (typeof handleStep3 === 'function') {
                            handleStep3({ preventDefault: () => {}, stopPropagation: () => {} });
                        } else {
                            console.error('handleStep3 không tồn tại!');
                            goToStep(4);
                        }
                    }, 2000);
                }
            }, 1000);
        }
    }
    
    // Nếu chuyển đến step 4, tự động điền password
    if (step === 4) {
        const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
        const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
        
        if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
            const account = accountsToCreate[autoCreateIndex];
            console.log('Auto mode: Điền password cho step 4, account:', account);
            
            setTimeout(() => {
                const passwordInput = document.getElementById('password');
                const confirmPasswordInput = document.getElementById('confirmPassword');
                
                if (passwordInput) {
                    console.log('Điền password:', account.password);
                    typeText(passwordInput, account.password, () => {
                        setTimeout(() => {
                            if (confirmPasswordInput) {
                                console.log('Điền confirm password...');
                                typeText(confirmPasswordInput, account.password, () => {
                                    setTimeout(() => {
                                        console.log('Đã điền xong password, gọi handleStep4...');
                                        // Đảm bảo giá trị đã được set
                                        formData.password = account.password;
                                        if (typeof handleStep4 === 'function') {
                                            handleStep4({ preventDefault: () => {}, stopPropagation: () => {} });
                                        } else {
                                            console.error('handleStep4 không tồn tại!');
                                        }
                                    }, 2000);
                                });
                            } else {
                                console.error('Không tìm thấy confirmPasswordInput!');
                                // Vẫn gọi handleStep4 nếu không có confirm
                                formData.password = account.password;
                                if (typeof handleStep4 === 'function') {
                                    handleStep4({ preventDefault: () => {}, stopPropagation: () => {} });
                                }
                            }
                        }, 800);
                    });
                } else {
                    console.error('Không tìm thấy passwordInput!');
                }
            }, 1000);
        }
    }
}

function goToPreviousStep() {
    if (currentStep === 4 && previousStep === 3) {
        // Nếu đang ở step 4 và trước đó là step 3b, quay lại step 3b
        goToStep(3);
    } else if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

// Step 1: Nhập tên
function handleStep1(event) {
    console.log('handleStep1 được gọi!', event);
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    
    console.log('firstNameInput:', firstNameInput);
    console.log('lastNameInput:', lastNameInput);
    
    if (!firstNameInput) {
        console.error('Không tìm thấy input firstName');
        alert('Lỗi: Không tìm thấy trường nhập tên');
        return false;
    }
    
    formData.firstName = firstNameInput.value.trim();
    formData.lastName = lastNameInput ? lastNameInput.value.trim() : '';
    
    console.log('formData:', formData);
    
    if (!formData.firstName) {
        alert('Vui lòng nhập tên');
        firstNameInput.focus();
        return false;
    }
    
    console.log('Chuyển sang step 2...', formData);
    
    // Đảm bảo step2 tồn tại trước khi chuyển
    const step2Element = document.getElementById('step2');
    if (!step2Element) {
        console.error('Không tìm thấy step2 element!');
        alert('Lỗi: Không tìm thấy bước tiếp theo');
        return false;
    }
    
    goToStep(2);
    return false;
}

// Step 2: Thông tin cơ bản
function handleStep2(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const dayInput = document.getElementById('day');
    const monthInput = document.getElementById('month');
    const yearInput = document.getElementById('year');
    const genderInput = document.getElementById('gender');
    
    if (!dayInput || !monthInput || !yearInput || !genderInput) {
        console.error('Không tìm thấy các input field');
        alert('Lỗi: Không tìm thấy các trường nhập liệu');
        return false;
    }
    
    formData.day = dayInput.value.trim();
    formData.month = monthInput.value.trim();
    formData.year = yearInput.value.trim();
    formData.gender = genderInput.value.trim();
    
    // Validate
    if (!formData.day || !formData.month || !formData.year) {
        alert('Vui lòng nhập đầy đủ ngày, tháng, năm');
        return false;
    }
    
    if (!formData.gender) {
        alert('Vui lòng chọn giới tính');
        return false;
    }
    
    console.log('Step 2 data:', formData);
    
    // Kiểm tra nếu đang trong auto mode
    const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
    const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
    
    if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
        // Dữ liệu đã được điền tự động trong goToStep(2)
        // Chỉ cần tạo email gợi ý và chuyển step
        const account = accountsToCreate[autoCreateIndex];
        formData.email = account.email;
        
        // Tạo email gợi ý (nếu cần)
        const baseUsername = (formData.firstName.toLowerCase() + (formData.lastName ? '.' + formData.lastName.toLowerCase() : ''))
            .replace(/\s+/g, '')
            .substring(0, 20);
        
        const random1 = Math.floor(Math.random() * 1000000);
        const random2 = Math.floor(Math.random() * 1000000);
        
        const suggested1 = document.getElementById('suggestedEmail1');
        const suggested2 = document.getElementById('suggestedEmail2');
        if (suggested1) suggested1.textContent = `${baseUsername}${random1}@gmail.com`;
        if (suggested2) suggested2.textContent = `${baseUsername}${random2}@gmail.com`;
        
        console.log('Chuyển sang step 3 (auto mode)...');
        goToStep(3);
        return false;
    }
    
    // Tạo email gợi ý
    const baseUsername = (formData.firstName.toLowerCase() + (formData.lastName ? '.' + formData.lastName.toLowerCase() : ''))
        .replace(/\s+/g, '')
        .substring(0, 20);
    
    const random1 = Math.floor(Math.random() * 1000000);
    const random2 = Math.floor(Math.random() * 1000000);
    
    const suggested1 = document.getElementById('suggestedEmail1');
    const suggested2 = document.getElementById('suggestedEmail2');
    if (suggested1) suggested1.textContent = `${baseUsername}${random1}@gmail.com`;
    if (suggested2) suggested2.textContent = `${baseUsername}${random2}@gmail.com`;
    
    console.log('Chuyển sang step 3...');
    goToStep(3);
    return false;
}

// Step 3: Tạo email
function handleStep3(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('handleStep3 called');
    
    // Kiểm tra nếu đang trong auto mode
    const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
    const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
    
    if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
        const account = accountsToCreate[autoCreateIndex];
        formData.email = account.email;
        // Dữ liệu đã được điền tự động trong goToStep(3)
        previousStep = 3;
        console.log('Chuyển sang step 4 (auto mode)...');
        goToStep(4);
        return false;
    }
    
    const emailOptionRadio = document.querySelector('input[name="emailOption"]:checked');
    if (!emailOptionRadio) {
        alert('Vui lòng chọn một tùy chọn email');
        return false;
    }
    
    const emailOption = emailOptionRadio.value;
    
    if (emailOption === 'custom') {
        const customEmail = document.getElementById('customEmail');
        if (!customEmail) {
            alert('Lỗi: Không tìm thấy trường nhập email tùy chỉnh');
            return false;
        }
        const customEmailValue = customEmail.value.trim();
        if (!customEmailValue) {
            alert('Vui lòng nhập tên người dùng');
            customEmail.focus();
            return false;
        }
        formData.email = customEmailValue.toLowerCase().replace(/[^a-z0-9._]/g, '') + '@gmail.com';
    } else if (emailOption === 'suggested1') {
        const suggested1 = document.getElementById('suggestedEmail1');
        if (!suggested1 || !suggested1.textContent) {
            alert('Lỗi: Không tìm thấy email gợi ý 1');
            return false;
        }
        formData.email = suggested1.textContent;
    } else {
        const suggested2 = document.getElementById('suggestedEmail2');
        if (!suggested2 || !suggested2.textContent) {
            alert('Lỗi: Không tìm thấy email gợi ý 2');
            return false;
        }
        formData.email = suggested2.textContent;
    }
    
    console.log('Email đã chọn:', formData.email);
    previousStep = 3;
    console.log('Chuyển sang step 4...');
    goToStep(4);
    return false;
}

// Step 3b: Sử dụng email hiện tại
function showUseCurrentEmail() {
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step3b').style.display = 'block';
    previousStep = 3;
    currentStep = 3.5;
}

function handleStep3b(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const currentEmailInput = document.getElementById('currentEmail');
    if (!currentEmailInput) {
        alert('Lỗi: Không tìm thấy trường nhập email');
        return false;
    }
    
    formData.email = currentEmailInput.value.trim();
    if (!formData.email) {
        alert('Vui lòng nhập email');
        currentEmailInput.focus();
        return false;
    }
    
    console.log('Email hiện tại:', formData.email);
    previousStep = 3.5;
    console.log('Chuyển sang step 4...');
    goToStep(4);
    return false;
}

// Step 4: Tạo mật khẩu
async function handleStep4(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // KIỂM TRA NGAY ĐẦU: Nếu đã có tài khoản, CHẶN (MỖI IP CHỈ TẠO ĐƯỢC 1 TÀI KHOẢN)
    const accountsPreCheck = getAccounts();
    const totalAccountCountPreCheck = accountsPreCheck.length;
    
    if (totalAccountCountPreCheck >= 1) {
        console.log('❌ ĐÃ CÓ TÀI KHOẢN! Mỗi IP chỉ tạo được 1 tài khoản. Chặn tạo thêm.');
        if (typeof showLicenseCard === 'function') {
            showLicenseCard();
        }
        // Ẩn form và quay về setup
        document.querySelectorAll('.step').forEach(step => {
            step.style.setProperty('display', 'none', 'important');
        });
        const tabSetup = document.getElementById('tab-setup');
        const tabCreate = document.getElementById('tab-create');
        if (tabCreate) tabCreate.style.setProperty('display', 'none', 'important');
        if (tabSetup) tabSetup.style.setProperty('display', 'block', 'important');
        return false;
    }
    
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!passwordInput || !confirmPasswordInput) {
        alert('Lỗi: Không tìm thấy các trường nhập mật khẩu');
        return false;
    }
    
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Kiểm tra nếu đang trong auto mode
    const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
    const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
    
    if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
        const account = accountsToCreate[autoCreateIndex];
        
        // KIỂM TRA LẠI: Nếu đã có tài khoản → CHẶN (MỖI IP CHỈ TẠO ĐƯỢC 1 TÀI KHOẢN)
        const accountsReCheck = getAccounts();
        const totalAccountCountReCheck = accountsReCheck.length;
        
        if (totalAccountCountReCheck >= 1) {
            console.log('❌ ĐÃ CÓ TÀI KHOẢN! Mỗi IP chỉ tạo được 1 tài khoản. Chặn tạo thêm.');
            if (typeof showLicenseCard === 'function') {
                showLicenseCard();
            }
            // Dừng automation
            localStorage.removeItem('accountsToCreate');
            localStorage.removeItem('autoCreateIndex');
            // Quay về setup
            document.querySelectorAll('.step').forEach(step => {
                step.style.setProperty('display', 'none', 'important');
            });
            const tabSetup = document.getElementById('tab-setup');
            const tabCreate = document.getElementById('tab-create');
            if (tabCreate) tabCreate.style.setProperty('display', 'none', 'important');
            if (tabSetup) tabSetup.style.setProperty('display', 'block', 'important');
            return false;
        }
        
        // Password đã được điền tự động trong goToStep(4)
        formData.password = account.password;
    } else {
        if (!password || password.length < 8) {
            alert('Mật khẩu phải có ít nhất 8 ký tự');
            passwordInput.focus();
            return false;
        }
        
        if (password !== confirmPassword) {
            alert('Mật khẩu không khớp');
            confirmPasswordInput.focus();
            return false;
        }
        
        formData.password = password;
    }
    
    console.log('Hoàn thành tất cả các bước, lưu tài khoản...');
    
    // Kiểm tra VPN CỰC MẠNH trước khi lưu (kiểm tra lại để đảm bảo)
    try {
        // Kiểm tra qua nhiều API
        const apis = [
            'https://ipapi.co/json/',
            'https://ip-api.com/json/?fields=status,message,proxy,hosting,query,org'
        ];
        
        let isVPN = false;
        let vpnReason = '';
        
        for (const api of apis) {
            try {
                const response = await fetch(api, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const ip = data.ip || data.query;
                    
                    // Kiểm tra proxy/VPN
                    if (data.proxy === true || data.vpn === true || data.tor === true || data.hosting === true) {
                        isVPN = true;
                        vpnReason = 'Phát hiện Proxy/VPN/Hosting';
                        break;
                    }
                    
                    // Kiểm tra organization
                    const org = (data.org || '').toLowerCase();
                    if (org.includes('vpn') || org.includes('proxy') || org.includes('datacenter') || 
                        org.includes('hosting') || org.includes('server') || org.includes('cloud')) {
                        isVPN = true;
                        vpnReason = `IP từ ${org} (VPN/Proxy)`;
                        break;
                    }
                    
                    // Kiểm tra IP đã lưu
                    const savedIP = localStorage.getItem('userIP');
                    if (savedIP && ip && savedIP !== ip) {
                        isVPN = true;
                        vpnReason = 'IP đã thay đổi (có thể là VPN)';
                        break;
                    }
                }
            } catch (err) {
                continue;
            }
        }
        
        if (isVPN) {
            // Hiển thị modal thay vì alert
            if (typeof showLicenseCard === 'function') {
                showLicenseCard();
            }
            return false;
        }
    } catch (error) {
        console.log('VPN re-check failed');
        // Nếu không kiểm tra được, CHẶN và hiển thị modal
        if (typeof showLicenseCard === 'function') {
            showLicenseCard();
        }
        return false;
    }
    
    // KIỂM TRA CỰC NGHIÊM: Nếu đã có tài khoản → CHẶN (MỖI IP CHỈ TẠO ĐƯỢC 1 TÀI KHOẢN)
    const accounts = getAccounts();
    const totalAccountCount = accounts.length;
    
    // NẾU ĐÃ CÓ TÀI KHOẢN RỒI → CHẶN, KHÔNG CHO TẠO THÊM
    if (totalAccountCount >= 1) {
        console.log('❌ ĐÃ CÓ TÀI KHOẢN! Mỗi IP chỉ tạo được 1 tài khoản. Chặn tạo thêm.');
        // Dừng automation nếu đang chạy
        localStorage.removeItem('accountsToCreate');
        localStorage.removeItem('autoCreateIndex');
        // Hiển thị modal
        if (typeof showLicenseCard === 'function') {
            showLicenseCard();
        }
        // Quay về setup
        document.querySelectorAll('.step').forEach(step => {
            step.style.setProperty('display', 'none', 'important');
        });
        const tabSetup = document.getElementById('tab-setup');
        const tabCreate = document.getElementById('tab-create');
        if (tabCreate) tabCreate.style.setProperty('display', 'none', 'important');
        if (tabSetup) tabSetup.style.setProperty('display', 'block', 'important');
        return false;
    }
    
    // Lưu IP khi tạo tài khoản thành công (BẤT KỲ TÀI KHOẢN NÀO)
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            if (ipData.ip) {
                localStorage.setItem('userIP', ipData.ip);
                localStorage.setItem('ipTimestamp', Date.now().toString());
                console.log('Đã lưu IP:', ipData.ip);
            }
        }
    } catch (err) {
        console.log('Không thể lưu IP:', err);
    }
    
    // Lưu tài khoản
    const isGmail = formData.email && formData.email.includes('@gmail.com');
    accounts.push({
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        email: formData.email,
        password: formData.password,
        day: formData.day,
        month: formData.month,
        year: formData.year,
        gender: formData.gender,
        createdAt: new Date().toISOString()
    });
    saveAccounts(accounts);
    
    // KIỂM TRA: Nếu vừa tạo Gmail đầu tiên → Ẩn card setup, hiển thị card license
    const accountsAfterSave = getAccounts();
    const gmailCount = accountsAfterSave.filter(acc => acc.email && acc.email.includes('@gmail.com')).length;
    
    if (isGmail && gmailCount === 1) {
        console.log('✅ Đã tạo Gmail đầu tiên! Ẩn card setup, hiển thị card license...');
        // Ẩn card setup
        const tabSetup = document.getElementById('tab-setup');
        if (tabSetup) {
            tabSetup.style.setProperty('display', 'none', 'important');
        }
        
        // Ẩn tất cả step
        document.querySelectorAll('.step').forEach(step => {
            step.style.setProperty('display', 'none', 'important');
        });
        
        // Ẩn tab create
        const tabCreate = document.getElementById('tab-create');
        if (tabCreate) {
            tabCreate.style.setProperty('display', 'none', 'important');
        }
        
        // Hiển thị card license
        const tabLicense = document.getElementById('tab-license');
        if (tabLicense) {
            tabLicense.style.setProperty('display', 'block', 'important');
            
            // Load logo ngay lập tức
            setTimeout(() => {
                // Load logo vào card license nếu có
                const savedLogo = localStorage.getItem('gmailLogo');
                if (savedLogo) {
                    const licenseLogoContainer = document.getElementById('licenseLogoContainer');
                    if (licenseLogoContainer) {
                        // Xóa logo cũ nếu có
                        const existingImg = licenseLogoContainer.querySelector('img');
                        if (existingImg) {
                            existingImg.remove();
                        }
                        const licenseImg = document.createElement('img');
                        licenseImg.src = savedLogo;
                        licenseImg.style.width = '40px';
                        licenseImg.style.height = '40px';
                        licenseImg.style.marginRight = '12px';
                        licenseImg.style.objectFit = 'contain';
                        licenseImg.alt = 'Logo';
                        licenseLogoContainer.appendChild(licenseImg);
                        console.log('✅ Logo đã được load vào license card sau khi tạo Gmail');
                    }
                }
            }, 100);
            
            // Scroll đến card license
            setTimeout(() => {
                tabLicense.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }
    
    // Kiểm tra nếu đang trong chế độ auto create (dùng lại biến đã khai báo ở trên)
    const currentAccountNumber = autoCreateIndex + 1;
    const totalAccounts = accountsToCreate.length;
    console.log(`Đã tạo xong tài khoản ${currentAccountNumber}/${totalAccounts}`);
    
    // KHÔNG hiển thị danh sách khi đang tạo từng tài khoản
    // Chỉ hiển thị khi tạo xong TẤT CẢ
    
    if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length - 1) {
        // Còn tài khoản cần tạo, tiếp tục
        const nextIndex = autoCreateIndex + 1;
        localStorage.setItem('autoCreateIndex', nextIndex.toString());
        
        console.log(`Còn ${accountsToCreate.length - nextIndex} tài khoản cần tạo, tiếp tục với tài khoản ${nextIndex + 1}...`);
        
        // Hiển thị thông báo tiến độ
        const progressMessage = `Đã tạo ${currentAccountNumber}/${totalAccounts} tài khoản. Đang tạo tài khoản ${nextIndex + 1}...`;
        console.log(progressMessage);
        
        // Reset form
        formData = {
            firstName: '',
            lastName: '',
            day: '',
            month: '',
            year: '',
            gender: '',
            email: '',
            password: ''
        };
        
        // Ẩn tất cả step nhưng giữ accountsList hiển thị
        document.querySelectorAll('.step').forEach(step => {
            step.style.setProperty('display', 'none', 'important');
        });
        
        // Quay lại bước 1
        const step1 = document.getElementById('step1');
        if (step1) {
            step1.style.setProperty('display', 'block', 'important');
        }
        const form = step1?.querySelector('form');
        if (form) form.reset();
        currentStep = 1;
        previousStep = 1;
        
        // Tự động điền tài khoản tiếp theo
        setTimeout(() => {
            console.log('Bắt đầu tự động điền tài khoản tiếp theo:', accountsToCreate[nextIndex]);
            autoFillNextAccount(accountsToCreate[nextIndex]);
        }, 2000);
    } else {
        // Đã tạo xong tất cả, hiển thị modal thành công
        console.log(`Đã tạo xong TẤT CẢ ${totalAccounts} tài khoản!`);
        localStorage.removeItem('accountsToCreate');
        localStorage.removeItem('autoCreateIndex');
        
        // Reset form
        formData = {
            firstName: '',
            lastName: '',
            day: '',
            month: '',
            year: '',
            gender: '',
            email: '',
            password: ''
        };
        
        // Ẩn tất cả step
        document.querySelectorAll('.step').forEach(step => {
            step.style.setProperty('display', 'none', 'important');
        });
        
        // Hiển thị danh sách tài khoản khi tạo xong TẤT CẢ
        const accountsList = document.getElementById('accountsList');
        if (accountsList) {
            accountsList.style.setProperty('display', 'block', 'important');
            displayAccounts();
            
            // Scroll đến danh sách
            setTimeout(() => {
                accountsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
        
        // Hiển thị modal thành công với dấu tích lớn
        showSuccessModal(totalAccounts);
        
        currentStep = 1;
        previousStep = 1;
    }
}

// Function để type text tự động
function typeText(element, text, callback) {
    if (!element) {
        if (callback) callback();
        return;
    }
    element.focus();
    element.value = '';
    let index = 0;
    const typing = setInterval(() => {
        if (index < text.length) {
            element.value += text[index];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            index++;
        } else {
            clearInterval(typing);
            element.dispatchEvent(new Event('change', { bubbles: true }));
            if (callback) setTimeout(callback, 200);
        }
    }, 50);
}

// Tự động điền form cho tài khoản tiếp theo
function autoFillNextAccount(account) {
    // Đảm bảo đang ở step 1
    document.querySelectorAll('.step').forEach(step => {
        step.style.display = 'none';
    });
    document.getElementById('step1').style.display = 'block';
    document.getElementById('accountsList').style.display = 'none';
    
    // Reset form
    const form = document.querySelector('#step1 form');
    if (form) form.reset();
    
    // Đợi form sẵn sàng
    setTimeout(() => {
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        
        if (!firstNameInput) {
            console.error('Không tìm thấy firstName input');
            return;
        }
        
        // Điền lastName trước nếu có
        if (lastNameInput && account.lastName) {
            typeText(lastNameInput, account.lastName, () => {
                setTimeout(() => {
                    typeText(firstNameInput, account.firstName, () => {
                        setTimeout(() => {
                            console.log('Đã điền xong tên, gọi handleStep1...');
                            // Đảm bảo giá trị đã được set vào input
                            formData.firstName = firstNameInput.value.trim() || account.firstName;
                            formData.lastName = lastNameInput.value.trim() || account.lastName || '';
                            
                            console.log('formData trước khi gọi handleStep1:', formData);
                            
                            // Gọi handleStep1 trực tiếp
                            if (typeof handleStep1 === 'function') {
                                handleStep1({ preventDefault: () => {}, stopPropagation: () => {} });
                            } else {
                                console.error('handleStep1 không tồn tại!');
                                // Fallback: gọi goToStep trực tiếp
                                goToStep(2);
                            }
                        }, 1000);
                    });
                }, 500);
            });
        } else {
            typeText(firstNameInput, account.firstName, () => {
                setTimeout(() => {
                    console.log('Đã điền xong tên (không có họ), gọi handleStep1...');
                    // Đảm bảo giá trị đã được set vào input
                    formData.firstName = firstNameInput.value.trim() || account.firstName;
                    formData.lastName = '';
                    
                    console.log('formData trước khi gọi handleStep1:', formData);
                    
                    // Gọi handleStep1 trực tiếp
                    if (typeof handleStep1 === 'function') {
                        handleStep1({ preventDefault: () => {}, stopPropagation: () => {} });
                    } else {
                        console.error('handleStep1 không tồn tại!');
                        // Fallback: gọi goToStep trực tiếp
                        goToStep(2);
                    }
                }, 1000);
            });
        }
    }, 800);
}

// Xử lý hiển thị mật khẩu
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - Khởi tạo trang');
    
    // Đảm bảo step 1 được hiển thị mặc định
    const step1 = document.getElementById('step1');
    if (step1) {
        step1.style.display = 'block';
        console.log('Đã hiển thị step1');
    } else {
        console.error('Không tìm thấy step1!');
    }
    
    // Đảm bảo các step khác được ẩn
    document.querySelectorAll('.step').forEach(step => {
        if (step.id !== 'step1') {
            step.style.display = 'none';
        }
    });
    
    // Reset currentStep về 1
    currentStep = 1;
    previousStep = 1;
    console.log('Đã reset currentStep =', currentStep);
    
    // Gắn event listener cho button step 1
    const step1Btn = document.getElementById('step1NextBtn');
    if (step1Btn) {
        step1Btn.addEventListener('click', function(e) {
            console.log('Button step1 được click!');
            handleStep1(e);
        });
        console.log('Đã gắn event listener cho step1 button');
    } else {
        console.error('Không tìm thấy button step1NextBtn!');
    }
    
    // Kiểm tra nếu đang trong chế độ auto create
    const accountsToCreate = JSON.parse(localStorage.getItem('accountsToCreate') || '[]');
    const autoCreateIndex = parseInt(localStorage.getItem('autoCreateIndex') || '0');
    
    if (accountsToCreate.length > 0 && autoCreateIndex < accountsToCreate.length) {
        // Đảm bảo đang ở step 1
        document.querySelectorAll('.step').forEach(step => {
            step.style.display = 'none';
        });
        if (step1) {
            step1.style.display = 'block';
        }
        const accountsList = document.getElementById('accountsList');
        if (accountsList) {
            accountsList.style.display = 'none';
        }
        
        // Bắt đầu tự động điền tài khoản đầu tiên sau khi DOM sẵn sàng
        const account = accountsToCreate[autoCreateIndex];
        setTimeout(() => {
            autoFillNextAccount(account);
        }, 1500);
    } else {
        // Kiểm tra nếu có tài khoản từ auto create thì hiển thị
        const accounts = getAccounts();
        if (accounts.length > 0 && !localStorage.getItem('accountsToCreate')) {
            // Ẩn form tạo tài khoản
            document.querySelectorAll('.step').forEach(step => {
                step.style.display = 'none';
            });
            // Hiển thị danh sách
            const accountsList = document.getElementById('accountsList');
            if (accountsList) {
                accountsList.style.display = 'block';
            }
            displayAccounts();
        }
    }
    
    // Hiển thị/ẩn mật khẩu
    const showPasswordCheckbox = document.getElementById('showPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', function() {
            if (this.checked) {
                passwordInput.type = 'text';
                confirmPasswordInput.type = 'text';
            } else {
                passwordInput.type = 'password';
                confirmPasswordInput.type = 'password';
            }
        });
    }
    
    // Xử lý custom email
    const customEmailRadio = document.querySelector('input[value="custom"]');
    const customEmailGroup = document.getElementById('customEmailGroup');
    
    if (customEmailRadio) {
        customEmailRadio.addEventListener('change', function() {
            if (this.checked) {
                customEmailGroup.style.display = 'block';
            } else {
                customEmailGroup.style.display = 'none';
            }
        });
    }
    
    // Floating label
    const floatingInputs = document.querySelectorAll('.floating-label input');
    floatingInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
        if (input.value) {
            input.parentElement.classList.add('focused');
        }
    });
});
