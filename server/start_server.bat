@echo off
cd /d "C:\Users\SoundTech\Server\audio-fix-mgr\server"
echo -------------------------------------------------- >> server_startup.log
echo Starting Audio Fix Server at %DATE% %TIME% >> server_startup.log
call npm start >> server_startup.log 2>&1
