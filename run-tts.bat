@echo off
chcp 65001 >nul
set BIN=bin
set MODEL=models\qwen-talker-1.7b-base-Q8_0.gguf
set CODEC=models\qwen-tokenizer-12hz-Q8_0.gguf

if not exist "%BIN%\qwen-tts.exe" (
    echo ERROR: qwen-tts.exe not found in %BIN%/
    pause
    exit /b 1
)
if not exist "%MODEL%" (
    echo ERROR: %MODEL% not found
    pause
    exit /b 1
)
if not exist "%CODEC%" (
    echo ERROR: %CODEC% not found
    pause
    exit /b 1
)

echo ========================================
echo  Vulkan-TTS - Voice Cloning Tool
echo ========================================
echo.

:GET_VOICE
set /p VOICE="Voice file (WAV, 24kHz mono): "
if not exist "%VOICE%" (
    echo File not found: %VOICE%
    goto GET_VOICE
)

:GET_TEXT
set /p TEXT="Text to speak (Korean supported): "
if "%TEXT%"=="" goto GET_TEXT

echo.
echo Generating...
echo %TEXT% | "%BIN%\qwen-tts.exe" --model "%MODEL%" --codec "%CODEC%" --ref-wav "%VOICE%" --lang Korean -o output.wav
echo.
echo Done! Saved to output.wav
pause
