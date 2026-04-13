@echo off
cls
echo ========================================
echo FlowPig Dev Environment Quick Start
echo ========================================
echo.
echo Starting services...
echo.

REM Kill any process occupying port 3001 (API)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill any process occupying port 5173 (Web)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Ports 3001 and 5173 cleared.
echo.

REM Check if Docker containers are running
docker ps | findstr flowpig-postgres-dev >nul
if %ERRORLEVEL% NEQ 0 (
    echo Starting Docker containers...
    cd /d F:\flowpigdev
    npm run dev:infra
    timeout /t 5 /nobreak >nul
)

echo.
echo ========================================
echo Starting API Server (Terminal 1)
echo ========================================
start "FlowPig API" cmd /k "cd /d F:\flowpigdev\apps\api && npx tsx src/server.ts"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Starting Web Dev Server (Terminal 2)
echo ========================================
start "FlowPig Web" cmd /k "cd /d F:\flowpigdev\apps\web && npm run dev"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo API: http://localhost:3001
echo Web: http://localhost:5173
echo.
echo Test Login:
echo   Email: test@flowpig.dev
echo   Password: testpassword123
echo.
pause
