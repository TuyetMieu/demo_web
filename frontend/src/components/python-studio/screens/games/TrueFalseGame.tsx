'use client';

// Game · Đúng hay sai: mỗi phát biểu chọn Đúng/Sai rồi bấm Kiểm tra.
import TrueFalse from '@/components/lesson-chrome/exercises/TrueFalse';

import c from '../../studio-chrome.module.css';
import { ScreenShell } from '../chrome';
import type { GameProps } from './common';

export default function TrueFalseGame({
  game,
  state,
  scr,
  metaLabel,
  verdict,
  checked,
  updateGame,
}: GameProps<'trueFalse'>) {
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={game.title}
      description={
        game.prompt ? (
          <>
            <code>{game.prompt}</code>
            <br />
            Mỗi đáp án dưới đây chọn Đúng hoặc Sai, rồi bấm Kiểm tra.
          </>
        ) : (
          'Mỗi câu chọn Đúng hoặc Sai, rồi bấm Kiểm tra.'
        )
      }
      verdict={verdict}
    >
      <ol className={c.tfList}>
        {game.items.map((it, i) => (
          <li key={i}>
            <p>{game.prompt ? <code>{it.statement}</code> : it.statement}</p>
            <TrueFalse
              selected={state.tf?.[i] ?? null}
              onSelect={(value) => updateGame(game.id, { tf: { ...state.tf, [i]: value } })}
              correctValue={it.answer ? 'true' : 'false'}
              checked={checked}
            />
          </li>
        ))}
      </ol>
    </ScreenShell>
  );
}
