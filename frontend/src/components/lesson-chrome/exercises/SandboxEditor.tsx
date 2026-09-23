'use client';

// Bản CHẠY THẬT của màn Stitch "3. SANDBOX": cùng bố cục với Sandbox.tsx (khối
// code — thanh chạy — console — bảng kiểm thử) nhưng code là ô soạn thảo được
// và kết quả đến từ Pyodide trong Web Worker, không phải dữ liệu soạn sẵn.
// Sandbox.tsx giữ nguyên cho trang xem trước; bài học thật dùng file này.
import styles from './exercises.module.css';
import Console, { ConsoleLine } from './Console';

export interface SandboxTestRow {
  label: string;
  detail?: string;
  status: 'pass' | 'fail' | 'pending';
}

export interface SandboxEditorProps {
  filename?: string;
  langTag?: string;
  code: string;
  onCodeChange: (code: string) => void;
  running: boolean;
  /** Chạy thử: chỉ xem output, không chấm. */
  onRun: () => void;
  onStop: () => void;
  /** Có lời giải mẫu thì hiện nút xem — bài nào không có thì bỏ trống. */
  onShowSolution?: () => void;
  consoleLines: ConsoleLine[] | null;
  consoleMeta?: string;
  tests: SandboxTestRow[];
  disabled?: boolean;
  /** Chữ mờ khi ô còn trống — bài không có code khởi tạo thì nói rõ ô này dùng làm gì. */
  placeholder?: string;
}

const STATUS_STYLE: Record<SandboxTestRow['status'], { bg: string; text: string; label: string }> = {
  pass: { bg: 'var(--st-ok-bg)', text: 'var(--st-ok-text)', label: '✓ Đạt' },
  fail: { bg: 'var(--st-err-bg)', text: 'var(--st-err-text)', label: '✕ Chưa đạt' },
  pending: { bg: 'var(--edu-card-bg)', text: 'var(--edu-t3)', label: '• Chưa chạy' },
};

export default function SandboxEditor({
  filename = 'solution.py',
  langTag = 'CPython 3.12',
  code,
  onCodeChange,
  running,
  onRun,
  onStop,
  onShowSolution,
  consoleLines,
  consoleMeta,
  tests,
  disabled,
  placeholder,
}: SandboxEditorProps) {
  const passed = tests.filter((t) => t.status === 'pass').length;

  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          <span className={styles.filename}>{filename}</span>
          <span className={styles.langTag}>{langTag}</span>
        </div>
        <textarea
          className={styles.codeBody}
          aria-label="Trình soạn mã Python"
          spellCheck={false}
          placeholder={placeholder}
          value={code}
          disabled={disabled}
          onChange={(e) => onCodeChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: 220,
            resize: 'vertical',
            border: 0,
            outline: 'none',
            color: 'var(--st-syn-plain)',
            background: 'transparent',
            fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            lineHeight: 1.7,
            // Tab thay vì nhảy focus: đang gõ code thụt lề là chuyện thường.
            tabSize: 4,
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') return;
            e.preventDefault();
            const el = e.currentTarget;
            const at = el.selectionStart;
            onCodeChange(code.slice(0, at) + '    ' + code.slice(el.selectionEnd));
            requestAnimationFrame(() => el.setSelectionRange(at + 4, at + 4));
          }}
        />
      </div>

      <div className={styles.runRow}>
        <button
          type="button"
          className={styles.runBtn}
          onClick={running ? onStop : onRun}
          disabled={disabled}
        >
          {running ? '■ Dừng' : '▶ Chạy thử'}
        </button>
        {onShowSolution && (
          <button type="button" className={styles.chip} onClick={onShowSolution}>
            Xem lời giải mẫu
          </button>
        )}
        <span className={styles.runHint}>
          {tests.length
            ? `${passed}/${tests.length} ca kiểm thử đạt`
            : 'Bài này chấm trên máy lab, không có ca tự động'}
        </span>
      </div>

      <Console
        title="KẾT QUẢ CHẠY"
        meta={consoleMeta}
        running={running}
        lines={consoleLines}
        placeholder='Bấm "Chạy thử" để thực thi solution.py ngay trong trình duyệt.'
      />

      {tests.length > 0 && (
        <div style={{ marginTop: 16, background: 'var(--edu-card-bg)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--edu-t1)', marginBottom: 10 }}>
            Kiểm thử &nbsp;
            <span style={{ color: 'var(--edu-t3)', fontWeight: 500 }}>
              {passed}/{tests.length} đạt
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tests.map((t, i) => {
              const style = STATUS_STYLE[t.status];
              return (
                <div
                  key={i}
                  style={{
                    background: 'var(--edu-panel-bg-solid)',
                    border: '1px solid var(--edu-sidebar-border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ color: 'var(--edu-t1)' }}>{t.label}</span>
                    <span
                      className={styles.chip}
                      style={{ background: style.bg, color: style.text, border: 0, cursor: 'default', flexShrink: 0 }}
                    >
                      {style.label}
                    </span>
                  </div>
                  {t.detail && t.status !== 'pending' && (
                    <div style={{ fontSize: 12, color: 'var(--edu-t3)', marginTop: 4 }}>{t.detail}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
