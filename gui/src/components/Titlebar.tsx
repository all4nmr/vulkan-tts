import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Theme, Lang } from "../App";

interface Props {
  theme: Theme;
  lang: Lang;
  onToggleTheme: () => void;
  onToggleLang: () => void;
}

export default function Titlebar({ theme, lang, onToggleTheme, onToggleLang }: Props) {
  const win = getCurrentWindow();

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
        <span className="titlebar-separator" />
        <button className="titlebar-win-btn" onClick={() => win.minimize()} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button className="titlebar-win-btn titlebar-close" onClick={() => win.close()} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
