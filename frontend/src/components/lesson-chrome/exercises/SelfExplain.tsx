'use client';

// Ô "tự giải thích" — phần S2 của studio-lesson không có trong bộ 27 màn Stitch
// (bộ đó chỉ có các dạng chọn/điền). Dựng theo cùng ngôn ngữ thị giác: thẻ nền
// sáng như các khối ngoài code, rubric hiện thành chip như kho token.
import styles from './exercises.module.css';

export interface SelfExplainProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nhãn các ý mà người chấm sẽ tìm; để trống nếu bài không khai rubric. */
  rubricLabels?: string[];
  /** Yêu cầu tối thiểu, hiện ngay dưới ô nhập để khỏi bấm Kiểm tra mới biết. */
  requirement?: string;
  disabled?: boolean;
}

export default function SelfExplain({
  value,
  onChange,
  placeholder,
  rubricLabels = [],
  requirement,
  disabled,
}: SelfExplainProps) {
  return (
    <div>
      <textarea
        aria-label="Lời giải thích của bạn"
        value={value}
        disabled={disabled}
        placeholder={placeholder || 'Nhập lời giải thích của bạn…'}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: 132,
          resize: 'vertical',
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid var(--edu-sidebar-border)',
          background: 'var(--edu-panel-bg-solid)',
          color: 'var(--edu-t1)',
          font: 'inherit',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      />
      {requirement && rubricLabels.length === 0 && (
        <p className={styles.runHint} style={{ marginTop: 10 }}>
          {requirement}
        </p>
      )}
      {rubricLabels.length > 0 && (
        <div className={styles.suggestions} style={{ marginTop: 12 }}>
          <span className={styles.runHint} style={{ marginRight: 4 }}>
            Cần nêu được:
          </span>
          {rubricLabels.map((label) => (
            <span key={label} className={styles.chip} style={{ cursor: 'default' }}>
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
