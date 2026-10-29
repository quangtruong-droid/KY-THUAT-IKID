@echo off
chcp 65001 >nul
title IKID - Xuat toan bo code + database
cd /d "%~dp0"
echo.
echo ============================================================
echo   XUAT TOAN BO DU AN RA MOT FILE ZIP
echo.
echo   Gom: ma nguon web + toan bo database D1
echo   Khong gom anh/video (840 MB, nam rieng tren kho)
echo.
echo   Lan dau chay co the mat 1-2 phut.
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0XUAT-TAT-CA.ps1"
if errorlevel 1 (
  echo.
  echo ------------------------------------------------------------
  echo   CO LOI. Chup man hinh nay gui lai.
  echo ------------------------------------------------------------
)
echo.
pause
