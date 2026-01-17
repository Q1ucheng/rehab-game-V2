@echo off
setlocal

echo 康复游戏启动器
echo.

:: 启动前端开发服务器
echo 正在启动前端开发服务器...
start "" cmd /c "npm run dev"

:: 询问是否开启数据采集
set /p RECORD="是否要开启数据采集功能？(Y/N): "
if /i "%RECORD%"=="Y" (
    echo 正在启动数据采集服务...
    start "" cmd /c "python data_recorder_server.py"
) else (
    echo 数据采集服务未启动。
)

echo.

:: 询问是否立即打开浏览器
set /p OPEN="是否现在打开游戏页面？(Y/N): "
if /i "%OPEN%"=="Y" (
    echo 正在打开游戏页面...
    start "" "http://localhost:5173/rehab-game/"
) else (
    echo 请手动访问 http://localhost:5173/rehab-game/ 开始游戏。
)

echo.
echo 游戏已启动，请根据提示操作。
pause