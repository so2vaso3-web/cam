@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 MULTI GITHUB UPLOAD - GUI
echo ========================================
echo.

python multi_github_upload_gui.py

if errorlevel 1 (
    echo.
    echo ❌ Có lỗi xảy ra!
    echo 💡 Đảm bảo Python đã được cài đặt
    pause
)

