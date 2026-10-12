// Nút CTA dưới đáy LessonChrome: nhãn, màu và HÀNH ĐỘNG của màn đang mở.
//
// Toàn bộ là hàm thuần (không state, không ref, không gọi API): đưa vào đây để
// quy tắc "khi nào được bấm Tiếp tục / Nộp bài / Thử lại" đọc được một mạch.
// Nó trả về TÊN hành động chứ không trả closure, vì nó chạy ngay trong lúc
// render — closure lại chạm tới bộ chạy code, mà React cấm đọc ref lúc render.
// Bấm nút mới gọi doAction() trong StudioLesson.tsx.
import {
  gameAnswered,
  isGraded,
  isRunnableGame,
  type LessonDraft,
  type LessonScreen,
  type PlayGame,
  type StudioLesson as Lesson,
} from '@/lib/studio-lesson';

import type { RunResult } from './runner/types';
import { eyebrowOf, type ScreenVerdict } from './screens/chrome';

export type Action =
  | 'leave'
  | 'nextLesson'
  | 'toSandbox'
  | 'toBlocked'
  | 'complete'
  | 'submit'
  | 'check'
  | 'retry'
  | 'next';

export type Cta = {
  label: string;
  tone: 'accent' | 'ok' | 'err';
  disabled?: boolean;
  action: Action;
};

export type CtaContext = {
  lesson: Lesson | null;
  scr?: LessonScreen;
  screens: LessonScreen[];
  draft: LessonDraft;
  game?: PlayGame;
  checked: boolean;
  verdict: ScreenVerdict | null;
  completed: boolean;
  /** Còn bài sau trong khoá hay không (để đổi nhãn ở màn tổng kết). */
  hasNextLesson: boolean;
  lessonNo: number;
  running: boolean;
  busy: boolean;
  result: RunResult | null;
};

/** Đã có câu trả lời để bấm "Kiểm tra" chưa. */
export function isAnswered({ lesson, scr, draft, game }: CtaContext): boolean {
  if (!scr || !lesson) return false;
  if (scr.kind === 'predict') return Boolean(draft.predict);
  if (scr.kind === 'mcq') return draft.mcq[scr.index ?? 0] !== undefined;
  if (scr.kind === 'classify')
    return (lesson.step_2?.classify?.tokens ?? []).every((t) => draft.bins[t.label]);
  if (scr.kind === 'selfExplain') return draft.explanation.trim().length > 0;
  if (scr.kind === 'scaffold')
    return (lesson.step_3?.scaffold?.slots ?? []).every((slot) => draft.slots[slot.n]);
  if (scr.kind === 'counter') return Boolean(draft.counter);
  if (scr.kind === 'game') return game ? gameAnswered(lesson, game, draft) : false;
  return true;
}

/** Màn có chấm mà học viên chưa làm đúng — chặn việc kết thúc bài. */
export function firstUnfinished(
  screens: LessonScreen[],
  draft: LessonDraft,
): LessonScreen | undefined {
  return screens.find((x) => isGraded(x.kind) && !draft.done[x.key]);
}

export function primaryCta(ctx: CtaContext): Cta {
  const { scr, screens, draft, game, checked, verdict, completed, busy, running, result } = ctx;
  const tests = ctx.lesson?.step_4?.tests ?? [];

  if (!scr) return { label: 'Về khóa học', tone: 'accent', action: 'leave' };

  if (scr.kind === 'recap') {
    // Học xong thì đi thẳng sang bài kế tiếp, không bắt quay về danh sách.
    if (completed)
      return ctx.hasNextLesson
        ? { label: `Bài ${ctx.lessonNo + 1} →`, tone: 'ok', action: 'nextLesson' }
        : { label: 'Về khóa học →', tone: 'ok', action: 'leave' };
    // Chưa làm xong màn nào đó thì không cho kết thúc bài — kể cả khi mở lại
    // từ bản nháp cũ và nhảy thẳng tới đây.
    const missing = firstUnfinished(screens, draft);
    if (missing)
      return {
        label: `Còn phải làm: ${eyebrowOf(missing).label}`,
        tone: 'err',
        action: 'toBlocked',
      };
    if (tests.length)
      return { label: 'Nộp bài ở màn trước', tone: 'accent', action: 'toSandbox' };
    // Bài lab desktop / bài quy trình không có ca chấm nào chạy được trong
    // trình duyệt, nên hoàn thành do người học tự xác nhận ở đây.
    return {
      label: busy ? 'Đang lưu…' : 'Đánh dấu đã hoàn thành ✓',
      tone: 'accent',
      disabled: busy,
      action: 'complete',
    };
  }

  if (scr.kind === 'sandbox') {
    if (!tests.length) return { label: 'Tiếp tục →', tone: 'accent', action: 'next' };
    if (draft.done[scr.key]) return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
    return {
      label: running ? 'Đang chấm…' : 'Nộp & Chấm điểm',
      tone: result && result.tests.some((t) => !t.passed) ? 'err' : 'accent',
      disabled: running || busy,
      action: 'submit',
    };
  }

  if (isGraded(scr.kind)) {
    if (isRunnableGame(game) && running)
      return { label: 'Đang chạy code…', tone: 'accent', disabled: true, action: 'check' };
    if (!checked)
      return {
        label: isRunnableGame(game) ? '▶ Chạy & kiểm tra' : 'Kiểm tra',
        tone: 'accent',
        disabled: !isAnswered(ctx),
        action: 'check',
      };
    if (verdict && !verdict.correct) return { label: 'Thử lại', tone: 'err', action: 'retry' };
    return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
  }

  return { label: 'Tiếp tục →', tone: 'accent', action: 'next' };
}
