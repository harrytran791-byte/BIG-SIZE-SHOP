@echo off
chcp 65001 >nul
title TRUNG TÂM ĐIỀU KHIỂN LOCALHOST - CURVE & CONFIDENCE
color 0F

:MENU
cls
echo =====================================================================
echo       TRUNG TÂM ĐIỀU KHIỂN LOCALHOST - SHOP THỜI TRANG BIG SIZE
echo =====================================================================
echo.

:: Kiểm tra trạng thái port 5173 (Frontend)
netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo   [FRONTEND - WEB CHÍNH]:  ● ĐANG CHẠY (http://localhost:5173)
) else (
    echo   [FRONTEND - WEB CHÍNH]:  ○ ĐANG TẮT
)

:: Kiểm tra trạng thái port 5000 (Backend API Express)
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo   [BACKEND - REST API]:    ● ĐANG CHẠY (http://localhost:5000/api/v1)
) else (
    echo   [BACKEND - REST API]:    ○ ĐANG TẮT (Không bắt buộc với web chính)
)
echo.
echo ---------------------------------------------------------------------
echo   [1] Khởi động Frontend CHẠY NGẦM  (Tắt cửa sổ này website VẪN CHẠY)
echo   [2] Khởi động Frontend CÓ LOG      (Xem chi tiết log Vite để debug)
echo   [3] Dừng Server Localhost          (Tắt sạch sẽ port 5173 và 5000)
echo   [4] Mở trang Website trên Trình Duyệt (http://localhost:5173)
echo   [5] Làm mới / Kiểm tra lại trạng thái Server
echo   [6] Khởi động Backend Express Server (Port 5000 - Demo bảo vệ đồ án)
echo   [0] Thoát
echo ---------------------------------------------------------------------
echo.
set "choice="
set /p choice="Nhập lựa chọn của bạn (1, 2, 3, 4, 5, 6 hoặc 0): "

if "%choice%"=="1" goto START_BACKGROUND
if "%choice%"=="2" goto START_FOREGROUND
if "%choice%"=="3" goto STOP_SERVER
if "%choice%"=="4" goto OPEN_BROWSER
if "%choice%"=="5" goto MENU
if "%choice%"=="6" goto START_BACKEND
if "%choice%"=="0" exit
goto MENU

:START_BACKGROUND
cls
echo =====================================================================
echo   ĐANG KHỞI ĐỘNG SERVER CHẠY NGẦM (BACKGROUND MODE)...
echo =====================================================================
echo.

netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [THÔNG BÁO] Server Localhost đã đang chạy rồi!
    echo Đang mở trình duyệt cho bạn...
    start http://localhost:5173
    timeout /t 2 >nul
    goto MENU
)

echo Đang khởi tạo tiến trình nền không chiếm dụng màn hình...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev' -WorkingDirectory '%~dp0frontend' -WindowStyle Hidden"

echo Đang chờ server sẵn sàng (3 giây)...
timeout /t 3 >nul

netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo   [THÀNH CÔNG] Server đã chạy ngầm tại http://localhost:5173
    echo   BẠN CÓ THỂ ĐÓNG CỬA SỔ TERMINAL NÀY MÀ KHÔNG LO BỊ TẮT LOCALHOST!
    echo =====================================================================
    start http://localhost:5173
) else (
    echo.
    echo [CẢNH BÁO] Server đang trong quá trình khởi động, đang mở trình duyệt...
    start http://localhost:5173
)

echo.
pause
goto MENU

:START_FOREGROUND
cls
echo =====================================================================
echo   ĐANG KHỞI ĐỘNG SERVER CÓ CỬA SỔ LOG (LOGS MODE)...
echo =====================================================================
echo.

netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [CẢNH BÁO] Port 5173 đang có tiến trình chạy.
    echo Bạn vui lòng chọn phím [3] để dừng server cũ trước khi mở cửa sổ mới!
    echo.
    pause
    goto MENU
)

echo Mở cửa sổ theo dõi log riêng biệt...
start "Vite Dev Server (Big Size Logs)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 2 >nul
start http://localhost:5173
goto MENU

:STOP_SERVER
cls
echo =====================================================================
echo   ĐANG DỪNG TIẾN TRÌNH SERVER LOCALHOST (PORT 5173 & PORT 5000)...
echo =====================================================================
echo.

set "KILLED="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo [FRONTEND] Tìm thấy tiến trình PID %%a trên cổng 5173, đang dừng...
    taskkill /F /T /PID %%a >nul 2>&1
    set "KILLED=1"
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo [BACKEND] Tìm thấy tiến trình PID %%a trên cổng 5000, đang dừng...
    taskkill /F /T /PID %%a >nul 2>&1
    set "KILLED=1"
)

if defined KILLED (
    echo.
    echo [THÀNH CÔNG] Đã tắt sạch sẽ toàn bộ server Localhost!
) else (
    echo [THÔNG BÁO] Không có server nào đang chạy trên cổng 5173 hoặc 5000.
)

echo.
pause
goto MENU

:START_BACKEND
cls
echo =====================================================================
echo   ĐANG KHỞI ĐỘNG SERVER BACKEND REST API (EXPRESS PORT 5000)...
echo =====================================================================
echo.

netstat -ano | findstr :5000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [CẢNH BÁO] Port 5000 đang có tiến trình chạy.
    echo Vui lòng chọn phím [3] để dừng trước khi mở lại!
    echo.
    pause
    goto MENU
)

echo Mở cửa sổ theo dõi log riêng biệt cho Backend Express...
start "Express Backend API Server (Port 5000)" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 2 >nul
echo.
echo [THÀNH CÔNG] Đã khởi chạy Backend Express tại http://localhost:5000!
echo Bạn có thể kiểm tra Health Check tại: http://localhost:5000/health
echo.
pause
goto MENU

:OPEN_BROWSER
start http://localhost:5173
goto MENU
