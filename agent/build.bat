@echo off
echo Building Remote PC Agent...

REM Install dependencies
pip install -r requirements.txt
pip install pyinstaller

REM Build executable with embedded default .env
pyinstaller --onefile --console --name agent --add-data ".env.embedded;." src/main.py

echo.
echo Build complete! Executable: dist/agent.exe
echo.
echo The agent includes embedded default configuration.
echo You can override it by placing a .env file next to agent.exe
pause
