// Admin Referral Dashboard

// Load referral tree for a user
async function loadReferralTree(userId) {
    try {
        const response = await fetch(`/api/admin/referral/tree/${userId}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayReferralTree(data.tree);
        } else {
            alert('Không thể tải cây giới thiệu');
        }
    } catch (error) {
        console.error('Error loading referral tree:', error);
        alert('Lỗi khi tải cây giới thiệu');
    }
}

// Display referral tree (recursive)
function displayReferralTree(tree, container, depth = 0) {
    if (!tree) return;

    if (!container) {
        container = document.getElementById('referral-tree-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'referral-tree-container';
            document.getElementById('referral-tree-section').appendChild(container);
        }
        container.innerHTML = '';
    }

    const maxDepth = 10;
    if (depth > maxDepth) return;

    const node = document.createElement('div');
    node.className = 'referral-tree-node';
    node.style.cssText = `
        margin-left: ${depth * 30}px;
        padding: 1rem;
        background: ${depth % 2 === 0 ? '#1a1a1a' : '#2d2d2d'};
        border-radius: 8px;
        margin-bottom: 0.5rem;
        border-left: 4px solid ${depth === 0 ? '#667eea' : depth <= 5 ? '#2ed573' : '#999'};
    `;

    node.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="color: #e0e0e0; font-weight: 600;">
                    ${tree.username || 'N/A'} (ID: ${tree.id})
                    ${depth === 0 ? '<span style="color: #667eea; margin-left: 0.5rem;">[ROOT]</span>' : ''}
                    ${depth <= 5 ? `<span style="color: #2ed573; margin-left: 0.5rem;">[F${depth}]</span>` : ''}
                </div>
                <div style="color: #999; font-size: 0.85rem; margin-top: 0.25rem;">
                    ${tree.email || 'N/A'} | Mã: ${tree.referral_code || 'N/A'}
                </div>
                <div style="color: #999; font-size: 0.85rem; margin-top: 0.25rem;">
                    Đã mời: ${tree.active_referrals || 0} | Hoa hồng: ${formatCurrency(tree.referral_earnings || 0)}
                </div>
            </div>
            <button onclick="loadReferralTree(${tree.id})" style="padding: 0.5rem 1rem; background: #404040; color: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                Xem cây
            </button>
        </div>
    `;

    container.appendChild(node);

    // Display children
    if (tree.children && tree.children.length > 0) {
        tree.children.forEach(child => {
            displayReferralTree(child, container, depth + 1);
        });
    }
}

// Load KYC data
async function loadKYCData() {
    const search = document.getElementById('kyc-search')?.value || '';
    const status = document.getElementById('kyc-status-filter')?.value || '';

    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);

        const response = await fetch(`/api/admin/kyc-data?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayKYCData(data.kyc_data || []);
        } else {
            alert('Không thể tải dữ liệu KYC');
        }
    } catch (error) {
        console.error('Error loading KYC data:', error);
        alert('Lỗi khi tải dữ liệu KYC');
    }
}

// Display KYC data
function displayKYCData(kycData) {
    const list = document.getElementById('kyc-data-list');
    if (!list) return;

    if (kycData.length === 0) {
        list.innerHTML = '<p style="padding: 2rem; text-align: center; color: #999;">Không có dữ liệu KYC</p>';
        return;
    }

    list.innerHTML = kycData.map(kyc => {
        const ocrData = kyc.ocr_data ? JSON.parse(kyc.ocr_data) : null;
        return `
            <div style="padding: 1.5rem; background: #1a1a1a; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="color: #e0e0e0; margin-bottom: 0.5rem;">${kyc.full_name || 'N/A'}</h3>
                        <p style="color: #999; font-size: 0.85rem;">User: ${kyc.username} (${kyc.email})</p>
                        <p style="color: #999; font-size: 0.85rem;">Phone: ${kyc.phone || 'N/A'}</p>
                    </div>
                    <span style="padding: 0.25rem 0.75rem; border-radius: 4px; background: ${kyc.verification_status === 'approved' ? '#2ed573' : kyc.verification_status === 'rejected' ? '#ff4444' : '#ffaa00'}; color: white; font-weight: 600; font-size: 0.85rem;">
                        ${kyc.verification_status === 'approved' ? 'Đã duyệt' : kyc.verification_status === 'rejected' ? 'Đã từ chối' : 'Đang chờ'}
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.25rem;">Số CCCD</div>
                        <div style="color: #e0e0e0; font-weight: 600;">${kyc.cccd_number || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.25rem;">Ngày sinh</div>
                        <div style="color: #e0e0e0;">${kyc.date_of_birth || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.25rem;">Địa chỉ</div>
                        <div style="color: #e0e0e0; font-size: 0.9rem;">${kyc.address || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.25rem;">OCR Confidence</div>
                        <div style="color: #e0e0e0;">${(kyc.ocr_confidence * 100).toFixed(1)}%</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    ${kyc.cccd_front_path ? `
                        <div>
                            <img src="/uploads/${kyc.cccd_front_path}" alt="CCCD Front" 
                                 onclick="openImageModal('/uploads/${kyc.cccd_front_path}')"
                                 style="width: 100%; max-height: 150px; object-fit: contain; border-radius: 6px; cursor: pointer; border: 1px solid #404040;">
                            <div style="color: #999; font-size: 0.75rem; text-align: center; margin-top: 0.25rem;">CCCD Mặt Trước</div>
                        </div>
                    ` : ''}
                    ${kyc.cccd_back_path ? `
                        <div>
                            <img src="/uploads/${kyc.cccd_back_path}" alt="CCCD Back"
                                 onclick="openImageModal('/uploads/${kyc.cccd_back_path}')"
                                 style="width: 100%; max-height: 150px; object-fit: contain; border-radius: 6px; cursor: pointer; border: 1px solid #404040;">
                            <div style="color: #999; font-size: 0.75rem; text-align: center; margin-top: 0.25rem;">CCCD Mặt Sau</div>
                        </div>
                    ` : ''}
                    ${kyc.face_photo_path ? `
                        <div>
                            <img src="/uploads/${kyc.face_photo_path}" alt="Face Photo"
                                 onclick="openImageModal('/uploads/${kyc.face_photo_path}')"
                                 style="width: 100%; max-height: 150px; object-fit: contain; border-radius: 6px; cursor: pointer; border: 1px solid #404040;">
                            <div style="color: #999; font-size: 0.75rem; text-align: center; margin-top: 0.25rem;">Ảnh Mặt</div>
                        </div>
                    ` : ''}
                </div>

                ${ocrData && ocrData.raw_text ? `
                    <div style="background: #2d2d2d; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                        <div style="color: #999; font-size: 0.85rem; margin-bottom: 0.5rem;">OCR Raw Text:</div>
                        <div style="color: #e0e0e0; font-size: 0.85rem; max-height: 100px; overflow-y: auto;">
                            ${ocrData.raw_text.substring(0, 500)}${ocrData.raw_text.length > 500 ? '...' : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Export KYC data to Excel
async function exportKYCData() {
    try {
        const response = await fetch('/api/admin/kyc-data/export', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kyc-data-${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert('Không thể xuất dữ liệu');
        }
    } catch (error) {
        console.error('Error exporting KYC data:', error);
        alert('Lỗi khi xuất dữ liệu');
    }
}

// Load referral tree for admin (from input)
function loadReferralTreeForAdmin() {
    const userId = document.getElementById('referral-user-id')?.value;
    if (!userId) {
        alert('Vui lòng nhập User ID');
        return;
    }
    loadReferralTree(parseInt(userId));
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

