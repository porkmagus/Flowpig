#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FlowPig Dev Environment Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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

$apiProcess = Start-Process powershell -ArgumentList "-Command", "cd F:\flowpigdev\apps\api; npx tsx src\server.ts" -WindowStyle Normal -PassThru

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Starting Web Dev Server (Terminal 2)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$webProcess = Start-Process powershell -ArgumentList "-Command", "cd F:\flowpigdev\apps\web; npm run dev" -WindowStyle Normal -PassThru

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
