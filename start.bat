@echo off
echo ========================================
echo FlowPig Dev Environment Startup
echo ========================================
echo.

REM Start API Server in new window
echo Starting API Server...
start "FlowPig API" cmd /k "cd /d F:\flowpigdev\apps\api && npx tsx src/server.ts"

REM Wait a bit
timeout /t 3 /nobreak >nul

REM Start Web Dev Server in new window  
echo Starting Web Dev Server...
start "FlowPig Web" cmd /k "cd /d F:\flowpigdev\apps\web && npm run dev"

echo.
echo ========================================
echo Servers starting in separate windows
echo ========================================
echo.
echo API: http://localhost:3001
echo Web: http://localhost:5173
echo.
echo Test Login:
echo   Email: test@flowpig.dev
echo   Password: testpassword123
echo.
echo Press any key to exit (servers will keep running)
pause >nul
