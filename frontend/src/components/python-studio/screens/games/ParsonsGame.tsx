'use client';

// Game · Ghép code ▶: bấm từng dòng theo đúng thứ tự, trong kho có dòng bẫy.
// Ghép xong thì CHẠY THẬT với các ca kiểm thử của bài, đạt hết mới tính đúng.
import Console from '@/components/lesson-chrome/exercises/Console';
import Parsons from '@/components/lesson-chrome/exercises/Parsons';

import c from '../../studio-chrome.module.css';
import { gameConsole, indentOf, testRows, ScreenShell } from '../chrome';
import type { LessonScreenProps } from '../props';
import { FlashNote, type GameProps } from './common';

type Props = GameProps<'parsons'> &
  Pick<LessonScreenProps, 'lesson' | 'gradedRun' | 'onBreakCombo'>;

export default function ParsonsGame({
  lesson,
  game,
  state,
  scr,
  metaLabel,
  verdict,
  checked,
  flash,
  setFlash,
  updateGame,
  gradedRun,
  onBreakCombo,
}: Props) {
  const picked = state.picked ?? [];
  const revealed = state.revealed ?? [];
  const head = game.head ? game.head.split('\n') : [];
  const tail = game.tail ? game.tail.split('\n') : [];
  const byId = new Map([...game.lines, ...game.distractors].map((l) => [l.id, l] as const));

  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={game.title}
      description="Bấm từng dòng theo đúng thứ tự để ghép thành chương trình. Cẩn thận: trong kho có dòng bẫy. Ghép xong bấm ▶ để chạy thật với các ca kiểm thử."
      verdict={verdict}
    >
      <Parsons
        filename="main.py"
        builtLines={[
          ...head.map((text, i) => ({
            id: `h${i}`,
            content: text.trim() || ' ',
            indent: indentOf(text),
            fixed: true,
          })),
          ...picked.map((id) => {
            const text = byId.get(id)?.text ?? '';
            return { id, content: text.trim(), indent: indentOf(text) };
          }),
        ]}
        tailLines={tail.map((text, i) => ({
          id: `t${i}`,
          content: text.trim() || ' ',
          indent: indentOf(text),
          fixed: true,
        }))}
        pool={game.order
          .filter((id) => !picked.includes(id))
          .map((id) => {
            const item = byId.get(id)!;
            const reason = 'reason' in item ? (item.reason as string) : undefined;
            return { id, content: item.text, distractorReason: reason };
          })}
        revealed={revealed}
        onPick={(id) => {
          setFlash('');
          updateGame(game.id, { picked: [...picked, id] });
        }}
        onAttemptDistractor={(id) => {
          const item = game.distractors.find((x) => x.id === id);
          setFlash(
            `Bẫy! Dòng này sai vì: ${item?.reason ?? 'không đúng yêu cầu'}. Chuỗi combo bị ngắt.`,
          );
          updateGame(game.id, { revealed: [...revealed, id] });
          onBreakCombo();
        }}
      />
      <div className={c.gameTools}>
        <button
          type="button"
          className={c.resetLink}
          disabled={!picked.length}
          onClick={() => updateGame(game.id, { picked: picked.slice(0, -1) })}
        >
          ↩ Gỡ dòng cuối
        </button>
        <button
          type="button"
          className={c.resetLink}
          disabled={!picked.length}
          onClick={() => updateGame(game.id, { picked: [] })}
        >
          Xếp lại từ đầu
        </button>
      </div>
      <FlashNote flash={flash} />
      {checked && gradedRun && (
        <div className={c.runResult}>
          <Console
            title="KẾT QUẢ CHẠY main.py"
            meta={`${gradedRun.duration} ms`}
            lines={gameConsole(gradedRun)}
          />
          <ul className={c.runTests}>
            {testRows(lesson, gradedRun).map((row, i) => (
              <li key={i} className={row.status === 'pass' ? c.runPass : c.runFail}>
                {row.status === 'pass' ? '✓' : '✕'} {row.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ScreenShell>
  );
}
