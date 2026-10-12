'use client';

// Code chạy từng bước: dòng đang chạy sáng lên, biến/đối tượng vừa đổi nảy lên kèm nhãn "mới",
// phần in ra hiện dần ở console. Dữ liệu do scripts/pe-v3/motion.py sinh từ ví dụ minh hoạ của
// bài (src/lib/lesson-motion.ts), nên tác giả không phải viết thêm chữ nào.
//
// Quy ước (theo báo cáo "Chuyển động cho phần lý thuyết"): người học TỰ bấm từng bước là mặc
// định; tự chạy chỉ dùng ở màn nhắc lại bài trước (autoPlay) và luôn có nút tạm dừng. Chuyển
// động chỉ là ngón tay chỉ — mỗi bước một câu ngắn. Không phân biệt chỉ bằng màu: ô đổi có
// viền đậm + nhãn chữ "mới", dòng đang chạy có thanh bên trái. prefers-reduced-motion thì tắt
// hoạt hình và không tự chạy, vẫn bấm chuyển bước được.
//
// Không dùng style={{…}}: style-src đang muốn bỏ 'unsafe-inline' (xem AGENTS.md). Màu và cỡ
// nằm hết trong CodeMotion.module.css qua token --edu-* / --st-*.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MotionHeap, MotionStep, MotionVar } from '@/lib/lesson-motion';
import { toCodeLines } from '@/lib/py-highlight';

import styles from './CodeMotion.module.css';

const GLYPH: Record<string, string> = {
  start: '▶',
  assign: '=',
  print: '›_',
  branch: '?',
  loop: '↻',
  return: '↩',
  call: '()',
  end: '■',
  other: '•',
};

const STEP_MS = 1700;
const LOOP_PAUSE_MS = 2600;

export interface CodeMotionProps {
  code: string;
  steps: MotionStep[];
  /** Tự chạy từng bước (màn nhắc lại). Có nút tạm dừng; bỏ qua nếu người dùng giảm chuyển động. */
  autoPlay?: boolean;
  /** Gọn hơn: bỏ số dòng, ít khoảng đệm. */
  compact?: boolean;
  label?: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function VarChip({ v, changed }: { v: MotionVar; changed: boolean }) {
  return (
    <li className={`${styles.chip} ${changed ? styles.changed : ''}`}>
      <span className={styles.chipName}>{v.n}</span>
      <span className={styles.chipValue}>
        {v.k === 'ref' ? <span className={styles.ref}>→ #{v.ref}</span> : v.v}
      </span>
      {changed && <span className={styles.badge}>mới</span>}
    </li>
  );
}

function HeapCard({ h }: { h: MotionHeap }) {
  const cells = h.type === 'list' || h.type === 'tuple' || h.type === 'set';
  return (
    <div className={`${styles.heapCard} ${h.ch ? styles.changed : ''}`}>
      <div className={styles.heapHead}>
        <span className={styles.heapType}>{h.type}</span>
        <span className={styles.heapId}>#{h.id}</span>
        {h.ch && <span className={styles.badge}>mới</span>}
      </div>
      {h.items.length === 0 ? (
        <span className={styles.empty}>trống</span>
      ) : cells ? (
        <ol className={styles.cells}>
          {h.items.map((item, i) => (
            <li key={i} className={styles.cell}>
              <span className={styles.cellIndex}>{i}</span>
              <span className={styles.cellValue}>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className={styles.rows}>
          {h.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CodeMotion({ code, steps, autoPlay = false, compact = false, label }: CodeMotionProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => toCodeLines(code), [code]);
  const last = steps.length - 1;
  const step = steps[Math.min(index, last)];

  // Chỉ bật tự chạy sau khi mount: matchMedia không có ở server.
  useEffect(() => {
    if (!autoPlay || prefersReducedMotion()) return;
    const t = setTimeout(() => setPlaying(true), 0);
    return () => clearTimeout(t);
  }, [autoPlay]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(
      () => setIndex((i) => (i >= last ? 0 : i + 1)),
      index >= last ? LOOP_PAUSE_MS : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [playing, index, last]);

  const go = useCallback(
    (next: number) => {
      setPlaying(false); // người học đã đụng tay vào thì thôi tự chạy
      setIndex(Math.max(0, Math.min(last, next)));
    },
    [last],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    }
  }

  const summary = step.frames
    .map((f) => `${f.name}: ${f.vars.map((v) => `${v.n} = ${v.k === 'ref' ? `đối tượng #${v.ref}` : v.v}`).join(', ') || 'chưa có biến'}`)
    .join('. ');

  return (
    <div
      ref={root}
      className={`${styles.root} ${compact ? styles.compact : ''}`}
      role="group"
      aria-label={label ?? 'Code chạy từng bước'}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className={styles.stage}>
        <div className={styles.code} aria-hidden="true">
          {lines.map((l) => (
            <div key={l.num} className={`${styles.line} ${step.line === l.num ? styles.lineOn : ''}`}>
              {!compact && <span className={styles.num}>{l.num}</span>}
              <span className={styles.text}>{l.content || ' '}</span>
            </div>
          ))}
        </div>

        <div className={styles.memory}>
          <div className={styles.title}>Bộ nhớ</div>
          {step.frames.map((f, depth) => (
            <section key={`${depth}-${f.name}`} className={styles.frame}>
              <h4 className={styles.frameName}>{f.name === 'toàn cục' ? 'Toàn cục' : `Hàm ${f.name}()`}</h4>
              {f.vars.length === 0 ? (
                <span className={styles.empty}>chưa có biến</span>
              ) : (
                <ul className={styles.vars}>
                  {f.vars.map((v, i) => (
                    <VarChip key={v.ch ? `${i}-${v.n}-${index}` : `${i}-${v.n}`} v={v} changed={v.ch} />
                  ))}
                </ul>
              )}
            </section>
          ))}
          {step.heap.length > 0 && (
            <div className={styles.heap}>
              {step.heap.map((h) => (
                <HeapCard key={h.ch ? `${h.id}-${index}` : h.id} h={h} />
              ))}
            </div>
          )}
          <div className={styles.out}>
            <div className={styles.outTitle}>In ra</div>
            {step.out.length === 0 ? (
              <span className={styles.outEmpty}>chưa in gì</span>
            ) : (
              step.out.map((line, i) => (
                <div
                  key={i === step.out.length - 1 ? `${i}-${index}` : i}
                  className={`${styles.outLine} ${i === step.out.length - 1 && step.kind === 'print' ? styles.outNew : ''}`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className={styles.caption} aria-live="polite" key={index}>
        <span className={styles.glyph} aria-hidden="true">
          {GLYPH[step.kind] ?? GLYPH.other}
        </span>
        <span>{step.cap}</span>
      </p>
      <p className={styles.sr}>{summary}</p>

      <div className={styles.controls}>
        <button type="button" className={styles.btn} onClick={() => go(index - 1)} disabled={index === 0}>
          ← Lùi
        </button>
        <span className={styles.counter} aria-label={`Bước ${index + 1} trên ${steps.length}`}>
          Bước {index + 1}/{steps.length}
        </span>
        {index >= last && !autoPlay ? (
          <button type="button" className={styles.btn} onClick={() => go(0)}>
            ↺ Chạy lại
          </button>
        ) : (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => go(index + 1)} disabled={index >= last}>
            Tiếp →
          </button>
        )}
        {autoPlay && (
          <button
            type="button"
            className={styles.btn}
            aria-pressed={playing}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Tạm dừng' : 'Tự chạy'}
          </button>
        )}
      </div>
    </div>
  );
}
