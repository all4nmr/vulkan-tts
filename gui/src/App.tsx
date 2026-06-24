import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import "./App.css";

const LANGUAGES = [
  "Korean",
  "English",
  "Chinese",
  "Japanese",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Portuguese",
  "Russian",
];

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function App() {
  const [modelPath, setModelPath] = useState("");
  const [codecPath, setCodecPath] = useState("");
  const [refWavPath, setRefWavPath] = useState("");
  const [text, setText] = useState("");
  const [lang, setLang] = useState("Korean");
  const [speaker, setSpeaker] = useState("");
  const [temp, setTemp] = useState(0.7);
  const [outputPath, setOutputPath] = useState("");
  const [qwenTtsPath, setQwenTtsPath] = useState("qwen-tts");
  const [generating, setGenerating] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const toastId = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const browseFile = async (
    setter: (v: string) => void,
    filters: { name: string; extensions: string[] }[]
  ) => {
    const result = await open({ multiple: false, filters });
    if (result) {
      setter(result as string);
    }
  };

  const browseOutput = async () => {
    const result = await save({
      filters: [{ name: "WAV Audio", extensions: ["wav"] }],
    });
    if (result) {
      setOutputPath(result as string);
    }
  };

  const handleGenerate = async () => {
    if (!modelPath) { addToast("모델 GGUF 파일을 선택하세요.", "error"); return; }
    if (!codecPath) { addToast("코덱 GGUF 파일을 선택하세요.", "error"); return; }
    if (!text.trim()) { addToast("텍스트를 입력하세요.", "error"); return; }
    if (!outputPath) { addToast("출력 파일 경로를 지정하세요.", "error"); return; }

    setGenerating(true);
    try {
      const result = await invoke<string>("run_tts", {
        modelPath,
        codecPath,
        refWav: refWavPath,
        text: text.trim(),
        lang,
        speaker,
        outputPath,
        temp,
        qwenTtsPath,
      });
      addToast(result, "success");
      // Load audio for playback
      const audioUrl = `file://${outputPath}`;
      setAudioSrc(audioUrl);
      if (audioRef.current) {
        audioRef.current.load();
      }
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAs = async () => {
    const newPath = await save({
      filters: [{ name: "WAV Audio", extensions: ["wav"] }],
    });
    if (newPath && outputPath) {
      try {
        // Copy the file using Tauri fs plugin
        const { copyFile } = await import("@tauri-apps/plugin-fs");
        await copyFile(outputPath, newPath as string);
        addToast(`저장 완료: ${newPath}`, "success");
      } catch (err) {
        addToast(`저장 실패: ${err}`, "error");
      }
    }
  };

  return (
    <div className="app">
      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>

      <header className="header">
        <div className="header-left">
          <div className="header-logo">VT</div>
          <h1>Vulkan TTS</h1>
        </div>
        <span className="header-badge">AMD GPU · Voice Clone</span>
      </header>

      <main className="main">
        {/* Qwen-TTS binary path */}
        <section className="section">
          <label className="label">qwen-tts 실행 파일 경로</label>
          <div className="file-row">
            <input
              type="text"
              value={qwenTtsPath}
              onChange={(e) => setQwenTtsPath(e.target.value)}
              placeholder="qwen-tts (PATH에 있으면 이름만)"
              className="input"
            />
            <button
              className="btn btn-secondary"
              onClick={() => browseFile(setQwenTtsPath, [{ name: "Executable", extensions: ["exe", "*"] }])}
            >
              찾기
            </button>
          </div>
        </section>

        <hr />

        {/* Model GGUF */}
        <section className="section">
          <label className="label">모델 GGUF</label>
          <div className="file-row">
            <input
              type="text"
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
              placeholder="qwen-talker-1.7b-base-Q8_0.gguf"
              className="input"
            />
            <button
              className="btn btn-secondary"
              onClick={() => browseFile(setModelPath, [{ name: "GGUF Model", extensions: ["gguf"] }])}
            >
              찾기
            </button>
          </div>
        </section>

        {/* Codec GGUF */}
        <section className="section">
          <label className="label">코덱 GGUF</label>
          <div className="file-row">
            <input
              type="text"
              value={codecPath}
              onChange={(e) => setCodecPath(e.target.value)}
              placeholder="qwen-tokenizer-12hz-Q8_0.gguf"
              className="input"
            />
            <button
              className="btn btn-secondary"
              onClick={() => browseFile(setCodecPath, [{ name: "GGUF Model", extensions: ["gguf"] }])}
            >
              찾기
            </button>
          </div>
        </section>

        {/* Reference WAV */}
        <section className="section">
          <label className="label">참조 음성 WAV (Voice Cloning)</label>
          <div className="file-row">
            <input
              type="text"
              value={refWavPath}
              onChange={(e) => setRefWavPath(e.target.value)}
              placeholder="내목소리.wav (선택사항)"
              className="input"
            />
            <button
              className="btn btn-secondary"
              onClick={() => browseFile(setRefWavPath, [{ name: "WAV Audio", extensions: ["wav"] }])}
            >
              찾기
            </button>
          </div>
        </section>

        <hr />

        {/* Text input */}
        <section className="section">
          <label className="label">텍스트</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="변환할 텍스트를 입력하세요..."
            className="textarea"
            rows={4}
          />
        </section>

        {/* Language & Speaker row */}
        <section className="section row">
          <div className="field">
            <label className="label">언어</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="select">
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">화자 (CustomVoice 모델)</label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="eric (선택사항)"
              className="input"
            />
          </div>
          <div className="field">
            <label className="label">Temperature: {temp.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="slider"
            />
          </div>
        </section>

        {/* Output path */}
        <section className="section">
          <label className="label">출력 WAV 파일</label>
          <div className="file-row">
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="output.wav"
              className="input"
            />
            <button className="btn btn-secondary" onClick={browseOutput}>
              저장위치
            </button>
          </div>
        </section>

        {/* Generate button */}
        <section className="section actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "생성 중..." : "음성 생성"}
          </button>
        </section>

        {/* Audio player */}
        {audioSrc && (
          <section className="section audio-section">
            <label className="label">미리듣기</label>
            <audio ref={audioRef} controls className="audio-player" src={audioSrc}>
              오디오를 재생할 수 없습니다.
            </audio>
            <div className="audio-actions">
              <button className="btn btn-secondary" onClick={handleSaveAs}>
                다른 이름으로 저장
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Vulkan TTS GUI v0.1.0</span>
      </footer>
    </div>
  );
}

export default App;
