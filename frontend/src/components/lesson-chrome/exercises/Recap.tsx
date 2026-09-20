// Dịch từ màn Stitch "3. RECAP — Tổng kết bài học & Nhận XP". Cũng là màn
// toàn thẻ, đứng độc lập như Checkpoint.
export interface RecapStat {
  icon: string;
  value: string;
  label: string;
}

export interface RecapProps {
  xpLabel: string;
  title: string;
  description: string;
  stats: RecapStat[];
  facts: string[];
  onFinish: () => void;
}

export default function Recap({ xpLabel, title, description, stats, facts, onFinish }: RecapProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--edu-panel-bg-solid)',
          border: '1px solid var(--edu-sidebar-border)',
          borderRadius: 999,
          padding: '10px 20px',
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--edu-accent-text)',
        }}
      >
        💎 {xpLabel} ✨
      </span>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: '16px 0 8px', color: 'var(--edu-t1)' }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--edu-t3)', maxWidth: 460, margin: '0 auto 20px' }}>{description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              background: 'var(--edu-panel-bg-solid)',
              border: '1px solid var(--edu-sidebar-border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--edu-t1)', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--edu-t3)' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--edu-t2)', marginBottom: 8 }}>
          📖 KIẾN THỨC CỐT LÕI ĐÃ HỌC
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {facts.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: 'var(--edu-panel-bg-solid)',
                border: '1px solid var(--edu-sidebar-border)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--edu-t1)',
              }}
            >
              <span style={{ color: 'var(--st-ok-text)' }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onFinish}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 999,
          border: 0,
          background: 'var(--edu-accent-grad)',
          color: 'var(--edu-panel-bg-solid)',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
          marginTop: 20,
        }}
      >
        Hoàn thành ✓
      </button>
    </div>
  );
}
