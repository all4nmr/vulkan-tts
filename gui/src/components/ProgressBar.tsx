interface Props {
  percent: number;
  label?: string;
  sublabel?: string;
  chunks?: string;
}

export default function ProgressBar({ percent, label, sublabel, chunks }: Props) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        {label && <span className="progress-bar-label">{label}</span>}
        {chunks && <span className="progress-bar-chunks">{chunks}</span>}
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {sublabel && <div className="progress-bar-sublabel">{sublabel}</div>}
    </div>
  );
}
