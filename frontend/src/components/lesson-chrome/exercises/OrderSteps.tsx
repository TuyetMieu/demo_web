// Dịch từ màn Stitch "3. ORDER — Sắp xếp luồng lệnh". Bản gốc kéo-thả tự do;
// ở đây dùng nút lên/xuống cho từng dòng — cùng kết quả sắp xếp lại thứ tự,
// thao tác được cả bằng bàn phím/chạm thay vì chỉ con trỏ chuột.
import styles from './exercises.module.css';

export interface OrderStepItem {
  id: string;
  content: React.ReactNode;
}

export interface OrderStepsProps {
  items: OrderStepItem[];
  onMove: (index: number, direction: -1 | 1) => void;
}

export default function OrderSteps({ items, onMove }: OrderStepsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--edu-panel-bg-solid)',
            border: '1px solid var(--edu-sidebar-border)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--edu-accent-soft)',
              color: 'var(--edu-accent-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <code style={{ flex: 1, fontSize: 13 }}>{item.content}</code>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              className={styles.chip}
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
              aria-label="Chuyển lên trên"
              style={{ opacity: i === 0 ? 0.35 : 1 }}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.chip}
              disabled={i === items.length - 1}
              onClick={() => onMove(i, 1)}
              aria-label="Chuyển xuống dưới"
              style={{ opacity: i === items.length - 1 ? 0.35 : 1 }}
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
