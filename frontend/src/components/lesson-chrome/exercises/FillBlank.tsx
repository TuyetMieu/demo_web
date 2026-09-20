'use client';

// Dịch từ màn Stitch "1. fill_blank — điền khuyết cụm nguồn".
// Bấm "Chạy" để xem kết quả ở khung console bên dưới — output là dữ liệu
// soạn sẵn truyền vào qua prop, KHÔNG chạy Python thật.
import { useState } from 'react';

import styles from './exercises.module.css';
import Console, { ConsoleLine } from './Console';

export interface FillBlankProps {
  filename?: string;
  langTag?: string;
  /** Các dòng code TRƯỚC chỗ trống. */
  beforeLines: { num: number; content: React.ReactNode }[];
  /** Dòng chứa ô trống: phần trước ô trống, ô trống, phần sau ô trống. */
  blankLine: { num: number; before: React.ReactNode; after: React.ReactNode };
  /** Các dòng code SAU chỗ trống. */
  afterLines: { num: number; content: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  /** Kết quả in ra console khi bấm "Chạy" (soạn sẵn theo đáp án). */
  outputFor?: (value: string) => ConsoleLine[];
  /** Đáp án đúng — chỉ dùng để tô màu SAU khi bấm "Kiểm tra". */
  correctAnswers?: string[];
  checked?: boolean;
}

export default function FillBlank({
  filename,
  langTag,
  beforeLines,
  blankLine,
  afterLines,
  value,
  onChange,
  suggestions,
  outputFor,
  correctAnswers,
  checked,
}: FillBlankProps) {
  const [output, setOutput] = useState<ConsoleLine[] | null>(null);
  const [running, setRunning] = useState(false);

  const isRight = checked && !!correctAnswers?.includes(value.trim());
  const isWrong = checked && !isRight;

  const run = () => {
    setRunning(true);
    setOutput(null);
    // Giả lập độ trễ biên dịch để khung console có nhịp "đang chạy".
    setTimeout(() => {
      setOutput(outputFor ? outputFor(value.trim()) : []);
      setRunning(false);
    }, 420);
  };

  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
          {langTag && <span className={styles.langTag}>{langTag}</span>}
        </div>
        <div className={styles.codeBody}>
          {beforeLines.map((line) => (
            <div key={line.num} className={styles.codeLine}>
              <span className={styles.lineNum}>{line.num}</span>
              <span className={styles.codeText}>{line.content}</span>
            </div>
          ))}
          <div className={styles.codeLine}>
            <span className={styles.lineNum}>{blankLine.num}</span>
            <span className={styles.codeText}>
              {blankLine.before}
              <input
                type="text"
                className={styles.blank}
                value={value}
                onChange={(e) => { onChange(e.target.value); setOutput(null); }}
                size={Math.max(3, value.length || 3)}
                aria-label="Điền vào chỗ trống"
                disabled={checked}
                style={
                  isRight
                    ? { borderColor: 'var(--st-ok-line)', borderStyle: 'solid', color: 'var(--st-ok-line)' }
                    : isWrong
                      ? { borderColor: 'var(--st-err-line)', borderStyle: 'solid', color: 'var(--st-err-text)' }
                      : undefined
                }
              />
              {blankLine.after}
            </span>
          </div>
          {afterLines.map((line) => (
            <div key={line.num} className={styles.codeLine}>
              <span className={styles.lineNum}>{line.num}</span>
              <span className={styles.codeText}>{line.content}</span>
            </div>
          ))}
        </div>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className={styles.suggestions} style={{ marginTop: 14 }}>
          Gợi ý nhanh:
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.chip}
              onClick={() => { onChange(s); setOutput(null); }}
              disabled={checked}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={styles.runRow}>
        <button type="button" className={styles.runBtn} onClick={run} disabled={running || !value.trim()}>
          {running ? '⟳ Đang chạy…' : '▶ Chạy'}
        </button>
        <span className={styles.runHint}>
          {value.trim() ? 'Chạy thử trước khi nộp — không trừ điểm.' : 'Điền đáp án vào ô trống để chạy thử.'}
        </span>
      </div>

      <Console title="KẾT QUẢ DÒNG LỆNH" running={running} lines={output} />
    </div>
  );
}
