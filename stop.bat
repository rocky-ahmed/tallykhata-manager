@echo off
chcp 65001 >nul
title Stop TallyKhata Expo Server
echo ====================================================
echo      Stopping TallyKhata Expo Metro Server (Port 8081)...
echo ====================================================
echo.
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
echo Server bondho hoyeche! (Port 8081 free kora hoyeche)
echo.
pause

