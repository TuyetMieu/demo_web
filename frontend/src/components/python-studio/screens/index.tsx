'use client';

// Bộ phân tuyến màn hình: đổi `scr.kind` thành đúng một component trong
// thư mục này. Trước đây đây là một chuỗi `if` dài trong StudioLesson.tsx.
import LessonBrief from '@/components/lesson-chrome/LessonBrief';

import ClassifyScreen from './ClassifyScreen';
import ContextScreen from './ContextScreen';
import CounterScreen from './CounterScreen';
import ExplainScreen from './ExplainScreen';
import GameScreen from './GameScreen';
import McqScreen from './McqScreen';
import MotionScreen from './MotionScreen';
import MemoryScreen from './MemoryScreen';
import MisconceptionScreen from './MisconceptionScreen';
import PredictScreen from './PredictScreen';
import RecallScreen from './RecallScreen';
import RecapScreen from './RecapScreen';
import SandboxScreen from './SandboxScreen';
import ScaffoldScreen from './ScaffoldScreen';
import SelfExplainScreen from './SelfExplainScreen';
import TraceScreen from './TraceScreen';
import type { LessonScreenProps } from './props';

export type { LessonScreenProps };

export default function LessonScreenView(props: LessonScreenProps) {
  const { lesson, scr, game } = props;

  switch (scr.kind) {
    case 'recall':
      return <RecallScreen {...props} />;
    case 'motion':
      return <MotionScreen {...props} />;
    case 'brief':
      // Màn mở đầu "một màn" theo Figma: tự có tiêu đề, không bọc trong ShellB.
      return lesson.step_1?.brief ? <LessonBrief {...lesson.step_1.brief} /> : null;
    case 'context':
      return <ContextScreen {...props} />;
    case 'explain':
      return <ExplainScreen {...props} />;
    case 'memory':
      return <MemoryScreen {...props} />;
    case 'misconception':
      return <MisconceptionScreen {...props} />;
    case 'predict':
      return <PredictScreen {...props} />;
    case 'mcq':
      return <McqScreen {...props} />;
    case 'classify':
      return <ClassifyScreen {...props} />;
    case 'selfExplain':
      return <SelfExplainScreen {...props} />;
    case 'scaffold':
      return <ScaffoldScreen {...props} />;
    case 'trace':
      return <TraceScreen {...props} />;
    case 'counter':
      return <CounterScreen {...props} />;
    case 'game':
      return game ? <GameScreen {...props} game={game} /> : null;
    case 'sandbox':
      return <SandboxScreen {...props} />;
    case 'recap':
      return <RecapScreen {...props} />;
    default:
      return null;
  }
}
