import type { Screen } from "../App";

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
}

const NAV_ITEMS: { id: Screen; icon: string; labelKo: string; labelEn: string }[] = [
  { id: "tts", icon: "🎙️", labelKo: "TTS 생성", labelEn: "TTS Generate" },
  { id: "settings", icon: "⚙️", labelKo: "설정", labelEn: "Settings" },
  { id: "audio", icon: "📂", labelKo: "오디오", labelEn: "Audio" },
];

export default function Sidebar({ screen, onNavigate }: Props) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-icon">V</div>
        <div>
          <div className="sidebar-brand-text">ScrappyVox</div>
          <div className="sidebar-brand-sub">AI Voice Cloning</div>
        </div>
      </div>

      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item${screen === item.id ? " active" : ""}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label-ko">{item.labelKo}</span>
          <span className="nav-label-en">{item.labelEn}</span>
        </button>
      ))}

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <div className="gpu-status">
          <div className="gpu-dot" />
          <span>ROCm · 16 GB</span>
        </div>
      </div>
    </nav>
  );
}
