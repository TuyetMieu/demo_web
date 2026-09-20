// Dịch từ màn Stitch "1. CLASSIFY — Phân loại dữ liệu". Bản gốc dùng kéo-thả
// (drag&drop) token vào ô; ở đây đơn giản hoá thành "chọn rồi bấm": bấm 1
// token trong kho để cầm lên (nổi bật), rồi bấm vào nhóm muốn thả vào —
// tương đương thao tác, không cần theo dõi toạ độ con trỏ.
import styles from './exercises.module.css';

export interface ClassifyBin {
  key: string;
  label: string;
  sub: string;
  items: string[];
}

export interface ClassifyProps {
  bins: ClassifyBin[];
  pool: string[];
  heldToken: string | null;
  onHold: (token: string) => void;
  onDrop: (binKey: string) => void;
}

export default function Classify({ bins, pool, heldToken, onHold, onDrop }: ClassifyProps) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bins.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
        {bins.map((bin) => (
          <button
            key={bin.key}
            type="button"
            onClick={() => heldToken && onDrop(bin.key)}
            style={{
              textAlign: 'left',
              font: 'inherit',
              cursor: heldToken ? 'pointer' : 'default',
              background: 'var(--edu-card-bg)',
              border: heldToken ? '1.5px dashed var(--st-slot-border)' : '1px solid var(--edu-sidebar-border)',
              borderRadius: 14,
              padding: 14,
              minHeight: 140,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--edu-t1)' }}>
              <code>{bin.label}</code>
            </div>
            <div style={{ fontSize: 11, color: 'var(--edu-t3)' }}>{bin.sub}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {bin.items.map((item) => (
                <span key={item} className={styles.chip} style={{ cursor: 'default' }}>
                  {item} ✓
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div
        style={{
          background: 'var(--edu-card-bg)',
          borderRadius: 12,
          padding: '12px 16px',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--edu-t2)', marginBottom: 8 }}>
          KHO TOKEN {heldToken ? `— đang cầm "${heldToken}", bấm vào nhóm để thả` : '(bấm để cầm lên)'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pool.length === 0 && <span style={{ fontSize: 12, color: 'var(--edu-t3)' }}>Đã phân loại hết.</span>}
          {pool.map((token) => (
            <button
              key={token}
              type="button"
              className={styles.chip}
              onClick={() => onHold(token)}
              style={heldToken === token ? { borderColor: 'var(--edu-accent)', background: 'var(--edu-accent-soft)' } : undefined}
            >
              {token}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
