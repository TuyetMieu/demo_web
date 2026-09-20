'use client';

// Demo TASK-02 (mở rộng): xem trước LessonChrome + Vỏ A/B + đủ 27 KIỂU màn
// hình dịch từ Figma "PE-desgin" (khớp 1-1 với bộ Stitch
// stitch_python_lesson_chrome_wrapper.zip cùng nội dung).
//
// Vòng tương tác: chọn/điền đáp án → "Kiểm tra" (chấm tại chỗ, tô xanh/đỏ +
// dải phản hồi) → "Tiếp tục". Nút "Gợi ý" nằm ở thanh dưới nên luôn với tới
// được. Các màn có code đều có nút "Chạy" + khung console.
//
// Phần chấm ở đây là chấm TẠI TRÌNH DUYỆT cho mục đích xem trước — chưa nối
// XP/tiến độ thật và chưa đụng vào PythonStudio.tsx/StudioLesson.tsx của bài
// học 11 đang chạy thật. Vài thao tác kéo-thả tự do trong thiết kế gốc
// (Classify/Match/Order/Assemble/Parsons) được đơn giản hoá thành "bấm chọn
// rồi bấm đích" — xem ghi chú trong từng file component.
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import PageStyles from '@/components/PageStyles';
import LessonChrome from '@/components/lesson-chrome/LessonChrome';
import ShellA from '@/components/lesson-chrome/ShellA';
import ShellB from '@/components/lesson-chrome/ShellB';
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import TrueFalse from '@/components/lesson-chrome/exercises/TrueFalse';
import FillBlank from '@/components/lesson-chrome/exercises/FillBlank';
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import Concept from '@/components/lesson-chrome/exercises/Concept';
import Compare from '@/components/lesson-chrome/exercises/Compare';
import Multi from '@/components/lesson-chrome/exercises/Multi';
import Misconception from '@/components/lesson-chrome/exercises/Misconception';
import SpotError from '@/components/lesson-chrome/exercises/SpotError';
import CodeAnnotated from '@/components/lesson-chrome/exercises/CodeAnnotated';
import Classify from '@/components/lesson-chrome/exercises/Classify';
import MatchPairs from '@/components/lesson-chrome/exercises/MatchPairs';
import Repl from '@/components/lesson-chrome/exercises/Repl';
import OrderSteps from '@/components/lesson-chrome/exercises/OrderSteps';
import Sandbox from '@/components/lesson-chrome/exercises/Sandbox';
import Assemble from '@/components/lesson-chrome/exercises/Assemble';
import Debug from '@/components/lesson-chrome/exercises/Debug';
import Visual from '@/components/lesson-chrome/exercises/Visual';
import Checkpoint from '@/components/lesson-chrome/exercises/Checkpoint';
import Recap from '@/components/lesson-chrome/exercises/Recap';
import FeedbackBanner from '@/components/lesson-chrome/exercises/FeedbackBanner';
import TraceTable from '@/components/lesson-chrome/exercises/TraceTable';
import HintSheet from '@/components/lesson-chrome/exercises/HintSheet';
import Parsons from '@/components/lesson-chrome/exercises/Parsons';
import { ConsoleLine } from '@/components/lesson-chrome/exercises/Console';

const TOTAL_STEPS = 27;

/** Các bước có gợi ý — quyết định việc hiện nút "Gợi ý" ở thanh dưới. */
const HINT_STEPS = new Set([4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 27]);

const Icon = {
  bulb: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  ),
  help: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5.9-1.5 1.7v.5" /><line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  code: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" /><line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  ),
  swap: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3 21 7l-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />
    </svg>
  ),
  bug: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="8" width="10" height="10" rx="3" /><path d="M12 8V5M9 5h6M4 12H2M22 12h-2M5 8l-2-2M19 8l2-2M5 16l-2 2M19 16l2 2" />
    </svg>
  ),
  warn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" />
    </svg>
  ),
};

interface Verdict {
  correct: boolean;
  explain: React.ReactNode;
}

export default function LessonChromeDemoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  // 5. MCQ
  const [mcqSelected, setMcqSelected] = useState<string | null>(null);
  // 6. MULTI
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  // 7. TRUE/FALSE
  const [tfSelected, setTfSelected] = useState<'true' | 'false' | null>(null);
  // 8. PREDICT
  const [predictSelected, setPredictSelected] = useState<string | null>(null);
  // 10. SPOT-ERROR
  const [spotErrorSelected, setSpotErrorSelected] = useState<number | null>(null);
  // 12. CLASSIFY
  const [classifyBins, setClassifyBins] = useState([
    { key: 'int', label: 'int (Số nguyên)', sub: 'Số không có phần thập phân', items: ['42', '-15'] },
    { key: 'str', label: 'str (Chuỗi ký tự)', sub: 'Văn bản đặt trong dấu nháy', items: ['"Python"'] },
    { key: 'float', label: 'float (Số thực)', sub: 'Số có dấu chấm động', items: ['3.14'] },
  ]);
  const [classifyPool, setClassifyPool] = useState(['0', '"123"', '9.99', '"hello"']);
  const [classifyHeld, setClassifyHeld] = useState<string | null>(null);
  // 13. FILL-BLANK
  const [blankValue, setBlankValue] = useState('');
  // 14. MATCH
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [pendingLeft, setPendingLeft] = useState<string | null>(null);
  // 15. REPL
  const [replValue, setReplValue] = useState('sum([10, 20, 30]) / len([10, 20, 30])');
  // 16. ORDER
  const [orderItems, setOrderItems] = useState([
    { id: 'a', content: 'tong = 0' },
    { id: 'b', content: 'for x in [1, 2, 3, 4, 5, 6]:' },
    { id: 'd', content: '    tong += x' },
    { id: 'c', content: '    if x % 2 == 0:' },
    { id: 'e', content: 'print(tong)' },
  ]);
  // 18. ASSEMBLE
  const [assembleFilled, setAssembleFilled] = useState<Record<string, string>>({});
  const [assembleBank, setAssembleBank] = useState(['False', 'return False', 'break', 'continue']);
  const [assembleHeld, setAssembleHeld] = useState<string | null>(null);
  // 24. TRACE-TABLE
  const [traceAnswers, setTraceAnswers] = useState<Record<string, string>>({});
  // 26. HINT-SHEET
  const [hintSheetIndex, setHintSheetIndex] = useState(0);
  // 27. PARSONS
  const [parsonsBuilt, setParsonsBuilt] = useState([
    { id: '1', content: 'diem = 75', indent: 0 },
    { id: '2', content: 'if diem >= 80:', indent: 0 },
    { id: '3', content: 'ket_qua = "Đỗ"', indent: 1 },
  ]);
  const [parsonsPool, setParsonsPool] = useState([
    { id: 'p1', content: 'print("Chúc mừng")' },
    { id: 'p2', content: 'else:' },
    { id: 'p3', content: 'if diem = 50:', distractorReason: 'Sai phép so sánh' },
    { id: 'p4', content: "elif diem < 0", distractorReason: "Thiếu dấu ':'" },
  ]);

  /** Chấm bài tại trình duyệt — null nghĩa là bước chỉ để đọc, không chấm. */
  const verdict: Verdict | null = (() => {
    switch (step) {
      case 5:
        return {
          correct: mcqSelected === 'B',
          explain: <>Hàm <code>len()</code> trả về số phần tử của list/chuỗi. <code>count()</code> đếm số lần xuất hiện của một phần tử.</>,
        };
      case 6: {
        const ok = multiSelected.length === 2 && multiSelected.includes('user_name') && multiSelected.includes('_total_score');
        return {
          correct: ok,
          explain: <>Tên biến hợp lệ chỉ gồm chữ, số và <code>_</code>, không bắt đầu bằng chữ số và không trùng từ khoá.</>,
        };
      }
      case 7:
        return {
          correct: tfSelected === 'true',
          explain: <>Đúng — <code>tuple</code> là bất biến, gán lại phần tử sẽ ném <code>TypeError</code>.</>,
        };
      case 8:
        return {
          correct: predictSelected === 'B',
          explain: <><code>numbers[:2]</code> chỉ lấy 2 phần tử đầu (10 và 20) nên tổng là 30.</>,
        };
      case 10:
        return {
          correct: spotErrorSelected === 2,
          explain: <>Dòng 2 thiếu dấu <code>:</code> ở cuối mệnh đề <code>if</code> nên Python báo <code>SyntaxError</code>.</>,
        };
      case 12: {
        const bin = (k: string) => classifyBins.find((b) => b.key === k)?.items ?? [];
        const ok =
          classifyPool.length === 0 &&
          bin('int').includes('0') &&
          bin('str').includes('"123"') &&
          bin('str').includes('"hello"') &&
          bin('float').includes('9.99');
        return {
          correct: ok,
          explain: <>Mọi giá trị trong cặp nháy đều là <code>str</code> — kể cả <code>&quot;123&quot;</code>. Số có dấu chấm là <code>float</code>.</>,
        };
      }
      case 13:
        return {
          correct: ['[]', 'list()'].includes(blankValue.trim()),
          explain: <>Danh sách rỗng khai báo bằng <code>[]</code> hoặc <code>list()</code>. <code>{'{}'}</code> tạo ra dict nên <code>.append()</code> sẽ lỗi.</>,
        };
      case 14: {
        const ok = matched.len === 'r-len' && matched.upper === 'r-upper' && matched.type === 'r-type';
        return {
          correct: ok,
          explain: <><code>len()</code> trả số nguyên, <code>.upper()</code> trả chuỗi in hoa, <code>type()</code> trả về đối tượng lớp.</>,
        };
      }
      case 16:
        return {
          correct: orderItems.map((i) => i.id).join(',') === 'a,b,c,d,e',
          explain: <>Phải kiểm tra điều kiện chẵn <code>if x % 2 == 0:</code> TRƯỚC khi cộng dồn <code>tong += x</code>.</>,
        };
      case 18:
        return {
          correct: assembleFilled.s1 === 'False' && assembleFilled.s2 === 'return False',
          explain: <>Số nhỏ hơn 2 không phải số nguyên tố nên trả <code>False</code>; chia hết cho <code>i</code> thì dừng ngay bằng <code>return False</code>.</>,
        };
      case 24: {
        const want: Record<string, string> = { '1-out': '2', '2-x': '3', '2-out': '6', '3-x': '4', '3-out': '12' };
        const ok = Object.entries(want).every(([k, v]) => traceAnswers[k]?.trim() === v);
        return {
          correct: ok,
          explain: <>Mỗi vòng: <code>out += x * 2</code> rồi mới <code>x += 1</code> → out lần lượt là 2, 6, 12.</>,
        };
      }
      case 27:
        return {
          correct: parsonsPool.length === 2 && parsonsPool.every((p) => p.distractorReason),
          explain: <>Chỉ <code>print(&quot;Chúc mừng&quot;)</code> và <code>else:</code> là dòng hợp lệ; hai dòng còn lại sai cú pháp.</>,
        };
      default:
        return null;
    }
  })();

  const goNext = () => {
    setChecked(false);
    setHintOpen(false);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const goDone = () => router.push('/admin');

  const isLast = step === TOTAL_STEPS;
  const needsCheck = !!verdict && !checked;

  const fillBlankOutput = (v: string): ConsoleLine[] => {
    if (v === '[]' || v === 'list()') {
      return [
        { text: '$ python main.py', tone: 'muted' },
        { text: '1' },
        { text: '→ Tiến trình kết thúc, mã thoát 0', tone: 'ok' },
      ];
    }
    if (v === '{}') {
      return [
        { text: '$ python main.py', tone: 'muted' },
        { text: 'Traceback (most recent call last):', tone: 'err' },
        { text: '  File "main.py", line 3, in <module>', tone: 'err' },
        { text: "AttributeError: 'dict' object has no attribute 'append'", tone: 'err' },
      ];
    }
    return [
      { text: '$ python main.py', tone: 'muted' },
      { text: `SyntaxError: invalid syntax → danh_sach = ${v}`, tone: 'err' },
    ];
  };

  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css', '/static/css/studio-tokens.css']} />
      <title>Xem trước LessonChrome | Programming EDU</title>

      <LessonChrome
        step={step}
        totalSteps={TOTAL_STEPS}
        streak={3}
        onClose={() => router.push('/admin')}
        primaryLabel={isLast ? 'Hoàn tất' : needsCheck ? 'Kiểm tra' : 'Tiếp tục'}
        primaryTone={checked && verdict ? (verdict.correct ? 'ok' : 'err') : 'accent'}
        onPrimaryClick={isLast ? goDone : needsCheck ? () => setChecked(true) : goNext}
        secondaryLabel={HINT_STEPS.has(step) ? (hintOpen ? '💡 Ẩn gợi ý' : '💡 Gợi ý') : undefined}
        onSecondaryClick={() => setHintOpen((o) => !o)}
      >
        {step === 1 && (
          <ShellA
            icon={Icon.bulb}
            title="Trong Python, thụt lề (Indentation) không chỉ để làm đẹp mã mà là cú pháp bắt buộc."
            description="Nó xác định cấu trúc phân cấp và phạm vi của các khối lệnh."
            dotCount={2}
            dotIndex={0}
          />
        )}

        {step === 2 && (
          <Concept
            termIcon={Icon.code}
            term="Biến (Variable)"
            description="Một vùng định danh trong bộ nhớ dùng để lưu trữ giá trị và có thể gán lại bất kỳ lúc nào."
            code={[{ num: 1, content: <><span style={{ color: 'var(--st-syn-keyword)' }}>age</span> = <span style={{ color: 'var(--st-syn-number)' }}>18</span> <span style={{ color: 'var(--st-syn-comment)' }}># Khởi tạo biến age với số nguyên</span></> }]}
          />
        )}

        {step === 3 && (
          <CodeBlock
            filename="functions.py"
            lines={[
              { num: 1, content: <><span style={{ color: 'var(--st-syn-keyword)' }}>def</span> chao_mung(ten):</> },
              { num: 2, content: <span style={{ color: 'var(--st-syn-comment)' }}># Ghép chuỗi và in ra màn hình</span> },
              { num: 3, content: <>thong_diep = <span style={{ color: 'var(--st-syn-string)' }}>f&quot;Xin chào, {'{ten}'}!&quot;</span></> },
              { num: 4, content: <><span style={{ color: 'var(--st-syn-keyword)' }}>return</span> thong_diep</> },
            ]}
          />
        )}

        {step === 4 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={Icon.swap} eyebrowLabel="So sánh cú pháp" centered title="Toán tử gán và Toán tử so sánh" description={<>Trong câu lệnh điều kiện Python, luôn sử dụng <code>==</code> thay vì <code>=</code></>} hint={{ icon: Icon.bulb, label: 'Gợi ý', text: <>Dấu <code>=</code> dùng để gán giá trị cho biến, trong khi <code>==</code> kiểm tra xem hai vế có bằng nhau không.</> }}>
            <Compare
              wrong={{ label: 'Sai', tag: 'SyntaxError', ok: false, lines: [{ num: 1, content: 'if x = 5:  # Lỗi cú pháp!' }, { num: 2, content: 'print(x)' }] }}
              right={{ label: 'Đúng', tag: 'Hợp lệ', ok: true, lines: [{ num: 1, content: 'if x == 5:  # So sánh bằng' }, { num: 2, content: 'print(x)' }] }}
            />
          </ShellB>
        )}

        {step === 5 && (
          <ShellB
            hintOpen={hintOpen}
            eyebrowIcon={Icon.help}
            eyebrowLabel="Trắc nghiệm đơn"
            metaLabel="Python Cơ Bản"
            title="Hàm nào trong Python được sử dụng để lấy độ dài (số lượng phần tử) của một danh sách (List)?"
            hint={{ icon: Icon.bulb, label: 'Gợi ý', text: 'Tên hàm là viết tắt của từ tiếng Anh "length".' }}
          >
            <Mcq
              filename="demo.py"
              langTag="Python 3.12"
              code={[{ num: 1, content: 'trai_cay = ["Táo", "Cam", "Xoài"]' }, { num: 2, content: 'so_luong = ???(trai_cay)  # Kết quả mong muốn: 3' }]}
              options={[
                { key: 'A', label: 'count()', sub: 'Đếm số lần xuất hiện của một phần tử cụ thể' },
                { key: 'B', label: 'len()', sub: 'Trả về số lượng phần tử trong chuỗi hoặc collection' },
                { key: 'C', label: 'size()', sub: 'Thường dùng trong các thư viện mở rộng như NumPy' },
                { key: 'D', label: 'length()', sub: 'Cú pháp của một số ngôn ngữ khác như Java hay JS' },
              ]}
              selected={mcqSelected}
              onSelect={setMcqSelected}
              correctKey="B"
              checked={checked}
            />
          </ShellB>
        )}

        {step === 6 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⋮≡</>} eyebrowLabel="Chọn nhiều đáp án" metaLabel="Quy tắc đặt tên" title="Những tên biến nào sau đây là hợp lệ (valid variable names) trong Python? (Chọn tất cả đáp án đúng)" hint={{ icon: Icon.bulb, label: 'Quy ước Python', text: 'Tên biến chỉ được chứa chữ cái (a-z, A-Z), chữ số (0-9) và dấu gạch dưới (_), không được bắt đầu bằng chữ số.' }}>
            <Multi
              instruction="Nhấn vào thẻ để chọn hoặc bỏ chọn một hoặc nhiều phương án."
              options={[
                { key: 'user_name', label: 'user_name', sub: 'Sử dụng quy tắc snake_case và ký tự gạch dưới hợp lệ' },
                { key: '_total_score', label: '_total_score', sub: 'Bắt đầu bằng dấu gạch dưới là hợp lệ trong Python' },
                { key: '2nd_player', label: '2nd_player', sub: 'Bắt đầu bằng chữ số (không hợp lệ)' },
                { key: 'class', label: 'class', sub: 'Trùng với từ khoá dành riêng của Python' },
              ]}
              selected={multiSelected}
              onToggle={(k) => setMultiSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))}
              correctKeys={['user_name', '_total_score']}
              checked={checked}
            />
          </ShellB>
        )}

        {step === 7 && (
          <ShellB
            hintOpen={hintOpen}
            eyebrowIcon={<>⊘</>}
            eyebrowLabel="Đúng hay sai"
            centered
            title={'"Trong Python, kiểu dữ liệu Tuple là bất biến (immutable), nghĩa là không thể thay đổi phần tử sau khi đã tạo."'}
            description="Hãy xem xét tính chất của danh sách List so với bộ giá trị Tuple."
            hint={{ icon: Icon.bulb, label: 'Ghi nhớ nhanh', text: <>Bộ giá trị <code>tuple</code> một khi đã khởi tạo thì các phần tử không thể gán lại, thêm hoặc xoá, khác với kiểu <code>list</code> có thể thay đổi linh hoạt.</> }}
          >
            <TrueFalse snippet={<>tup = (1, 2, 3)  |  tup[0] = 99  →  TypeError</>} selected={tfSelected} onSelect={setTfSelected} correctValue="true" checked={checked} />
          </ShellB>
        )}

        {step === 8 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={Icon.code} eyebrowLabel="Dự đoán kết quả" metaLabel="Python Basics" title="Đoạn mã trên sẽ in ra kết quả gì trên màn hình console?" hint={{ icon: Icon.bulb, label: 'Gợi ý', text: <>Cú pháp cắt lát <code>[:2]</code> lấy từ chỉ số 0 đến TRƯỚC chỉ số 2 — tức 2 phần tử đầu tiên.</> }}>
            <Mcq
              code={[
                { num: 1, content: 'numbers = [10, 20, 30, 40]' },
                { num: 2, content: 'total = 0' },
                { num: 3, content: 'for n in numbers[:2]:' },
                { num: 4, content: '    total += n' },
                { num: 5, content: 'print(total)' },
              ]}
              options={[
                { key: 'A', label: '60', sub: 'Tính tổng 3 phần tử đầu tiên' },
                { key: 'B', label: '30', sub: 'Cắt lát [:2] chỉ lấy 2 phần tử đầu: 10 + 20' },
                { key: 'C', label: '100', sub: 'Tính tổng tất cả các phần tử trong danh sách' },
              ]}
              selected={predictSelected}
              onSelect={setPredictSelected}
              correctKey="B"
              checked={checked}
            />
          </ShellB>
        )}

        {step === 9 && (
          <Misconception
            myth="Dấu = được dùng để kiểm tra hai giá trị có bằng nhau hay không."
            correction={<>Dấu <code>=</code> là toán tử gán giá trị. Để kiểm tra sự bằng nhau, Python bắt buộc sử dụng hai dấu bằng liên tiếp (<code>==</code>).</>}
            exampleLabel="Ví dụ trực quan"
            langTag="python 3.x"
            code={[{ num: 1, content: 'x = 10   # Gán 10 vào biến x' }, { num: 2, content: 'x == 10  # So sánh: Kết quả là True' }]}
          />
        )}

        {step === 10 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={Icon.bug} eyebrowLabel="Tìm dòng mã lỗi" title="Dòng lệnh nào dưới đây gây ra lỗi cú pháp (SyntaxError) khi chạy chương trình?" description="Nhấn vào dòng lệnh bạn cho là chứa lỗi." hint={{ icon: Icon.bulb, label: 'Gợi ý', text: <>Mọi mệnh đề mở khối (<code>if</code>, <code>for</code>, <code>def</code>…) đều phải kết thúc bằng dấu hai chấm.</> }}>
            <SpotError
              filename="python_solution.py"
              lines={[
                { num: 1, content: 'def kiem_tra_tuoi(tuoi):' },
                { num: 2, content: 'if tuoi >= 18', errorLabel: "Thiếu dấu hai chấm ':'" },
                { num: 3, content: '    return "Đã trưởng thành"' },
                { num: 4, content: 'else:' },
                { num: 5, content: '    return "Chưa đủ tuổi"' },
              ]}
              selected={spotErrorSelected}
              onSelect={setSpotErrorSelected}
              correctLine={2}
              checked={checked}
            />
          </ShellB>
        )}

        {step === 11 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={Icon.code} eyebrowLabel="Cú pháp trực quan" metaLabel="Python 3.11" title="Giải phẫu câu lệnh điều kiện" description={<>Quan sát cách khai báo dữ liệu ban đầu kết hợp cùng mệnh đề <code>if</code> để kiểm tra điều kiện logic trước khi thực thi.</>} hint={{ icon: Icon.bulb, label: 'Gợi ý', text: "Dấu hai chấm : ở cuối dòng điều kiện là bắt buộc để mở khối lệnh được thụt lề tiếp theo." }}>
            <CodeAnnotated
              filename="main.py"
              code={[{ num: 1, content: 'diem = 85' }, { num: 2, content: 'if diem >= 80:' }, { num: 3, content: '    print("Đạt loại Giỏi")' }]}
              annotations={[
                { label: 'Khởi tạo biến số nguyên', detail: <>kiểu: <code>int</code></> },
                { label: 'Biểu thức điều kiện so sánh', detail: <>kết quả: <code>True</code></> },
              ]}
            />
          </ShellB>
        )}

        {step === 12 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⟲</>} eyebrowLabel="Thử thách phân loại" metaLabel="Python 3.12" title="Phân loại các giá trị sau vào đúng nhóm kiểu dữ liệu" description="Bấm một token trong kho để cầm lên, rồi bấm vào nhóm muốn thả vào." hint={{ icon: Icon.bulb, label: 'Mẹo ghi nhớ nhanh cú pháp Python', text: <>Bất kỳ giá trị nào nằm trong cặp nháy đơn &apos;&apos; hoặc nháy kép &quot;&quot; đều là kiểu <code>str</code>!</> }}>
            <Classify
              bins={classifyBins}
              pool={classifyPool}
              heldToken={classifyHeld}
              onHold={setClassifyHeld}
              onDrop={(binKey) => {
                if (!classifyHeld) return;
                setClassifyBins((bins) => bins.map((b) => (b.key === binKey ? { ...b, items: [...b.items, classifyHeld] } : b)));
                setClassifyPool((pool) => pool.filter((p) => p !== classifyHeld));
                setClassifyHeld(null);
              }}
            />
          </ShellB>
        )}

        {step === 13 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={Icon.code} eyebrowLabel="Cú pháp cơ bản" title="Hoàn thiện cú pháp tạo danh sách" description="Điền từ khoá hoặc ký hiệu thích hợp vào ô trống để tạo danh sách rỗng trong Python." hint={{ icon: Icon.bulb, label: 'Gợi ý lập trình', text: <>Danh sách trong Python được bao bọc bởi cặp ngoặc vuông <code>[]</code> hoặc khởi tạo qua hàm có sẵn <code>list()</code>.</> }}>
            <FillBlank
              filename="main.py"
              langTag="Python 3.11"
              beforeLines={[{ num: 1, content: <span style={{ color: 'var(--st-syn-comment)' }}># Khởi tạo danh sách sinh viên</span> }]}
              blankLine={{ num: 2, before: 'danh_sach = ', after: '' }}
              afterLines={[{ num: 3, content: 'danh_sach.append("Minh")' }, { num: 4, content: 'print(len(danh_sach))' }]}
              value={blankValue}
              onChange={setBlankValue}
              suggestions={['[]', 'list()', '{}']}
              outputFor={fillBlankOutput}
              correctAnswers={['[]', 'list()']}
              checked={checked}
            />
          </ShellB>
        )}

        {step === 14 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⁂</>} eyebrowLabel="Thử thách tương tác" title="Nối biểu thức Python với kết quả tương ứng" description="Bấm một biểu thức bên trái rồi bấm kết quả khớp bên phải." hint={{ icon: Icon.bulb, label: 'Gợi ý phân tích', text: <>Hàm <code>len()</code> trả về một số nguyên thể hiện độ dài chuỗi, còn phương thức chuỗi <code>.upper()</code> chuyển đổi toàn bộ ký tự thành in hoa.</> }}>
            <MatchPairs
              left={[{ id: 'len', content: 'len("Python")' }, { id: 'upper', content: '"py".upper()' }, { id: 'type', content: 'type(True)' }]}
              right={[{ id: 'r-len', content: <code>6</code> }, { id: 'r-upper', content: <code>&apos;PY&apos;</code> }, { id: 'r-type', content: <code>&lt;class &apos;bool&apos;&gt;</code> }]}
              matched={matched}
              pendingLeft={pendingLeft}
              onPickLeft={(id) => setPendingLeft(id)}
              onPickRight={(id) => {
                if (!pendingLeft) return;
                setMatched((m) => ({ ...m, [pendingLeft]: id }));
                setPendingLeft(null);
              }}
            />
          </ShellB>
        )}

        {step === 15 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>●</>} eyebrowLabel="Interactive REPL" metaLabel="Python 3.12" title="Thực thi biểu thức tức thì" description="Gõ biểu thức logic hoặc toán học vào dòng nhắc để kiểm tra giá trị trả về ngay lập tức." hint={{ icon: Icon.bulb, label: 'Gợi ý', text: <><code>sum()</code> cộng dồn các phần tử, <code>len()</code> đếm số phần tử — chia hai giá trị này ra giá trị trung bình.</> }}>
            <Repl filename="repl_session.py" value={replValue} onChange={setReplValue} sampleOutput={{ value: '20.0', type: 'float' }} />
          </ShellB>
        )}

        {step === 16 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⋮≡</>} eyebrowLabel="Thử thách thuật toán" metaLabel="Logic tư duy" title="Sắp xếp các bước để tính tổng các số chẵn trong danh sách" description="Dùng nút lên/xuống để sắp xếp các khối lệnh theo đúng thứ tự thực thi." hint={{ icon: Icon.bulb, label: 'Gợi ý thuật toán', text: <>Khởi tạo biến tích luỹ trước khi bắt đầu duyệt vòng lặp. Cần kiểm tra điều kiện chẵn (<code>x % 2 == 0</code>) trước khi cộng dồn giá trị.</> }}>
            <OrderSteps
              items={orderItems}
              onMove={(i, dir) => {
                setOrderItems((items) => {
                  const next = [...items];
                  const j = i + dir;
                  if (j < 0 || j >= next.length) return items;
                  [next[i], next[j]] = [next[j], next[i]];
                  return next;
                });
              }}
            />
          </ShellB>
        )}

        {step === 17 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>&gt;_</>} eyebrowLabel="Thực hành thuật toán" title="Đếm số nguyên tố trong danh sách" description={<>Viết hàm <code>count_primes(lst)</code> nhận vào một danh sách các số nguyên và trả về tổng số lượng phần tử là số nguyên tố trong danh sách đó.</>} hint={{ icon: Icon.bulb, label: 'Gợi ý cách giải', text: <>Chỉ cần kiểm tra ước từ 2 tới <code>√n</code> là đủ — độ phức tạp <code>O(n√k)</code>.</> }}>
            <Sandbox
              filename="solution.py"
              langTag="Python 3.11"
              code={[
                { num: 1, content: '# Đếm các số nguyên tố trong mảng đầu vào' },
                { num: 2, content: 'def is_prime(n):' },
                { num: 3, content: '    if n <= 1: return False' },
                { num: 4, content: '    for i in range(2, int(n**0.5) + 1):' },
                { num: 5, content: '        if n % i == 0: return False' },
                { num: 6, content: '    return True' },
                { num: 7, content: 'def count_primes(lst):' },
                { num: 8, content: '    return sum(1 for x in lst if is_prime(x))' },
              ]}
              tests={[
                { label: 'count_primes([2, 3, 5, 7, 8]) == 4', status: 'pass' },
                { label: 'count_primes([4, 6, 8, 9]) == 0', status: 'pass' },
                { label: 'count_primes([11, 13, 17]) == 3', status: 'pass' },
              ]}
              consoleOutput={[
                { text: '$ pytest -q solution.py', tone: 'muted' },
                { text: 'count_primes([2, 3, 5, 7, 8]) → 4', tone: 'ok' },
                { text: 'count_primes([4, 6, 8, 9]) → 0', tone: 'ok' },
                { text: 'count_primes([11, 13, 17]) → 3', tone: 'ok' },
                { text: '3 passed in 0.04s', tone: 'ok' },
              ]}
            />
          </ShellB>
        )}

        {step === 18 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⟲</>} eyebrowLabel="Thử thách lắp ráp mã" title="Hoàn thiện hàm kiểm tra số nguyên tố" description="Bấm một token trong kho rồi bấm vào ô trống để điền vào mã nguồn." hint={{ icon: Icon.bulb, label: 'Gợi ý O(√n)', text: <>Với <code>n &lt; 2</code> trả về <code>False</code>; trong vòng lặp, chỉ cần tìm được một ước là kết luận ngay không phải số nguyên tố.</> }}>
            <Assemble
              filename="prime_checker.py"
              langTag="Python 3.11"
              lines={[
                { num: 1, before: 'def la_so_nguyen_to(n):' },
                { num: 2, before: '    if n < 2:' },
                { num: 3, before: '        return ', slotId: 's1' },
                { num: 4, before: '    for i in range(2, int(n**0.5)+1):' },
                { num: 5, before: '        if n % i == 0:' },
                { num: 6, before: '            ', slotId: 's2' },
                { num: 7, before: '    return True' },
              ]}
              filled={assembleFilled}
              bank={assembleBank}
              heldToken={assembleHeld}
              onHold={setAssembleHeld}
              onFillSlot={(slotId) => {
                if (!assembleHeld) return;
                setAssembleFilled((f) => ({ ...f, [slotId]: assembleHeld }));
                setAssembleBank((b) => b.filter((t) => t !== assembleHeld));
                setAssembleHeld(null);
              }}
            />
          </ShellB>
        )}

        {step === 19 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={Icon.bug} eyebrowLabel="Debug #04" metaLabel="Độ khó: Cơ bản" title="Thử thách Debug: Sửa lỗi tính điểm trung bình" description={<>Hàm <code>tinh_trung_binh</code> đang bị lỗi khi danh sách rỗng (ZeroDivisionError). Chạy chương trình để xem traceback rồi hoàn thiện mã nguồn.</>} hint={{ icon: Icon.bulb, label: 'Gợi ý', text: <>Thêm <code>if not diem_so: return 0</code> ở đầu hàm để chặn trường hợp danh sách rỗng trước khi chia.</> }}>
            <Debug
              filename="solution.py"
              errorBadge="Phát hiện 1 lỗi crash"
              code={[
                { num: 1, content: 'def tinh_trung_binh(diem_so):' },
                { num: 2, content: '    # Chưa kiểm tra điều kiện danh sách rỗng' },
                { num: 3, content: '    tong_diem = sum(diem_so)' },
                { num: 4, content: '    return tong_diem / len(diem_so)' },
                { num: 5, content: '# Gọi thử nghiệm' },
                { num: 6, content: 'print(tinh_trung_binh([8, 9, 10]))' },
              ]}
              errorLine={4}
              errorMessage="ZeroDivisionError: division by zero (khi diem_so = [])"
              tests={[
                { label: 'tinh_trung_binh([8, 9, 10]) == 9.0', status: 'pass' },
                { label: 'tinh_trung_binh([]) == 0', status: 'fail' },
                { label: 'tinh_trung_binh([5]) == 5.0', status: 'pass' },
              ]}
              consoleOutput={[
                { text: '$ python solution.py', tone: 'muted' },
                { text: '9.0' },
                { text: 'Traceback (most recent call last):', tone: 'err' },
                { text: '  File "solution.py", line 4, in tinh_trung_binh', tone: 'err' },
                { text: '    return tong_diem / len(diem_so)', tone: 'err' },
                { text: 'ZeroDivisionError: division by zero', tone: 'err' },
              ]}
            />
          </ShellB>
        )}

        {step === 20 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⚙</>} eyebrowLabel="Mô hình bộ nhớ" title="Mô hình quản lý bộ nhớ: Stack và Heap" description="Biến trên Stack lưu giữ tham chiếu trỏ tới đối tượng thực sự được cấp phát trên Heap." hint={{ icon: Icon.bulb, label: 'Cơ chế dọn rác (Garbage Collection qua Refcount)', text: <>Mỗi khi biến gán trỏ đến một vùng bộ nhớ, bộ đếm tham chiếu (<code>ob_refcnt</code>) tự động tăng lên. Cả <code>y</code> và <code>danh_sach</code> cùng trỏ tới List (<code>Refcount = 2</code>).</> }}>
            <Visual
              stack={[
                { name: 'x', address: '0x7ffe3a', note: 'Trỏ đến PyLong' },
                { name: 'y', address: '0x7ffe8c', note: 'Trỏ đến PyList' },
                { name: 'danh_sach', address: '0x7ffe8c', note: 'Cùng tham chiếu y' },
              ]}
              heap={[
                { tag: 'PyLongObject', address: '0x7ffe3a', refcount: 1, rows: [{ label: 'Kiểu dữ liệu:', value: 'int' }, { label: 'Giá trị:', value: '42' }] },
                { tag: 'PyObject (List)', address: '0x7ffe8c', refcount: 2, rows: [{ label: 'Kiểu:', value: 'list' }, { label: 'Kích thước:', value: '3' }] },
              ]}
            />
          </ShellB>
        )}

        {step === 21 && (
          <Checkpoint
            title="Bạn đã đi được nửa chặng!"
            description="Tuyệt vời! Bạn đang nắm rất vững các quy tắc cốt lõi của ngôn ngữ Python. Hãy duy trì nhịp độ phản xạ này nhé!"
            accuracyLabel="Độ chính xác hiện tại"
            accuracyValue="94%"
            items={[
              { title: '1. Khái niệm & Cú pháp biến hợp lệ', meta: 'Đã làm chủ · 5 câu hỏi', xp: 100 },
              { title: '2. Toán tử so sánh & Cấu trúc rẽ nhánh if/else', meta: 'Đã làm chủ · 6 câu hỏi', xp: 120 },
              { title: '3. Thao tác danh sách & Lắp ráp mã nguồn', meta: 'Đã làm chủ · 5 câu hỏi', xp: 100 },
            ]}
            onContinue={goNext}
            onPause={() => router.push('/admin')}
          />
        )}

        {step === 22 && (
          <Recap
            xpLabel="+50 XP"
            title="Bài học hoàn tất!"
            description="Bạn đã bổ sung thêm 3 kiến thức quan trọng vào kho tàng lập trình Python hôm nay."
            stats={[{ icon: '🎯', value: '92%', label: 'Độ chính xác' }, { icon: '⏱', value: '4p 15s', label: 'Thời gian' }, { icon: '🔥', value: '4 ngày', label: 'Chuỗi Streak' }]}
            facts={[
              'Python quản lý biến bằng con trỏ tham chiếu trỏ tới đối tượng trên Heap.',
              'Thụt lề (Indentation) 4 khoảng trắng là bắt buộc để xác định khối lệnh.',
              'Toán tử == dùng để so sánh bằng, còn toán tử = dùng cho phép gán.',
            ]}
            onFinish={goNext}
          />
        )}

        {step === 23 && (
          <ShellB eyebrowIcon={<>▤</>} eyebrowLabel="Cắt lát danh sách (List Slicing)" title={<>Đoạn mã <code>numbers[:2]</code> trả về kết quả gì?</>} description="Màn minh hoạ TRẠNG THÁI PHẢN HỒI ĐÚNG — đây là dải băng hiện ra sau khi người học chọn đúng đáp án.">
            <Mcq
              options={[
                { key: 'A', label: '[10, 20]' },
                { key: 'B', label: '[10, 20, 30]' },
                { key: 'C', label: '[20, 30]' },
                { key: 'D', label: '[30, 40, 50]' },
              ]}
              selected="A"
              onSelect={() => {}}
              correctKey="A"
              checked
            />
            <FeedbackBanner correct title="Chính xác!" explanation={<>Cú pháp <code>[:2]</code> lấy lát từ chỉ số 0 đến trước chỉ số 2 (gồm 2 phần tử đầu).</>} />
          </ShellB>
        )}

        {step === 24 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>▦</>} eyebrowLabel="Bài tập vòng lặp" metaLabel="Thử thách 06" title="Bảng theo dõi giá trị biến (Trace Table)" description="Dự đoán giá trị của biến qua từng vòng lặp và điền vào ô tương ứng." hint={{ icon: Icon.bulb, label: 'Mẹo nhỏ', text: <>Giá trị mới của <code>out</code> được tính trước, sau đó giá trị <code>x</code> mới được tăng thêm 1 đơn vị.</> }}>
            <TraceTable
              filename="loop_trace.py"
              code={[{ num: 1, content: 'x = 1' }, { num: 2, content: 'out = 0' }, { num: 3, content: 'while x <= 3:' }, { num: 4, content: '    out = out + x * 2' }, { num: 5, content: '    x += 1' }]}
              columns={['x', 'out']}
              rows={[
                { step: 'Khởi tạo', values: { x: '1', out: '0' } },
                { step: 'Vòng lặp 1', values: { x: '2', out: null } },
                { step: 'Vòng lặp 2', values: { x: null, out: null } },
                { step: 'Vòng lặp 3', values: { x: null, out: null } },
              ]}
              answers={traceAnswers}
              onAnswerChange={(k, v) => setTraceAnswers((a) => ({ ...a, [k]: v }))}
            />
          </ShellB>
        )}

        {step === 25 && (
          <ShellB eyebrowIcon={Icon.help} eyebrowLabel="Trắc nghiệm đơn" title="Hàm nào dùng để chuyển một chuỗi số thành số nguyên?" description="Màn minh hoạ TRẠNG THÁI PHẢN HỒI SAI — dải băng đỏ kèm giải thích ngắn.">
            <Mcq
              options={[{ key: 'A', label: 'str()' }, { key: 'B', label: 'int()' }, { key: 'C', label: 'float()' }]}
              selected="A"
              onSelect={() => {}}
              correctKey="B"
              checked
            />
            <FeedbackBanner correct={false} title="Chưa đúng" explanation={<><code>str()</code> chuyển giá trị THÀNH chuỗi. Để chuyển chuỗi số thành số nguyên, dùng <code>int()</code>.</>} />
          </ShellB>
        )}

        {step === 26 && (
          <ShellB eyebrowIcon={Icon.warn} eyebrowLabel="Thử thách Debug #5" metaLabel="ZeroDivisionError" title="Tính điểm trung bình của danh sách học viên" description={<>Hàm <code>tinh_trung_binh(diem_so)</code> hiện đang gặp sự cố sập chương trình khi danh sách đầu vào rỗng. Hãy xử lý ngoại lệ này an toàn.</>}>
            <HintSheet
              levels={[
                { title: 'Gợi ý 1: Điều kiện biên', locked: false, body: <>Trước khi thực hiện phép chia <code>len(diem_so)</code>, hãy dùng câu lệnh <code>if not diem_so:</code> để kiểm tra xem danh sách có rỗng hay không. Nếu rỗng, bạn có thể trả về 0 để tránh lỗi phép chia cho 0.</> },
                { title: 'Gợi ý 2: Cấu trúc rẽ nhánh', locked: true, cost: 5, body: <>Đặt <code>return 0</code> ngay trong nhánh <code>if</code>, phần tính trung bình giữ nguyên ở nhánh còn lại.</> },
                { title: 'Gợi ý 3 (Lời giải chi tiết)', locked: true, cost: 10, body: <><code>def tinh_trung_binh(diem_so): if not diem_so: return 0; return sum(diem_so) / len(diem_so)</code></> },
              ]}
              openIndex={hintSheetIndex}
              onUnlock={setHintSheetIndex}
              onBackToCode={goNext}
              onContinueWriting={goNext}
            />
          </ShellB>
        )}

        {step === 27 && (
          <ShellB hintOpen={hintOpen} eyebrowIcon={<>⋮≡</>} eyebrowLabel="Thử thách logic" metaLabel="Python 3.11" title="Parsons Problem: Xây dựng cấu trúc rẽ nhánh" description="Bấm sắp xếp các dòng lệnh hợp lệ theo đúng thứ tự. Bỏ qua 2 dòng gây nhiễu (distractors)." hint={{ icon: Icon.bulb, label: 'Mẹo căn lề', text: 'Mỗi thụt lề chuẩn trong Python tương ứng với 4 khoảng trắng. Các khối mã nằm dưới câu lệnh có dấu hai chấm : bắt buộc phải lùi vào trong.' }}>
            <Parsons
              filename="workspace_solution.py"
              builtLines={parsonsBuilt}
              pool={parsonsPool}
              onPick={(id) => {
                const item = parsonsPool.find((p) => p.id === id);
                if (!item) return;
                setParsonsBuilt((b) => [...b, { id: item.id, content: item.content, indent: b.length ? 1 : 0 }]);
                setParsonsPool((pool) => pool.filter((p) => p.id !== id));
              }}
              onAttemptDistractor={() => {}}
            />
          </ShellB>
        )}

        {checked && verdict && (
          <FeedbackBanner
            correct={verdict.correct}
            title={verdict.correct ? 'Chính xác!' : 'Chưa đúng'}
            explanation={verdict.explain}
          />
        )}
      </LessonChrome>
    </>
  );
}
