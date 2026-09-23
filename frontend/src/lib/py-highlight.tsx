// Tô màu cú pháp Python ở mức tối thiểu cho các khối code trong bài học.
//
// Vì sao tự viết: nội dung bài đến từ `lessons.content_json` dưới dạng chuỗi
// thuần, trong khi các thẻ code của LessonChrome nhận ReactNode và tô màu bằng
// class .kw/.str/.num/.cm (xem exercises.module.css). Kéo cả một thư viện
// highlight về chỉ để làm việc này là quá nặng so với nhu cầu.
//
// Phạm vi: từ khoá, chuỗi một dòng, số và chú thích. KHÔNG xử lý chuỗi nhiều
// dòng (docstring) — dòng giữa docstring sẽ hiện như mã thường, chấp nhận được
// vì chỉ ảnh hưởng màu sắc.

const KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

// Thứ tự quan trọng: chuỗi và chú thích phải khớp TRƯỚC khi tách từ, nếu không
// dấu # trong chuỗi sẽ bị coi là chú thích.
const TOKEN =
  /("""[\s\S]*?"""|'''[\s\S]*?'''|[frbFRB]{0,2}"(?:\\.|[^"\\])*"|[frbFRB]{0,2}'(?:\\.|[^'\\])*'|#[^\n]*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;

export function highlightPython(line: string): React.ReactNode {
  if (!line) return '';
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of line.matchAll(TOKEN)) {
    const text = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    last = at + text.length;

    const first = text[0];
    if (text.startsWith('#')) out.push(<span key={key++} className="cm">{text}</span>);
    else if (first === '"' || first === "'" || /^[frbFRB]{1,2}["']/.test(text))
      out.push(<span key={key++} className="str">{text}</span>);
    else if (/^\d/.test(text)) out.push(<span key={key++} className="num">{text}</span>);
    else if (KEYWORDS.has(text)) out.push(<span key={key++} className="kw">{text}</span>);
    else out.push(text);
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/** Chuỗi mã -> danh sách dòng đánh số cho CodeBlock. */
export function toCodeLines(
  source: string,
  highlightLine?: number,
): { num: number; content: React.ReactNode; highlighted?: boolean }[] {
  return source.replace(/\s+$/, '').split('\n').map((line, i) => ({
    num: i + 1,
    content: highlightPython(line),
    highlighted: highlightLine === i + 1,
  }));
}
