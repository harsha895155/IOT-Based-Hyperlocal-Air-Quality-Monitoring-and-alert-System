@echo off
title AirGuard ESP32 1-Click Firmware Flasher
color 0B
echo ========================================================
echo        AirGuard ESP32 - 1-Click USB Firmware Flasher
echo ========================================================
echo.
echo 1. Plug your ESP32 into your PC via USB cable.
echo 2. If flashing gets stuck at "Connecting...", hold down
echo    the physical [BOOT] button on your ESP32 board.
echo.
echo ========================================================
pause

set ESPTOOL="C:\Users\user\AppData\Local\Arduino15\packages\esp32\tools\esptool_py\5.3.1\esptool.exe"
set BINARY="firmware\AirGuard_ESP32_AllInOne.bin"

if not exist %ESPTOOL% (
    echo [ERROR] esptool.exe not found at default path.
    pause
    exit /b
)

if not exist %BINARY% (
    echo [ERROR] Firmware binary not found!
    pause
    exit /b
)

echo.
echo [1/2] Connecting to ESP32 and burning updated firmware...
echo.

%ESPTOOL% --chip esp32 write-flash --flash-mode dio --flash-freq 80m --flash-size 4MB 0x0 %BINARY%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================================
    echo [FAILED] Could not flash ESP32.
    echo Common fixes:
    echo 1. Make sure no other program (like Arduino IDE or Serial Monitor) is using the COM port.
    echo 2. Hold down the physical [BOOT] button on the ESP32 while retrying.
    echo ========================================================
    pause
    exit /b
)

echo.
echo ========================================================
echo [SUCCESS] ESP32 has been updated with the latest firmware!
echo The Wi-Fi Name (SSID) box is now visible by default.
echo ========================================================
pause

