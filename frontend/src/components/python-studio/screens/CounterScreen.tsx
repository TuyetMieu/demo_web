'use client';

// S3 · Tái dự đoán: hỏi lại câu dự đoán sau khi đã học, xem có đổi ý không.
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import { letterKey } from '@/lib/studio-lesson';

import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'clearChecked' | 'checked' | 'verdict'
>;

export default function CounterScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  checked,
  verdict,
}: Props) {
  const counter = lesson.step_3?.counter;
  if (!counter) return null;
  return (
    <ScreenShell scr={scr} metaLabel={metaLabel} title={counter.question} verdict={verdict}>
      <Mcq
        options={counter.options.map((opt, i) => ({ key: letterKey(i), label: opt }))}
        selected={draft.counter || null}
        onSelect={(key) => {
          clearChecked();
          update({ counter: key });
        }}
        correctKey={letterKey(counter.options.indexOf(counter.correct))}
        checked={checked}
      />
    </ScreenShell>
  );
}
