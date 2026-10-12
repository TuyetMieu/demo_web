'use client';

// Tiến độ trong một bài: màn đang mở, màn nào đã làm đúng, kết quả "Kiểm tra"
// của màn hiện tại, điểm/combo và các hiệu ứng ăn mừng.
//
// Điểm và cờ "đã làm đúng" nằm trong BẢN NHÁP (useLessonDraft) vì phải sống qua
// lần tải lại trang; hook này chỉ là các phép đổi trạng thái trên bản nháp đó
// cộng với mấy state chỉ sống trong một lần xem màn (flash, pop, thẻ đang giữ).
import { useCallback, useState } from 'react';

import {
  EMPTY_SCORE,
  scoreCheck,
  type GameState,
  type LessonDraft,
  type LessonScreen,
} from '@/lib/studio-lesson';

import type { RunResult } from './runner/types';

export type RunVerdict = { correct: boolean; explain: string; result: RunResult };

export function useLessonProgress({
  screens,
  draft,
  setDraft,
  update,
  scored,
  clearMessage,
}: {
  screens: LessonScreen[];
  draft: LessonDraft;
  setDraft: React.Dispatch<React.SetStateAction<LessonDraft>>;
  update: (changes: Partial<LessonDraft>) => void;
  /** Chỉ khoá có mini-game (`play`) mới cộng điểm. */
  scored: boolean;
  clearMessage: () => void;
}) {
  /** Màn đã bấm "Kiểm tra" — rỗng nghĩa là chưa chấm màn nào. */
  const [checkedKey, setCheckedKey] = useState('');
  /** Kết quả chấm của game chạy code (parsons/debug), theo khoá màn. */
  const [runVerdicts, setRunVerdicts] = useState<Record<string, RunVerdict>>({});
  /** Lần chạy gần nhất của từng game có editor (debug). */
  const [gameRuns, setGameRuns] = useState<Record<string, RunResult>>({});
  /** "+10 điểm · Combo x3" bật lên rồi tự tắt. */
  const [pop, setPop] = useState<{ id: number; text: string } | null>(null);
  /** Hiệu ứng ăn mừng khi code chạy đúng — đổi số để chạy lại animation. */
  const [celebrate, setCelebrate] = useState(0);
  /** Phản hồi tức thì trong game (nối nhầm, bấm phải dòng bẫy). */
  const [flash, setFlash] = useState('');
  /** Thẻ đang giữ trên tay ở màn phân loại / lắp ghép. */
  const [held, setHeld] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);

  const clearChecked = useCallback(() => setCheckedKey(''), []);

  const markDone = useCallback(
    (key: string) => setDraft((prev) => ({ ...prev, done: { ...prev.done, [key]: true } })),
    [setDraft],
  );

  const updateGame = useCallback(
    (id: string, changes: Partial<GameState>) => {
      setCheckedKey('');
      setDraft((prev) => ({
        ...prev,
        games: { ...prev.games, [id]: { ...(prev.games?.[id] ?? {}), ...changes } },
      }));
    },
    [setDraft],
  );

  const goTo = useCallback(
    (step: number) => {
      setCheckedKey('');
      setHintOpen(false);
      clearMessage();
      setDraft((prev) => ({ ...prev, step: Math.min(screens.length, Math.max(1, step)) }));
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [clearMessage, screens.length, setDraft],
  );

  /** Cộng điểm (chỉ khoá có mini-game). clean=false: đúng nhưng đã nhầm trước đó. */
  const award = useCallback(
    (key: string, correct: boolean, clean = correct) => {
      if (!scored) return;
      let s = draft.score ?? EMPTY_SCORE;
      if (correct && !clean) s = scoreCheck(s, key, false).score;
      const r = scoreCheck(s, key, correct);
      update({ score: r.score });
      if (r.gained > 0)
        setPop((prev) => ({
          id: (prev?.id ?? 0) + 1,
          text: `+${r.gained} điểm${r.score.combo >= 3 ? ` · Combo x${r.score.combo} 🔥` : ''}`,
        }));
    },
    [draft.score, scored, update],
  );

  return {
    checkedKey,
    setCheckedKey,
    clearChecked,
    runVerdicts,
    setRunVerdicts,
    gameRuns,
    setGameRuns,
    pop,
    setPop,
    celebrate,
    setCelebrate,
    flash,
    setFlash,
    held,
    setHeld,
    hintOpen,
    setHintOpen,
    hintIndex,
    setHintIndex,
    procedureOpen,
    setProcedureOpen,
    answerOpen,
    setAnswerOpen,
    markDone,
    updateGame,
    goTo,
    award,
  };
}
