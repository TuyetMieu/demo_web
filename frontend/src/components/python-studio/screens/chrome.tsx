// Phần dùng chung của mọi màn bài học: biểu tượng nhãn, vỏ thẻ ShellB kèm băng
// phản hồi, và vài hàm suy ra từ nội dung bài.
//
// Vì sao tách khỏi StudioLesson.tsx: mỗi màn trước đây là một nhánh `if` trong
// một hàm render dài ~900 dòng, dùng chung closure `shell()` nên không màn nào
// đọc hiểu hay sửa riêng được. Giờ mỗi màn là một component nhận props.
import FeedbackBanner from '@/components/lesson-chrome/exercises/FeedbackBanner';
import ShellB from '@/components/lesson-chrome/ShellB';
import type { LessonScreen, PlayGame, StudioLesson as Lesson } from '@/lib/studio-lesson';

import type { RunResult } from '../runner/types';
import type { SandboxTestRow } from '@/components/lesson-chrome/exercises/SandboxEditor';
import type { ConsoleLine } from '@/components/lesson-chrome/exercises/Console';

/** Kết quả chấm của màn đang mở (screenVerdict hoặc kết quả chạy code). */
export type ScreenVerdict = { correct: boolean; explain?: string };

export const ICON = {
  book: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 3v18" />
    </svg>
  ),
  code: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
    </svg>
  ),
  help: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5.9-1.5 1.7v.5" /><line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  ),
  bulb: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  ),
  swap: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3 21 7l-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />
    </svg>
  ),
  play: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  ),
};

/** Đoạn văn cách nhau bằng dòng trống → từng khối riêng (mô tả nằm trong <p>). */
export function paragraphs(text?: string): React.ReactNode {
  if (!text || !text.includes('\n\n')) return text;
  return text.split(/\n{2,}/).map((part, i) => (
    <span key={i} style={{ display: 'block', marginTop: i ? 8 : 0 }}>
      {part}
    </span>
  ));
}

/** Nhãn nhỏ trên mỗi thẻ: "S2 · Bẫy ngộ nhận". */
export function eyebrowOf(scr: LessonScreen): { icon: React.ReactNode; label: string } {
  const map: Record<string, { icon: React.ReactNode; label: string }> = {
    recall: { icon: ICON.swap, label: 'Nhắc lại bài trước' },
    brief: { icon: ICON.book, label: 'Tổng quan bài' },
    context: { icon: ICON.book, label: 'Ngữ cảnh' },
    motion: { icon: ICON.play, label: 'Code chạy từng bước' },
    explain: { icon: ICON.code, label: 'Giải thích từng dòng' },
    memory: { icon: ICON.swap, label: 'Mô hình bộ nhớ' },
    misconception: { icon: ICON.bulb, label: 'Ngộ nhận' },
    predict: { icon: ICON.code, label: 'Dự đoán kết quả' },
    mcq: { icon: ICON.help, label: 'Trắc nghiệm' },
    classify: { icon: ICON.swap, label: 'Phân loại thao tác' },
    selfExplain: { icon: ICON.bulb, label: 'Tự giải thích' },
    scaffold: { icon: ICON.swap, label: 'Lắp ghép khung mã' },
    trace: { icon: ICON.book, label: 'Nhật ký biến đổi' },
    counter: { icon: ICON.help, label: 'Tái dự đoán' },
    sandbox: { icon: ICON.play, label: 'Thử thách độc lập' },
    recap: { icon: ICON.bulb, label: 'Tổng kết' },
  };
  const games: Record<PlayGame['type'], { icon: React.ReactNode; label: string }> = {
    traceTable: { icon: ICON.book, label: 'Game · Theo dõi biến' },
    match: { icon: ICON.swap, label: 'Game · Nối cặp' },
    trueFalse: { icon: ICON.help, label: 'Game · Đúng hay sai' },
    fill: { icon: ICON.swap, label: 'Game · Điền mảnh code' },
    parsons: { icon: ICON.play, label: 'Game · Ghép code ▶' },
    spotError: { icon: ICON.bulb, label: 'Game · Săn lỗi' },
    debug: { icon: ICON.play, label: 'Game · Sửa code ▶' },
    selfExplain: { icon: ICON.bulb, label: 'Tự giải thích' },
  };
  if (scr.kind === 'game' && scr.gameType) return games[scr.gameType];
  const found = map[scr.kind] ?? { icon: ICON.book, label: scr.label };
  return { icon: found.icon, label: `S${scr.origin} · ${found.label}` };
}

/** Thụt lề của một dòng Python, tính theo bậc 4 dấu cách (Parsons hiển thị). */
export function indentOf(line: string): number {
  return Math.floor((line.length - line.trimStart().length) / 4);
}

/**
 * Vỏ thẻ của một màn: nhãn loại màn + tiêu đề + nội dung + băng phản hồi.
 * `verdict` truyền vào đã được lọc theo "đã bấm Kiểm tra chưa" ở phía trên.
 */
export function ScreenShell({
  scr,
  metaLabel,
  title,
  description,
  centered,
  verdict,
  children,
}: {
  scr: LessonScreen;
  metaLabel?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  centered?: boolean;
  verdict?: ScreenVerdict | null;
  children?: React.ReactNode;
}) {
  const eyebrow = eyebrowOf(scr);
  return (
    <ShellB
      eyebrowIcon={eyebrow.icon}
      eyebrowLabel={eyebrow.label}
      metaLabel={metaLabel}
      title={title ?? ''}
      description={description}
      centered={centered}
    >
      {children}
      {verdict && (
        <FeedbackBanner
          correct={verdict.correct}
          title={
            scr.kind === 'selfExplain'
              ? verdict.correct
                ? 'Đã ghi nhận — tự so với lời giải thích mẫu'
                : 'Chưa đủ ý — viết thêm nhé'
              : verdict.correct
                ? 'Chính xác!'
                : 'Chưa đúng — thử lại nhé'
          }
          explanation={verdict.explain}
        />
      )}
    </ShellB>
  );
}

/**
 * Mã ví dụ của bài để nhúng kèm câu hỏi. Ví dụ minh hoạ (PE v3) dùng dữ liệu
 * KHÁC đề bài: chỉ hiện ở màn giải thích, không gắn vào câu dự đoán hay thẻ
 * ngộ nhận như mã ví dụ của bài v2.
 */
export function lessonCodeOf(lesson: Lesson): string | undefined {
  return lesson.step_1?.code?.kind === 'demo' ? undefined : lesson.step_1?.code?.source;
}

/**
 * Chỉ dựng ô soạn mã khi thật sự có mã Python để làm: bài quy trình thuần
 * (không code khởi tạo, không lời giải, không ca chấm) thì editor chỉ gây rối.
 */
export function showEditorOf(lesson: Lesson): boolean {
  const four = lesson.step_4;
  return Boolean(
    four?.tests?.length || four?.starterCode || four?.solutionCode || !four?.procedure?.length,
  );
}

/** Bảng ca kiểm thử dưới editor, ghép đề bài với kết quả chạy gần nhất. */
export function testRows(lesson: Lesson, data: RunResult | null | undefined): SandboxTestRow[] {
  return (lesson.step_4?.tests ?? []).map((t, i) => {
    const got = data?.tests?.[i];
    return {
      label: t.name || t.call,
      detail: got?.detail,
      status: !data || !got ? 'pending' : got.passed ? 'pass' : 'fail',
    };
  });
}

/** Console của game chạy code (bản gọn: không có `notes`, không dò code rỗng). */
export function gameConsole(data: RunResult | undefined): ConsoleLine[] | null {
  if (!data) return null;
  const lines: ConsoleLine[] = [];
  if (data.output)
    for (const line of data.output.replace(/\n$/, '').split('\n')) lines.push({ text: line });
  if (data.error) lines.push({ text: data.error, tone: 'err' });
  if (!lines.length)
    lines.push({ text: 'Chương trình chạy xong, không in ra gì.', tone: 'muted' });
  return lines;
}
