import type { Lang } from "../App";

interface Props {
  lang: Lang;
}

const LABELS = {
  title: { ko: "설정", en: "Settings" },
  placeholder: { ko: "설정 기능은 준비 중입니다.", en: "Settings are coming soon." },
};

export default function SettingsPanel({ lang }: Props) {
  const l = (key: keyof typeof LABELS) => LABELS[key][lang];

  return (
    <div className="content-panel active settings-panel">
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
