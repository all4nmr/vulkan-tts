@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM run-tts.bat — 한국어 TTS 실행 도우미
REM 사용법: run-tts "텍스트"
REM 또는: run-tts.cmd < text_utf8.txt

if "%~1"=="" (
  echo 사용법: run-tts "안녕하세요, 반갑습니다."
  echo 또는:  type text_utf8.txt ^| run-tts
  exit /b 1
)

set "TEXT=%~1"

REM 임시 UTF-8 파일 생성 (BOM 없이)
if exist "%TEMP%\tts_input.txt" del "%TEMP%\tts_input.txt"
(
  echo %TEXT%
) > "%TEMP%\tts_input.txt"

bin\qwen-tts.exe ^
  --model models\qwen-talker-1.7b-base-Q8_0.gguf ^
  --codec models\qwen-tokenizer-12hz-Q8_0.gguf ^
  --ref-wav myvoice.wav ^
  --lang Korean ^
  -o output.wav ^
  < "%TEMP%\tts_input.txt"

if %ERRORLEVEL% equ 0 (
  echo ✅ 생성 완료: output.wav
) else (
  echo ❌ 오류 발생
)
