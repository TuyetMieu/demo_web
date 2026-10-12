'use client';

// S2 · Phân loại thao tác: nhặt thẻ ở kho rồi bỏ vào đúng nhóm.
import Classify from '@/components/lesson-chrome/exercises/Classify';

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
>;

export default function ClassifyScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  verdict,
  held,
  onHold,
}: Props) {
  const classify = lesson.step_2?.classify;
  if (!classify) return null;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={classify.instruction || 'Xếp mỗi thẻ vào đúng nhóm'}
      verdict={verdict}
    >
      <Classify
        bins={classify.bins.map((bin) => ({
          key: bin.key,
          label: bin.title,
          sub: bin.subtitle || bin.desc || '',
          items: classify.tokens
            .filter((t) => draft.bins[t.label] === bin.key)
            .map((t) => t.label),
        }))}
        pool={classify.tokens.filter((t) => !draft.bins[t.label]).map((t) => t.label)}
        heldToken={held}
        onHold={onHold}
        onDrop={(binKey) => {
          if (!held) return;
          clearChecked();
          update({ bins: { ...draft.bins, [held]: binKey } });
          onHold(null);
        }}
      />
      <button
        type="button"
        className={c.resetLink}
        onClick={() => {
          clearChecked();
          update({ bins: {} });
          onHold(null);
        }}
      >
        Xếp lại từ đầu
      </button>
    </ScreenShell>
  );
}
