# ScrappyVox

**[ScrappyAI](https://scrappyai.blogspot.com)의 AI 음성 클론 데스크탑 앱**

**Windows + AMD GPU에서 Vulkan 가속으로 동작하는 로컬 AI 음성 합성 도구**

음성 클론, 한국어 TTS 지원. Python 필요 없음, 설치파일 하나로 끝.

## 특징

- 🎯 **AMD GPU Vulkan 가속** — voicebox.sh보다 3~5배 빠름 (DirectML 대비)
- 🎤 **음성 클론** — 참조 음성 3초만 있으면 zero-shot 클론
- 🌏 **한국어 + 영어 + 10개 언어 지원**
- 🔒 **완전 로컬** — 인터넷 필요 없음, 데이터 외부 유출 없음
- ⚡ **설치파일 하나** — Python, CUDA, ROCm 전혀 필요 없음

## 다운로드

[GitHub Releases](https://github.com/all4nmr/vulkan-tts/releases) 페이지에서 최신 `scrappyvox-windows.zip` 다운로드

## 실행 방법

### CLI

```bash
# 음성 클론
qwen-tts.exe ^
  --model models/qwen-talker-1.7b-base-Q8_0.gguf ^
  --codec models/qwen-tokenizer-12hz-Q8_0.gguf ^
  --ref-wav my-voice.wav ^
  --lang Korean ^
  -p "안녕하세요, 반갑습니다." ^
  -o output.wav

# 화자 선택 (CustomVoice)
qwen-tts.exe ^
  --model models/qwen-talker-1.7b-customvoice-Q8_0.gguf ^
  --codec models/qwen-tokenizer-12hz-Q8_0.gguf ^
  --speaker eric ^
  --lang Korean ^
  -p "안녕하세요." ^
  -o output.wav
```

## 직접 빌드

```powershell
# Windows (Vulkan)
git clone --recurse-submodules https://github.com/all4nmr/vulkan-tts
cd vulkan-tts
cmake -B build -DGGML_VULKAN=ON
cmake --build build --config Release -j
```
