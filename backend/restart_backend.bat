@echo off
echo ========================================
echo RESTARTING ZENPOST BACKEND SERVER
echo ========================================
echo.

echo Step 1: Stopping any running Python processes...
taskkill /F /IM python.exe /T 2>nul
if %errorlevel% == 0 (
    echo ✓ Stopped existing processes
    timeout /t 2 /nobreak >nul
) else (
    echo ℹ No running processes found
)

echo.
echo Step 2: Clearing Python cache...
if exist "__pycache__" (
    rmdir /s /q "__pycache__"
    echo ✓ Cleared main cache
)
if exist "services\__pycache__" (
    rmdir /s /q "services\__pycache__"
    echo ✓ Cleared services cache
)

echo.
echo Step 3: Starting backend server...
echo ========================================
echo.
python main.py
