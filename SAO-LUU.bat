@echo off
chcp 65001 >nul
title IKID - Sao luu ma nguon
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sao-luu.ps1"
if errorlevel 1 (
  echo.
  echo ---------------------------------------------
  echo   CO LOI. Chup man hinh nay gui lai.
  echo ---------------------------------------------
)
echo.
pause
