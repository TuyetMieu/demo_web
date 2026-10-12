'use client';

// S3 · Nhật ký biến đổi: từng bước dữ liệu thay đổi thế nào.
import c from '../studio-chrome.module.css';
import { ScreenShell } from './chrome';
import type { ShellProps } from './props';

export default function TraceScreen({ lesson, scr, metaLabel }: ShellProps) {
  const three = lesson.step_3;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title="Nhật ký biến đổi"
      description={three?.task?.rule || three?.task?.body}
    >
      <ol className={c.trace}>
        {(three?.trace?.steps ?? []).map((row, i) => (
          <li key={i}>
            {row.label && <b>{row.label}</b>}
            <span>{row.text}</span>
          </li>
        ))}
      </ol>
    </ScreenShell>
  );
}
