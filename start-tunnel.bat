@echo off
echo ========================================
echo   Starting Ngrok Tunnel for Camera
echo ========================================
echo.
echo Server must be running on port 3000 first!
echo Press Ctrl+C to stop ngrok
echo.
ngrok http 3000

