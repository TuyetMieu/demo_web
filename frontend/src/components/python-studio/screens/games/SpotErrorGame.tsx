'use client';

// Game · Săn lỗi: chương trình chạy được nhưng cho kết quả SAI — bấm vào dòng
// gây ra lỗi. Bài có thể khai cả một khối dòng (`lines`) đều được tính đúng.
import SpotError from '@/components/lesson-chrome/exercises/SpotError';
import { toCodeLines } from '@/lib/py-highlight';

import { ScreenShell } from '../chrome';
import type { GameProps } from './common';

export default function SpotErrorGame({
  game,
  state,
  scr,
  metaLabel,
  verdict,
  checked,
  updateGame,
}: GameProps<'spotError'>) {
  const hits = new Set(game.lines?.length ? game.lines : [game.line]);
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={game.title}
      description="Chương trình này chạy được nhưng cho kết quả SAI. Bấm vào dòng gây ra lỗi."
      verdict={verdict}
    >
      <SpotError
        filename="main.py"
        lines={toCodeLines(game.code).map((line, i) => {
          const num = game.firstLine + i;
          return { num, content: line.content, errorLabel: hits.has(num) ? game.label : undefined };
        })}
        selected={state.line ?? null}
        onSelect={(num) => updateGame(game.id, { line: num })}
        correctLine={
          checked ? (state.line != null && hits.has(state.line) ? state.line : game.line) : undefined
        }
        checked={checked}
      />
    </ScreenShell>
  );
}
