'use client';

// Dịch từ màn Stitch "3. SANDBOX — Môi trường kiểm thử mã": khối code +
// console kết quả + bảng kiểm thử tự động (pass/fail). Không chạy Python
// thật — output và trạng thái test là dữ liệu soạn sẵn, bấm "Chạy" mới đổ ra.
import { useState } from 'react';

import styles from './exercises.module.css';
import CodeBlock, { CodeBlockLine } from './CodeBlock';
import Console, { ConsoleLine } from './Console';

export interface SandboxTest {
  label: string;
  status: 'pass' | 'fail' | 'pending';
}

export interface SandboxProps {
  filename?: string;
  langTag?: string;
  code: CodeBlockLine[];
  tests: SandboxTest[];
  consoleOutput?: ConsoleLine[];
}

const STATUS_STYLE: Record<SandboxTest['status'], { bg: string; text: string; label: string }> = {
  pass: { bg: 'var(--st-ok-bg)', text: 'var(--st-ok-text)', label: '✓ Đạt (Pass)' },
  fail: { bg: 'var(--st-err-bg)', text: 'var(--st-err-text)', label: '✕ Thất bại' },
  pending: { bg: 'var(--edu-card-bg)', text: 'var(--edu-t3)', label: '• Chưa chạy' },
};

export default function Sandbox({ filename, langTag, code, tests, consoleOutput }: SandboxProps) {
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);

  const shown: SandboxTest[] = ran ? tests : tests.map((t) => ({ ...t, status: 'pending' }));
  const passed = shown.filter((t) => t.status === 'pass').length;

  const run = () => {
    setRunning(true);
    setRan(false);
    setTimeout(() => {
      setRunning(false);
      setRan(true);
    }, 520);
  };

  return (
    <div>
      <CodeBlock filename={filename} langTag={langTag} lines={code} />

      <div className={styles.runRow}>
        <button type="button" className={styles.runBtn} onClick={run} disabled={running}>
          {running ? '⟳ Đang chạy…' : ran ? '↻ Chạy lại' : '▶ Chạy kiểm thử'}
        </button>
        <span className={styles.runHint}>
          {ran ? `${passed}/${tests.length} test đạt` : 'Chạy để xem kết quả ở console bên dưới'}
        </span>
      </div>

      <Console
        title="KẾT QUẢ CHẠY"
        running={running}
        lines={ran ? consoleOutput || [] : null}
        placeholder='Bấm "Chạy kiểm thử" để thực thi solution.py'
      />

      <div style={{ marginTop: 16, background: 'var(--edu-card-bg)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--edu-t1)', marginBottom: 10 }}>
          Kiểm thử &nbsp;
          <span style={{ color: 'var(--edu-t3)', fontWeight: 500 }}>{passed}/{tests.length} test đạt</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map((t, i) => {
            const s = STATUS_STYLE[t.status];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--edu-panel-bg-solid)',
                  border: '1px solid var(--edu-sidebar-border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  transition: 'border-color .2s',
                }}
              >
                <code>{t.label}</code>
                <span className={styles.chip} style={{ background: s.bg, color: s.text, border: 0, cursor: 'default' }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
