import { useState } from "react";
import type { Lang } from "../App";

interface Props {
  lang: Lang;
}

const LABELS = {
  title: { ko: "설정", en: "Settings" },
  gpuBackend: { ko: "GPU 백엔드", en: "GPU Backend" },
  inferenceEngine: { ko: "추론 엔진", en: "Inference Engine" },
  gpuSelection: { ko: "GPU 선택", en: "GPU Selection" },
  cpuFallback: { ko: "CPU 폴백", en: "CPU Fallback" },
  modelMgmt: { ko: "모델 관리", en: "Model Management" },
  searchModels: { ko: "모델 검색...", en: "Search models..." },
  addModel: { ko: "모델 추가", en: "Add Model" },
  installed: { ko: "설치됨", en: "Installed" },
  downloading: { ko: "다운로드 중", en: "Downloading" },
  available: { ko: "설치 가능", en: "Available" },
  languageRegion: { ko: "언어 및 지역", en: "Language & Locale" },
  uiLanguage: { ko: "UI 언어", en: "UI Language" },
  defaultTtsLang: { ko: "기본 TTS 언어", en: "Default TTS Language" },
  sampleRate: { ko: "샘플 레이트", en: "Sample Rate" },
};

type InferenceEngine = "cuda" | "rocm" | "metal" | "directml" | "vulkan";

const ENGINES: { id: InferenceEngine; label: string }[] = [
  { id: "cuda", label: "CUDA" },
  { id: "rocm", label: "ROCm" },
  { id: "metal", label: "Metal" },
  { id: "directml", label: "DirectML" },
  { id: "vulkan", label: "Vulkan" },
];

interface ModelCard {
  name: string;
  size: string;
  status: "installed" | "downloading" | "available";
  progress?: number;
}

const MOCK_MODELS: ModelCard[] = [
  { name: "XTTS-v2", size: "1.8 GB", status: "installed" },
  { name: "Bark", size: "3.2 GB", status: "available" },
  { name: "CosyVoice", size: "2.1 GB", status: "downloading", progress: 68 },
  { name: "MeloTTS", size: "420 MB", status: "available" },
];

export default function SettingsPanel({ lang }: Props) {
  const [engine, setEngine] = useState<InferenceEngine>("rocm");
  const [gpu, setGpu] = useState("RX 7900 XTX");
  const [cpuFallback, setCpuFallback] = useState(true);
  const [search, setSearch] = useState("");
  const [uiLang, setUiLang] = useState("ko");
  const [defaultLang, setDefaultLang] = useState("ko");
  const [sr, setSr] = useState("24000");

  const l = (key: keyof typeof LABELS) => LABELS[key][lang];

  const filteredModels = MOCK_MODELS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="content-panel active settings-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">{l("title")}</div>
        </div>
      </div>

      {/* GPU Backend */}
      <section className="card">
        <h3 className="section-title">{l("gpuBackend")}</h3>
        <div className="form-group">
          <label className="form-label">{l("inferenceEngine")}</label>
          <div className="chip-group">
            {ENGINES.map((eng) => (
              <button
                key={eng.id}
                className={`chip${engine === eng.id ? " active" : ""}`}
                onClick={() => setEngine(eng.id)}
              >
                {eng.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div className="form-group">
            <label className="form-label">{l("gpuSelection")}</label>
            <select value={gpu} onChange={(e) => setGpu(e.target.value)}>
              <option>RX 7900 XTX</option>
              <option>RX 6900 XT</option>
              <option>RX 6800</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{l("cpuFallback")}</label>
            <div className="toggle-row">
              <button
                className={`toggle${cpuFallback ? " on" : ""}`}
                onClick={() => setCpuFallback(!cpuFallback)}
                role="switch"
                aria-checked={cpuFallback}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Model Management */}
      <section className="card">
        <h3 className="section-title">{l("modelMgmt")}</h3>
        <div className="settings-row">
          <input
            type="text"
            className="search-input"
            placeholder={l("searchModels")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn">{l("addModel")}</button>
        </div>
        <div className="model-grid">
          {filteredModels.map((m) => (
            <div key={m.name} className="model-card">
              <div className="model-info">
                <div className="model-name">{m.name}</div>
                <div className="model-size">{m.size}</div>
              </div>
              <div className="model-status">
                {m.status === "installed" && (
                  <span className="badge badge-green">✓ {l("installed")}</span>
                )}
                {m.status === "downloading" && (
                  <div>
                    <span className="badge badge-amber">{l("downloading")} {m.progress}%</span>
                    <div className="mini-progress">
                      <div className="mini-progress-fill" style={{ width: `${m.progress}%` }} />
                    </div>
                  </div>
                )}
                {m.status === "available" && (
                  <button className="btn btn-small">{l("available")}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Language & Locale */}
      <section className="card">
        <h3 className="section-title">{l("languageRegion")}</h3>
        <div className="settings-row">
          <div className="form-group">
            <label className="form-label">{l("uiLanguage")}</label>
            <select value={uiLang} onChange={(e) => setUiLang(e.target.value)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{l("defaultTtsLang")}</label>
            <select value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)}>
              <option value="ko">한국어 (Korean)</option>
              <option value="en">English</option>
              <option value="ja">日本語 (Japanese)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{l("sampleRate")}</label>
            <select value={sr} onChange={(e) => setSr(e.target.value)}>
              <option value="24000">24 kHz</option>
              <option value="44100">44.1 kHz</option>
              <option value="48000">48 kHz</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
