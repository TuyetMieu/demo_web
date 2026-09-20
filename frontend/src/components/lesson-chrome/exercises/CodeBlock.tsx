// Khối code tĩnh dùng chung — nền tối luôn giữ nguyên ở cả hai chế độ sáng/tối
// (token --st-code-*). Dùng cho CONCEPT, CODE-READ, CODE-ANNOTATED, VISUAL...
import styles from './exercises.module.css';

export interface CodeBlockLine {
  num: number;
  content: React.ReactNode;
  /** Đánh dấu dòng đang được chú ý (dòng lỗi, dòng đang chạy...). */
  highlighted?: boolean;
}

export interface CodeBlockProps {
  filename?: string;
  langTag?: string;
  showDots?: boolean;
  lines: CodeBlockLine[];
}

export default function CodeBlock({ filename, langTag, showDots = true, lines }: CodeBlockProps) {
  return (
    <div className={styles.codeCard}>
      {(filename || langTag || showDots) && (
        <div className={styles.codeHeader}>
          {showDots && (
            <div className={styles.dots}><i /><i /><i /></div>
          )}
          {filename && <span className={styles.filename}>{filename}</span>}
          {langTag && <span className={styles.langTag}>{langTag}</span>}
        </div>
      )}
      <div className={styles.codeBody}>
        {lines.map((line) => (
          <div
            key={line.num}
            className={styles.codeLine}
            style={line.highlighted ? { background: 'var(--st-err-bg)', borderRadius: 4 } : undefined}
          >
            <span className={styles.lineNum}>{line.num}</span>
            <span className={styles.codeText}>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
