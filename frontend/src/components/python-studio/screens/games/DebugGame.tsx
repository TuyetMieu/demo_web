'use client';

// Game · Sửa code ▶: code có MỘT lỗi thường gặp, chạy thử để xem ca nào trượt.
import SandboxEditor from '@/components/lesson-chrome/exercises/SandboxEditor';

import c from '../../studio-chrome.module.css';
import { gameConsole, testRows, ScreenShell } from '../chrome';
import type { LessonScreenProps } from '../props';
import type { GameProps } from './common';

type Props = GameProps<'debug'> &
  Pick<
    LessonScreenProps,
    'lesson' | 'gameRun' | 'onRunGame' | 'onStop' | 'running' | 'runtimeStatus' | 'busy'
  >;

export default function DebugGame({
  lesson,
  game,
  state,
  scr,
  metaLabel,
  verdict,
  updateGame,
  gameRun,
  onRunGame,
  onStop,
  running,
  runtimeStatus,
  busy,
}: Props) {
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={game.title}
      description='Code dưới đây có MỘT lỗi thường gặp. Bấm "Chạy thử" để xem ca nào trượt, sửa lại rồi bấm ▶ Chạy & kiểm tra.'
      verdict={verdict}
    >
      <SandboxEditor
        filename="main.py"
        langTag={runtimeStatus || 'CPython 3.12'}
        code={state.code ?? game.code}
        onCodeChange={(code) => updateGame(game.id, { code })}
        running={running}
        onRun={() => onRunGame(false)}
        onStop={onStop}
        consoleLines={gameConsole(gameRun)}
        consoleMeta={gameRun ? `${gameRun.duration} ms` : runtimeStatus}
        tests={testRows(lesson, gameRun)}
        disabled={busy}
      />
      <details className={c.panel}>
        <summary>Gợi ý: tên lỗi</summary>
        <p className={c.panelNote}>{game.label}</p>
      </details>
      <button
        type="button"
        className={c.resetLink}
        onClick={() => updateGame(game.id, { code: game.code })}
      >
        Khôi phục code ban đầu
      </button>
    </ScreenShell>
  );
}
