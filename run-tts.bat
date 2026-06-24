@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: run-tts.bat "TEXT TO SPEAK"
    echo Example: run-tts.bat "Hello, this is my cloned voice."
    exit /b 1
)

echo Writing input text...
set "TEXT=%~1"
powershell -Command "[System.IO.File]::WriteAllText('input.txt', '%TEXT%')" 2>nul

if not exist "input.txt" (
    echo Error: Could not create input.txt
    exit /b 1
)

echo Generating speech...
bin\qwen-tts.exe --model models\qwen-talker-1.7b-base-Q8_0.gguf --codec models\qwen-tokenizer-12hz-Q8_0.gguf --ref-wav myvoice.wav --lang Korean -o output.wav < input.txt

if %ERRORLEVEL% equ 0 (
    echo Success: output.wav created.
) else (
    echo Error: generation failed.
)
