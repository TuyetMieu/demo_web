'use client';

// Game · Nối cặp: bấm một dòng lệnh bên trái rồi bấm việc nó làm bên phải.
// Nối sai bị chặn ngay tại chỗ (đếm vào `misses` để trừ điểm), nên đủ cặp là đạt.
import MatchPairs from '@/components/lesson-chrome/exercises/MatchPairs';

import { ScreenShell } from '../chrome';
import { FlashNote, type GameProps } from './common';

export default function MatchGame({
  game,
  state,
  scr,
  metaLabel,
  verdict,
  flash,
  setFlash,
  updateGame,
}: GameProps<'match'>) {
  const matched = state.matched ?? {};
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={game.title}
      description="Bấm một dòng lệnh bên trái, rồi bấm việc nó làm bên phải."
      verdict={verdict}
    >
      <MatchPairs
        left={game.pairs.map((p, i) => ({ id: String(i), content: p.left }))}
        right={game.rightOrder.map((i) => ({ id: String(i), content: game.pairs[i].right }))}
        matched={Object.fromEntries(Object.entries(matched).map(([l, r]) => [l, String(r)]))}
        pendingLeft={state.pending == null ? null : String(state.pending)}
        onPickLeft={(id) => {
          setFlash('');
          updateGame(game.id, { pending: Number(id) });
        }}
        onPickRight={(id) => {
          const left = state.pending;
          if (left == null) return;
          if (Number(id) === left) {
            setFlash('');
            updateGame(game.id, { matched: { ...matched, [left]: left }, pending: null });
          } else {
            setFlash(
              `Chưa khớp: "${game.pairs[left].left}" không làm "${game.pairs[Number(id)].right}". Thử cặp khác.`,
            );
            updateGame(game.id, { pending: null, misses: (state.misses ?? 0) + 1 });
          }
        }}
      />
      <FlashNote flash={flash} />
    </ScreenShell>
  );
}
