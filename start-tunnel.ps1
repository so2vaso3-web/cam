Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Ngrok Tunnel for Camera" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server must be running on port 3000 first!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop ngrok" -ForegroundColor Yellow
Write-Host ""
ngrok http 3000

