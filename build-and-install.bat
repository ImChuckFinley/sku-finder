@echo off
echo =====================================
echo   SKU Finder - Build and Install
echo =====================================
echo.

echo [1/5] Stopping Dropbox...
taskkill /IM Dropbox.exe /F >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/5] Building release APK...
set GRADLE_USER_HOME=C:\gradle-cache
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;C:\Program Files\nodejs;%PATH%

cd /d %~dp0android
call gradlew assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED. Starting Dropbox back up...
    start "" "%LOCALAPPDATA%\Dropbox\Dropbox.exe"
    pause
    exit /b 1
)

echo.
echo [3/5] Installing on phone...
adb install -r "%~dp0android\app\build\outputs\apk\release\app-release.apk"
if %ERRORLEVEL% NEQ 0 (
    echo Install failed - is the phone connected with USB debugging on?
)

echo.
echo [4/5] Backing up APK to Google Drive...
if not exist "G:\My Drive\APKs\SKU Finder" mkdir "G:\My Drive\APKs\SKU Finder"
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set dt=%%a
set STAMP=%dt:~0,8%
copy "%~dp0android\app\build\outputs\apk\release\app-release.apk" "G:\My Drive\APKs\SKU Finder\sku-finder-%STAMP%.apk" >nul
echo APK saved to Google Drive as sku-finder-%STAMP%.apk

echo.
echo [5/5] Restarting Dropbox...
start "" "%LOCALAPPDATA%\Dropbox\Dropbox.exe"

echo.
echo =====================================
echo   Done! App installed on phone.
echo =====================================
pause
