@echo off
setlocal

echo 正在安装康复游戏项目依赖...
echo.

echo 1. 安装前端依赖...
npm install
if %errorlevel% neq 0 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)

echo.
echo 2. 安装Python依赖...
pip install websockets
if %errorlevel% neq 0 (
    echo Python依赖安装失败！
    pause
    exit /b 1
)

echo.
echo 所有依赖安装完成！
echo 按任意键退出当前程序，双击运行 start.bat 开始游玩游戏！
pause >nul
exit /b 0