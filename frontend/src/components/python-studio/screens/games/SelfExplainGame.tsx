'use client';

// Game · Tự giải thích: cùng ô viết như màn S2 nhưng chấm theo
// `play.selfExplainMinWords` của khoá có mini-game.
import SelfExplain from '@/components/lesson-chrome/exercises/SelfExplain';
import { SELF_EXPLAIN_MIN } from '@/lib/studio-lesson';

import { ScreenShell } from '../chrome';
import type { LessonScreenProps } from '../props';
import type { GameProps } from './common';

type Props = GameProps<'selfExplain'> &
  Pick<LessonScreenProps, 'lesson' | 'draft' | 'update' | 'clearChecked'>;

export default function SelfExplainGame({
  lesson,
  game,
  scr,
  metaLabel,
  verdict,
  draft,
  update,
  clearChecked,
}: Props) {
  const min = lesson.play?.selfExplainMinWords ?? SELF_EXPLAIN_MIN.words;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={lesson.step_2?.selfExplain?.prompt || game.title}
      verdict={verdict}
    >
      <SelfExplain
        value={draft.explanation}
        onChange={(value) => {
          clearChecked();
          update({ explanation: value });
        }}
        placeholder={lesson.step_2?.selfExplain?.placeholder}
        rubricLabels={[]}
        requirement={`Viết thành một câu, ít nhất ${min} từ.`}
      />
    </ScreenShell>
  );
}
