# run-tts.ps1 — Vulkan-TTS 한국어 음성 클론 실행 스크립트
# 사용법: .\run-tts.ps1 -Text "안녕하세요" -Voice "내목소리.wav"

param(
    [string]$Text = "안녕하세요, 반갑습니다.",
    [string]$Voice = "내목소리.wav",
    [string]$Output = "결과.wav"
)

# UTF-8 설정 (한국어 깨짐 방지)
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()

# 임시 텍스트 파일 생성 (UTF-8 BOM 없이)
$tmpFile = [System.IO.Path]::GetTempFileName() + ".txt"
[System.IO.File]::WriteAllText($tmpFile, $Text, [System.Text.UTF8Encoding]::new($false))

Write-Host "🎤 음성 클론 중..." -ForegroundColor Cyan
Write-Host "   텍스트: $Text"
Write-Host "   참조음성: $Voice"
Write-Host "   출력: $Output"

# qwen-tts 실행 (stdin으로 텍스트 전달)
Get-Content $tmpFile -Raw | .\qwen-tts.exe `
    --model models\qwen-talker-1.7b-base-Q8_0.gguf `
    --codec models\qwen-tokenizer-12hz-Q8_0.gguf `
    --ref-wav $Voice `
    --lang Korean `
    --temp 0.7 `
    -o $Output

# 임시 파일 삭제
Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 완료! $Output" -ForegroundColor Green
} else {
    Write-Host "❌ 실패" -ForegroundColor Red
}
