@echo off
echo ===============================
echo NeuroSense AI - Quick Start
echo ===============================

IF NOT EXIST venv (
    echo Error: Virtual environment not found. Please run 'run.bat' first to install dependencies.
    pause
    exit /b
)

call venv\Scripts\activate
echo Starting Flask server...
start cmd /k python app.py

timeout /t 3 >nul
echo Opening dashboard...
start http://127.0.0.1:5000/

exit
