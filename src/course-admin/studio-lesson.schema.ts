/**
 * studio-lesson/v1 — cấu trúc một bài Python Studio lưu trong
 * `lessons.content_json`. Bản sao của frontend/src/lib/studio-lesson.ts; giữ hai
 * bên khớp nhau khi đổi schema.
 *
 * RÀNG BUỘC: trắc nghiệm PHẢI nằm ở `step_2.mcq`. QuizzesService.collectQuestions()
 * đọc đúng đường dẫn đó để dựng quiz ôn tập (src/quizzes/quizzes.service.ts).
 */

export const STUDIO_LESSON_SCHEMA = 'studio-lesson/v1';

export type McqOption =
  | string
  | { text: string; correct?: boolean; detail?: string };

export interface Mcq {
  question: string;
  options: McqOption[];
  correct?: number;
  explanation?: string;
}

export interface StudioLesson {
  schema?: string;
  title?: string;
  subtitle?: string;
  source?: {
    kind?: string;
    filename?: string;
    parser?: string;
    importedAt?: string;
  };
  step_1?: Record<string, unknown>;
  step_2?: { mcq?: Mcq[] } & Record<string, unknown>;
  step_3?: Record<string, unknown>;
  step_4?: Record<string, unknown>;
}

export const STEP_KEYS = ['step_1', 'step_2', 'step_3', 'step_4'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  );
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Kiểm tra một bản nháp trước khi cho lưu. Trả danh sách lỗi theo đường dẫn
 * field để admin biết sửa chỗ nào — KHÔNG ném exception, người gọi quyết định.
 */
export function validateStudioLesson(value: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(value)) return ['Nội dung phải là một object JSON.'];

  const lesson = value as StudioLesson;

  if (!nonEmptyString(lesson.title)) {
    errors.push('title: thiếu tiêu đề bài học.');
  }

  const present = STEP_KEYS.filter((key) => {
    const step = lesson[key];
    return isObject(step) && Object.keys(step).length > 0;
  });
  if (present.length === 0) {
    errors.push(
      'step_1..step_4: không có bước nào có nội dung. Cần ít nhất một bước.',
    );
  }

  const one = lesson.step_1;
  if (isObject(one) && isObject(one.predict)) {
    const predict = one.predict as Record<string, unknown>;
    const options = predict.options;
    if (!Array.isArray(options) || options.length < 2) {
      errors.push('step_1.predict.options: cần ít nhất 2 lựa chọn.');
    } else if (!options.some((o) => isObject(o) && o.correct === true)) {
      errors.push('step_1.predict.options: phải đánh dấu đúng một đáp án.');
    }
  }

  const two = lesson.step_2;
  if (isObject(two) && two.mcq !== undefined) {
    if (!Array.isArray(two.mcq)) {
      errors.push('step_2.mcq: phải là mảng câu hỏi.');
    } else {
      two.mcq.forEach((q, i) => {
        const at = `step_2.mcq[${i}]`;
        if (!isObject(q)) return errors.push(`${at}: phải là object.`);
        if (!nonEmptyString(q.question)) errors.push(`${at}.question: thiếu đề bài.`);
        const options = (q as Mcq).options;
        if (!Array.isArray(options) || options.length < 2) {
          errors.push(`${at}.options: cần ít nhất 2 lựa chọn.`);
          return;
        }
        const flagged = options.some(
          (o) => isObject(o) && (o as { correct?: boolean }).correct === true,
        );
        const indexed =
          typeof (q as Mcq).correct === 'number' &&
          (q as Mcq).correct! >= 0 &&
          (q as Mcq).correct! < options.length;
        if (!flagged && !indexed) {
          errors.push(`${at}.correct: chưa chỉ ra đáp án đúng.`);
        }
      });
    }
  }
  if (isObject(two) && isObject(two.classify)) {
    const classify = two.classify as Record<string, unknown>;
    const bins = classify.bins;
    const tokens = classify.tokens;
    if (!Array.isArray(bins) || bins.length < 2) {
      errors.push('step_2.classify.bins: cần ít nhất 2 nhóm.');
    }
    if (!Array.isArray(tokens) || tokens.length === 0) {
      errors.push('step_2.classify.tokens: cần ít nhất 1 thẻ.');
    }
    if (Array.isArray(bins) && Array.isArray(tokens)) {
      const keys = new Set(
        bins.filter(isObject).map((b) => String((b as { key: string }).key)),
      );
      tokens.filter(isObject).forEach((t, i) => {
        const bin = String((t as { bin?: string }).bin ?? '');
        if (!keys.has(bin)) {
          errors.push(
            `step_2.classify.tokens[${i}].bin: "${bin}" không khớp nhóm nào.`,
          );
        }
      });
    }
  }

  const three = lesson.step_3;
  if (isObject(three) && isObject(three.scaffold)) {
    const scaffold = three.scaffold as Record<string, unknown>;
    const template = scaffold.template;
    const slots = scaffold.slots;
    if (!nonEmptyString(template)) {
      errors.push('step_3.scaffold.template: thiếu khung mã.');
    }
    if (!Array.isArray(slots) || slots.length === 0) {
      errors.push('step_3.scaffold.slots: cần ít nhất 1 slot.');
    } else if (nonEmptyString(template)) {
      slots.filter(isObject).forEach((slot) => {
        const n = (slot as { n?: number }).n;
        if (!String(template).includes(`{{slot${n}}}`)) {
          errors.push(
            `step_3.scaffold.template: thiếu chỗ đặt {{slot${n}}}.`,
          );
        }
        if (!nonEmptyString((slot as { answer?: string }).answer)) {
          errors.push(`step_3.scaffold.slots: slot ${n} thiếu đáp án.`);
        }
      });
    }
  }

  const four = lesson.step_4;
  if (isObject(four)) {
    const tests = four.tests;
    if (tests !== undefined) {
      if (!Array.isArray(tests) || tests.length === 0) {
        errors.push('step_4.tests: cần ít nhất 1 trường hợp kiểm thử.');
      } else {
        tests.forEach((t, i) => {
          if (!isObject(t)) return errors.push(`step_4.tests[${i}]: sai kiểu.`);
          if (!nonEmptyString(t.call))
            errors.push(`step_4.tests[${i}].call: thiếu biểu thức gọi hàm.`);
          if (!nonEmptyString(t.expect))
            errors.push(`step_4.tests[${i}].expect: thiếu kết quả mong đợi.`);
        });
      }
    }
    // Bước sandbox mà không có test thì học viên không thể nộp bài.
    if (nonEmptyString(four.starterCode) && !Array.isArray(tests)) {
      errors.push('step_4.tests: có code khởi tạo thì phải có phần Test.');
    }
  }

  return errors;
}
