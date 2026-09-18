// The Figma lesson is List & Mutability. In this project's curriculum it is
// Module 2, lesson 11 (not lesson 5 as in the design's example breadcrumb).
export const PYTHON_LESSON_NUMBER = 11;
export const STARTER_CODE = `def clean_and_boost_scores(raw_scores: list[float], bonus: float) -> list[float]:
    """Lọc điểm âm, cộng thưởng và giữ nguyên danh sách gốc."""
    result = []
    # Viết lời giải của bạn ở đây
    return result

print(clean_and_boost_scores([6.5, -1.0, 8.0], 0.5))`;
export const SOLUTION_CODE = `def clean_and_boost_scores(raw_scores: list[float], bonus: float) -> list[float]:
    """Lọc điểm âm, cộng thưởng và giữ nguyên danh sách gốc."""
    result = []
    for score in raw_scores:
        if score >= 0:
            result.append(round(score + bonus, 2))
    return result

print(clean_and_boost_scores([6.5, -1.0, 8.0], 0.5))`;
export const OPERATIONS = [
  '.append(x)',
  '.extend(y)',
  'lst + [x]',
  '.sort()',
  'sorted(lst)',
  'lst[:]',
  '.pop()',
];
export const MUTATIONS = ['.append(x)', '.extend(y)', '.sort()', '.pop()'];
export type TestResult = { name: string; passed: boolean; detail: string };
export type RunResult = {
  tests: TestResult[];
  output: string;
  error?: string;
  duration: number;
  version: string;
};
export type Draft = {
  step: number;
  prediction: string;
  predicted: boolean;
  quiz: string;
  quizDone: boolean;
  bins: Record<string, string>;
  classified: boolean;
  explanation: string;
  explained: boolean;
  slots: string[];
  traced: boolean;
  counter: string;
  code: string;
  bookmark: boolean;
  solutionUsed: boolean;
};
export function initialDraft(): Draft {
  return {
    step: 1,
    prediction: '',
    predicted: false,
    quiz: '',
    quizDone: false,
    bins: {},
    classified: false,
    explanation: '',
    explained: false,
    slots: ['', '', ''],
    traced: false,
    counter: '',
    code: STARTER_CODE,
    bookmark: false,
    solutionUsed: false,
  };
}
export function explanationScore(text: string) {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  return (
    Number(/tham chieu|dia chi|reference|pointer/.test(normalized)) +
    Number(/mutable|bien doi|thay doi|sua doi/.test(normalized))
  );
}
export function canAdvance(d: Draft) {
  if (d.step === 1) return d.predicted;
  if (d.step === 2) return d.quizDone && d.classified && d.explained;
  if (d.step === 3) return d.traced && d.counter === '2';
  return false;
}

/**
 * Đáp án đầy đủ 4 bước, chỉ hiển thị cho tài khoản role === 'admin' để dựng
 * kịch bản kiểm thử nhanh. Bài này vốn chấm ở trình duyệt nên mọi đáp án đã
 * nằm sẵn trong bundle; bảng này không làm lộ thêm gì so với trước.
 */
export const ANSWER_KEY: { title: string; lines: string[] }[] = [
  {
    title: 'S1 · Cổng dự đoán',
    lines: [
      'Chọn B — "Gốc: 4, Bản sao: 4".',
      'Lý do: phép gán không sao chép; hai tên cùng trỏ một list.',
    ],
  },
  {
    title: 'S2 · Trắc nghiệm & phân loại',
    lines: [
      'Trắc nghiệm: chọn B — "id(a) != id(b)" vì lst[:] cấp container mới.',
      'In-place: .append(x) · .extend(y) · .sort() · .pop()',
      'Pure: lst + [x] · sorted(lst) · lst[:]',
      'Giải thích phải đủ 2 ý: "tham chiếu/địa chỉ" và "mutable/biến đổi".',
    ],
  },
  {
    title: 'S3 · Lắp ghép & mô phỏng',
    lines: [
      'Slot 1: result = []',
      'Slot 2: if val >= threshold:',
      'Slot 3: result.append(val)',
      'Dự đoán len(result): 2 phần tử.',
    ],
  },
  {
    title: 'S4 · Sandbox',
    lines: [
      'def clean_and_boost_scores(raw_scores, bonus):',
      '    return [round(x + bonus, 2) for x in raw_scores if x >= 0]',
      'Bấm "Nộp & Chấm điểm" để chạy đủ 5 trường hợp.',
    ],
  },
];
