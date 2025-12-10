// Standard Camera Capture Module
// This module handles camera capture following web standards

let cameraStream = null;

// Initialize camera
async function initCamera(videoElement) {
    // Check HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera chỉ hoạt động trên HTTPS hoặc localhost');
    }
    
    // Check getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera');
    }
    
    // Request camera
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    });
    
    // Set video source
    videoElement.srcObject = stream;
    cameraStream = stream;
    
    // Ensure video plays
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('autoplay', '');
    videoElement.muted = true;
    
    // Wait for metadata and play
    return new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
            videoElement.play()
                .then(() => {
                    console.log('✓ Camera ready');
                    resolve();
                })
                .catch(reject);
        };
        videoElement.onerror = reject;
    });
}

// Capture photo from video
function capturePhoto(videoElement, canvasElement) {
    // Ensure video is playing and has dimensions
    if (videoElement.paused || videoElement.ended) {
        throw new Error('Video không đang phát');
    }
    
    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        throw new Error('Video chưa sẵn sàng');
    }
    
    // Set canvas dimensions EXACTLY to video dimensions
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Get context and draw
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Convert to data URL (for preview)
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);
    
    // Convert to blob (for file upload)
    return new Promise((resolve, reject) => {
        canvasElement.toBlob((blob) => {
            if (!blob || blob.size === 0) {
                reject(new Error('Không thể tạo ảnh'));
                return;
            }
            resolve({ blob, dataUrl });
        }, 'image/jpeg', 0.9);
    });
}

// Stop camera
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}



