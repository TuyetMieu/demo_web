// Dịch từ màn Stitch "2. MULTI — Chọn nhiều đáp án": giống Mcq nhưng chọn
// được nhiều đáp án cùng lúc (checkbox thay vì radio).
import styles from './exercises.module.css';

export interface MultiOption {
  key: string;
  label: string;
  sub?: string;
}

export interface MultiProps {
  instruction?: string;
  options: MultiOption[];
  selected: string[];
  onToggle: (key: string) => void;
  /** Tập đáp án đúng — chỉ dùng để tô màu SAU khi bấm "Kiểm tra". */
  correctKeys?: string[];
  checked?: boolean;
}

export default function Multi({ instruction, options, selected, onToggle, correctKeys, checked }: MultiProps) {
  return (
    <div>
      {instruction && (
        <p style={{ fontSize: 13, color: 'var(--edu-t3)', margin: '0 0 16px' }}>{instruction}</p>
      )}
      <div className={styles.optionsList}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt.key);
          const shouldPick = !!correctKeys?.includes(opt.key);
          const isRight = checked && shouldPick;
          const isWrong = checked && isSelected && !shouldPick;

          const cardClass = isRight
            ? styles.optionCorrect
            : isWrong
              ? styles.optionWrong
              : isSelected
                ? styles.optionSelected
                : styles.optionCard;

          return (
            <button
              key={opt.key}
              type="button"
              className={cardClass}
              onClick={() => onToggle(opt.key)}
              disabled={checked}
              aria-pressed={isSelected}
              style={checked && !isRight && !isWrong ? { opacity: 0.55 } : undefined}
            >
              <span
                className={isSelected || isRight ? styles.checkboxSelected : styles.checkbox}
                style={
                  isRight
                    ? { background: 'var(--st-ok-text)', borderColor: 'var(--st-ok-text)' }
                    : isWrong
                      ? { background: 'var(--st-err-text)', borderColor: 'var(--st-err-text)' }
                      : undefined
                }
              >
                {isWrong ? '✕' : '✓'}
              </span>
              <span className={styles.optionMain} style={{ flex: 1 }}>
                <code>{opt.label}</code>
                {opt.sub && <span className={styles.optionSub}>{opt.sub}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
