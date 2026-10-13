@echo off
chcp 65001 >nul
title Sync TallyKhata with GitHub
cd /d "%~dp0"

set "PATH=C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd;C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\mingw64\bin;%PATH%"

echo ================================================================
echo           TallyKhata - Git Sync & Push to GitHub
echo           Repository: https://github.com/rocky-ahmed/tallykhata-manager
echo ================================================================
echo.

git config --global --add safe.directory "*"

echo [1/3] Fetching latest changes from GitHub...
git pull origin main

echo.
echo [2/3] Adding changes and committing...
git add .
set /p commit_msg="Enter commit message (Leave empty for default): "
if "%commit_msg%"=="" set commit_msg=Update project changes

git commit -m "%commit_msg%"

echo.
echo [3/3] Pushing changes to GitHub...
git push origin main

echo.
if %ERRORLEVEL% equ 0 (
  echo ================================================================
  echo  SUCCESS! Apnar shob changes GitHub-e sync hoye geche!
  echo ================================================================
) else (
  echo ================================================================
  echo  Kono shomossha hole screen-e dekhte paben.
  echo ================================================================
)
pause
