@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo          卡皮巴拉法庭 - 本地启动
echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有检测到 Node.js。
  echo 请先安装 Node.js 20 或更高版本：https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo 已生成 .env 配置文件。
  echo 接下来会打开它，请填入你的 OPENAI_API_KEY，保存并关闭记事本。
  notepad ".env"
  pause
)

if not exist "node_modules" (
  echo 正在安装项目依赖，请保持网络连接...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败。请检查网络后重试，或在此目录手动运行 npm install。
    pause
    exit /b 1
  )
)

echo 正在启动。浏览器请打开 http://localhost:3000
echo 按 Ctrl+C 可停止服务；关闭此窗口也会停止服务。
call npm start
pause
