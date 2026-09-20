// Khung console dùng chung cho các màn có chạy thử (Fill-blank, Sandbox,
// Debug, Repl). Không thực thi Python — chỉ hiển thị các dòng output được
// truyền vào, đổ ra lần lượt cho giống cảm giác chương trình đang in.
import styles from './exercises.module.css';

export interface ConsoleLine {
  text: string;
  tone?: 'ok' | 'err' | 'muted';
}

export interface ConsoleProps {
  title?: string;
  meta?: string;
  running?: boolean;
  /** null = chưa chạy lần nào. */
  lines: ConsoleLine[] | null;
  placeholder?: string;
}

export default function Console({
  title = 'CONSOLE',
  meta,
  running,
  lines,
  placeholder = 'Chưa có kết quả — bấm "Chạy" để thực thi.',
}: ConsoleProps) {
  const toneClass = (tone?: ConsoleLine['tone']) =>
    tone === 'ok'
      ? styles.consoleRowOk
      : tone === 'err'
        ? styles.consoleRowErr
        : tone === 'muted'
          ? styles.consoleRowMuted
          : styles.consoleRow;

  return (
    <div className={styles.consolePanel}>
      <div className={styles.consoleHead}>
        <span>▣ {title}</span>
        <span>{running ? 'đang chạy…' : meta || (lines ? `${lines.length} dòng` : 'sẵn sàng')}</span>
      </div>
      <div className={styles.consoleBody}>
        {running && <div className={styles.consoleRowMuted}>⟳ Đang biên dịch và thực thi…</div>}
        {!running && !lines && (
          <div className={styles.consoleRowMuted}>
            &gt; {placeholder} <span className={styles.caret} />
          </div>
        )}
        {!running &&
          lines?.map((line, i) => (
            <div key={i} className={toneClass(line.tone)} style={{ animationDelay: `${i * 90}ms` }}>
              {line.text}
            </div>
          ))}
        {!running && lines?.length === 0 && (
          <div className={styles.consoleRowMuted}>&gt; (không có output)</div>
        )}
      </div>
    </div>
  );
}
