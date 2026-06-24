import type { Theme, Lang } from "../App";

interface Props {
  theme: Theme;
  lang: Lang;
  onToggleTheme: () => void;
  onToggleLang: () => void;
}

export default function Titlebar({ theme, lang, onToggleTheme, onToggleLang }: Props) {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="window-title" data-tauri-drag-region>ScrappyVox — AI Voice Cloning</div>
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
