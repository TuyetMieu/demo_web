'use client';

// S1 · Ngộ nhận: thẻ "nhiều người tưởng… nhưng thật ra…" (tự có vỏ riêng).
import Misconception from '@/components/lesson-chrome/exercises/Misconception';
import { toCodeLines } from '@/lib/py-highlight';

import { lessonCodeOf } from './chrome';
import type { LessonScreenProps } from './props';

export default function MisconceptionScreen({ lesson }: Pick<LessonScreenProps, 'lesson'>) {
  const one = lesson.step_1;
  const code = one?.misconception?.code ?? lessonCodeOf(lesson);
  return (
    <Misconception
      myth={one?.misconception?.title || 'Ngộ nhận thường gặp'}
      correction={one?.misconception?.body}
      exampleLabel={code ? 'Ví dụ của bài' : undefined}
      langTag={one?.code?.version}
      code={code ? toCodeLines(code) : undefined}
    />
  );
}
