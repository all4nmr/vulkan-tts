import type { Theme, Lang } from "../App";

interface Props {
  theme: Theme;
  lang: Lang;
  onToggleTheme: () => void;
  onToggleLang: () => void;
}

export default function Titlebar({ theme, lang, onToggleTheme, onToggleLang }: Props) {
  return (
    <div className="titlebar">
      <div className="traffic-lights">
        <div className="traffic-light tl-close" />
        <div className="traffic-light tl-minimize" />
        <div className="traffic-light tl-zoom" />
      </div>
      <div className="window-title">Vulkan-TTS</div>
      <div className="titlebar-actions">
        <button className="titlebar-btn" onClick={onToggleLang}>
          {lang === "ko" ? "EN" : "KO"}
        </button>
        <button className="titlebar-btn" onClick={onToggleTheme}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  );
}
