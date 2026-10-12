'use client';

// S1 · Giải thích từng dòng: mã ví dụ kèm chú giải theo từng ý.
import CodeAnnotated from '@/components/lesson-chrome/exercises/CodeAnnotated';
import { toCodeLines } from '@/lib/py-highlight';

import c from '../studio-chrome.module.css';
import { ScreenShell } from './chrome';
import type { ShellProps } from './props';

export default function ExplainScreen({ lesson, scr, metaLabel }: ShellProps) {
  const one = lesson.step_1;
  const rows = one?.explain ?? [];
  const demo = one?.code?.kind === 'demo';

  // Cửa tự kiểm tra không có mã ví dụ: chỉ còn các ý cần nắm trước khi tự viết.
  if (!one?.code?.source)
    return (
      <ScreenShell scr={scr} metaLabel={metaLabel} title="Những điều cần nắm trước khi tự viết">
        <ol className={c.trace}>
          {rows.map((row, i) => (
            <li key={i}>
              <b>{row.title || `Ý ${row.n ?? i + 1}`}</b>
              <span>{row.body}</span>
            </li>
          ))}
        </ol>
      </ScreenShell>
    );

  // Khoá có mini-game bỏ màn "Ngộ nhận" riêng: gộp thành một dòng cảnh báo ở đây.
  const myth =
    lesson.play && one?.misconception?.body ? (
      <div className={`${c.note} ${c.noteWarn}`}>
        <strong>Ngộ nhận hay gặp: {one.misconception.title?.replace(/^["“]|["”]$/g, '')}</strong>
        <br />
        {one.misconception.body}
      </div>
    ) : null;

  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={demo ? 'Ví dụ minh hoạ cơ chế' : 'Đọc lại ví dụ theo từng ý'}
      description={
        demo
          ? 'Cùng cơ chế với bài, nhưng dữ liệu khác — đọc hiểu rồi tự áp dụng vào đề.'
          : undefined
      }
    >
      <CodeAnnotated
        filename={one.code.filename || 'example.py'}
        langTag={one.code.version || 'Python 3.12'}
        code={toCodeLines(one.code.source)}
        annotations={rows.map((row, i) => ({
          label: row.title || `Ý ${row.n ?? i + 1}`,
          detail: row.body,
        }))}
      />
      {myth}
    </ScreenShell>
  );
}
