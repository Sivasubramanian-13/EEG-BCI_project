@echo off
echo ===============================
echo EEG BCI Project - Auto Runner
echo ===============================

REM ---- Check if venv exists ----
IF NOT EXIST venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM ---- Activate venv ----
call venv\Scripts\activate

REM ---- Upgrade pip safely ----
echo Checking pip...
python -m pip install --upgrade pip

REM ---- Install requirements (only missing ones) ----
echo Installing requirements...
pip install -r requirements.txt

REM ---- Run app ----
echo Starting Flask server...
start cmd /k python app.py

REM ---- Wait before opening browser ----
timeout /t 5 >nul

echo Opening browser...
start http://127.0.0.1:5000

pause