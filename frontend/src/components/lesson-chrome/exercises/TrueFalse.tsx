// Dịch từ màn Stitch "3. true_false — đúng hay sai".
import styles from './exercises.module.css';

export interface TrueFalseProps {
  snippet?: React.ReactNode;
  selected: 'true' | 'false' | null;
  onSelect: (value: 'true' | 'false') => void;
  /** Đáp án đúng — chỉ dùng để tô màu SAU khi bấm "Kiểm tra". */
  correctValue?: 'true' | 'false';
  checked?: boolean;
}

export default function TrueFalse({ snippet, selected, onSelect, correctValue, checked }: TrueFalseProps) {
  const renderButton = (value: 'true' | 'false', label: string, icon: string) => {
    const isSelected = selected === value;
    const isRight = checked && correctValue === value;
    const isWrong = checked && isSelected && correctValue !== value;

    const cls = isSelected || isRight ? styles.toggleSelected : styles.toggleBtn;
    const tone = isRight
      ? { borderColor: 'var(--st-ok-line)', background: 'var(--st-ok-bg)', color: 'var(--st-ok-text)' }
      : isWrong
        ? { borderColor: 'var(--st-err-line)', background: 'var(--st-err-bg)', color: 'var(--st-err-text)' }
        : checked
          ? { opacity: 0.55 }
          : undefined;

    return (
      <button
        type="button"
        className={cls}
        onClick={() => onSelect(value)}
        disabled={checked}
        aria-pressed={isSelected}
        style={tone}
      >
        <span className={isSelected || isRight ? styles.toggleIconSelected : styles.toggleIcon}>
          {isRight ? '✓' : isWrong ? '✕' : icon}
        </span>
        {label}
      </button>
    );
  };

  return (
    <div>
      {snippet && <div className={styles.consoleBlock}>{snippet}</div>}
      <div className={styles.toggleRow}>
        {renderButton('true', 'Đúng', '✓')}
        {renderButton('false', 'Sai', '✕')}
      </div>
    </div>
  );
}
