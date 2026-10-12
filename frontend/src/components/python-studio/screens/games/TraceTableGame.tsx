'use client';

// Game · Theo dõi biến: chạy chương trình trong đầu rồi điền giá trị từng bước.
import TraceTable from '@/components/lesson-chrome/exercises/TraceTable';
import { toCodeLines } from '@/lib/py-highlight';

import { ScreenShell } from '../chrome';
import type { GameProps } from './common';

export default function TraceTableGame({
  game,
  state,
  scr,
  metaLabel,
  verdict,
  updateGame,
}: GameProps<'traceTable'>) {
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={game.title}
      description="Chạy chương trình trong đầu: sau mỗi dòng, biến nào đổi và đổi thành gì? Chuỗi gõ có hay không có nháy đều được."
      verdict={verdict}
    >
      <TraceTable
        filename="vi_du.py"
        code={toCodeLines(game.code)}
        columns={game.columns}
        rows={game.rows}
        answers={state.cells ?? {}}
        onAnswerChange={(key, value) =>
          updateGame(game.id, { cells: { ...state.cells, [key]: value } })
        }
      />
    </ScreenShell>
  );
}
