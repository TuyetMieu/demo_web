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

/**
 * studio-lesson/v2 = v1 + khối `play` (khoá Python Advanced): danh sách
 * mini-game sinh bởi scripts/pe-v3/build_advanced.py. Có `play` thì
 * buildScreens() dựng luồng ngắn theo game thay cho luồng S1–S4 đầy đủ; mọi
 * trường v1 vẫn giữ (step_2.mcq còn phục vụ quiz ôn tập).
 */
export const STUDIO_LESSON_SCHEMA_V2 = 'studio-lesson/v2';

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

/** Màn mở đầu "một màn" (Figma PE Python v3): tóm cả bài trên một trang. */
export type LessonBriefData = {
  /** ["M1", "BÀI TẬP CƠ BẢN", "B01"] */
  eyebrow: string[];
  title: string;
  goal?: string;
  task: string;
  predict?: string;
  /** Khung code rút gọn hiện trong main.py (không phải code khởi tạo thật). */
  code?: string;
  /** Hai ca công khai, dạng "Mặc định → Python ↵ 1991". */
  tests?: string[];
  reflect?: string;
};

export type Step1 = {
  heading?: string;
  /** Có thì màn đầu của bài là LessonBrief thay cho thẻ "Ngữ cảnh". */
  brief?: LessonBriefData;
  context?: {
    title?: string;
    body?: string;
    /** Ví dụ vào/ra của đề, hiện ngay dưới đề. */
    example?: string;
    /** "Học trước", mức độ và file cấp sẵn — hiện thành dải nhãn nhỏ. */
    prereq?: string;
    level?: string;
    files?: string[];
  };
  /** kind 'demo' = ví dụ minh hoạ khác dữ liệu đề: chỉ dùng ở màn giải thích. */
  code?: { filename?: string; version?: string; source: string; kind?: 'demo' | 'lesson' };
  /** `code` riêng của câu dự đoán; bỏ trống thì dùng step_1.code (trừ khi là demo). */
  predict?: { question: string; options: PredictOption[]; code?: string };
  memory?: MemoryModel;
  explain?: { n?: number; title?: string; body: string }[];
  misconception?: { title?: string; body: string; code?: string };
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
    /** Lời giải thích mẫu (mức 2/2) — chỉ hiện SAU khi học viên đã viết của mình. */
    sample?: string;
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

/** File đặt sẵn trong thư mục chạy bài: module cấp sẵn (import được) hoặc dữ liệu (data.txt…). */
export type LessonFile = { name: string; content: string; kind?: 'module' | 'data' };

/** "Hợp đồng" của một hàm/method: nhận gì, trả gì, tác dụng phụ — đúng mẫu thẻ hàm của PE v3. */
export type LessonContract = {
  sig: string;
  does?: string;
  takes?: string;
  gives?: string;
  effect?: string;
  call?: string;
};

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
  /** Ghi vào thư mục chạy trước mỗi lần chạy; bộ chấm cho phép thay theo từng ca. */
  files?: LessonFile[];
  contracts?: LessonContract[];
  /** Cửa tự kiểm tra (B20, I07, I12, N04, N08): lời giải chỉ mở sau lần nộp đầu. */
  gate?: boolean;
  /** Ghi chú môi trường (thread/fork chạy bản mô phỏng trong trình duyệt). */
  env?: string;
};

export type TraceTableGame = {
  type: 'traceTable';
  code: string;
  columns: string[];
  /** null = ô học viên phải điền. */
  rows: { step: string; values: Record<string, string | null> }[];
  /** Khoá `${rowIndex}-${column}` → giá trị đúng (repr Python). */
  answers: Record<string, string>;
};
export type MatchGame = {
  type: 'match';
  pairs: { left: string; right: string }[];
  /** Thứ tự hiện cột phải (chỉ số trong pairs), trộn sẵn lúc build. */
  rightOrder: number[];
};
export type TrueFalseGame = {
  type: 'trueFalse';
  /** Câu hỏi chung cho mọi phát biểu (vd đề trắc nghiệm ở trận Boss). */
  prompt?: string;
  items: { statement: string; answer: boolean; explain?: string }[];
};
/** Dùng nguyên step_3.scaffold, chỉ thêm phản hồi theo bẫy của từng thẻ. */
export type FillGame = { type: 'fill' };
export type ParsonsGame = {
  type: 'parsons';
  /** Phần đầu/cuối lời giải giữ cố định, chỉ xếp lại các dòng ở giữa. */
  head: string;
  tail: string;
  /** Đúng thứ tự của lời giải. */
  lines: { id: string; text: string }[];
  /** Dòng nhiễu lấy từ biến thể sai — bấm vào là bị chặn và hiện lý do. */
  distractors: { id: string; text: string; reason: string }[];
  /** Thứ tự hiện trong kho (đã trộn cả dòng nhiễu). */
  order: string[];
};
export type SpotErrorGame = {
  type: 'spotError';
  code: string;
  /** Số dòng của dòng đầu tiên trong `code` (đoạn trích từ chương trình dài). */
  firstLine: number;
  line: number;
  /** Mọi dòng thuộc khối lỗi — chọn dòng nào trong đó cũng tính đúng. */
  lines?: number[];
  label: string;
  fix?: string;
};
export type DebugGame = { type: 'debug'; code: string; label: string };
export type SelfExplainGame = { type: 'selfExplain' };

export type PlayGame = { id: string; title: string } & (
  | TraceTableGame
  | MatchGame
  | TrueFalseGame
  | FillGame
  | ParsonsGame
  | SpotErrorGame
  | DebugGame
  | SelfExplainGame
);

export type Play = {
  level: 'B' | 'I' | 'N';
  /** Cửa tự kiểm tra: chỉ game + sandbox, không gợi ý. */
  boss?: boolean;
  games: PlayGame[];
  selfExplainMinWords?: number;
};

export type StudioLesson = {
  schema?: string;
  play?: Play;
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
  /** Đã bấm "Nộp & Chấm điểm" ít nhất một lần — mở khoá lời giải ở cửa tự kiểm tra. */
  submitted?: boolean;
  /** Đã mở gợi ý hoặc lời giải: lượt này được ghi nhận là "có hỗ trợ". */
  assisted?: boolean;
  /** Trạng thái từng mini-game (studio-lesson/v2), theo PlayGame.id. */
  games?: Record<string, GameState>;
  /** Điểm trong bài: lần chấm đầu đúng +10 (combo từ 3 trở lên thì 20), sửa rồi đúng +5. */
  score?: LessonScore;
};

export type GameState = {
  /** match: chỉ số trái → chỉ số phải đã nối ĐÚNG. */
  matched?: Record<number, number>;
  pending?: number | null;
  misses?: number;
  /** trueFalse: chỉ số câu → lựa chọn. */
  tf?: Record<number, 'true' | 'false'>;
  /** traceTable: `${row}-${col}` → giá trị học viên gõ. */
  cells?: Record<string, string>;
  /** parsons: id các dòng đã xếp, theo thứ tự. */
  picked?: string[];
  /** parsons: dòng nhiễu đã bấm nhầm (hiện lý do). */
  revealed?: string[];
  /** spotError: dòng đang chọn. */
  line?: number | null;
  /** debug: code đang sửa. */
  code?: string;
};

export type LessonScore = {
  points: number;
  combo: number;
  bestCombo: number;
  /** Số lần đã bấm "Kiểm tra" ở từng màn. */
  attempts: Record<string, number>;
  /** Màn đúng ngay lần chấm đầu (true) hay sai lần đầu (false). */
  firstTry: Record<string, boolean>;
};

export const EMPTY_SCORE: LessonScore = {
  points: 0,
  combo: 0,
  bestCombo: 0,
  attempts: {},
  firstTry: {},
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
    submitted: false,
    assisted: false,
    games: {},
    score: EMPTY_SCORE,
  };
}

// ---------------------------------------------------------------- màn hình
//
// LessonChrome đi TỪNG MÀN một (một thẻ, một nút CTA) chứ không gộp cả bước S
// vào một trang. Một bài studio-lesson vì vậy trải ra thành nhiều màn: S1 có
// thể cho 4 màn (ngữ cảnh, giải thích, ngộ nhận, dự đoán), S2 cho mỗi câu hỏi
// một màn… Thanh tiến độ trên đầu đếm theo số màn này.

export type ScreenKind =
  /** Nhắc lại bài trước bằng hoạt hình — màn đầu tiên của bài (src/lib/lesson-motion.ts). */
  | 'recall'
  | 'brief'
  | 'context'
  /** Ví dụ minh hoạ chạy từng bước (hoạt hình sinh từ code ví dụ), đặt trước 'explain'. */
  | 'motion'
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
  | 'recap'
  /** Một mini-game của studio-lesson/v2 (xem `gameId`). */
  | 'game';

export type LessonScreen = {
  /** Khoá ổn định (không đổi khi chèn thêm màn) — dùng lưu nháp và animation. */
  key: string;
  kind: ScreenKind;
  /** Bước gốc S1–S4, để hiện nhãn "S2 · Bẫy ngộ nhận". */
  origin: 1 | 2 | 3 | 4;
  label: string;
  /** Vị trí câu hỏi trong step_2.mcq. */
  index?: number;
  /** PlayGame.id khi kind = 'game'. */
  gameId?: string;
  gameType?: PlayGame['type'];
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

/**
 * Luồng ngắn của bài có `play` (khoá Python Advanced):
 *   brief → giải thích (+ ngộ nhận) → dự đoán → các mini-game → sandbox → tổng kết.
 * Boss bỏ giải thích/dự đoán: chỉ game và sandbox.
 */
function buildPlayScreens(lesson: StudioLesson, play: Play, extras: ScreenExtras): LessonScreen[] {
  const out: LessonScreen[] = [];
  const one = lesson.step_1;
  if (extras.recall) out.push(screen('s0-recall', 'recall', 1));
  if (one?.brief?.task) out.push(screen('s1-brief', 'brief', 1));
  else if (one?.context?.body) out.push(screen('s1-context', 'context', 1));
  if (!play.boss) {
    if (extras.motion && one?.explain?.length) out.push(screen('s1-motion', 'motion', 1));
    if (one?.explain?.length) out.push(screen('s1-explain', 'explain', 1));
    if ((one?.predict?.options?.length ?? 0) >= 2) out.push(screen('s1-predict', 'predict', 1));
  }
  for (const game of play.games) {
    if (game.type === 'fill' && !lesson.step_3?.scaffold?.slots?.length) continue;
    if (game.type === 'selfExplain' && !lesson.step_2?.selfExplain?.prompt) continue;
    out.push({ ...screen(`g-${game.id}`, 'game', game.type === 'debug' ? 4 : 3), gameId: game.id, gameType: game.type });
  }
  const four = lesson.step_4;
  if (four?.task?.body || four?.starterCode || four?.tests?.length || four?.solutionCode)
    out.push(screen('s4-sandbox', 'sandbox', 4));
  if (out.length) out.push(screen('recap', 'recap', 4));
  return out;
}

export function gameOf(lesson: StudioLesson, scr: LessonScreen | undefined): PlayGame | undefined {
  if (!scr || scr.kind !== 'game') return undefined;
  return lesson.play?.games.find((g) => g.id === scr.gameId);
}

/**
 * Màn thêm vào từ dữ liệu NGOÀI content_json (public/static/motion/*.json, xem
 * scripts/pe-v3/motion.py). Mặc định tắt: ai gọi buildScreens(lesson) như cũ vẫn ra đúng luồng cũ.
 */
export type ScreenExtras = {
  /** Có hoạt hình cho ví dụ minh hoạ của bài này. */
  motion?: boolean;
  /** Có bài trước để nhắc lại. */
  recall?: boolean;
};

/** Trải nội dung bài thành danh sách màn hình, bỏ phần tài liệu không có. */
export function buildScreens(lesson: StudioLesson, extras: ScreenExtras = {}): LessonScreen[] {
  if (lesson.play?.games?.length) return buildPlayScreens(lesson, lesson.play, extras);
  const out: LessonScreen[] = [];
  const one = lesson.step_1;
  if (extras.recall) out.push(screen('s0-recall', 'recall', 1));
  if (one?.brief?.task) out.push(screen('s1-brief', 'brief', 1));
  else if (one?.context?.body || one?.code?.source) out.push(screen('s1-context', 'context', 1));
  if (extras.motion && one?.explain?.length) out.push(screen('s1-motion', 'motion', 1));
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
    kind === 'counter' ||
    kind === 'game'
  );
}

/** Game chấm bằng CHẠY code trong Pyodide (bất đồng bộ) thay vì so đáp án. */
export function isRunnableGame(game: PlayGame | undefined): boolean {
  return game?.type === 'parsons' || game?.type === 'debug';
}

/** Ghép chương trình từ các dòng đã xếp — khớp scripts/pe-v3/check-advanced.mjs. */
export function parsonsCode(game: ParsonsGame, ids: string[]): string {
  const byId = new Map(game.lines.map((l) => [l.id, l.text]));
  const body = ids.map((id) => byId.get(id) ?? '').join('\n');
  return [game.head, body, game.tail].filter((part) => part !== '').join('\n') + '\n';
}

/** So giá trị bảng theo dõi biến: bỏ nháy, khoảng trắng; True/true như nhau. */
export function sameTraceValue(typed: string, expected: string): boolean {
  const norm = (v: string) =>
    v
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  return norm(typed) === norm(expected);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Đã có câu trả lời đủ để bấm "Kiểm tra" chưa. */
export function gameAnswered(lesson: StudioLesson, game: PlayGame, d: LessonDraft): boolean {
  const st = d.games?.[game.id] ?? {};
  switch (game.type) {
    case 'traceTable':
      return Object.keys(game.answers).every((k) => (st.cells?.[k] ?? '').trim() !== '');
    case 'match':
      return Object.keys(st.matched ?? {}).length === game.pairs.length;
    case 'trueFalse':
      return game.items.every((_, i) => Boolean(st.tf?.[i]));
    case 'fill':
      return (lesson.step_3?.scaffold?.slots ?? []).every((slot) => d.slots[slot.n]);
    case 'parsons':
      return (st.picked?.length ?? 0) === game.lines.length;
    case 'spotError':
      return st.line != null;
    case 'debug':
      return true;
    case 'selfExplain':
      return d.explanation.trim().length > 0;
  }
}

/** Chấm game đồng bộ. Game chạy code (parsons/debug) trả null — chấm qua Pyodide. */
export function gameVerdict(
  lesson: StudioLesson,
  game: PlayGame,
  d: LessonDraft,
): { correct: boolean; explain?: string } | null {
  const st = d.games?.[game.id] ?? {};
  switch (game.type) {
    case 'traceTable': {
      const wrong = Object.entries(game.answers).filter(
        ([k, v]) => !sameTraceValue(st.cells?.[k] ?? '', v),
      );
      return {
        correct: wrong.length === 0,
        explain: wrong.length
          ? `Còn ${wrong.length} ô chưa đúng. Đọc lại dòng lệnh ở cột "Bước": biến nào vừa đổi, đổi thành gì?`
          : 'Bạn đã chạy chương trình trong đầu đúng như Python.',
      };
    }
    case 'match':
      return {
        // Nối sai bị chặn ngay tại chỗ nên đủ cặp là đúng; số lần nhầm chỉ
        // ảnh hưởng điểm (StudioLesson tính như "sửa rồi đúng").
        correct: true,
        explain: st.misses
          ? `Nối đủ ${game.pairs.length} cặp sau ${st.misses} lần nhầm.`
          : `Nối đúng cả ${game.pairs.length} cặp, không nhầm lần nào.`,
      };
    case 'trueFalse': {
      const wrong = game.items.filter((it, i) => (st.tf?.[i] === 'true') !== it.answer);
      return {
        correct: wrong.length === 0,
        explain: wrong.length
          ? wrong
              .map((it) => `"${it.statement}" là ${it.answer ? 'ĐÚNG' : 'SAI'}. ${it.explain ?? ''}`)
              .join('\n\n')
          : game.items.find((it) => !it.answer)?.explain,
      };
    }
    case 'fill': {
      const scaffold = lesson.step_3?.scaffold;
      const slots = scaffold?.slots ?? [];
      const wrong = slots.find((slot) => d.slots[slot.n] !== slot.answer);
      if (!wrong) return { correct: slots.length > 0, explain: 'Khung mã đã khớp lời giải.' };
      const trap = scaffold?.bank.find((b) => b.label === d.slots[wrong.n])?.trap;
      return {
        correct: false,
        explain: trap
          ? `Ô ${wrong.n}: ${d.slots[wrong.n]} — ${trap}`
          : `Ô ${wrong.n} chưa đúng — thẻ này không làm đúng việc ô cần.`,
      };
    }
    case 'spotError': {
      const hits = game.lines?.length ? game.lines : [game.line];
      const ok = st.line != null && hits.includes(st.line);
      return {
        correct: ok,
        explain: ok
          ? `Chuẩn: ${game.label}.${game.fix ? ` Sửa đúng là: ${game.fix.trim()}` : ''}`
          : 'Dòng này vẫn đúng. Hỏi: dòng nào làm kết quả khác với đề bài yêu cầu?',
      };
    }
    case 'selfExplain': {
      const min = lesson.play?.selfExplainMinWords ?? SELF_EXPLAIN_MIN.words;
      const enough = wordCount(d.explanation) >= min;
      const sample = lesson.step_2?.selfExplain?.sample;
      return {
        correct: enough,
        explain: enough
          ? sample
            ? `So với lời giải thích mẫu: ${sample}`
            : 'Đã ghi lại lời giải thích của bạn.'
          : `Viết thành một câu, ít nhất ${min} từ.`,
      };
    }
    default:
      return null;
  }
}

/**
 * Cộng điểm cho một lần bấm "Kiểm tra". Đúng ngay lần đầu: +10, chuỗi đúng
 * liên tiếp từ 3 trở lên: +20. Sai rồi sửa đúng: +5 và mất chuỗi. Đúng lần nữa
 * ở màn đã đúng (xem lại bài) không cộng thêm.
 */
export function scoreCheck(
  prev: LessonScore,
  key: string,
  correct: boolean,
): { score: LessonScore; gained: number } {
  const attempts = (prev.attempts[key] ?? 0) + 1;
  const first = attempts === 1;
  const base = { ...prev, attempts: { ...prev.attempts, [key]: attempts } };
  if (!correct)
    return {
      score: {
        ...base,
        combo: 0,
        firstTry: first ? { ...prev.firstTry, [key]: false } : prev.firstTry,
      },
      gained: 0,
    };
  if (prev.firstTry[key] === true) return { score: base, gained: 0 };
  const combo = first ? prev.combo + 1 : 0;
  const gained = first ? (combo >= 3 ? 20 : 10) : 5;
  return {
    score: {
      ...base,
      points: prev.points + gained,
      combo,
      bestCombo: Math.max(prev.bestCombo, combo),
      firstTry: { ...prev.firstTry, [key]: first },
    },
    gained,
  };
}

/** Điểm 0–100 gửi về backend: tỉ lệ màn đúng ngay lần đầu, bị chặn trần khi dùng gợi ý. */
export function quizPercent(screens: LessonScreen[], d: LessonDraft, boss: boolean): number {
  const graded = screens.filter((x) => isGraded(x.kind));
  if (!graded.length) return 100;
  const first = graded.filter((x) => d.score?.firstTry[x.key] === true).length;
  let pct = Math.round((first / graded.length) * 100);
  if (d.assisted) pct = Math.min(pct, boss ? 60 : 80);
  return Math.max(0, Math.min(100, pct));
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
    const sample = lesson.step_2?.selfExplain?.sample;
    return {
      correct: enough,
      explain: enough
        ? sample
          ? `Đối chiếu với lời giải thích mẫu (mức 2/2): ${sample}`
          : 'Lời giải thích đã được ghi lại cho người chấm.'
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
  if (scr.kind === 'game') {
    const game = gameOf(lesson, scr);
    return game ? gameVerdict(lesson, game, d) : null;
  }
  return null;
}
