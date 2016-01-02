REM Shamelessly taken from BetterDiscordApp's code, modified to open installer
REM selection rather than grab the download directly
REM Copyright (c) 2015 Jiiks | Jiiks.net
REM License: MIT

@echo off
where node.exe
if %errorlevel%==1 (
    echo "Node.js installation not on path, download and install the MSI"
    echo "Opening your browser..."
    start "" "https://nodejs.org/en/download/"
    pause
) else (
    taskkill /f /im "Discord.exe" >nul 2>nul
    cmd /k node.exe index.js
)
exit

