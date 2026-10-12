'use client';

// Chọn đúng mini-game cho màn `kind: 'game'`. Game "fill" không có component
// riêng: nó LÀ màn lắp ghép khung mã, chỉ đổi tiêu đề.
import type { PlayGame } from '@/lib/studio-lesson';

import DebugGame from './games/DebugGame';
import MatchGame from './games/MatchGame';
import ParsonsGame from './games/ParsonsGame';
import SelfExplainGame from './games/SelfExplainGame';
import SpotErrorGame from './games/SpotErrorGame';
import TraceTableGame from './games/TraceTableGame';
import TrueFalseGame from './games/TrueFalseGame';
import ScaffoldScreen from './ScaffoldScreen';
import type { LessonScreenProps } from './props';

export default function GameScreen(props: LessonScreenProps & { game: PlayGame }) {
  const { game, draft } = props;
  const state = draft.games?.[game.id] ?? {};
  const shared = {
    scr: props.scr,
    metaLabel: props.metaLabel,
    verdict: props.verdict,
    checked: props.checked,
    flash: props.flash,
    setFlash: props.setFlash,
    updateGame: props.updateGame,
    state,
  };

  switch (game.type) {
    case 'traceTable':
      return <TraceTableGame {...shared} game={game} />;
    case 'match':
      return <MatchGame {...shared} game={game} />;
    case 'trueFalse':
      return <TrueFalseGame {...shared} game={game} />;
    case 'fill':
      return <ScaffoldScreen {...props} title={game.title} />;
    case 'parsons':
      return (
        <ParsonsGame
          {...shared}
          game={game}
          lesson={props.lesson}
          gradedRun={props.gradedRun}
          onBreakCombo={props.onBreakCombo}
        />
      );
    case 'spotError':
      return <SpotErrorGame {...shared} game={game} />;
    case 'debug':
      return (
        <DebugGame
          {...shared}
          game={game}
          lesson={props.lesson}
          gameRun={props.gameRun}
          onRunGame={props.onRunGame}
          onStop={props.onStop}
          running={props.running}
          runtimeStatus={props.runtimeStatus}
          busy={props.busy}
        />
      );
    case 'selfExplain':
      return (
        <SelfExplainGame
          {...shared}
          game={game}
          lesson={props.lesson}
          draft={props.draft}
          update={props.update}
          clearChecked={props.clearChecked}
        />
      );
  }
}
