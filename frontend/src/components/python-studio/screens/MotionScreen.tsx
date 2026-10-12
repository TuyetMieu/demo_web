'use client';

// Ví dụ minh hoạ chạy từng bước: thay vì đọc đoạn văn, bấm Tiếp để xem biến đổi.
import CodeMotion from '@/components/lesson-chrome/exercises/CodeMotion';

import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

export default function MotionScreen({ scr, metaLabel, motion }: Pick<LessonScreenProps, 'scr' | 'metaLabel' | 'motion'>) {
  if (!motion?.code || !motion.steps) return null;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title="Xem code chạy từng bước"
      description="Bấm Tiếp (hoặc phím →) để chạy từng dòng và nhìn biến thay đổi."
    >
      <CodeMotion code={motion.code} steps={motion.steps} />
    </ScreenShell>
  );
}
