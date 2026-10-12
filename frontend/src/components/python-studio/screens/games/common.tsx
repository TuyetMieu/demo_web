'use client';

// Phần dùng chung của các mini-game (khoá có `play`).
import type { GameState, PlayGame } from '@/lib/studio-lesson';

import c from '../../studio-chrome.module.css';
import type { LessonScreenProps } from '../props';

/** Nhánh của union PlayGame theo `type` — để mỗi game nhận đúng kiểu của nó. */
export type GameOf<K extends PlayGame['type']> = Extract<PlayGame, { type: K }>;

export type GameProps<K extends PlayGame['type']> = Pick<
  LessonScreenProps,
  'scr' | 'metaLabel' | 'verdict' | 'checked' | 'flash' | 'setFlash' | 'updateGame'
> & {
  game: GameOf<K>;
  /** Trạng thái đã lưu của game này trong bản nháp (draft.games[game.id]). */
  state: GameState;
};

/** Phản hồi tức thì: nối nhầm cặp, bấm phải dòng bẫy… */
export function FlashNote({ flash }: { flash: string }) {
  if (!flash) return null;
  return (
    <div className={`${c.note} ${c.noteWarn}`} role="status">
      {flash}
    </div>
  );
}
