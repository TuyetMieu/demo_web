// Dữ liệu "code chạy từng bước" cho phần lý thuyết, do scripts/pe-v3/motion.py sinh từ
// chính ví dụ minh hoạ của bài (xem docstring file đó) và nằm ở
// public/static/motion/<khoá>.json. Logic thuần, không phụ thuộc React để test bằng Node.

export type MotionVar = {
  n: string;
  /** Kiểu hiển thị: str | int | float | bool | None | ref (trỏ tới đối tượng trong heap). */
  k: string;
  /** Giá trị đã định dạng (có dấu nháy cho chuỗi). Vắng khi k = 'ref'. */
  v?: string;
  ref?: number;
  /** Vừa đổi so với bước trước. */
  ch: boolean;
};

export type MotionFrame = { name: string; vars: MotionVar[] };
export type MotionHeap = { id: number; type: string; items: string[]; ch: boolean };

export type MotionStep = {
  /** Dòng vừa chạy xong (1-based); null ở bước "Bắt đầu". */
  line: number | null;
  kind: string;
  cap: string;
  frames: MotionFrame[];
  heap: MotionHeap[];
  out: string[];
};

export type MotionLesson = {
  code_id: string;
  title: string;
  goal: string;
  myth?: string;
  /** Ví dụ minh hoạ đã được chạy; có cùng `steps`. */
  code?: string;
  steps?: MotionStep[];
};

export type MotionFile = { course: string; lessons: Record<string, MotionLesson> };

/** Tải file chuyển động của khoá; lỗi mạng/không có file thì trả null — bài vẫn học bình thường. */
export async function fetchMotion(course: string): Promise<MotionFile | null> {
  try {
    const response = await fetch(`/static/motion/${encodeURIComponent(course)}.json`);
    if (!response.ok) return null;
    const body = (await response.json()) as MotionFile;
    return body && typeof body === 'object' && body.lessons ? body : null;
  } catch {
    return null;
  }
}

/**
 * Hoạt hình của bài đang mở. Chỉ dùng khi `code` trong file KHỚP ví dụ minh hoạ của bài lấy từ
 * DB: giáo trình được viết lại mà chưa chạy lại motion.py thì thà không có hoạt hình còn hơn
 * chiếu một vết của đoạn code khác.
 */
export function motionFor(
  file: MotionFile | null,
  lessonNo: number,
  liveCode: string | undefined,
): MotionLesson | null {
  const entry = file?.lessons?.[String(lessonNo)];
  if (!entry?.steps?.length || !entry.code || !liveCode) return null;
  return entry.code.trim() === liveCode.trim() ? entry : null;
}

/**
 * Bài ngay trước bài đang mở để nhắc lại. Số thứ tự có chỗ trống (khoá có bài 19 rồi tới 21),
 * nên lấy bài lớn nhất nhỏ hơn `lessonNo` chứ không phải `lessonNo - 1`.
 */
export function recallFor(
  file: MotionFile | null,
  lessonNo: number,
): { no: number; lesson: MotionLesson } | null {
  if (!file?.lessons) return null;
  let best = 0;
  for (const key of Object.keys(file.lessons)) {
    const no = Number(key);
    if (Number.isInteger(no) && no < lessonNo && no > best) best = no;
  }
  const lesson = best ? file.lessons[String(best)] : undefined;
  if (!lesson) return null;
  return lesson.goal || lesson.steps?.length ? { no: best, lesson } : null;
}
