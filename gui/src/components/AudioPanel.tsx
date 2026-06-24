import { useState } from "react";
import type { Lang } from "../App";

interface Props {
  lang: Lang;
}

const LABELS = {
  title: { ko: "오디오", en: "Audio" },
  totalFiles: { ko: "전체 파일", en: "Total Files" },
  usedSpace: { ko: "사용 공간", en: "Used Space" },
  freeSpace: { ko: "남은 공간", en: "Free Space" },
  all: { ko: "전체", en: "All" },
  tts: { ko: "TTS", en: "TTS" },
  cloned: { ko: "Cloned", en: "Cloned" },
  imported: { ko: "가져옴", en: "Imported" },
  search: { ko: "검색...", en: "Search..." },
};

type FilterTab = "all" | "tts" | "cloned" | "imported";

interface AudioFile {
  name: string;
  format: string;
  size: string;
  duration: string;
  model: string;
  date: string;
  type: "tts" | "clone" | "imported";
}

const MOCK_FILES: AudioFile[] = [
  { name: "Project Intro Narration.mp3", format: "MP3", size: "2.4 MB", duration: "1:23", model: "XTTS-v2", date: "2026-06-23", type: "tts" },
  { name: "Blog Review Voice.mp3", format: "MP3", size: "1.8 MB", duration: "0:56", model: "Bark", date: "2026-06-22", type: "tts" },
  { name: "Ad Narration Sample A.mp3", format: "WAV", size: "4.2 MB", duration: "2:10", model: "CosyVoice", date: "2026-06-21", type: "tts" },
  { name: "Voice Clone Sample.wav", format: "WAV", size: "3.1 MB", duration: "1:45", model: "XTTS-v2", date: "2026-06-20", type: "clone" },
  { name: "Imported Lecture.mp3", format: "MP3", size: "12.8 MB", duration: "8:32", model: "—", date: "2026-06-18", type: "imported" },
];

export default function AudioPanel({ lang }: Props) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const l = (key: keyof typeof LABELS) => LABELS[key][lang];

  const filtered = MOCK_FILES.filter((f) => {
    if (filter !== "all") {
      if (filter === "cloned" && f.type !== "clone") return false;
      if (filter === "tts" && f.type !== "tts") return false;
      if (filter === "imported" && f.type !== "imported") return false;
    }
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeIcon = (type: AudioFile["type"]) => (type === "clone" ? "🎤" : "🎙️");

  return (
    <div className="content-panel active audio-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">{l("title")}</div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="metrics-bar">
        <div className="metric-card">
          <div className="metric-value">24</div>
          <div className="metric-label">{l("totalFiles")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">342 MB</div>
          <div className="metric-label">{l("usedSpace")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">1.8 GB</div>
          <div className="metric-label">{l("freeSpace")}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {(["all", "tts", "cloned", "imported"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            className={`filter-tab${filter === tab ? " active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {l(tab)}
          </button>
        ))}
        <input
          type="text"
          className="search-input-small"
          placeholder={l("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* File List */}
      <div className="file-list">
        {filtered.map((file) => (
          <div key={file.name} className="file-item">
            <div className="file-icon">{typeIcon(file.type)}</div>
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                {file.format} · {file.size} · {file.duration} · {file.model} · {file.date}
              </div>
            </div>
            <div className="file-actions">
              <button className="btn btn-icon" title="Play">▶</button>
              <button className="btn btn-icon" title="Save">💾</button>
              <button className="btn btn-icon btn-danger-icon" title="Delete">✕</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">No files found</div>
        )}
      </div>
    </div>
  );
}
