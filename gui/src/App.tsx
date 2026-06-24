import { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Titlebar from "./components/Titlebar";
import TTSPanel from "./components/TTSPanel";
import SettingsPanel from "./components/SettingsPanel";
import AudioPanel from "./components/AudioPanel";

export type Theme = "dark" | "light";
export type Lang = "ko" | "en";
export type Screen = "tts" | "settings" | "audio";

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLang] = useState<Lang>("ko");
  const [screen, setScreen] = useState<Screen>("tts");

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const toggleLang = useCallback(() => {
    setLang((l) => (l === "ko" ? "en" : "ko"));
  }, []);

  return (
    <div className="window" data-theme={theme} data-lang={lang}>
      <Titlebar
        theme={theme}
        lang={lang}
        onToggleTheme={toggleTheme}
        onToggleLang={toggleLang}
      />
      <div className="window-body">
        <Sidebar screen={screen} onNavigate={setScreen} />
        <main className="content">
          {screen === "tts" && <TTSPanel lang={lang} />}
          {screen === "settings" && <SettingsPanel lang={lang} />}
          {screen === "audio" && <AudioPanel lang={lang} />}
        </main>
      </div>
    </div>
  );
}
