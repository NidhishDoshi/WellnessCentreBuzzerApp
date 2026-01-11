@echo off
echo ========================================
echo Wellness Centre - Setup Script
echo ========================================
echo.

echo [1/3] Installing Server Dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Server installation failed
    pause
    exit /b 1
)
echo Server dependencies installed successfully!
echo.

echo [2/3] Installing Mobile App Dependencies...
cd ..\mobile-app
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Mobile app installation failed
    pause
    exit /b 1
)
echo Mobile app dependencies installed successfully!
echo.

echo [3/3] Setup Complete!
echo.
echo ========================================
echo IMPORTANT: Configuration Required
echo ========================================
echo.
echo Before running the system, you need to configure the server IP address:
echo.
echo 1. Find your server IP address:
echo    - Run: ipconfig
echo    - Look for "IPv4 Address" (example: 192.168.1.100)
echo.
echo 2. Update the following files with your server IP:
echo    - mobile-app\src\config.js (lines 2-3)
echo    - tv-display\app.js (line 2)
echo.
echo 3. Optionally update the IP range in:
echo    - server\.env (line 2)
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Configure the IP addresses (see above)
echo 2. Start the server: cd server ^& npm start
echo 3. Open TV display: open tv-display\index.html in browser
echo 4. Run mobile app: cd mobile-app ^& npm run android
echo.
echo See QUICKSTART.md for detailed instructions
echo.
pause
