'use client';

// S3 · Lắp ghép khung mã: điền các slot {{slotN}} trong template bằng thẻ ở kho.
// Game "fill" của khoá có mini-game dùng lại đúng màn này, chỉ đổi tiêu đề.
import Assemble from '@/components/lesson-chrome/exercises/Assemble';

import c from '../studio-chrome.module.css';
import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  | 'lesson'
  | 'scr'
  | 'metaLabel'
  | 'draft'
  | 'update'
  | 'clearChecked'
  | 'verdict'
  | 'held'
  | 'onHold'
> & { title?: string };

export default function ScaffoldScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  verdict,
  held,
  onHold,
  title,
}: Props) {
  const three = lesson.step_3;
  const scaffold = three?.scaffold;
  if (!scaffold) return null;
  const slotOf = (line: string) => /\{\{\s*slot(\d+)\s*\}\}/.exec(line);
  const placed = new Set(Object.values(draft.slots));

  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={title ?? (three?.task?.title || 'Lắp lại khung mã')}
      description={three?.task?.body}
      verdict={verdict}
    >
      <Assemble
        filename="main.py"
        langTag="Python 3.12"
        lines={scaffold.template
          .replace(/\s+$/, '')
          .split('\n')
          .map((line, i) => {
            const hit = slotOf(line);
            if (!hit) return { num: i + 1, before: line };
            const n = Number(hit[1]);
            return {
              num: i + 1,
              before: line.slice(0, hit.index),
              slotId: `slot${n}`,
              after: line.slice((hit.index ?? 0) + hit[0].length),
            };
          })}
        filled={Object.fromEntries(
          Object.entries(draft.slots).map(([n, label]) => [`slot${n}`, label]),
        )}
        bank={scaffold.bank.filter((b) => !placed.has(b.label)).map((b) => b.label)}
        heldToken={held}
        onHold={onHold}
        onFillSlot={(slotId) => {
          if (!held) return;
          clearChecked();
          update({ slots: { ...draft.slots, [Number(slotId.replace('slot', ''))]: held } });
          onHold(null);
        }}
      />
      <button
        type="button"
        className={c.resetLink}
        onClick={() => {
          clearChecked();
          update({ slots: {} });
          onHold(null);
        }}
      >
        Đặt lại các slot
      </button>
    </ScreenShell>
  );
}
