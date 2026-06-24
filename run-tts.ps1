#requires -version 5.1
# Vulkan-TTS: Voice Cloning Script (Korean supported)
# Run in PowerShell (NOT cmd.exe)

$ErrorActionPreference = "Stop"

# --- Config ---
$BIN = "bin"
$MODEL = "models\qwen-talker-1.7b-base-Q8_0.gguf"
$CODEC = "models\qwen-tokenizer-12hz-Q8_0.gguf"
$OUTPUT = "output.wav"

# --- Check files ---
if (-not (Test-Path "$BIN\qwen-tts.exe")) { Write-Error "qwen-tts.exe not found in $BIN/"; exit 1 }
if (-not (Test-Path $MODEL)) { Write-Error "Model not found: $MODEL"; exit 1 }
if (-not (Test-Path $CODEC)) { Write-Error "Codec not found: $CODEC"; exit 1 }

# --- Get voice file (auto-convert m4a/flac → wav) ---
$voice = Read-Host "Voice file path (m4a, mp3, wav, etc.)"
if (-not (Test-Path $voice)) { Write-Error "File not found: $voice"; exit 1 }

$ext = [System.IO.Path]::GetExtension($voice).ToLower()
if ($ext -ne ".wav") {
    # Try ffmpeg (if installed), otherwise require WAV
    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($ffmpeg) {
        $wavVoice = "$env:TEMP\voice_converted.wav"
        & ffmpeg -y -i "$voice" -ac 1 -ar 24000 -sample_fmt s16 "$wavVoice" 2>$null
        $voice = $wavVoice
        Write-Host "Converted to WAV: $voice" -ForegroundColor Green
    } else {
        Write-Error "Please convert to WAV first (24kHz mono, 16-bit)."
        Write-Host "ffmpeg not found. Install from: https://ffmpeg.org/download.html"
        exit 1
    }
}

# --- Get text (UTF-8, Korean supported) ---
Write-Host ""
Write-Host "Enter text to speak (Korean supported):" -ForegroundColor Cyan
$text = Read-Host

# Save text to UTF-8 file (NO BOM) and pipe to qwen-tts
$tmpFile = "$env:TEMP\tts_input_$([System.Guid]::NewGuid().ToString('N')).txt"
[System.IO.File]::WriteAllLines($tmpFile, $text, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Generating... (this may take 30-60 seconds)" -ForegroundColor Yellow

# Run qwen-tts: redirect stdin from UTF-8 file
Get-Content $tmpFile -Raw | & "$BIN\qwen-tts.exe" --model $MODEL --codec $CODEC --ref-wav $voice --lang Korean -o $OUTPUT

# Cleanup
Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Done! Saved to: $OUTPUT" -ForegroundColor Green
Write-Host "   File size: $((Get-Item $OUTPUT).Length / 1024) KB"
