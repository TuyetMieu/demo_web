// Bảng đáp án cho tài khoản admin.
//
// Tách khỏi StudioLesson.tsx vì nó là hàm thuần dài ~170 dòng và chỉ phục vụ
// một việc: cho người biên soạn đối chiếu nội dung màn đang mở, kèm phần
// `fill` để điền sẵn bản nháp mà đi nhanh qua bài khi kiểm tra 40 bài.
//
// Không có bí mật nào bị lộ thêm ở đây: bài vốn chấm ở TRÌNH DUYỆT nên cả
// `content_json` (gồm đáp án) đã được gửi cho mọi học viên — xem AGENTS.md.
import {
  correctIndex,
  letterKey,
  optionText,
  parsonsCode,
  SELF_EXPLAIN_MIN,
  type GameState,
  type LessonDraft,
  type LessonScreen,
  type PlayGame,
  type StudioLesson as Lesson,
} from '@/lib/studio-lesson';

export type AnswerKeyContext = {
  lesson: Lesson | null;
  scr?: LessonScreen;
  game?: PlayGame;
  draft: LessonDraft;
};

export type AnswerKey = {
  rows: { label: string; value: string }[];
  code?: string;
  fill?: Partial<LessonDraft>;
};

/** Đáp án của màn đang mở, chỉ dựng cho tài khoản admin. `fill` là phần bản
 *  nháp điền sẵn đáp án để admin đi nhanh qua bài khi kiểm tra nội dung.
 *  Bài vốn chấm ở trình duyệt (content_json gửi nguyên cho học viên) nên
 *  bảng này không lộ thêm dữ liệu nào. */
export function answerKeyFor({ lesson, scr, game, draft }: AnswerKeyContext): {
  rows: { label: string; value: string }[];
  code?: string;
  fill?: Partial<LessonDraft>;
} | null {
  if (!lesson || !scr) return null;
  const tests = lesson.step_4?.tests ?? [];
  if (scr.kind === 'predict') {
    const options = lesson.step_1?.predict?.options ?? [];
    const i = options.findIndex((o) => o.correct);
    if (i < 0) return null;
    return {
      rows: [{ label: 'Đáp án', value: `${letterKey(i)}. ${options[i].title}` }],
      fill: { predict: letterKey(i) },
    };
  }
  if (scr.kind === 'mcq') {
    const at = scr.index ?? 0;
    const q = lesson.step_2?.mcq?.[at];
    const i = q ? correctIndex(q) : -1;
    if (!q || i < 0) return null;
    return {
      rows: [{ label: 'Đáp án', value: `${letterKey(i)}. ${optionText(q.options[i])}` }],
      fill: { mcq: { ...draft.mcq, [at]: letterKey(i) } },
    };
  }
  if (scr.kind === 'classify') {
    const classify = lesson.step_2?.classify;
    if (!classify) return null;
    return {
      rows: classify.bins.map((bin) => ({
        label: bin.title,
        value:
          classify.tokens
            .filter((t) => t.bin === bin.key)
            .map((t) => t.label)
            .join(', ') || '—',
      })),
      fill: { bins: Object.fromEntries(classify.tokens.map((t) => [t.label, t.bin])) },
    };
  }
  if (scr.kind === 'selfExplain') {
    const selfExplain = lesson.step_2?.selfExplain;
    const rubric = selfExplain?.rubric ?? [];
    if (!rubric.length) {
      // Bài v3 có lời giải thích mẫu (mức 2/2). Bài v2 thì không: placeholder
      // chính là mô tả mức điểm tối đa của ngân hàng đề, dùng tạm để đối chiếu.
      const sample = selfExplain?.sample
        ? selfExplain.sample
        : selfExplain?.placeholder
          ? `Bài mẫu (admin điền sẵn): ${selfExplain.placeholder}`
          : '';
      const passes =
        sample.length >= SELF_EXPLAIN_MIN.chars &&
        sample.split(/\s+/).filter(Boolean).length >= SELF_EXPLAIN_MIN.words;
      return {
        rows: [
          ...(selfExplain?.sample ? [{ label: 'Lời giải thích mẫu', value: selfExplain.sample }] : []),
          ...(selfExplain?.placeholder && !selfExplain?.sample
            ? [{ label: 'Tiêu chí đạt điểm tối đa', value: selfExplain.placeholder }]
            : []),
          {
            label: 'Cách chấm',
            value: `Không có rubric từ khoá — chỉ yêu cầu tối thiểu ${SELF_EXPLAIN_MIN.words} từ / ${SELF_EXPLAIN_MIN.chars} ký tự.`,
          },
        ],
        fill: passes ? { explanation: sample } : undefined,
      };
    }
    return {
      rows: rubric.map((r) => ({ label: r.label, value: r.keywords.join(' / ') })),
      fill: { explanation: rubric.map((r) => r.keywords[0]).filter(Boolean).join('; ') },
    };
  }
  if (scr.kind === 'scaffold') {
    const slots = lesson.step_3?.scaffold?.slots ?? [];
    return {
      rows: slots.map((slot) => ({ label: `Slot ${slot.n}`, value: slot.answer })),
      fill: { slots: Object.fromEntries(slots.map((slot) => [slot.n, slot.answer])) },
    };
  }
  if (scr.kind === 'counter') {
    const counter = lesson.step_3?.counter;
    const i = counter ? counter.options.indexOf(counter.correct) : -1;
    if (!counter || i < 0) return null;
    return {
      rows: [{ label: 'Đáp án', value: `${letterKey(i)}. ${counter.correct}` }],
      fill: { counter: letterKey(i) },
    };
  }
  if (scr.kind === 'game' && game) {
    const fillGame = (state: GameState) => ({ games: { ...draft.games, [game.id]: state } });
    switch (game.type) {
      case 'traceTable':
        return {
          rows: Object.entries(game.answers).map(([k, v]) => {
            const [row, col] = k.split('-');
            return { label: `${game.rows[Number(row)]?.step} · ${col}`, value: v };
          }),
          fill: fillGame({ cells: { ...game.answers } }),
        };
      case 'match':
        return {
          rows: game.pairs.map((p) => ({ label: p.left, value: p.right })),
          fill: fillGame({ matched: Object.fromEntries(game.pairs.map((_, i) => [i, i])) }),
        };
      case 'trueFalse':
        return {
          rows: game.items.map((it) => ({ label: it.answer ? 'ĐÚNG' : 'SAI', value: it.statement })),
          fill: fillGame({
            tf: Object.fromEntries(game.items.map((it, i) => [i, it.answer ? 'true' : 'false'])),
          }),
        };
      case 'fill': {
        const slots = lesson.step_3?.scaffold?.slots ?? [];
        return {
          rows: slots.map((slot) => ({ label: `Ô ${slot.n}`, value: slot.answer })),
          fill: { slots: Object.fromEntries(slots.map((slot) => [slot.n, slot.answer])) },
        };
      }
      case 'parsons':
        return {
          rows: [],
          code: parsonsCode(game, game.lines.map((l) => l.id)),
          fill: fillGame({ picked: game.lines.map((l) => l.id) }),
        };
      case 'spotError':
        return {
          rows: [
            { label: 'Dòng lỗi', value: String(game.line) },
            { label: 'Lỗi', value: game.label },
          ],
          fill: fillGame({ line: game.line }),
        };
      case 'debug':
        return {
          rows: [{ label: 'Lỗi cần sửa', value: game.label }],
          code: lesson.step_4?.solutionCode,
          fill: lesson.step_4?.solutionCode
            ? fillGame({ code: lesson.step_4.solutionCode })
            : undefined,
        };
      case 'selfExplain': {
        const sample = lesson.step_2?.selfExplain?.sample ?? '';
        return {
          rows: sample ? [{ label: 'Lời giải thích mẫu', value: sample }] : [],
          fill: sample ? { explanation: sample } : undefined,
        };
      }
    }
  }
  if (scr.kind === 'sandbox') {
    const solution = lesson.step_4?.solutionCode;
    if (!solution && !tests.length) return null;
    return {
      // Ca kiểm tra stdout của bài PE là cả một chuỗi exec(...) — in ra chỉ
      // gây rối, lời giải mẫu bên dưới đã đủ để đối chiếu.
      rows: tests
        .filter((t) => t.call.length <= 120 && !t.call.includes('exec('))
        .map((t) => ({ label: t.name || 'Ca kiểm thử', value: `${t.call} → ${t.expect}` })),
      code: solution,
      fill: solution ? { code: solution } : undefined,
    };
  }
  return null;
}

