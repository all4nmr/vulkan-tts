import { useState, useRef } from "react";
import type { Lang } from "../App";
import ProgressRing from "./ProgressRing";
import ProgressBar from "./ProgressBar";

interface Props {
  lang: Lang;
}

const LANGUAGES = ["Korean", "English", "Chinese", "Japanese", "French", "German", "Spanish", "Italian", "Portuguese", "Russian"];

const LABELS = {
  ttsTitle: { ko: "음성 합성", en: "Speech Synthesis" },
  subtitle: { ko: "Qwen-TTS · 음성 클론 · Vulkan 가속", en: "Qwen-TTS · Voice Clone · Vulkan Accelerated" },
  model: { ko: "모델 GGUF", en: "Model GGUF" },
  codec: { ko: "코덱 GGUF", en: "Codec GGUF" },
  voice: { ko: "참조 음성", en: "Reference Voice" },
  lang: { ko: "언어", en: "Language" },
  text: { ko: "텍스트", en: "Text" },
  textPlaceholder: { ko: "변환할 텍스트를 입력하세요...", en: "Enter text to synthesize..." },
  generate: { ko: "음성 생성", en: "Generate" },
  generating: { ko: "생성 중...", en: "Generating..." },
  browse: { ko: "찾기", en: "Browse" },
  output: { ko: "출력 파일", en: "Output File" },
  saveAs: { ko: "저장 위치", en: "Save As" },
};

export default function TTSPanel({ lang }: Props) {
  const [text, setText] = useState("");
  const [modelPath, setModelPath] = useState("");
  const [codecPath, setCodecPath] = useState("");
  const [refWavPath, setRefWavPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [ttsLang, setTtsLang] = useState("Korean");
  const [generating, setGenerating] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Progress state
  const [progress, setProgress] = useState({ percent: 0, chunk: 0, totalChunks: 0, phase: "", text: "" });
  const unlistenRef = useRef<(() => void) | null>(null);

  const l = (key: string) => {
    const entry = LABELS[key as keyof typeof LABELS];
    return (entry as any)[lang];
  };

  const browseFile = async (setter: (v: string) => void, filters: { name: string; extensions: string[] }[]) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({ multiple: false, filters });
      if (result) setter(result as string);
    } catch {
      // Fallback for browser dev mode
      const path = prompt("파일 경로를 입력하세요:");
      if (path) setter(path);
    }
  };

  const browseOutput = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const result = await save({
        filters: [{ name: "WAV Audio", extensions: ["wav"] }],
      });
      if (result) setOutputPath(result as string);
    } catch {
      const path = prompt("저장할 WAV 경로를 입력하세요:");
      if (path) setOutputPath(path);
    }
  };

  const handleGenerate = async () => {
    if (!modelPath || !codecPath || !text.trim() || generating) return;

    setGenerating(true);
    setProgress({ percent: 0, chunk: 0, totalChunks: 0, phase: "preparing", text: "준비 중..." });
    setAudioSrc(null);

    try {
      // Listen for progress events from Rust backend
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen<{
        percent: number;
        chunk: number;
        total_chunks: number;
        phase: string;
        text: string;
        output_path?: string;
      }>("tts-progress", (event) => {
        setProgress({
          percent: event.payload.percent,
          chunk: event.payload.chunk,
          totalChunks: event.payload.total_chunks,
          phase: event.payload.phase,
          text: event.payload.text,
        });
      });
      unlistenRef.current = unlisten;

      const { invoke } = await import("@tauri-apps/api/core");
      const defaultOutput = outputPath || `${text.trim().slice(0, 20).replace(/[^a-zA-Z0-9가-힣]/g, "_")}.wav`;
      const result = await invoke<string>("run_tts", {
        modelPath,
        codecPath,
        refWav: refWavPath,
        text: text.trim(),
        lang: ttsLang,
        speaker: "",
        outputPath: defaultOutput,
        temp: 0.7,
        qwenTtsPath: "",
      });
      console.log(result);
      // Read the generated WAV as base64 data URL for playback
      const { readFile } = await import("@tauri-apps/plugin-fs");
      try {
        const wavBytes = await readFile(defaultOutput);
        const blob = new Blob([wavBytes], { type: "audio/wav" });
        setAudioSrc(URL.createObjectURL(blob));
      } catch (e) {
        console.error("Failed to read WAV for preview:", e);
        setAudioSrc(defaultOutput);
      }
      if (audioRef.current) audioRef.current.load();
    } catch (err) {
      console.error("TTS failed:", err);
      alert(`Error: ${err}`);
    } finally {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      setGenerating(false);
    }
  };

  return (
    <div className="content-panel active tts-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">{l("ttsTitle")}</div>
          <div className="panel-subtitle">{l("subtitle")}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{l("model")}</div>
        <div className="form-row">
          <input type="text" value={modelPath} placeholder="qwen-talker-1.7b-base-Q8_0.gguf" readOnly />
          <button className="btn btn-small" onClick={() => browseFile(setModelPath, [{ name: "GGUF", extensions: ["gguf"] }])}>
            {l("browse")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{l("codec")}</div>
        <div className="form-row">
          <input type="text" value={codecPath} placeholder="qwen-tokenizer-12hz-Q8_0.gguf" readOnly />
          <button className="btn btn-small" onClick={() => browseFile(setCodecPath, [{ name: "GGUF", extensions: ["gguf"] }])}>
            {l("browse")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{l("voice")}</div>
        <div className="form-row">
          <input type="text" value={refWavPath} placeholder="내목소리.wav (선택)" readOnly />
          <button className="btn btn-small" onClick={() => browseFile(setRefWavPath, [{ name: "WAV", extensions: ["wav"] }])}>
            {l("browse")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{l("text")}</div>
        <textarea
          placeholder={l("textPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{l("lang")}</label>
          <select value={ttsLang} onChange={(e) => setTtsLang(e.target.value)}>
            {LANGUAGES.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{l("output")}</label>
          <div className="form-row">
            <input type="text" value={outputPath} placeholder="output.wav" readOnly />
            <button className="btn btn-small" onClick={browseOutput}>{l("saveAs")}</button>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="panel-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <button
          className={`btn btn-primary btn-large${generating ? " loading" : ""}`}
          onClick={handleGenerate}
          disabled={generating || !text.trim() || !modelPath}
          style={{ width: "100%", justifyContent: "center", padding: "12px 24px", fontSize: "15px" }}
        >
          {generating ? "⏳" : "▶"} {generating ? l("generating") : l("generate")}
        </button>

        {/* Progress display during generation */}
        {generating && (
          <div className="generation-progress">
            <div className="progress-ring-wrapper">
              <ProgressRing
                percent={progress.percent}
                label={progress.text}
                sublabel={
                  progress.totalChunks > 1
                    ? `Chunk ${progress.chunk}/${progress.totalChunks}`
                    : undefined
                }
              />
            </div>
            {progress.totalChunks > 1 && (
              <ProgressBar
                percent={progress.percent}
                label={progress.text}
                chunks={`${progress.chunk}/${progress.totalChunks}`}
              />
            )}
          </div>
        )}
      </div>

      {audioSrc && (
        <div className="card">
          <div className="section-title">미리듣기</div>
          <audio ref={audioRef} controls src={audioSrc} style={{ width: "100%" }}>
            오디오를 재생할 수 없습니다.
          </audio>
        </div>
      )}
    </div>
  );
}
