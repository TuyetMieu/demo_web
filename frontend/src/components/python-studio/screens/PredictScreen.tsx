'use client';

// S1 · Dự đoán kết quả: trắc nghiệm trên chính mã của bài.
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import { letterKey } from '@/lib/studio-lesson';
import { toCodeLines } from '@/lib/py-highlight';

import { lessonCodeOf, ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'clearChecked' | 'checked' | 'verdict'
>;

export default function PredictScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  checked,
  verdict,
}: Props) {
  const one = lesson.step_1;
  const predict = one?.predict;
  const code = predict?.code || lessonCodeOf(lesson);
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={predict?.question || 'Dự đoán kết quả'}
      verdict={verdict}
    >
      <Mcq
        filename={predict?.code ? 'solution.py' : one?.code?.filename || 'example.py'}
        langTag={one?.code?.version || 'Python 3.12'}
        code={code ? toCodeLines(code) : undefined}
        options={(predict?.options ?? []).map((o, i) => ({
          key: letterKey(i),
          label: o.title,
          // Giải thích của phương án lộ luôn đáp án: chỉ hiện sau khi đã kiểm tra.
          sub: checked ? o.detail : undefined,
        }))}
        selected={draft.predict || null}
        onSelect={(key) => {
          clearChecked();
          update({ predict: key });
        }}
        correctKey={letterKey((predict?.options ?? []).findIndex((o) => o.correct))}
        checked={checked}
      />
    </ScreenShell>
  );
}
