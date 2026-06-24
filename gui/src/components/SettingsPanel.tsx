import { useState } from "react";
import type { Lang } from "../App";

interface Props {
  lang: Lang;
}

const LABELS = {
  title: { ko: "설정", en: "Settings" },
  gpuBackend: { ko: "GPU 백엔드", en: "GPU Backend" },
  inferenceEngine: { ko: "추론 엔진", en: "Inference Engine" },
  gpuSelection: { ko: "GPU 상태", en: "GPU Status" },
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

interface ModelCard {
  name: string;
  size: string;
  status: "installed" | "downloading" | "available";
  progress?: number;
}

const MOCK_MODELS: ModelCard[] = [
  { name: "Qwen3-TTS 1.7B (Base)", size: "2.1 GB", status: "installed" },
  { name: "Qwen3-TTS 0.6B (Base)", size: "993 MB", status: "available" },
  { name: "Qwen3-TTS 1.7B (Custom)", size: "2.1 GB", status: "available" },
];

export default function SettingsPanel({ lang }: Props) {
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
        <div className="gpu-info-row">
          <div className="gpu-info-item">
            <span className="gpu-info-label">{l("inferenceEngine")}</span>
            <span className="gpu-info-value">
              <span className="badge badge-green">Vulkan</span>
            </span>
          </div>
          <div className="gpu-info-item">
            <span className="gpu-info-label">{l("gpuSelection")}</span>
            <span className="gpu-info-value">
              <span className="gpu-device-name">AMD Radeon (자동 감지)</span>
              <span className="gpu-dot" />
            </span>
          </div>
        </div>
      </section>

      {/* Model Status */}
      <section className="card">
        <h3 className="section-title">{l("modelMgmt")}</h3>
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
                  <span className="badge">{l("available")}</span>
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
