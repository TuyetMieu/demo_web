// Dịch từ màn Stitch "5. SPOT-ERROR — Tìm dòng mã lỗi": nhấn vào dòng nghi
// chứa lỗi; dòng được chọn hiện khung tím + nhãn mô tả lỗi.
import styles from './exercises.module.css';

export interface SpotErrorLine {
  num: number;
  content: React.ReactNode;
  /** Chỉ dòng đúng mới có nhãn lỗi — hiện ra khi người dùng chọn dòng này. */
  errorLabel?: string;
}

export interface SpotErrorProps {
  filename?: string;
  lines: SpotErrorLine[];
  selected: number | null;
  onSelect: (num: number) => void;
  /** Dòng chứa lỗi thật — chỉ dùng để tô màu SAU khi bấm "Kiểm tra". */
  correctLine?: number;
  checked?: boolean;
}

export default function SpotError({ filename, lines, selected, onSelect, correctLine, checked }: SpotErrorProps) {
  return (
    <div className={styles.codeCard}>
      <div className={styles.codeHeader}>
        <div className={styles.dots}><i /><i /><i /></div>
        {filename && <span className={styles.filename}>{filename}</span>}
      </div>
      <div className={styles.codeBody}>
        {lines.map((line) => {
          const isSelected = selected === line.num;
          const isRight = checked && correctLine === line.num;
          const isWrong = checked && isSelected && correctLine !== line.num;
          const showLabel = (isSelected || isRight) && line.errorLabel;

          const borderColor = isRight
            ? 'var(--st-ok-line)'
            : isWrong
              ? 'var(--st-err-line)'
              : isSelected
                ? 'var(--edu-accent)'
                : 'transparent';

          return (
            <button
              key={line.num}
              type="button"
              onClick={() => onSelect(line.num)}
              disabled={checked}
              className={styles.codeLine}
              style={{
                width: '100%',
                background: isRight ? 'var(--st-ok-bg)' : isWrong ? 'var(--st-err-bg)' : 'transparent',
                border: `1px solid ${borderColor}`,
                borderRadius: 6,
                cursor: checked ? 'default' : 'pointer',
                textAlign: 'left',
                font: 'inherit',
                justifyContent: 'space-between',
                padding: '2px 6px',
                transition: 'background .18s, border-color .18s',
              }}
            >
              <span style={{ display: 'flex', gap: 12 }}>
                <span className={styles.lineNum}>{line.num}</span>
                <span className={styles.codeText}>{line.content}</span>
              </span>
              {showLabel && (
                <span
                  style={{
                    background: isRight ? 'var(--st-ok-bg)' : 'var(--edu-accent-soft)',
                    color: isRight ? 'var(--st-ok-text)' : 'var(--edu-accent-text)',
                    borderRadius: 999,
                    padding: '2px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  ! {line.errorLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
