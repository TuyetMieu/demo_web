'use client';

// Màn cuối · Tổng kết: XP, thống kê và nút đi tiếp. Hai bản khác nhau: khoá có
// mini-game đếm điểm/combo/"đúng ngay lần đầu", khoá thường đếm câu đúng và ca
// kiểm thử đạt.
import Recap from '@/components/lesson-chrome/exercises/Recap';
import { EMPTY_SCORE, isGraded } from '@/lib/studio-lesson';

import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  | 'lesson'
  | 'screens'
  | 'draft'
  | 'completed'
  | 'xpGained'
  | 'xpReward'
  | 'result'
  | 'onFinish'
>;

export default function RecapScreen({
  lesson,
  screens,
  draft,
  completed,
  xpGained,
  xpReward,
  result,
  onFinish,
}: Props) {
  const tests = lesson.step_4?.tests ?? [];
  const gate = Boolean(lesson.step_4?.gate);
  const play = lesson.play;
  const boss = Boolean(play?.boss);
  const score = draft.score ?? EMPTY_SCORE;
  const graded = screens.filter((x) => isGraded(x.kind));
  const done = graded.filter((x) => draft.done[x.key]).length;
  const firstTry = graded.filter((x) => score.firstTry[x.key] === true).length;

  if (play) {
    const xpText =
      completed && xpGained !== null
        ? `+${xpGained} XP`
        : completed
          ? `+${xpReward} XP`
          : `${xpReward} XP`;
    return (
      <Recap
        xpLabel={xpText}
        title={
          completed ? (boss ? '⚔️ Đã hạ Boss của chặng!' : 'Đã hoàn thành bài học!') : 'Tổng kết bài học'
        }
        description={
          (completed
            ? boss
              ? 'Chặng tiếp theo đã mở khoá. '
              : 'Tiến độ và XP đã được lưu. '
            : tests.length
              ? 'Nộp bài ở màn sandbox để ghi nhận hoàn thành. '
              : 'Xác nhận khi bạn đã làm xong. ') +
          `XP nhận được tính theo số game bạn làm đúng ngay lần đầu (${firstTry}/${graded.length}).` +
          (draft.assisted ? ' Lượt này có dùng gợi ý/lời giải nên điểm bị giới hạn.' : '')
        }
        stats={[
          { icon: '⭐', value: String(score.points), label: 'Điểm trong bài' },
          { icon: '🔥', value: `x${score.bestCombo}`, label: 'Combo cao nhất' },
          { icon: '🎯', value: `${firstTry}/${graded.length || 0}`, label: 'Đúng ngay lần đầu' },
        ]}
        facts={[
          ...(lesson.step_1?.explain ?? []).map((row) => row.body),
          lesson.step_1?.misconception?.body
            ? `Tránh ngộ nhận: ${lesson.step_1.misconception.body}`
            : undefined,
        ]
          .filter((x): x is string => Boolean(x))
          .slice(0, 3)}
        onFinish={onFinish}
      />
    );
  }

  return (
    <Recap
      xpLabel={completed ? `+${xpReward} XP` : `${xpReward} XP`}
      title={completed ? 'Đã hoàn thành bài học!' : 'Tổng kết bài học'}
      description={
        (completed
          ? 'Tiến độ và XP đã được lưu. Bạn có thể quay lại luyện tập bất cứ lúc nào.'
          : tests.length
            ? 'Bài này chấm tự động — nộp bài ở màn sandbox để ghi nhận hoàn thành.'
            : 'Bài này thực hành trên máy lab nên không có ca chấm tự động. Xác nhận khi bạn đã làm xong.') +
        (draft.assisted
          ? gate
            ? ' Lượt này có dùng gợi ý/lời giải: cửa tự kiểm tra tính là "có hỗ trợ" — hãy tự làm lại với dữ liệu mới.'
            : ' Lượt này có dùng gợi ý/lời giải — thử làm lại không mở gợi ý để chắc kiến thức.'
          : '')
      }
      stats={[
        { icon: '🎯', value: `${done}/${graded.length || 0}`, label: 'Câu đã làm đúng' },
        {
          icon: '🧪',
          // Kết quả chạy không lưu qua lần tải trang; bài có test chỉ hoàn thành
          // được qua lượt nộp đạt hết ca, nên đã hoàn thành = đạt đủ.
          value: `${result ? result.tests.filter((t) => t.passed).length : completed ? tests.length : 0}/${tests.length}`,
          label: 'Ca kiểm thử đạt',
        },
        { icon: '📚', value: `${screens.length - 1}`, label: 'Màn đã học' },
      ]}
      facts={[
        lesson.step_1?.context?.body,
        ...(lesson.step_1?.explain ?? []).map((row) => row.body),
        lesson.step_1?.misconception?.body
          ? `Tránh ngộ nhận: ${lesson.step_1.misconception.body}`
          : undefined,
      ]
        .filter((x): x is string => Boolean(x))
        .slice(0, 4)}
      onFinish={onFinish}
    />
  );
}
