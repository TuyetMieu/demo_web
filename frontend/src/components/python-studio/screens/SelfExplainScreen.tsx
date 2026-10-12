'use client';

// S2 · Tự giải thích: ô viết lời giải thích, chấm theo rubric từ khoá hoặc
// theo mốc tối thiểu từ/ký tự.
import SelfExplain from '@/components/lesson-chrome/exercises/SelfExplain';
import { SELF_EXPLAIN_MIN } from '@/lib/studio-lesson';

import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'clearChecked' | 'verdict'
>;

export default function SelfExplainScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  verdict,
}: Props) {
  const selfExplain = lesson.step_2?.selfExplain;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={selfExplain?.prompt || 'Giải thích cách làm của bạn'}
      verdict={verdict}
    >
      <SelfExplain
        value={draft.explanation}
        onChange={(value) => {
          clearChecked();
          update({ explanation: value });
        }}
        placeholder={selfExplain?.placeholder}
        rubricLabels={(selfExplain?.rubric ?? []).map((r) => r.label)}
        requirement={`Viết thành câu, ít nhất ${SELF_EXPLAIN_MIN.words} từ — người chấm sẽ đọc phần này.`}
      />
    </ScreenShell>
  );
}
