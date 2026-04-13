#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FlowPig Dev Environment Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any process occupying port 3001 (API) or 5173 (Web)
foreach ($port in @(3001, 5173)) {
    $pids = netstat -aon | Select-String ":$port " | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique
    foreach ($pid in $pids) {
        if ($pid -match '^\d+$' -and $pid -ne '0') {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}
Write-Host "Ports 3001 and 5173 cleared." -ForegroundColor DarkGray
Write-Host ""

# Check if Docker containers are running
$postgresRunning = docker ps | Select-String "flowpig-postgres-dev"
if (-not $postgresRunning) {
    Write-Host "Starting Docker containers..." -ForegroundColor Yellow
    Set-Location F:\flowpigdev
    npm run dev:infra
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Starting API Server (Terminal 1)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Start-Process powershell -ArgumentList "-Command", "cd F:\flowpigdev\apps\api; npx tsx src\server.ts" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Starting Web Dev Server (Terminal 2)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Start-Process powershell -ArgumentList "-Command", "cd F:\flowpigdev\apps\web; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services starting!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Web: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test Login:" -ForegroundColor Magenta
Write-Host "  Email: test@flowpig.dev" -ForegroundColor White
Write-Host "  Password: testpassword123" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit (servers will keep running)"
