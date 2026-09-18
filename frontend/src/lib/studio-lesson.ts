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
  predicted: boolean;
  mcq: Record<number, string>;
  mcqDone: boolean;
  bins: Record<string, string>;
  classified: boolean;
  explanation: string;
  explained: boolean;
  slots: Record<number, string>;
  traced: boolean;
  counter: string;
  code: string;
  solutionUsed: boolean;
};

export function initialLessonDraft(lesson: StudioLesson): LessonDraft {
  return {
    step: 1,
    predict: '',
    predicted: false,
    mcq: {},
    mcqDone: false,
    bins: {},
    classified: false,
    explanation: '',
    explained: false,
    slots: {},
    traced: false,
    counter: '',
    code: lesson.step_4?.starterCode ?? '',
    solutionUsed: false,
  };
}

/** Whether the learner may leave the step they are on. */
export function canLeaveStep(
  lesson: StudioLesson,
  steps: PresentStep[],
  d: LessonDraft,
): boolean {
  const current = steps[d.step - 1];
  if (!current) return false;
  if (current.key === 'step_1') return !lesson.step_1?.predict || d.predicted;
  if (current.key === 'step_2') {
    const two = lesson.step_2;
    return (
      (!two?.mcq?.length || d.mcqDone) &&
      (!two?.classify || d.classified) &&
      (!two?.selfExplain || d.explained)
    );
  }
  if (current.key === 'step_3') {
    const three = lesson.step_3;
    return (
      (!three?.scaffold || d.traced) &&
      (!three?.counter || d.counter === three.counter.correct)
    );
  }
  return false;
}
