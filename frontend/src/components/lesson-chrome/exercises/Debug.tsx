'use client';

// Dịch từ màn Stitch "4. DEBUG — Sửa lỗi chương trình": khối code có dòng
// lỗi bôi đỏ kèm thông báo, console traceback và bảng kiểm thử tự động.
import { useState } from 'react';

import styles from './exercises.module.css';
import { CodeBlockLine } from './CodeBlock';
import { SandboxTest } from './Sandbox';
import Console, { ConsoleLine } from './Console';

export interface DebugProps {
  filename?: string;
  errorBadge?: string;
  code: CodeBlockLine[];
  errorLine?: number;
  errorMessage?: string;
  tests: SandboxTest[];
  consoleOutput?: ConsoleLine[];
}

const STATUS_STYLE: Record<SandboxTest['status'], { bg: string; text: string; label: string }> = {
  pass: { bg: 'var(--st-ok-bg)', text: 'var(--st-ok-text)', label: '✓ Đạt' },
  fail: { bg: 'var(--st-err-bg)', text: 'var(--st-err-text)', label: '✕ Thất bại' },
  pending: { bg: 'var(--edu-card-bg)', text: 'var(--edu-t3)', label: '⟳ Đang chờ' },
};

export default function Debug({
  filename,
  errorBadge,
  code,
  errorLine,
  errorMessage,
  tests,
  consoleOutput,
}: DebugProps) {
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
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
          {errorBadge && (
            <span className={styles.langTag} style={{ color: 'var(--st-err-text)' }}>{errorBadge}</span>
          )}
        </div>
        <div className={styles.codeBody}>
          {code.map((line) => (
            <div key={line.num}>
              <div
                className={styles.codeLine}
                style={line.num === errorLine ? { background: 'var(--st-err-bg)', borderRadius: 4 } : undefined}
              >
                <span className={styles.lineNum}>{line.num}</span>
                <span className={styles.codeText}>{line.content}</span>
              </div>
              {line.num === errorLine && errorMessage && (
                <div
                  style={{
                    background: 'var(--st-err-bg)',
                    color: 'var(--st-err-text)',
                    fontSize: 11,
                    borderRadius: 4,
                    padding: '4px 12px 8px 44px',
                  }}
                >
                  ⚠ {errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.runRow}>
        <button type="button" className={styles.runBtn} onClick={run} disabled={running}>
          {running ? '⟳ Đang chạy…' : ran ? '↻ Chạy lại' : '▶ Chạy chương trình'}
        </button>
        <span className={styles.runHint}>
          {ran ? `${passed}/${tests.length} test đạt` : 'Chạy để xem traceback ở console bên dưới'}
        </span>
      </div>

      <Console
        title="TRACEBACK / OUTPUT"
        running={running}
        lines={ran ? consoleOutput || [] : null}
        placeholder='Bấm "Chạy chương trình" để xem lỗi thực tế'
      />

      <div style={{ marginTop: 16, background: 'var(--edu-card-bg)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
          Kiểm thử tự động &nbsp;<span style={{ color: 'var(--edu-t3)', fontWeight: 500 }}>{passed}/{tests.length} test đạt</span>
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
