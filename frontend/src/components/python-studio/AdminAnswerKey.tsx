'use client';

// Bảng đáp án của màn đang mở, CHỈ dựng cho tài khoản admin — để người biên
// soạn đối chiếu nội dung và đi nhanh qua bài khi kiểm tra 40 bài.
// Nội dung bảng do answer-key.ts tính; ở đây chỉ là phần hiện ra.
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import { toCodeLines } from '@/lib/py-highlight';

import type { AnswerKey } from './answer-key';
import c from './studio-chrome.module.css';

export default function AdminAnswerKey({
  answerKey,
  open,
  onToggle,
  onFill,
}: {
  answerKey: AnswerKey;
  open: boolean;
  onToggle: () => void;
  /** Điền sẵn đáp án vào bản nháp của màn này. */
  onFill: () => void;
}) {
  return (
    <section className={c.answerKey} aria-label="Đáp án cho quản trị viên">
      <button type="button" className={c.answerKeyHead} aria-expanded={open} onClick={onToggle}>
        <span className={c.adminTag}>ADMIN</span>
        <strong>Đáp án màn này</strong>
        <span className={c.answerKeyToggle}>{open ? 'Ẩn' : 'Hiện'}</span>
      </button>
      {open && (
        <>
          {answerKey.rows.length > 0 && (
            <dl>
              {answerKey.rows.map((row, i) => (
                <div key={i}>
                  <dt>{row.label}</dt>
                  <dd>
                    <code>{row.value}</code>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {answerKey.code && (
            <CodeBlock filename="main.py" langTag="Lời giải mẫu" lines={toCodeLines(answerKey.code)} />
          )}
          {answerKey.fill && (
            <button type="button" className={c.resetLink} onClick={onFill}>
              Điền sẵn đáp án vào màn này
            </button>
          )}
        </>
      )}
    </section>
  );
}
