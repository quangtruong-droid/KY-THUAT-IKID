@echo off
chcp 65001 >nul
title IKID - Day ma nguon len GitHub
cd /d "%~dp0"

echo.
echo ============================================================
echo   DAY MA NGUON LEN GITHUB
echo.
echo   Chi day MA NGUON (1,9 MB). Khong day anh, video, database.
echo   Khong dung den web dang chay - web chi doi khi chay DEPLOY.bat.
echo ============================================================
echo.

REM ------------------------------------------------------------
REM  1) Co Git chua
REM ------------------------------------------------------------
git --version >nul 2>&1
if errorlevel 1 (
  echo   MAY CHUA CAI GIT.
  echo.
  echo   Vao trang nay tai ve roi cai, bam Next het:
  echo       https://git-scm.com/download/win
  echo.
  echo   Cai xong DONG cua so nay, mo lai file nay.
  echo.
  pause
  exit /b 1
)

REM ------------------------------------------------------------
REM  2) Lan dau: tao kho trong may
REM ------------------------------------------------------------
if not exist ".git" (
  echo   Lan dau chay - dang tao kho trong may...
  git init -q
  git branch -M main
  git config user.name "Vu Quang Truong"
  git config user.email "quangtruong@ikidvn.com"
  echo   Xong.
  echo.
)

REM ------------------------------------------------------------
REM  3) Dia chi kho tren GitHub
REM ------------------------------------------------------------
REM  (Phan hoi dia chi phai de NGOAI khoi if. Trong CMD, bien dat bang
REM   set /p o trong mot khoi ngoac thi doc lai ra rong - loi kinh dien.)
git remote get-url origin >nul 2>&1
if not errorlevel 1 goto CO_KHO

echo   Chua biet kho tren GitHub nam o dau.
echo.
echo   Mo github.com, bam New, dat ten gi cung duoc,
echo   CHON PRIVATE, KHONG tich o nao het, roi bam Create.
echo   Trang hien ra co dong dia chi dang:
echo       https://github.com/TEN-CUA-ANH/TEN-KHO.git
echo.
set "KHO="
set /p "KHO=  Dan dia chi do vao day roi Enter: "
if not defined KHO (
  echo.
  echo   Chua nhap gi. Dung lai.
  pause
  exit /b 1
)
git remote add origin %KHO%
echo.

:CO_KHO
for /f "delims=" %%u in ('git remote get-url origin') do set DIACHI=%%u
echo   Kho: %DIACHI%
echo.

REM ------------------------------------------------------------
REM  4) Dong goi va day len
REM ------------------------------------------------------------
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format ''yyyy-MM-dd HH:mm''"') do set LUC=%%i

echo   Dang xem co gi moi...
git add -A
git commit -q -m "Cap nhat %LUC%" 2>nul
if errorlevel 1 (
  echo   Khong co gi moi so voi lan truoc. Van thu day len cho chac.
)
echo.
echo   Dang day len... Lan dau se hien cua so bao dang nhap GitHub.
echo.

git push -u origin main
if not errorlevel 1 goto XONG

echo.
echo   Day khong duoc. Thu hoa voi ban tren mang roi day lai...
git pull --rebase origin main
git push -u origin main
if not errorlevel 1 goto XONG

echo.
echo   ------------------------------------------------------------
echo   VAN KHONG DUOC. Chup man hinh nay gui lai.
echo.
echo   Hay gap nhat: kho tren GitHub phai TRONG HOAN TOAN.
echo   Luc tao kho khong duoc tich o "Add a README file".
echo   ------------------------------------------------------------
echo.
pause
exit /b 1

:XONG
echo.
echo ============================================================
echo   XONG. Ma nguon da nam tren GitHub.
echo.
echo   Lan sau sua code xong, bam dup file nay la day tiep.
echo   Khong can nhap lai dia chi.
echo ============================================================
echo.
pause
