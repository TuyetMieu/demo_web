// Dịch từ màn Stitch "2. MATCH — Ghép nối cặp giá trị". Bản gốc kéo dây nối
// giữa 2 cột; ở đây đơn giản hoá thành "bấm chọn 2 đầu": bấm 1 mục cột trái
// rồi bấm mục cột phải để ghép cặp — bỏ vẽ đường SVG cong theo con trỏ.
import styles from './exercises.module.css';

export interface MatchItem {
  id: string;
  content: React.ReactNode;
}

export interface MatchPairsProps {
  left: MatchItem[];
  right: MatchItem[];
  /** id bên trái → id bên phải đã ghép đúng vị trí. */
  matched: Record<string, string>;
  pendingLeft: string | null;
  onPickLeft: (id: string) => void;
  onPickRight: (id: string) => void;
}

export default function MatchPairs({ left, right, matched, pendingLeft, onPickLeft, onPickRight }: MatchPairsProps) {
  const matchedRightIds = new Set(Object.values(matched));
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          background: 'var(--edu-panel-bg-solid)',
          border: '1px solid var(--edu-sidebar-border)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {left.map((item) => {
            const isMatched = !!matched[item.id];
            const isPending = pendingLeft === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isMatched}
                onClick={() => onPickLeft(item.id)}
                className={styles.optionCard}
                style={{
                  borderColor: isPending ? 'var(--edu-accent)' : isMatched ? 'var(--st-ok-line)' : undefined,
                  background: isMatched ? 'var(--st-ok-bg)' : isPending ? 'var(--edu-accent-soft)' : undefined,
                  opacity: isMatched ? 0.7 : 1,
                  justifyContent: 'flex-start',
                }}
              >
                <code>{item.content}</code>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {right.map((item) => {
            const isMatched = matchedRightIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isMatched || !pendingLeft}
                onClick={() => onPickRight(item.id)}
                className={styles.optionCard}
                style={{
                  borderColor: isMatched ? 'var(--st-ok-line)' : undefined,
                  background: isMatched ? 'var(--st-ok-bg)' : undefined,
                  opacity: isMatched ? 0.7 : pendingLeft ? 1 : 0.5,
                  justifyContent: 'flex-start',
                }}
              >
                {item.content}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--edu-t3)', marginTop: 10 }}>
        Đã ghép {Object.keys(matched).length}/{left.length} cặp
      </div>
    </div>
  );
}
