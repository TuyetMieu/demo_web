'use client';

// Bản nháp của bài: câu đã chọn, ô đã xếp, code đang viết, màn đang mở, điểm.
// Lưu xuống localStorage sau 400 ms không gõ gì, và nạp lại khi mở bài.
//
// Bản nháp CHỈ nằm trên máy học viên: server không biết gì về nó, nên mất nháp
// không được phép làm hỏng bài — mọi lỗi đọc/ghi đều bị nuốt, cùng lắm là mất
// bản nháp.
import { useCallback, useEffect, useState } from 'react';

import {
  EMPTY_SCORE,
  initialLessonDraft,
  type LessonDraft,
  type StudioLesson as Lesson,
} from '@/lib/studio-lesson';

const PREFIX = 'pe-studio-lesson-v1';

export type LessonDraftState = {
  draft: LessonDraft;
  setDraft: React.Dispatch<React.SetStateAction<LessonDraft>>;
  update: (changes: Partial<LessonDraft>) => void;
  /** Câu hiện ở thanh trên cùng ("✓ Tiến độ tự lưu" / lỗi ghi). */
  saveStatus: string;
  /** Gọi khi đã có nội dung bài: nạp lại bản nháp đã lưu của đúng học viên đó. */
  restore: (lesson: Lesson, userId: number, screenCount: number) => void;
};

export function useLessonDraft({
  courseId,
  lessonNo,
}: {
  courseId: string;
  lessonNo: number;
}): LessonDraftState {
  const [draft, setDraft] = useState<LessonDraft>(() => initialLessonDraft({}));
  const [saveStatus, setSaveStatus] = useState('');
  // Chủ của bản nháp. Chỉ có giá trị sau `restore()`, nên nó cũng là cờ "bài đã
  // nạp xong" — chưa nạp thì KHÔNG tự lưu, kẻo ghi đè nháp cũ bằng nháp rỗng.
  const [owner, setOwner] = useState<number | null>(null);
  const key = owner ? `${PREFIX}:${owner}:${courseId}:${lessonNo}` : null;

  const update = useCallback(
    (changes: Partial<LessonDraft>) => setDraft((prev) => ({ ...prev, ...changes })),
    [],
  );

  const restore = useCallback(
    (lesson: Lesson, user: number, screenCount: number) => {
      let restored = initialLessonDraft(lesson);
      try {
        const stored = JSON.parse(
          localStorage.getItem(`${PREFIX}:${user}:${courseId}:${lessonNo}`) || 'null',
        );
        if (stored && typeof stored.code === 'string') {
          restored = {
            ...restored,
            ...stored,
            // Bản nháp cũ đánh số theo 4 bước S; giờ danh sách màn dài hơn nên
            // phải kẹp lại cho khỏi rơi ra ngoài mảng.
            step: Math.min(screenCount, Math.max(1, Number(stored.step) || 1)),
            done: stored.done && typeof stored.done === 'object' ? stored.done : {},
            games: stored.games && typeof stored.games === 'object' ? stored.games : {},
            score:
              stored.score && typeof stored.score === 'object'
                ? { ...EMPTY_SCORE, ...stored.score }
                : EMPTY_SCORE,
            code: String(stored.code).slice(0, 15000),
          };
        }
      } catch {
        /* A missing or corrupt draft must not block the lesson. */
      }
      setDraft(restored);
      setOwner(user);
    },
    [courseId, lessonNo],
  );

  useEffect(() => {
    if (!key) return;
    const save = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(draft));
        setSaveStatus('Đã lưu bản nháp trên máy');
      } catch {
        setSaveStatus('Không lưu được bản nháp trên trình duyệt này');
      }
    }, 400);
    return () => clearTimeout(save);
  }, [draft, key]);

  return { draft, setDraft, update, saveStatus, restore };
}
