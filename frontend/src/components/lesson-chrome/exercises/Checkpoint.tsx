// Dịch từ màn Stitch "2. CHECKPOINT — Điểm dừng nửa chặng". Đây là một màn
// TOÀN THẺ (đứng độc lập trong vùng nội dung, không cần ShellA/ShellB bọc).
export interface CheckpointItem {
  title: string;
  meta: string;
  xp: number;
}

export interface CheckpointProps {
  title: string;
  description: string;
  accuracyLabel: string;
  accuracyValue: string;
  items: CheckpointItem[];
  onContinue: () => void;
  onPause?: () => void;
}

export default function Checkpoint({
  title,
  description,
  accuracyLabel,
  accuracyValue,
  items,
  onContinue,
  onPause,
}: CheckpointProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'var(--edu-accent-grad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 40,
          color: 'var(--edu-panel-bg-solid)',
        }}
      >
        🏆
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--edu-accent-soft)',
          color: 'var(--edu-accent-text)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        ● Cột mốc bài học
      </span>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '14px 0 8px', color: 'var(--edu-t1)' }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--edu-t3)', maxWidth: 460, margin: '0 auto 20px' }}>{description}</p>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--edu-panel-bg-solid)',
          border: '1px solid var(--edu-sidebar-border)',
          borderRadius: 999,
          padding: '8px 16px',
          fontSize: 13,
          marginBottom: 24,
        }}
      >
        🎯 {accuracyLabel}
        <span style={{ background: 'var(--edu-card-bg)', borderRadius: 999, padding: '2px 10px', fontWeight: 700 }}>
          {accuracyValue}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--edu-panel-bg-solid)',
              border: '1px solid var(--edu-sidebar-border)',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--st-ok-text)', fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--edu-t1)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--st-ok-text)' }}>{item.meta}</div>
              </div>
            </div>
            <span style={{ background: 'var(--edu-card-bg)', color: 'var(--edu-t2)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
              {item.xp} XP
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onContinue}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 999,
            border: 0,
            background: 'var(--edu-accent-grad)',
            color: 'var(--edu-panel-bg-solid)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ▶ Học tiếp
        </button>
        {onPause && (
          <button
            type="button"
            onClick={onPause}
            style={{
              padding: '0 20px',
              height: 48,
              borderRadius: 999,
              border: '1px solid var(--edu-sidebar-border)',
              background: 'var(--edu-panel-bg-solid)',
              color: 'var(--edu-t2)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔖 Nghỉ, lưu tiến độ
          </button>
        )}
      </div>
    </div>
  );
}
