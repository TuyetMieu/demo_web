// Dịch từ màn Stitch "1. VISUAL — Sơ đồ bộ nhớ Stack & Heap": thẻ trực quan
// tĩnh, không tương tác.
import styles from './exercises.module.css';

export interface StackEntry {
  name: string;
  address: string;
  note: string;
}
export interface HeapEntry {
  tag: string;
  address: string;
  refcount: number;
  rows: { label: string; value: string }[];
}

export interface VisualProps {
  stack: StackEntry[];
  heap: HeapEntry[];
}

export default function Visual({ stack, heap }: VisualProps) {
  const col: React.CSSProperties = {
    background: 'var(--edu-panel-bg-solid)',
    border: '1px solid var(--edu-sidebar-border)',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--edu-accent)', marginBottom: 8 }}>● Stack</div>
        <div style={col}>
          {stack.map((s, i) => (
            <div key={i} style={{ borderBottom: i < stack.length - 1 ? '1px solid var(--edu-sidebar-border)' : undefined, paddingBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <code style={{ color: 'var(--edu-accent-text)', fontWeight: 700 }}>{s.name}</code>
                <code style={{ color: 'var(--edu-t3)' }}>{s.address}</code>
              </div>
              <div style={{ fontSize: 12, color: 'var(--edu-t3)', marginTop: 2 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--edu-accent)', marginBottom: 8 }}>● Heap</div>
        <div style={col}>
          {heap.map((h, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className={styles.chip} style={{ background: 'var(--edu-accent)', color: 'var(--edu-panel-bg-solid)', border: 0, cursor: 'default' }}>
                  {h.tag}
                </span>
                <code style={{ fontSize: 11, color: 'var(--edu-t3)' }}>@ {h.address}</code>
                <span className={styles.chip} style={{ marginLeft: 'auto', background: 'var(--st-ok-bg)', color: 'var(--st-ok-text)', border: 0, cursor: 'default' }}>
                  Refcount: {h.refcount}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {h.rows.map((r, j) => (
                  <div key={j} style={{ fontSize: 11, color: 'var(--edu-t3)' }}>
                    {r.label} <code style={{ color: 'var(--edu-t1)', fontWeight: 700 }}>{r.value}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
