import { useState, useRef, useCallback } from "react";

interface Props {
  sampleRate: number;
  duration: number;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ duration }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (p) {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        return false;
      }
      const start = performance.now();
      const startProg = progress;
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        const newProg = Math.min(startProg + elapsed / duration, 1);
        setProgress(newProg);
        if (newProg < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          setPlaying(false);
        }
      };
      animRef.current = requestAnimationFrame(tick);
      return true;
    });
  }, [duration, progress]);

  const currentTime = progress * duration;

  return (
    <div className="audio-player">
      <div className="waveform">
        <div className="waveform-bars">
          {Array.from({ length: 38 }, (_, i) => {
            const h = 8 + Math.abs(Math.sin(i * 0.7 + 1.2)) * 28 + (i % 3) * 4;
            const isActive = i / 38 < progress;
            return (
              <div
                key={i}
                className={`waveform-bar${isActive ? " active" : ""}`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className="waveform-progress" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="player-controls">
        <button className="btn btn-icon" onClick={togglePlay}>
          {playing ? "⏸" : "▶"}
        </button>
        <span className="player-time">{formatTime(currentTime)}</span>
        <div
          className="player-progress-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setProgress(Math.min(x / rect.width, 1));
          }}
        >
          <div className="player-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
        <div className="player-actions">
          <button className="btn btn-icon" title="Save">💾</button>
          <button className="btn btn-icon" title="Download">⬇️</button>
          <button className="btn btn-icon" title="Volume">🔊</button>
        </div>
      </div>
    </div>
  );
}
