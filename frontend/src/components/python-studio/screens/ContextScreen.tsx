'use client';

// S1 · Ngữ cảnh: đề bài nói gì, học trước những gì, file nào có sẵn.
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import { toCodeLines } from '@/lib/py-highlight';

import c from '../studio-chrome.module.css';
import { lessonCodeOf, paragraphs, ScreenShell } from './chrome';
import type { ShellProps } from './props';

export default function ContextScreen({ lesson, scr, metaLabel }: ShellProps) {
  const one = lesson.step_1;
  const ctx = one?.context;
  const gate = Boolean(lesson.step_4?.gate);
  const lessonCode = lessonCodeOf(lesson);
  const facts = [
    ctx?.example && { label: 'Ví dụ', value: ctx.example },
    ctx?.prereq && { label: 'Học trước', value: ctx.prereq },
    ctx?.files?.length && {
      label: 'File trong thư mục bài',
      value: ctx.files.join(', '),
      code: true,
    },
  ].filter((x): x is { label: string; value: string; code?: boolean } => Boolean(x));

  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={ctx?.title || lesson.title || 'Ngữ cảnh'}
      description={paragraphs(ctx?.body)}
    >
      {(ctx?.level || gate) && (
        <div className={c.tags}>
          {ctx?.level && <span className={c.tag}>{ctx.level}</span>}
          {gate && <span className={`${c.tag} ${c.tagGate}`}>Cửa tự kiểm tra</span>}
        </div>
      )}
      {facts.length > 0 && (
        <dl className={c.facts}>
          {facts.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.code ? <code>{row.value}</code> : row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {lessonCode && (
        <CodeBlock
          filename={one?.code?.filename || 'example.py'}
          langTag={one?.code?.version || 'Python 3.12'}
          lines={toCodeLines(lessonCode)}
        />
      )}
    </ScreenShell>
  );
}
