# Vulkan TTS GUI

Tauri v2 + React + TypeScript 데스크탑 앱 — qwen-tts 음성 합성 GUI

## 기능

- **파일 선택**: 모델 GGUF, 코덱 GGUF, 참조 음성 WAV
- **텍스트 입력**: 변환할 텍스트 입력
- **언어 선택**: Korean, English, Chinese, Japanese 등 10개 언어
- **화자 선택**: CustomVoice 모델용 화자 지정
- **Temperature 조절**: 0.1 ~ 2.0 슬라이더
- **음성 생성**: Rust 백엔드에서 qwen-tts subprocess 실행
- **오디오 미리듣기**: 생성된 WAV 파일 즉시 재생
- **저장**: 다른 이름으로 WAV 저장

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust (Tauri v2)
- **Audio**: HTML5 Audio API
- **File Dialogs**: tauri-plugin-dialog
- **Styling**: CSS custom properties (dark theme)

## 개발

```bash
cd gui
npm install
cargo tauri dev     # 개발 모드 (hot reload)
cargo tauri build   # 프로덕션 빌드
```

## 빌드 결과물

- **macOS**: `src-tauri/target/release/bundle/macos/Vulkan TTS.app`
- **DMG**: `src-tauri/target/release/bundle/dmg/Vulkan TTS_0.1.0_aarch64.dmg`
- **Windows**: 크로스컴파일 예정 (`cargo tauri build --target x86_64-pc-windows-msvc`)

## 의존성

- Rust 1.77+
- Node.js 22+
- Xcode Command Line Tools (macOS)
- qwen-tts 바이너리 (PATH에 있거나 직접 경로 지정)
