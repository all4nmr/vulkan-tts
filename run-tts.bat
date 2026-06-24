@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

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
    echo   run-tts.bat "My voice is my voice."
    echo.
    echo NOTES:
    echo   - Place myvoice.wav (3-10 sec, mono, 24kHz) in this folder
    echo   - Place GGUF models in models\ folder
    echo.
    goto :eof
)

echo %TEXT% > __input.txt
bin\qwen-tts.exe --model %MODEL% --codec %CODEC% --ref-wav %VOICE% --lang Korean -o output.wav < __input.txt
del __input.txt
echo.
echo Done! Saved to output.wav
