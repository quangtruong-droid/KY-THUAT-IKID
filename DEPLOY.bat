@echo off
chcp 65001 >nul
title IKID - Day web len Cloudflare
cd /d "%~dp0"
echo.
echo ==========================================
echo   IKID - So sua chua : DAY LEN CLOUDFLARE
echo ==========================================
echo.
echo [Buoc 1/2] Sao luu ma nguon truoc khi day...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sao-luu.ps1"
if not errorlevel 1 goto day
echo.
echo ---------------------------------------------
echo   SAO LUU KHONG XONG.
echo   Van day len web duoc, nhung lan sua nay
echo   se KHONG co ban sao de quay ve neu hong.
echo ---------------------------------------------
choice /C YN /N /M "Van day len web? (Y = co, N = dung lai) "
if errorlevel 2 goto thoi

:day
echo.
echo [Buoc 2/2] Day len Cloudflare...
echo.
call npx wrangler deploy
if errorlevel 1 goto loi
echo.
echo ---------------------------------------------
echo   XONG. Mo: https://ikid-oms.quangtruong.workers.dev
echo   Ma nguon da co ban sao tren OneDrive.
echo ---------------------------------------------
goto cuoi

:loi
echo.
echo ---------------------------------------------
echo   CO LOI KHI DAY LEN. Chup man hinh nay gui lai.
echo ---------------------------------------------
goto cuoi

:thoi
echo.
echo Da dung lai. CHUA day gi len web.

:cuoi
echo.
pause
