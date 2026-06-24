@echo off
chcp 65001 > nul

set TEXT=%~1
set VOICE=myvoice.wav
set MODEL=models\qwen-talker-1.7b-base-Q8_0.gguf
set CODEC=models\qwen-tokenizer-12hz-Q8_0.gguf

if "%TEXT%"=="" (
    echo.
    echo ============================================
    echo  Vulkan-TTS - Voice Clone TTS for Windows
    echo ============================================
    echo.
    echo USAGE: run-tts.bat "text to speak"
    echo.
    echo EXAMPLE:
    echo   run-tts.bat "Hello, this is my cloned voice."
    echo.
    echo NOTES:
    echo   - Place myvoice.wav (3-10 sec, mono, 24000 Hz) in this folder
    echo   - Place GGUF models in models\ folder
    echo   - Korean example: run-tts.bat "myvoice" ^< sample-korean.txt
    echo.
    goto :eof
)

:: Write text as UTF-8 (no BOM) using PowerShell
powershell -Command "[System.IO.File]::WriteAllText('__input.txt', '%TEXT%')"
if errorlevel 1 goto :error

bin\qwen-tts.exe --model %MODEL% --codec %CODEC% --ref-wav "%VOICE%" --lang Korean -o output.wav < __input.txt
del __input.txt
echo.
echo Done! Saved to output.wav (24kHz mono WAV)
echo.
goto :eof

:error
echo Error writing UTF-8 text.
pause
