// Hợp đồng props của tầng màn hình.
//
// Không màn nào đọc state dùng chung: tất cả những gì một màn cần đều đi qua
// props dưới đây, nên đọc một màn là biết nó phụ thuộc vào đúng những gì. Mỗi
// component chỉ lấy phần của mình bằng `Pick<LessonScreenProps, …>`.
import type {
  GameState,
  LessonDraft,
  LessonScreen,
  PlayGame,
  StudioLesson as Lesson,
} from '@/lib/studio-lesson';

import type { motionFor, recallFor } from '@/lib/lesson-motion';

import type { RunResult } from '../runner/types';
import type { ScreenVerdict } from './chrome';

export type LessonScreenProps = {
  lesson: Lesson;
  scr: LessonScreen;
  /** Toàn bộ danh sách màn — màn tổng kết cần để đếm. */
  screens: LessonScreen[];
  /** Hoạt hình ví dụ minh hoạ của bài (màn 'motion'); null nếu không có. */
  motion?: ReturnType<typeof motionFor>;
  /** Bài trước để nhắc lại (màn 'recall'); null nếu không có. */
  recall?: ReturnType<typeof recallFor>;
  /** Tên bài, hiện mờ ở góc thẻ. */
  metaLabel?: string;
  draft: LessonDraft;
  update: (changes: Partial<LessonDraft>) => void;
  /** Chọn/gõ lại thì bỏ kết quả "Kiểm tra" của màn đang mở. */
  clearChecked: () => void;
  checked: boolean;
  /** Đã lọc theo `checked` ở phía trên: có giá trị là có băng phản hồi. */
  verdict: ScreenVerdict | null;

  // ---- game ----
  game?: PlayGame;
  updateGame: (id: string, changes: Partial<GameState>) => void;
  /** Phản hồi tức thì trong game (nối nhầm, bấm phải dòng bẫy). */
  flash: string;
  setFlash: (text: string) => void;
  /** Thẻ đang giữ trên tay ở màn phân loại / lắp ghép. */
  held: string | null;
  onHold: (token: string | null) => void;
  /** Lần chạy gần nhất của game có editor (debug). */
  gameRun?: RunResult;
  /** Kết quả chạy ĐÃ CHẤM của game chạy code (parsons/debug). */
  gradedRun?: RunResult;
  onRunGame: (grade: boolean) => void;
  /** Bấm phải dòng bẫy ở game ghép code: ngắt chuỗi combo (nếu khoá có điểm). */
  onBreakCombo: () => void;

  // ---- chạy code ----
  running: boolean;
  runtimeStatus: string;
  result: RunResult | null;
  onRun: () => void;
  onStop: () => void;
  busy: boolean;
  setMessage: (text: string) => void;
  hint: {
    open: boolean;
    index: number;
    onUnlock: (index: number) => void;
    onClose: () => void;
  };
  procedure: { open: boolean; toggle: () => void };

  // ---- tổng kết ----
  completed: boolean;
  xpGained: number | null;
  xpReward: number;
  onFinish: () => void;
};

/** Phần mọi màn dùng ShellB đều cần. */
export type ShellProps = Pick<LessonScreenProps, 'lesson' | 'scr' | 'metaLabel'>;
