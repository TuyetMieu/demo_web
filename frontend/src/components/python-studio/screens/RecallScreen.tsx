'use client';

// Nhắc lại bài trước: mục tiêu một dòng + hoạt hình của chính bài đó (tự chạy, có nút dừng).
import CodeMotion from '@/components/lesson-chrome/exercises/CodeMotion';

import c from '../studio-chrome.module.css';
import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

export default function RecallScreen({ scr, metaLabel, recall }: Pick<LessonScreenProps, 'scr' | 'metaLabel' | 'recall'>) {
  if (!recall) return null;
  const prev = recall.lesson;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={`Nhắc lại: ${prev.title}`}
      description="Xem nhanh bài trước chạy ra sao — bài này xây tiếp lên đó."
    >
      <dl className={c.facts}>
        <div>
          <dt>Bài {recall.no}</dt>
          <dd>{prev.goal || prev.title}</dd>
        </div>
        {prev.myth && (
          <div>
            <dt>Hay nhầm</dt>
            <dd>{prev.myth}</dd>
          </div>
        )}
      </dl>
      {prev.code && prev.steps?.length ? (
        <CodeMotion code={prev.code} steps={prev.steps} autoPlay compact label={`Nhắc lại bài ${recall.no}`} />
      ) : null}
    </ScreenShell>
  );
}
