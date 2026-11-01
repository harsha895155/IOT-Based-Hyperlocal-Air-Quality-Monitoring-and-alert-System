@echo off
title AirGuard Wireless ESP32 Setup
color 0B
echo ========================================================
echo        AirGuard ESP32 - 100%% Pure Wireless Setup
echo ========================================================
echo.
echo Make sure your Laptop's Wi-Fi is currently connected to:
echo                 [ AirGuard-Setup ]
echo.
echo ========================================================
echo.

set /p WIFI_SSID="Enter your Home/Mobile Wi-Fi Name (SSID): "
set /p WIFI_PASS="Enter your Wi-Fi Password: "

if "%WIFI_SSID%"=="" (
    echo [ERROR] Wi-Fi SSID cannot be empty!
    pause
    exit /b
)

echo.
echo Sending credentials wirelessly to ESP32 at http://192.168.4.1/save ...
echo.

curl.exe -X POST -d "ssid=%WIFI_SSID%&manual_ssid=%WIFI_SSID%&password=%WIFI_PASS%" http://192.168.4.1/save

echo.
echo.
echo ========================================================
echo If you saw 'Wi-Fi Credentials Saved', the node is now
echo connected to %WIFI_SSID%!
echo.
echo You can now reconnect your laptop back to your normal Wi-Fi.
echo ========================================================
pause

