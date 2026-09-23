/**
 * studio-lesson/v1 — shape of a Python Studio lesson stored in
 * `lessons.content_json` and produced by the admin import (Markdown/PDF).
 *
 * Every `step_N` is optional: a document rarely supplies all four. The renderer
 * drops the missing ones and renumbers what is left, so a lesson with only
 * theory + a quiz shows "Bước 1/2" rather than empty S3/S4 screens.
 *
 * `step_2.mcq` is NOT free to move: QuizzesService.collectQuestions() reads
 * `content_json.step_2.mcq` to build review quizzes (src/quizzes/quizzes.service.ts).
 */

export const STUDIO_LESSON_SCHEMA = 'studio-lesson/v1';

export type McqOption = string | { text: string; correct?: boolean; detail?: string };

export type Mcq = {
  question: string;
  options: McqOption[];
  /** Index of the correct option. The object form of `options` may set it instead. */
  correct?: number;
  explanation?: string;
};

export type PredictOption = {
  id: string;
  title: string;
  detail?: string;
  correct?: boolean;
};

export type MemoryModel = {
  heapAddr?: string;
  stack?: { label?: string; name: string; ptr?: string }[];
  heap?: {
    type?: string;
    refcount?: number;
    cells?: { value: string; id?: string; note?: string }[];
    note?: string;
  };
  assertion?: string;
  assertionResult?: string;
};

export type Step1 = {
  heading?: string;
  context?: { title?: string; body?: string };
  code?: { filename?: string; version?: string; source: string };
  predict?: { question: string; options: PredictOption[] };
  memory?: MemoryModel;
  explain?: { n?: number; title?: string; body: string }[];
  misconception?: { title?: string; body: string };
};

export type ClassifyBin = {
  key: string;
  title: string;
  subtitle?: string;
  desc?: string;
};

export type Step2 = {
  heading?: string;
  mcq?: Mcq[];
  classify?: {
    instruction?: string;
    bins: ClassifyBin[];
    tokens: { label: string; bin: string }[];
  };
  selfExplain?: {
    prompt: string;
    placeholder?: string;
    rubric?: { label: string; keywords: string[] }[];
  };
};

export type Step3 = {
  heading?: string;
  task?: { title?: string; body?: string; rule?: string };
  scaffold?: {
    /** Uses {{slot1}}, {{slot2}}… as placeholders. */
    template: string;
    slots: { n: number; placeholder?: string; answer: string }[];
    bank: { label: string; slot: number; trap?: string }[];
  };
  trace?: { input?: (number | string)[]; steps: { label?: string; text: string }[] };
  counter?: { question: string; options: string[]; correct: string };
};

export type LessonTest = { name: string; call: string; expect: string };

export type Step4 = {
  heading?: string;
  task?: { title?: string; body?: string; io?: { label: string; value: string }[] };
  starterCode?: string;
  solutionCode?: string;
  hints?: { title: string; body: string }[];
  /** Bài quy trình (dựng môi trường, Git, MySQL…): các bước phải tự làm trên
   *  máy. Không có mã Python để chạy nên Studio hiện khối này thay cho sandbox. */
  procedure?: string[];
  tests?: LessonTest[];
  /** Substrings that must not appear in the learner's code (anti-mutation guard). */
  forbid?: string[];
};

export type StudioLesson = {
  schema?: string;
  title?: string;
  subtitle?: string;
  source?: { kind?: string; filename?: string; parser?: string; importedAt?: string };
  step_1?: Step1;
  step_2?: Step2;
  step_3?: Step3;
  step_4?: Step4;
};

export type StepKey = 'step_1' | 'step_2' | 'step_3' | 'step_4';

export const STEP_KEYS: StepKey[] = ['step_1', 'step_2', 'step_3', 'step_4'];

/** Short label per original step, used for the S1-S4 progress bar. */
export const STEP_LABELS: Record<StepKey, string> = {
  step_1: 'Hiểu & Dự đoán',
  step_2: 'Bẫy ngộ nhận',
  step_3: 'Luyện có hỗ trợ',
  step_4: 'Sandbox IDE',
};

export type PresentStep = { key: StepKey; origin: number; label: string };

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/** Steps that actually carry data, in order, with their original S-number. */
export function presentSteps(lesson: StudioLesson): PresentStep[] {
  return STEP_KEYS.map((key, i) => ({ key, origin: i + 1, label: STEP_LABELS[key] }))
    .filter(({ key }) => hasContent(lesson[key]));
}

/** Resolve an mcq's correct index across both authoring shapes. */
export function correctIndex(q: Mcq): number {
  if (typeof q.correct === 'number') return q.correct;
  return q.options.findIndex((o) => typeof o === 'object' && o.correct === true);
}

export function optionText(o: McqOption): string {
  return typeof o === 'string' ? o : o.text;
}

export function optionDetail(o: McqOption): string | undefined {
  return typeof o === 'string' ? undefined : o.detail;
}

/** Diacritic-insensitive match so rubric keywords work on unaccented typing too. */
export function foldVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

/** How many rubric rows the learner's explanation covers. */
export function rubricScore(
  text: string,
  rubric: { label: string; keywords: string[] }[] = [],
): number {
  const folded = foldVietnamese(text);
  return rubric.filter((row) =>
    row.keywords.some((k) => folded.includes(foldVietnamese(k))),
  ).length;
}

/** Fill {{slotN}} placeholders with the learner's picks (or a visible stub). */
export function assembleScaffold(
  template: string,
  slots: { n: number; placeholder?: string }[],
  picks: Record<number, string>,
): string {
  return slots.reduce(
    (code, slot) =>
      code.replace(
        new RegExp(`\\{\\{\\s*slot${slot.n}\\s*\\}\\}`, 'g'),
        picks[slot.n] || slot.placeholder || `[Slot ${slot.n}]`,
      ),
    template,
  );
}

export type LessonDraft = {
  step: number;
  predict: string;
  mcq: Record<number, string>;
  bins: Record<string, string>;
  explanation: string;
  slots: Record<number, string>;
  counter: string;
  code: string;
  solutionUsed: boolean;
  /** Màn hình đã qua, theo `LessonScreen.key`. */
  done: Record<string, boolean>;
};

export function initialLessonDraft(lesson: StudioLesson): LessonDraft {
  return {
    step: 1,
    predict: '',
    mcq: {},
    bins: {},
    explanation: '',
    slots: {},
    counter: '',
    code: lesson.step_4?.starterCode ?? '',
    solutionUsed: false,
    done: {},
  };
}

// ---------------------------------------------------------------- màn hình
//
// LessonChrome đi TỪNG MÀN một (một thẻ, một nút CTA) chứ không gộp cả bước S
// vào một trang. Một bài studio-lesson vì vậy trải ra thành nhiều màn: S1 có
// thể cho 4 màn (ngữ cảnh, giải thích, ngộ nhận, dự đoán), S2 cho mỗi câu hỏi
// một màn… Thanh tiến độ trên đầu đếm theo số màn này.

export type ScreenKind =
  | 'context'
  | 'explain'
  | 'memory'
  | 'misconception'
  | 'predict'
  | 'mcq'
  | 'classify'
  | 'selfExplain'
  | 'scaffold'
  | 'trace'
  | 'counter'
  | 'sandbox'
  | 'recap';

export type LessonScreen = {
  /** Khoá ổn định (không đổi khi chèn thêm màn) — dùng lưu nháp và animation. */
  key: string;
  kind: ScreenKind;
  /** Bước gốc S1–S4, để hiện nhãn "S2 · Bẫy ngộ nhận". */
  origin: 1 | 2 | 3 | 4;
  label: string;
  /** Vị trí câu hỏi trong step_2.mcq. */
  index?: number;
};

const ORIGIN_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: STEP_LABELS.step_1,
  2: STEP_LABELS.step_2,
  3: STEP_LABELS.step_3,
  4: STEP_LABELS.step_4,
};

function screen(
  key: string,
  kind: ScreenKind,
  origin: 1 | 2 | 3 | 4,
  index?: number,
): LessonScreen {
  return { key, kind, origin, label: ORIGIN_LABEL[origin], index };
}

/** Trải nội dung bài thành danh sách màn hình, bỏ phần tài liệu không có. */
export function buildScreens(lesson: StudioLesson): LessonScreen[] {
  const out: LessonScreen[] = [];
  const one = lesson.step_1;
  if (one?.context?.body || one?.code?.source) out.push(screen('s1-context', 'context', 1));
  if (one?.explain?.length) out.push(screen('s1-explain', 'explain', 1));
  if (one?.memory) out.push(screen('s1-memory', 'memory', 1));
  if (one?.misconception?.body) out.push(screen('s1-misconception', 'misconception', 1));
  if ((one?.predict?.options?.length ?? 0) >= 2) out.push(screen('s1-predict', 'predict', 1));

  const two = lesson.step_2;
  (two?.mcq ?? []).forEach((q, i) => {
    if ((q.options?.length ?? 0) >= 2) out.push(screen(`s2-mcq-${i}`, 'mcq', 2, i));
  });
  if (two?.classify?.tokens?.length) out.push(screen('s2-classify', 'classify', 2));
  if (two?.selfExplain?.prompt) out.push(screen('s2-self', 'selfExplain', 2));

  const three = lesson.step_3;
  if (three?.scaffold?.slots?.length) out.push(screen('s3-scaffold', 'scaffold', 3));
  if (three?.trace?.steps?.length || (three?.task?.body && !three?.scaffold))
    out.push(screen('s3-trace', 'trace', 3));
  if (three?.counter?.options?.length) out.push(screen('s3-counter', 'counter', 3));

  const four = lesson.step_4;
  if (four?.task?.body || four?.starterCode || four?.tests?.length || four?.solutionCode)
    out.push(screen('s4-sandbox', 'sandbox', 4));

  if (out.length) out.push(screen('recap', 'recap', 4));
  return out;
}

/** Nhãn A, B, C… cho từng lựa chọn — Mcq hiển thị chính khoá này. */
export function letterKey(index: number): string {
  return String.fromCharCode(65 + index);
}

export function keyIndex(key: string): number {
  return key ? key.charCodeAt(0) - 65 : -1;
}

/** Ngưỡng tối thiểu cho ô tự giải thích khi bài không khai rubric từ khoá. */
export const SELF_EXPLAIN_MIN = { chars: 60, words: 12 };

/** Màn hình có chấm đúng/sai tại chỗ (nút CTA đổi thành "Kiểm tra"). */
export function isGraded(kind: ScreenKind): boolean {
  return (
    kind === 'predict' ||
    kind === 'mcq' ||
    kind === 'classify' ||
    kind === 'selfExplain' ||
    kind === 'scaffold' ||
    kind === 'counter'
  );
}

/** Chấm màn hình hiện tại. null = màn chỉ để đọc. Màn sandbox chấm bằng Pyodide. */
export function screenVerdict(
  lesson: StudioLesson,
  scr: LessonScreen,
  d: LessonDraft,
): { correct: boolean; explain?: string } | null {
  if (scr.kind === 'predict') {
    const options = lesson.step_1?.predict?.options ?? [];
    const chosen = options[keyIndex(d.predict)];
    const right = options.find((o) => o.correct);
    return {
      correct: Boolean(chosen?.correct),
      explain: chosen?.detail || right?.detail || right?.title,
    };
  }
  if (scr.kind === 'mcq') {
    const q = lesson.step_2?.mcq?.[scr.index ?? 0];
    if (!q) return null;
    const picked = keyIndex(d.mcq[scr.index ?? 0] ?? '');
    const answer = correctIndex(q);
    return {
      correct: picked === answer,
      explain:
        (Number.isInteger(picked) ? optionDetail(q.options[picked]) : undefined) ||
        q.explanation ||
        optionDetail(q.options[answer]),
    };
  }
  if (scr.kind === 'classify') {
    const tokens = lesson.step_2?.classify?.tokens ?? [];
    const wrong = tokens.filter((t) => d.bins[t.label] !== t.bin);
    return {
      correct: tokens.length > 0 && wrong.length === 0,
      explain: wrong.length
        ? `Còn ${wrong.length}/${tokens.length} thẻ chưa đúng nhóm.`
        : `Đúng cả ${tokens.length} thẻ.`,
    };
  }
  if (scr.kind === 'selfExplain') {
    // Rubric của ngân hàng PE là thang 0–2 cho NGƯỜI chấm đọc, không phải từ
    // khoá máy dò. Bài nào không khai keywords thì không tự chấm đúng/sai được
    // — nhưng vẫn phải chặn kiểu gõ một chữ cho qua, nên yêu cầu tối thiểu một
    // câu có nghĩa (SELF_EXPLAIN_MIN).
    const rubric = lesson.step_2?.selfExplain?.rubric ?? [];
    const text = d.explanation.trim();
    if (rubric.length) {
      const got = rubricScore(text, rubric);
      return {
        correct: got >= rubric.length,
        explain: `Đạt ${got}/${rubric.length} ý của rubric.`,
      };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const enough = text.length >= SELF_EXPLAIN_MIN.chars && words >= SELF_EXPLAIN_MIN.words;
    return {
      correct: enough,
      explain: enough
        ? 'Lời giải thích đã được ghi lại cho người chấm.'
        : `Viết thành câu giải thích cơ chế (ít nhất ${SELF_EXPLAIN_MIN.words} từ), đừng gõ cho có.`,
    };
  }
  if (scr.kind === 'scaffold') {
    const slots = lesson.step_3?.scaffold?.slots ?? [];
    const wrong = slots.find((slot) => d.slots[slot.n] !== slot.answer);
    return {
      correct: slots.length > 0 && !wrong,
      explain: wrong ? `Slot ${wrong.n} chưa đúng.` : 'Khung mã đã khớp lời giải.',
    };
  }
  if (scr.kind === 'counter') {
    const counter = lesson.step_3?.counter;
    if (!counter) return null;
    return {
      correct: counter.options[keyIndex(d.counter)] === counter.correct,
      explain: `Đáp án đúng: ${counter.correct}.`,
    };
  }
  return null;
}
