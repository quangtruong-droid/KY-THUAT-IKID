@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  DAY 13 ANH CU LEN KHO R2
echo  Anh cu dang nam base64 trong bang -> chuyen sang R2
echo ============================================
echo.
echo [1/13] KT-0001-anh_truoc-0-a883f48a044c7de4.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0001-anh_truoc-0-a883f48a044c7de4.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0001-anh_truoc-0-a883f48a044c7de4.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [2/13] KT-0002-anh-0-f467f14339e15022.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh-0-f467f14339e15022.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh-0-f467f14339e15022.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [3/13] KT-0002-anh-1-e7a02768b18424bd.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh-1-e7a02768b18424bd.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh-1-e7a02768b18424bd.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [4/13] KT-0002-anh-2-7ed3afb8e55c3fed.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh-2-7ed3afb8e55c3fed.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh-2-7ed3afb8e55c3fed.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [5/13] KT-0002-anh-3-228debb100f75e31.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh-3-228debb100f75e31.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh-3-228debb100f75e31.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [6/13] KT-0002-anh-4-c93ff04149628566.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh-4-c93ff04149628566.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh-4-c93ff04149628566.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [7/13] KT-0002-anh-5-0d65394091afab0a.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh-5-0d65394091afab0a.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh-5-0d65394091afab0a.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [8/13] KT-0002-anh_sau-1-239e30264fc329ad.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh_sau-1-239e30264fc329ad.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh_sau-1-239e30264fc329ad.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [9/13] KT-0002-anh_truoc-0-4982e7531e6c7fea.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh_truoc-0-4982e7531e6c7fea.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh_truoc-0-4982e7531e6c7fea.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [10/13] KT-0002-anh_truoc-3-fcbf1166f6460015.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0002-anh_truoc-3-fcbf1166f6460015.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0002-anh_truoc-3-fcbf1166f6460015.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [11/13] KT-0003-anh_truoc-0-059f0b60a3809e02.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0003-anh_truoc-0-059f0b60a3809e02.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0003-anh_truoc-0-059f0b60a3809e02.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [12/13] KT-0003-anh_truoc-1-18ec362379faded9.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0003-anh_truoc-1-18ec362379faded9.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0003-anh_truoc-1-18ec362379faded9.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo [13/13] KT-0007-anh_sau-0-ece8d31a14f41b80.jpg
call npx wrangler r2 object put ikid-minhchung/cu/KT-0007-anh_sau-0-ece8d31a14f41b80.jpg --file="../ikid-kt-hoso/chuyen-d1/anh-can-day/KT-0007-anh_sau-0-ece8d31a14f41b80.jpg" --content-type=image/jpeg --remote
if errorlevel 1 goto loi
echo.
echo XONG - da day 13 file len R2
goto het
:loi
echo.
echo *** CO LOI - chup man hinh nay gui lai ***
:het
echo.
pause