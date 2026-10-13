@echo off
chcp 65001 >nul
title Push TallyKhata to GitHub
cd /d "%~dp0"

set "PATH=C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd;C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\mingw64\bin;%PATH%"

echo ================================================================
echo           Uploading TallyKhata to GitHub
echo           Repository: https://github.com/rocky-ahmed/tallykhata-manager
echo ================================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
  echo ================================================================
  echo  SUCCESS! Apnar project GitHub-e shofolbhabe upload hoyeche!
  echo ================================================================
) else (
  echo ================================================================
  echo  Jodi GitHub Login ba Token cheye thake, login korun.
  echo ================================================================
)
pause
