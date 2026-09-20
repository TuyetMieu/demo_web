'use client';

// Dịch từ màn Stitch "2. REPL — Dòng lệnh tương tác tức thì". Đây là bản
// demo trình bày, KHÔNG chạy Python thật — bấm "Chạy" chỉ hiện lại output
// mẫu đã soạn sẵn (giống cơ chế của FillBlank/Sandbox trong bộ này).
import { useState } from 'react';

import styles from './exercises.module.css';
import Console, { ConsoleLine } from './Console';

export interface ReplProps {
  filename?: string;
  value: string;
  onChange: (value: string) => void;
  sampleOutput: { value: string; type: string };
}

export default function Repl({ filename, value, onChange, sampleOutput }: ReplProps) {
  const [lines, setLines] = useState<ConsoleLine[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setLines(null);
    setTimeout(() => {
      setLines([
        { text: `>>> ${value}`, tone: 'muted' },
        { text: `Out[1]: ${sampleOutput.value}`, tone: 'ok' },
        { text: `# type: ${sampleOutput.type} · thực thi 0.002s · bộ nhớ 12 KB`, tone: 'muted' },
      ]);
      setRunning(false);
    }, 380);
  };

  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          {filename && <span className={styles.filename}>{filename}</span>}
          <span className={styles.langTag}>Chế độ tương tác</span>
        </div>
        <div className={styles.codeBody}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--st-syn-comment)', marginBottom: 8 }}>
            DÒNG LỆNH NHẬP LIỆU
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--st-syn-keyword)' }}>&gt;&gt;&gt;</span>
            <input
              value={value}
              onChange={(e) => { onChange(e.target.value); setLines(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                outline: 'none',
                color: 'var(--st-syn-string)',
                font: 'inherit',
                fontSize: 13,
              }}
              aria-label="Biểu thức Python"
            />
          </div>
        </div>
      </div>

      <div className={styles.runRow}>
        <button type="button" className={styles.runBtn} onClick={run} disabled={running || !value.trim()}>
          {running ? '⟳ Đang chạy…' : '▶ Chạy (Enter)'}
        </button>
        <span className={styles.runHint}>Ctrl + Enter để chạy nhanh</span>
      </div>

      <Console title="KẾT QUẢ (OUTPUT)" running={running} lines={lines} placeholder="Gõ biểu thức rồi bấm Chạy" />
    </div>
  );
}
