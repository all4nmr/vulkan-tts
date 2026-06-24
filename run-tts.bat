@echo off
chcp 65001 > nul
title ScrappyVox — CLI 음성 합성기

echo ============================================
echo   ScrappyVox — AI Voice Cloning
echo ============================================
echo.
echo 모델 파일이 models/ 폴더에 있는지 확인하세요.
echo.
echo 1. sample-korean.txt 파일로 테스트
echo 2. 직접 텍스트 입력
echo 3. 종료
echo.

set /p CHOICE="선택 (1/2/3): "

if "%CHOICE%"=="1" (
    echo.
    echo sample-korean.txt 음성 합성 중...
    bin\qwen-tts.exe --model models\qwen-talker-1.7b-base-Q8_0.gguf --codec models\qwen-tokenizer-12hz-Q8_0.gguf --lang Korean -o output.wav < sample-korean.txt
    if %ERRORLEVEL% equ 0 (
        echo.
        echo 성공! output.wav 생성됨
    ) else (
        echo.
        echo 실패: 모델 파일 경로를 확인하세요
    )
    goto :EOF
)

if "%CHOICE%"=="2" (
    echo.
    set /p TEXT="변환할 텍스트: "
    echo %TEXT% > input.txt
    echo.
    echo 음성 합성 중...
    bin\qwen-tts.exe --model models\qwen-talker-1.7b-base-Q8_0.gguf --codec models\qwen-tokenizer-12hz-Q8_0.gguf --lang Korean -o output.wav < input.txt
    if %ERRORLEVEL% equ 0 (
        echo.
        echo 성공! output.wav 생성됨
    ) else (
        echo.
        echo 실패: 모델 파일 경로를 확인하세요
    )
    goto :EOF
)

if "%CHOICE%"=="3" goto :EOF

echo 잘못된 입력입니다.
pause
