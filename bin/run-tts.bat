@echo off
chcp 65001 >nul
set MODEL=models\qwen-talker-1.7b-base-Q8_0.gguf
set CODEC=models\qwen-tokenizer-12hz-Q8_0.gguf

if "%1"=="" (
  echo.
  echo [Vulkan-TTS] 한국어 음성 클론
  echo.
  echo 사용법: run-tts.bat "텍스트" [목소리.wav] [결과.wav]
  echo.
  echo 예시:   run-tts.bat "안녕하세요" myvoice.wav output.wav
  echo.
  exit /b
)

set TEXT=%~1
set VOICE=myvoice.wav
if not "%2"=="" set VOICE=%2
set OUTPUT=output.wav
if not "%3"=="" set OUTPUT=%3

echo %TEXT% | bin\qwen-tts.exe --model %MODEL% --codec %CODEC% --ref-wav %VOICE% --lang Korean -o %OUTPUT%
if %ERRORLEVEL%==0 (
  echo ✅ %OUTPUT% 생성 완료!
) else (
  echo ❌ 오류 발생
)
