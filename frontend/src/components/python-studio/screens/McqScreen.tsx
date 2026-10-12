'use client';

// S2 · Trắc nghiệm: một màn cho MỖI câu (scr.index trỏ vào step_2.mcq).
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import { correctIndex, letterKey, optionDetail, optionText } from '@/lib/studio-lesson';

import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'clearChecked' | 'checked' | 'verdict'
>;

export default function McqScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  checked,
  verdict,
}: Props) {
  const i = scr.index ?? 0;
  const q = lesson.step_2?.mcq?.[i];
  if (!q) return null;
  return (
    <ScreenShell scr={scr} metaLabel={metaLabel} title={q.question} verdict={verdict}>
      <Mcq
        options={q.options.map((o, oi) => ({
          key: letterKey(oi),
          label: optionText(o),
          sub: checked ? optionDetail(o) : undefined,
        }))}
        selected={draft.mcq[i] ?? null}
        onSelect={(key) => {
          clearChecked();
          update({ mcq: { ...draft.mcq, [i]: key } });
        }}
        correctKey={letterKey(correctIndex(q))}
        checked={checked}
      />
    </ScreenShell>
  );
}
