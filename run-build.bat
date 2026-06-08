@echo off
set GRADLE_USER_HOME=C:\gradle-cache
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;C:\Program Files\nodejs;%PATH%
C:\Users\overw\Dropbox\Claude\sku-finder\android\gradlew.bat -p C:\Users\overw\Dropbox\Claude\sku-finder\android assembleRelease > %USERPROFILE%\gradle-build.log 2>&1
echo %ERRORLEVEL% > %USERPROFILE%\gradle-exit.txt
