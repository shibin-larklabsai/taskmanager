@echo off
echo Installing required packages...
call npm install socket.io
call npm install @socket.io/redis-adapter
call npm install ioredis
call npm install @types/socket.io

echo.
echo Installation complete!
pause
