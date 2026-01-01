@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 MULTI GITHUB UPLOAD
echo ========================================
echo.

python multi_github_upload.py

if errorlevel 1 (
    echo.
    echo ❌ Có lỗi xảy ra!
    echo 💡 Đảm bảo Python đã được cài đặt
    pause
)

