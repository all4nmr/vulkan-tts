@echo off
chcp 65001 >nul
REM run-tts.bat — Vulkan-TTS 음성 클론 실행기
REM 사용법: run-tts "텍스트"

set MODEL=models\qwen-talker-1.7b-base-Q8_0.gguf
set CODEC=models\qwen-tokenizer-12hz-Q8_0.gguf
set VOICE=내목소리.wav
set OUTPUT=결과.wav

if not exist "%MODEL%" (
    echo ❌ 모델 파일 없음: %MODEL%
    echo    다운로드: https://huggingface.co/Serveurperso/Qwen3-TTS-GGUF
    pause
    exit /b 1
)

if not exist "%VOICE%" (
    echo ❌ 참조 음성 파일 없음: %VOICE%
    echo    3초 WAV 파일(24000Hz, mono)을 내목소리.wav로 저장하세요
    pause
    exit /b 1
)

echo %* > prompt.txt
bin\qwen-tts.exe --model %MODEL% --codec %CODEC% --ref-wav %VOICE% --lang Korean -o %OUTPUT% < prompt.txt

if %ERRORLEVEL% equ 0 (
    echo ✅ 완료: %OUTPUT%
) else (
    echo ❌ 오류 발생
)
