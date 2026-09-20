// Dịch từ màn Stitch "5. COMPARE — So sánh Sai & Đúng": 2 khối code cạnh
// nhau, một sai (viền/badge đỏ) một đúng (viền/badge xanh).
import styles from './exercises.module.css';
import { CodeBlockLine } from './CodeBlock';

export interface CompareSideProps {
  label: string;
  tag: string;
  ok: boolean;
  lines: CodeBlockLine[];
}

function CompareSide({ label, tag, ok, lines }: CompareSideProps) {
  return (
    <div className={styles.codeCard} style={{ flex: 1, minWidth: 0 }}>
      <div
        className={styles.codeHeader}
        style={{
          background: ok ? 'var(--st-ok-bg)' : 'var(--st-err-bg)',
          color: ok ? 'var(--st-ok-text)' : 'var(--st-err-text)',
          fontWeight: 700,
        }}
      >
        <span>{ok ? '✓' : '✕'} {label}</span>
        <span className={styles.langTag} style={{ color: 'inherit' }}>{tag}</span>
      </div>
      <div className={styles.codeBody}>
        {lines.map((line) => (
          <div key={line.num} className={styles.codeLine}>
            <span className={styles.lineNum}>{line.num}</span>
            <span className={styles.codeText}>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CompareProps {
  wrong: CompareSideProps;
  right: CompareSideProps;
}

export default function Compare({ wrong, right }: CompareProps) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <CompareSide {...wrong} />
      <CompareSide {...right} />
    </div>
  );
}
