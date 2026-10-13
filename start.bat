@echo off
chcp 65001 >nul
title TallyKhata - Expo Go Offline Server
cd /d "%~dp0"

set "NODE_EXE=C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  set "NODE_EXE=%~dp0node_modules\.bin\node.exe"
)
if not exist "%NODE_EXE%" (
  set "NODE_EXE=node"
)

set "PATH=C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%~dp0node_modules\.bin;C:\Windows\System32;C:\Windows;%PATH%"

set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.10.232
set __UNSAFE_EXPO_HOME_DIRECTORY=%~dp0.expo-cache
set EXPO_NO_CACHE=1
set EXPO_NO_TELEMETRY=1
set EXPO_OFFLINE=1

echo ================================================================
echo           TallyKhata (Offline Ledger) - Expo Go Server
echo           100%% Offline - No Login or Subscription Required
echo ================================================================
echo.
echo IP Address: 192.168.10.232 (Port: 8081)
echo.
echo [1] Mobile-e Google Play Store theke "Expo Go" install thakbe.
echo [2] Mobile ebong Computer eki Wi-Fi network-e thakbe.
echo [3] Niche QR code scan korun, ba Expo Go-te "Enter URL manually"
echo     te giye likhun:
echo     exp://192.168.10.232:8081
echo.
echo Server bondho korte: ei window close korun ba stop.bat chalaben.
echo ================================================================
echo.
echo Starting Expo Metro Bundler on LAN (192.168.10.232:8081)...
"%NODE_EXE%" "%~dp0node_modules\expo\bin\cli" start --host lan
pause
