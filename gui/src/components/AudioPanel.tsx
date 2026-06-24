import type { Lang } from "../App";

interface Props {
  lang: Lang;
}

const LABELS = {
  title: { ko: "오디오", en: "Audio" },
  placeholder: { ko: "오디오 파일 관리는 준비 중입니다.", en: "Audio file management is coming soon." },
};

export default function AudioPanel({ lang }: Props) {
  const l = (key: keyof typeof LABELS) => LABELS[key][lang];

  return (
    <div className="content-panel active audio-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">{l("title")}</div>
        </div>
      </div>
      <p style={{ color: "var(--text-tertiary)", padding: "24px 0", fontSize: "14px" }}>
        {l("placeholder")}
      </p>
    </div>
  );
}
