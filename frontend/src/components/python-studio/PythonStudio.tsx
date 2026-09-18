'use client';

/* eslint-disable @next/next/no-img-element */
// Full document navigation clears legacy per-page global styles on course pages.
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-page-custom-font */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import {
  ANSWER_KEY,
  canAdvance,
  explanationScore,
  initialDraft,
  MUTATIONS,
  OPERATIONS,
  PYTHON_LESSON_NUMBER,
  SOLUTION_CODE,
  STARTER_CODE,
  type Draft,
  type RunResult,
} from '@/lib/python-studio';
import s from './studio.module.css';

function Icon({
  step = 1,
  n = '',
  vector = false,
}: {
  step?: number;
  n?: number | string;
  vector?: boolean;
}) {
  return (
    <img
      className={s.icon}
      src={`/static/python-studio/s${step}-img${vector ? 'Vector' : 'Container'}${n}.svg`}
      alt=""
    />
  );
}
const STEP_NAMES = [
  'S1: Hiểu & Dự đoán',
  'S2: Bẫy ngộ nhận',
  'S3: Bộ nhớ trực quan',
  'S4: Sandbox IDE',
];
function Stepper({ current }: { current: number }) {
  return (
    <div className={s.stepper} aria-label={`Bước ${current} trên 4`}>
      {STEP_NAMES.map((label, index) => {
        const n = index + 1;
        const state =
          n < current ? s.stepDone : n === current ? s.stepCurrent : s.stepTodo;
        return (
          <Fragment key={label}>
            {index > 0 && <i className={s.stepDivider} />}
            <span
              className={`${s.step} ${state}`}
              aria-current={n === current ? 'step' : undefined}
            >
              <span className={s.stepMark}>
                {n < current ? (
                  <img src="/static/python-studio/s3-stepper-check.svg" alt="" />
                ) : (
                  n
                )}
              </span>
              {label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${s.card} ${className}`}>{children}</section>;
}
function Code({ code, active = -1 }: { code: string; active?: number }) {
  return (
    <div className={s.codeLines}>
      {code.split('\n').map((line, i) => (
        <div className={active === i ? s.activeLine : ''} key={i}>
          <span>{i + 1}</span>
          <code>
            {line
              .split(
                /(#.*$|"[^"\n]*"|'[^'\n]*'|\b(?:def|return|for|in|if|else|print|len|round)\b|\b\d+(?:\.\d+)?\b)/g,
              )
              .map((part, j) => (
                <span
                  key={j}
                  className={
                    part.startsWith('#')
                      ? s.comment
                      : /^(def|return|for|in|if|else)$/.test(part)
                        ? s.keyword
                        : /^\d|^["']/.test(part)
                          ? s.literal
                          : ''
                  }
                >
                  {part}
                </span>
              ))}
          </code>
        </div>
      ))}
    </div>
  );
}
function Choice({
  name,
  value,
  selected,
  onChange,
  title,
  detail,
}: {
  name: string;
  value: string;
  selected: string;
  onChange: (v: string) => void;
  title: string;
  detail?: string;
}) {
  return (
    <label className={`${s.choice} ${selected === value ? s.selected : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected === value}
        onChange={() => onChange(value)}
      />
      <span>
        {title}
        {detail && <small>{detail}</small>}
      </span>
    </label>
  );
}
const predictionCode =
  'scores_original = [85, 92, 78]\nscores_backup = scores_original\nscores_backup.append(99)\nprint("Gốc:", len(scores_original), "Bản sao:",\n      len(scores_backup))';
const HINTS = [
  'Phép gán không sao chép list. Hai tên cùng tham chiếu một đối tượng; append làm thay đổi đối tượng đó.',
  'Slice [:] tạo list mới. append, extend, sort, pop sửa list hiện tại; +, sorted và [:] tạo list mới.',
  'Khởi tạo result = [] để chỉ chứa các giá trị đạt ngưỡng. Dùng if val >= threshold và result.append(val).',
  'Tạo result = [], duyệt raw_scores, bỏ điểm âm rồi thêm round(score + bonus, 2). Không sửa raw_scores.',
];

export default function PythonStudio() {
  const [d, setD] = useState<Draft>(initialDraft);
  const [user, setUser] = useState<{
    id: number;
    name: string;
    xp: number;
    role?: string;
  } | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [completed, setCompleted] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [help, setHelp] = useState(0);
  const [selectedToken, setSelectedToken] = useState('');
  const [trace, setTrace] = useState(0);
  const [alternate, setAlternate] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = user ? `pe-python-studio-v1:${user.id}:11` : null;
  const update = (changes: Partial<Draft>) =>
    setD((prev) => ({ ...prev, ...changes }));

  async function json(path: string, options?: RequestInit) {
    const response = await apiFetch(path, options);
    if (response.status === 401) {
      window.location.assign(
        '/login?next=' + encodeURIComponent('/lesson/python'),
      );
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false)
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message ||
              body.error ||
              `Không thể kết nối (${response.status}).`,
      );
    return body;
  }
  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [profile, enrollments] = await Promise.all([
        json('/api/user'),
        json('/api/enrolled'),
      ]);
      const enrollment = findEnrollment(
        asList(enrollments, 'enrolled'),
        'python',
      );
      setReward(
        typeof enrollments.pythonStudio?.xpReward === 'number'
          ? enrollments.pythonStudio.xpReward
          : null,
      );
      let restored = initialDraft();
      try {
        const stored = JSON.parse(
          localStorage.getItem(`pe-python-studio-v1:${profile.id}:11`) ||
            'null',
        );
        if (
          stored &&
          typeof stored.code === 'string' &&
          Array.isArray(stored.slots) &&
          stored.slots.length === 3 &&
          stored.bins &&
          typeof stored.explanation === 'string'
        ) {
          restored = {
            ...restored,
            ...stored,
            step: Math.min(4, Math.max(1, Number(stored.step) || 1)),
            code: stored.code.slice(0, 15000),
          };
        }
      } catch {
        /* A missing/corrupt draft must not block learning. */
      }
      setD(restored);
      setUser(profile);
      setEnrolled(Boolean(enrollment));
      setCompleted(
        Array.isArray(enrollment?.completedLessonNumbers) &&
          enrollment.completedLessonNumbers.includes(PYTHON_LESSON_NUMBER),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Không kết nối được backend.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const init = setTimeout(() => void load(), 0);
    document.title = 'Python Studio · List & Mutability | Programming Edu';
    return () => {
      clearTimeout(init);
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!draftKey || loading) return;
    const save = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(d));
        setSaveStatus('Đã lưu bản nháp trên máy');
      } catch {
        setSaveStatus('Không lưu được bản nháp trên máy');
      }
    }, 100);
    return () => clearTimeout(save);
  }, [d, draftKey, loading]);

  async function enroll() {
    setBusy(true);
    setMessage('');
    try {
      await json('/api/courses/python/enroll', { method: 'POST' });
      setEnrolled(true);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function complete() {
    setBusy(true);
    try {
      const saved = await json(
        `/api/lessons/${PYTHON_LESSON_NUMBER}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: 'python',
            lessonTitle: 'Danh sách (List) — List & Mutability',
            quizScore: 100,
          }),
        },
      );
      setCompleted(true);
      setMessage(
        saved.alreadyCompleted
          ? 'Bài học đã hoàn thành trước đó. Tiến độ được giữ nguyên, không cộng XP lần hai.'
          : `Hoàn thành bài học! +${saved.xpGained} XP. Đã lưu tiến độ lên backend.`,
      );
      setUser((prev) =>
        prev ? { ...prev, xp: prev.xp + saved.xpGained } : prev,
      );
    } catch (error) {
      setMessage(
        `Code đã đạt, nhưng chưa lưu được tiến độ: ${(error as Error).message}. Bấm Nộp & Chấm điểm để thử lại.`,
      );
    } finally {
      setBusy(false);
    }
  }
  function cancelRun() {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    setRunning(false);
    setRuntimeStatus('Đã dừng chạy');
  }
  function run(submit: boolean) {
    if (running || busy) return;
    if (
      submit &&
      !(
        d.predicted &&
        d.quizDone &&
        d.classified &&
        d.explained &&
        d.traced &&
        d.counter === '2'
      )
    ) {
      setMessage('Hãy hoàn thành cả 3 bước học trước khi nộp bài.');
      return;
    }
    setMessage('');
    setResult(null);
    setRunning(true);
    setRuntimeStatus('Đang tải Python…');
    const instance = new Worker('/static/js/python-studio.worker.js');
    worker.current = instance;
    const expire = (text: string) => {
      cancelRun();
      setResult({
        tests: [],
        output: '',
        error: text,
        duration: 0,
        version: '',
      });
    };
    timer.current = setTimeout(
      () => expire('Tải Python quá lâu. Kiểm tra kết nối mạng rồi thử lại.'),
      60000,
    );
    instance.onerror = () =>
      expire('Không tải được bộ chạy Python. Kiểm tra kết nối rồi thử lại.');
    instance.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(
          () =>
            expire(
              'Chương trình vượt giới hạn 5 giây. Kiểm tra vòng lặp vô hạn.',
            ),
          5000,
        );
        setRuntimeStatus('Đang chạy và kiểm tra…');
        return;
      }
      cancelRun();
      setRuntimeStatus(`Python ${data.version || ''}`);
      setResult(data);
      if (
        submit &&
        !data.error &&
        data.tests.length === 5 &&
        data.tests.every((t: { passed: boolean }) => t.passed)
      )
        void complete();
    };
    instance.postMessage({ code: d.code, submit });
  }
  function changeStep(step: number) {
    update({ step });
    setMessage('');
    setHint(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function classify(group: string, token = selectedToken) {
    if (!OPERATIONS.includes(token)) return;
    // Derive from the previous state rather than the render closure: two drops
    // landing in one batch must not discard each other.
    setD((prev) => ({
      ...prev,
      bins: { ...prev.bins, [token]: group },
      classified: false,
    }));
    setSelectedToken('');
  }
  function unclassify(token: string) {
    setD((prev) => {
      const bins = { ...prev.bins };
      delete bins[token];
      return { ...prev, bins, classified: false };
    });
  }
  function runTrace(all = false) {
    if (d.slots.some((slot) => !slot)) {
      setMessage('Hãy lắp đủ 3 khối mã trước khi chạy.');
      return;
    }
    if (d.slots[0] === 'result = data') {
      setMessage(
        'Bẫy alias: thêm vào result cũng sửa data đang được duyệt. Hãy tạo một danh sách mới.',
      );
      setTrace(1);
      update({ traced: false });
      return;
    }
    if (d.slots[0] !== 'result = []') {
      setMessage(
        'copy() tạo vùng nhớ mới nhưng giữ tất cả phần tử. Với bài lọc này, hãy khởi tạo result = [] để tránh lặp và giữ cả giá trị dưới ngưỡng.',
      );
      setTrace(1);
      update({ traced: false });
      return;
    }
    const next = all ? 4 : Math.min(4, trace + 1);
    setTrace(next);
    setMessage('');
    update({ traced: next === 4 });
  }
  const headerIcons =
    d.step === 1
      ? [16, 17, 18, 19, 20]
      : d.step === 2
        ? [16, 17, 18, 19, 20]
        : d.step === 3
          ? [20, 21, 22, 23, 24]
          : [23, 24, 25, 26, 27];
  const footerIcons =
    d.step <= 2
      ? [11, 12, 13, 14, 15]
      : d.step === 3
        ? [15, 16, 17, 18, 19]
        : [18, 19, 20, 21, 22];
  const isAdmin = user?.role === 'admin';
  const input = alternate ? [5, 15, 25] : [10, 20, 30];
  const filtered = input.filter((v) => v >= 15);
  const traceResult =
    trace === 0
      ? null
      : trace === 1
        ? d.slots[0] === 'result = []'
          ? []
          : input
        : filtered.slice(0, Math.min(2, trace - 1));
  const assembled = `def clone_and_filter(data, threshold):\n    ${d.slots[0] || '# Chọn khối mã cho Slot 1'}\n    for val in data:\n        ${d.slots[1] || '# Chọn khối mã cho Slot 2'}\n            ${d.slots[2] || '# Chọn khối mã cho Slot 3'}\n    return result\n\n# Khởi chạy thực nghiệm:\ndata = [${input.join(', ')}]; threshold = 15\nfinal_res = clone_and_filter(data, threshold)`;
  const passed = result?.tests.filter((t) => t.passed).length || 0;

  return (
    <div className={s.studio}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <header className={s.header}>
        <div className={s.headerInner}>
          <a
            className={s.iconButton}
            href="/courses/python"
            aria-label="Đóng bài học"
          >
            <Icon step={d.step} n={headerIcons[0]} />
          </a>
          <a className={s.brand} href="/dashboard">
            Programming Edu
          </a>
          <div className={s.breadcrumb}>
            Python Core <Icon step={d.step} n={headerIcons[1]} /> Module 02{' '}
            <Icon step={d.step} n={headerIcons[1]} />{' '}
            <strong>Bài 11: List &amp; Mutability</strong>
          </div>
          <div className={s.headerActions}>
            <span className={s.xp}>
              <Icon step={d.step} n={headerIcons[2]} /> {user?.xp ?? '—'} XP
            </span>
            <button
              className={s.iconButton}
              aria-label="Đánh dấu bài học"
              aria-pressed={d.bookmark}
              onClick={() => update({ bookmark: !d.bookmark })}
              style={{ background: d.bookmark ? '#eef2ff' : undefined }}
            >
              <Icon step={d.step} n={headerIcons[3]} />
            </button>
            <a
              href="/dashboard#profile"
              className={s.avatar}
              title={user?.name || 'Tài khoản'}
            >
              <Icon step={d.step} n={headerIcons[4]} />
            </a>
          </div>
        </div>
      </header>
      <main className={s.main}>
        {loading ? (
          <Card>
            <p role="status">Đang tải khóa học và tiến độ…</p>
          </Card>
        ) : loadError ? (
          <Card>
            <h1>Chưa kết nối được khóa học</h1>
            <p role="alert">{loadError}</p>
            <button className={s.primary} onClick={() => void load()}>
              Thử lại
            </button>
          </Card>
        ) : !enrolled ? (
          <Card>
            <span className={s.pill}>PYTHON STUDIO · 4 BƯỚC</span>
            <h1>List &amp; Mutability</h1>
            <p>
              Khám phá tham chiếu, luyện tập với bộ nhớ trực quan và tự viết
              Python. Đăng ký khóa học miễn phí để lưu tiến độ.
            </p>
            <button
              className={s.primary}
              disabled={busy}
              onClick={() => void enroll()}
            >
              {busy ? 'Đang đăng ký…' : 'Đăng ký khóa Python & bắt đầu'}
            </button>
          </Card>
        ) : (
          <>
            <div className={`${s.banner} ${d.step === 2 ? s.slimBanner : ''}`}>
              <div>
                <span className={s.pill}>
                  ● BƯỚC {d.step}/4{' '}
                  {d.step === 1
                    ? '• HIỂU & DỰ ĐOÁN (PRIMM)'
                    : d.step === 3
                      ? '• LUYỆN CÓ HỖ TRỢ & BỘ NHỚ TRỰC QUAN'
                      : d.step === 4
                        ? '• SANDBOX TỰ CODE'
                        : ''}
                </span>
                <span className={s.bannerTitle}>
                  {
                    [
                      'Kiến trúc CPython: Con trỏ tham chiếu & Vùng nhớ Heap',
                      'Bẫy bộ nhớ Slice Cloning & Cơ chế In-place Mutation',
                      'Python Shallow Copy vs Reference & Mutability Isolation',
                      'S1–S3 Hoàn tất · Thử thách độc lập',
                    ][d.step - 1]
                  }
                </span>
              </div>
              <div className={s.badges}>
                {d.step === 1 ? (
                  <>
                    <span>
                      Cổng chặn:{' '}
                      <b className={d.predicted ? s.green : s.amber}>
                        <Icon /> {d.predicted ? 'Đã mở' : 'Chờ phản hồi'}
                      </b>
                    </span>
                    <span>
                      Độ khó: <b className={s.blue}>Cốt lõi (Foundation)</b>
                    </span>
                  </>
                ) : d.step === 4 ? (
                  <>
                    <span className={s.green}>
                      <Icon step={4} n={1} /> Anti-Mutation: ACTIVE
                    </span>
                    <span className={s.amber}>
                      <Icon step={4} n={2} /> +{reward ?? '—'} XP
                    </span>
                  </>
                ) : d.step === 3 ? (
                  <Stepper current={3} />
                ) : (
                  <span className={s.plainBadge}>
                    <b className={s.green}>
                      <Icon step={d.step} /> Bước {d.step - 1} đã xong
                    </b>
                    <i className={s.badgeDot}>•</i>
                    FACT Stage II
                  </span>
                )}
              </div>
            </div>
            {completed && (
              <div className={s.success} role="status">
                ✓ Bài này đã hoàn thành và được lưu trên hệ thống. Bạn có thể
                luyện tập lại.
              </div>
            )}
            {d.step === 1 && (
              <div className={s.twoColumns}>
                <div className={s.stack}>
                  <Card className={s.scenario}>
                    <div className={s.titleRow}>
                      <span className={s.iconBox}>
                        <Icon n={1} />
                      </span>
                      <div>
                        <h1>
                          Ngữ cảnh: GameHub USTH <small>v2.4</small>
                        </h1>
                        <p>
                          Hệ thống bảng xếp hạng giải đấu eSports cần tạo một
                          bản dự phòng điểm thi đấu vòng loại. Kỹ thuật viên
                          dùng toán tử gán trực tiếp để tạo bản sao và thêm điểm
                          thưởng sau trận knock-out.
                        </p>
                      </div>
                    </div>
                  </Card>
                  <div className={s.codeCard}>
                    <div className={s.editorHeader}>
                      <span className={s.dots}>
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>tournament_state.py</span>
                      <small>Python 3.12</small>
                      <button
                        aria-label="Sao chép mã ví dụ"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(predictionCode)
                            .then(() => setMessage('Đã sao chép mã ví dụ.'))
                            .catch(() =>
                              setMessage(
                                'Không thể sao chép. Bạn có thể chọn đoạn mã và sao chép thủ công.',
                              ),
                            )
                        }
                      >
                        <Icon n={2} />
                      </button>
                    </div>
                    <Code code={predictionCode} />
                  </div>
                  <Card>
                    <div className={s.titleRow}>
                      <span className={s.iconBox}>?</span>
                      <div>
                        <h2>Cổng dự đoán (PRIMM: Predict)</h2>
                        <small>
                          Dòng lệnh cuối sẽ xuất kết quả nào ra màn hình
                          Console?
                        </small>
                      </div>
                    </div>
                    <div className={s.choices}>
                      <Choice
                        name="predict"
                        value="a"
                        selected={d.prediction}
                        onChange={(v) =>
                          update({ prediction: v, predicted: false })
                        }
                        title="A. Gốc: 3, Bản sao: 4"
                        detail="Biến scores_backup tạo ra mảng độc lập mới trên RAM"
                      />
                      <Choice
                        name="predict"
                        value="b"
                        selected={d.prediction}
                        onChange={(v) =>
                          update({ prediction: v, predicted: false })
                        }
                        title="B. Gốc: 4, Bản sao: 4"
                        detail="Cả 2 biến cùng trỏ đến 1 đối tượng danh sách duy nhất"
                      />
                      <Choice
                        name="predict"
                        value="c"
                        selected={d.prediction}
                        onChange={(v) =>
                          update({ prediction: v, predicted: false })
                        }
                        title="C. Báo lỗi AttributeError"
                        detail="Không thể dùng hàm .append() trực tiếp trên tham chiếu"
                      />
                      <Choice
                        name="predict"
                        value="d"
                        selected={d.prediction}
                        onChange={(v) =>
                          update({ prediction: v, predicted: false })
                        }
                        title="D. Gốc: 3, Bản sao: 3"
                        detail="Toán tử .append() tạo list mới và không cập nhật tại chỗ"
                      />
                    </div>
                    <button
                      className={`${s.primary} ${s.full}`}
                      disabled={!d.prediction}
                      onClick={() => {
                        update({ predicted: true });
                        setMessage(
                          d.prediction === 'b'
                            ? 'Chính xác! Hai tên cùng trỏ đến một list.'
                            : 'Dự đoán đã được ghi nhận. Đáp án đúng là B; đọc giải thích bên phải để hiểu vì sao.',
                        );
                      }}
                    >
                      <Icon n={3} /> Xác nhận dự đoán để mở khóa giải thích
                    </button>
                  </Card>
                  <aside className={s.warning}>
                    <Icon n={4} />
                    <div>
                      <strong>
                        Ngộ nhận kinh điển từ C/C++: “Biến là chiếc hộp chứa giá
                        trị”
                      </strong>
                      <p>
                        Trong Python, biến không phải là ô nhớ chứa dữ liệu.
                        Biến là chiếc thẻ tên (name tag) được gán để tham chiếu
                        đến đối tượng trong Heap Memory!
                      </p>
                    </div>
                  </aside>
                </div>
                <div className={s.stack}>
                  <Card>
                    <div className={s.titleRow}>
                      <Icon n={5} />
                      <h2>Mô hình thực thi bộ nhớ (CPython Runtime)</h2>
                      <small className={s.monoBadge}>
                        Heap Addr: 0x7fff892a0
                      </small>
                    </div>
                    <p>
                      Quan sát trực quan cách 2 định danh trên Stack trỏ tới
                      cùng địa chỉ trong RAM Heap:
                    </p>
                    <div className={s.memory}>
                      <div className={s.memoryGrid}>
                        <div>
                          <h3>
                            <Icon n={6} /> STACK (BIẾN TÊN)
                          </h3>
                          <div className={s.pointer}>
                            <small>Identifier (Scope Global)</small>
                            <code>scores_original</code>
                            <small>ptr: 0x7fff892a0</small>
                          </div>
                          <span className={s.alias}>= gán tham chiếu</span>
                          <div className={s.pointer}>
                            <small>Identifier (Alias)</small>
                            <code>scores_backup</code>
                            <small>ptr: 0x7fff892a0</small>
                          </div>
                        </div>
                        <div className={s.arrows}>
                          <Icon vector />
                          <Icon vector n={1} />
                          <Icon vector n={2} />
                        </div>
                        <div>
                          <h3>
                            <Icon n={7} /> HEAP (ĐỐI TƯỢNG DANH SÁCH)
                          </h3>
                          <div className={s.heap}>
                            <div className={s.titleRow}>
                              <strong>🟢 PyListObject</strong>
                              <small>ob_refcnt: 2</small>
                            </div>
                            <div className={s.cells}>
                              {[85, 92, 78, 99].map((v, i) => (
                                <div
                                  key={v}
                                  className={i === 3 ? s.newCell : ''}
                                >
                                  <small>[ {i} ]</small>
                                  <strong>{v}</strong>
                                  <small>
                                    {i === 3 ? '.append()' : `id: 0x1B${i}`}
                                  </small>
                                </div>
                              ))}
                            </div>
                            <div className={s.titleRow}>
                              <small>
                                Dung lượng hiện tại: <b>4 phần tử</b>
                              </small>
                              <small className={s.green}>
                                <Icon n={8} /> Mutable
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={s.consoleLine}>
                        <span>
                          &gt;&gt;&gt; id(scores_original) == id(scores_backup)
                        </span>
                        <b>True</b>
                        <small>(Chung một vị trí trên RAM)</small>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div className={s.titleRow}>
                      <span className={s.iconBox}>
                        <Icon n={9} />
                      </span>
                      <h2>Bản chất cơ chế CPython: Vì sao đáp án là B?</h2>
                      <small className={s.monoBadge}>
                        <Icon n={10} />{' '}
                        {d.predicted
                          ? 'Đã mở khóa'
                          : 'Khóa cho đến khi dự đoán'}
                      </small>
                    </div>
                    <div
                      className={!d.predicted ? s.lockedExplanation : ''}
                      aria-hidden={!d.predicted}
                    >
                      {[
                        <>
                          <b>Dòng 1:</b> Python cấp phát bộ nhớ tại địa chỉ{' '}
                          <code>0x7fff892a0</code> chứa đối tượng danh sách [85,
                          92, 78]. <code>scores_original</code> tham chiếu tới
                          địa chỉ này.
                        </>,
                        <>
                          <b>Dòng 2 (Mấu chốt):</b>{' '}
                          <code>scores_backup = scores_original</code> KHÔNG
                          nhân bản list. Nó chỉ tạo thêm một tham chiếu cùng trỏ
                          tới đối tượng đó.
                        </>,
                        <>
                          <b>Dòng 3:</b> <code>.append(99)</code> thay đổi trực
                          tiếp list trên Heap. Vì hai biến cùng tham chiếu một
                          đối tượng, cả hai đều nhìn thấy 4 phần tử!
                        </>,
                      ].map((text, i) => (
                        <div className={s.explanation} key={i}>
                          <b>{i + 1}</b>
                          <p>{text}</p>
                        </div>
                      ))}
                      <div className={s.copySolution}>
                        Giải pháp tạo bản sao độc lập (Shallow Copy):{' '}
                        <code>scores_backup = scores_original.copy()</code>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            {d.step === 2 && (
              <>
                <div className={s.equalColumns}>
                  <Card>
                    <div className={s.eyebrow}>
                      Q1 • Trắc nghiệm bẫy <small>Slice Copy Mechanism</small>
                      <Icon step={2} n={5} />
                    </div>
                    <h2>
                      Điều gì xảy ra trong bộ nhớ khi thực thi đoạn mã sau?
                    </h2>
                    <div className={s.codeCard}>
                      <div className={s.editorHeader}>
                        python_memory_test.py{' '}
                        <small className={s.amber}>CPython 3.11</small>
                      </div>
                      <Code
                        code={'a = [1, 2]\nb = a[:]\n# id(a) so với id(b)?'}
                      />
                    </div>
                    <div className={s.choices}>
                      {[
                        [
                          'a',
                          'A. Biến b trỏ cùng địa chỉ ô nhớ heap với a',
                          'Hai biến là bí danh (alias) của cùng một danh sách.',
                        ],
                        [
                          'b',
                          'B. Python tạo danh sách mới với id(a) != id(b)',
                          'Shallow slice cấp phát một container mới độc lập.',
                        ],
                        [
                          'c',
                          'C. Lệnh [:] chỉ áp dụng cho String, báo lỗi TypeError',
                          'List không hỗ trợ toán tử slicing.',
                        ],
                        [
                          'd',
                          'D. Chỉ copy phần tử đầu tiên vào biến b',
                          'Toán tử thiếu stop value nên dừng tại index 0.',
                        ],
                      ].map(([value, title, detail]) => (
                        <Choice
                          key={value}
                          name="slice"
                          {...{ value, title, detail }}
                          selected={d.quiz}
                          onChange={(quiz) => update({ quiz, quizDone: false })}
                        />
                      ))}
                    </div>
                    <button
                      className={`${s.primary} ${s.full}`}
                      disabled={!d.quiz}
                      onClick={() => {
                        update({ quizDone: d.quiz === 'b' });
                        setMessage(
                          d.quiz === 'b'
                            ? 'Đúng! Slice tạo container mới. Các phần tử lồng nhau vẫn có thể được dùng chung.'
                            : 'Chưa đúng. Hãy nhớ [:] là shallow copy, tạo container mới.',
                        );
                      }}
                    >
                      Xác nhận phân tích <Icon step={2} n={6} />
                    </button>
                    {d.quizDone && (
                      <p className={s.green}>✓ Đã hoàn thành câu hỏi</p>
                    )}
                  </Card>
                  <Card>
                    <div className={s.eyebrow}>
                      Phân loại thao tác <small>In-place vs Pure</small>
                      <Icon step={2} n={1} />
                    </div>
                    <h2>Kéo hoặc Chạm để phân loại thao tác bộ nhớ</h2>
                    <p className={s.muted}>
                      <Icon step={2} n={2} /> Chọn thẻ lệnh bên dưới, sau đó
                      chạm vào vùng mong muốn để thả.
                    </p>
                    <div className={s.tokenQueue}>
                      <div className={s.titleRow}>
                        <small>Hàng chờ phân loại:</small>
                        <code>
                          {OPERATIONS.filter((op) => !d.bins[op]).length} thẻ
                          còn lại
                        </code>
                      </div>
                      <div className={s.tokens}>
                        {OPERATIONS.every((op) => d.bins[op]) && (
                          <small className={s.queueEmpty}>
                            Đã xếp hết 7 thẻ. Bấm thẻ trong nhóm để lấy lại.
                          </small>
                        )}
                        {OPERATIONS.filter((op) => !d.bins[op]).map((op) => (
                          <button
                            className={selectedToken === op ? s.selected : ''}
                            key={op}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', op);
                              setSelectedToken(op);
                            }}
                            onClick={() => setSelectedToken(op)}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={s.binGrid}>
                      {[
                        [
                          'mutate',
                          'In-place Mutation',
                          'Cùng ô nhớ',
                          'Biến đổi trực tiếp trên heap hiện tại.',
                        ],
                        [
                          'pure',
                          'Pure / New Object',
                          'Tạo id mới',
                          'Tạo container mới, bảo toàn dữ liệu gốc.',
                        ],
                      ].map(([key, title, subtitle, desc]) => {
                        const label = key === 'mutate' ? 'In-place' : 'Pure';
                        const placed = OPERATIONS.filter(
                          (op) => d.bins[op] === key,
                        );
                        return (
                        <div
                          className={s.bin}
                          key={key}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            classify(key, e.dataTransfer.getData('text/plain'));
                          }}
                        >
                          <h3>
                            {title} <small>{subtitle}</small>
                          </h3>
                          <p>{desc}</p>
                          <div
                            className={`${s.dropZone} ${selectedToken ? s.dropZoneReady : ''}`}
                          >
                            {placed.length > 0 && (
                              <div className={s.tokens}>
                                {placed.map((op) => (
                                  <button
                                    title="Trả về hàng chờ"
                                    key={op}
                                    onClick={() => unclassify(op)}
                                  >
                                    {op} ×
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              className={s.dropTarget}
                              onClick={() => classify(key)}
                              aria-label={`Thả vào nhóm ${label}`}
                            >
                              {selectedToken
                                ? `Đặt ${selectedToken} vào đây`
                                : placed.length
                                  ? 'Thả thêm thẻ vào đây'
                                  : `Thả vào nhóm ${label}`}
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    <div className={s.titleRow}>
                      <button
                        className={s.textButton}
                        onClick={() => update({ bins: {}, classified: false })}
                      >
                        <Icon step={2} n={3} /> Làm lại
                      </button>
                      <button
                        className={s.darkButton}
                        onClick={() => {
                          const correct = OPERATIONS.every(
                            (op) =>
                              d.bins[op] ===
                              (MUTATIONS.includes(op) ? 'mutate' : 'pure'),
                          );
                          update({ classified: correct });
                          setMessage(
                            correct
                              ? 'Đúng cả 7 thao tác!'
                              : 'Chưa đúng cả 7 thẻ. Chạm thẻ trong nhóm để đưa về hàng chờ và sửa.',
                          );
                        }}
                      >
                        Kiểm tra phân loại <Icon step={2} n={4} />
                      </button>
                    </div>
                    {d.classified && (
                      <p className={s.green}>✓ Phân loại 7/7 chính xác</p>
                    )}
                  </Card>
                </div>
                <Card className={s.probe}>
                  <div className={s.titleRow}>
                    <span className={s.iconBox}>
                      <Icon step={2} n={7} />
                    </span>
                    <div>
                      <div className={s.eyebrow}>
                        SELF-EXPLANATION PROBE • 0–2 điểm
                      </div>
                      <h2>
                        Tự giải thích hiện tượng: “Pass-by-Object-Reference”
                      </h2>
                    </div>
                    <small className={s.monoBadge}>
                      <Icon step={2} n={8} /> Rubric: tham chiếu (1đ) &amp; đối
                      tượng biến đổi (1đ)
                    </small>
                  </div>
                  <p className={s.inset}>
                    Tại sao truyền một <code>list</code> vào hàm và sửa đổi bên
                    trong lại làm thay đổi dữ liệu của biến bên ngoài hàm?
                  </p>
                  <label className={s.srOnly} htmlFor="explanation">
                    Lời giải thích của bạn
                  </label>
                  <textarea
                    id="explanation"
                    className={s.explanationInput}
                    maxLength={2000}
                    placeholder="Nhập lời giải thích của bạn (khoảng 40–150 từ)…"
                    value={d.explanation}
                    onChange={(e) => {
                      update({ explanation: e.target.value, explained: false });
                      setScore(null);
                    }}
                  />
                  <div className={s.titleRow}>
                    <small>
                      <Icon step={2} n={9} /> Kiểm tra từ khóa theo rubric ·{' '}
                      {d.explanation.trim().split(/\s+/).filter(Boolean).length}{' '}
                      từ · {d.explanation.length} ký tự{' '}
                      {score !== null ? `· ${score}/2 điểm` : ''}
                    </small>
                    <button
                      className={s.primary}
                      disabled={d.explanation.trim().length < 20}
                      onClick={() => {
                        const value = explanationScore(d.explanation);
                        setScore(value);
                        update({ explained: value === 2 });
                        setMessage(
                          value === 2
                            ? 'Đã nhận đủ 2 ý: tham chiếu dùng chung và đối tượng có thể thay đổi.'
                            : 'Hãy bổ sung ý còn thiếu: tham chiếu đến cùng đối tượng và tính mutable của list.',
                        );
                      }}
                    >
                      Gửi lời giải thích <Icon step={2} n={10} />
                    </button>
                  </div>
                </Card>
              </>
            )}
            {d.step === 3 && (
              <div className={s.threeColumns}>
                <div className={s.stack}>
                  <Card>
                    <div className={s.titleRow}>
                      <span className={s.iconBox}>A</span>
                      <h2>Nhiệm vụ Giàn giáo (PRIMM)</h2>
                      <small className={s.amber}>Tự ghép</small>
                    </div>
                    <p>
                      Dựng hàm <code>clone_and_filter(data, threshold)</code>.
                      Trả về một list mới chỉ chứa giá trị ≥ ngưỡng, bảo toàn
                      danh sách gốc.
                    </p>
                    <p className={s.inset}>
                      <b>Quy tắc độc lập:</b> Chọn token chỉ lắp ráp code. Mô
                      hình bộ nhớ chỉ thay đổi khi bạn bấm <b>Chạy từng bước</b>
                      .
                    </p>
                  </Card>
                  <Card>
                    <div className={s.titleRow}>
                      <h3>KHUNG LẮP GHÉP (CODE CANVAS)</h3>
                      <button
                        className={s.textButton}
                        onClick={() => {
                          update({ slots: ['', '', ''], traced: false });
                          setTrace(0);
                        }}
                      >
                        <Icon step={3} n={1} /> Đặt lại slot
                      </button>
                    </div>
                    <div className={s.slotCanvas}>
                      <code>def clone_and_filter(data, threshold):</code>
                      {d.slots.map((slot, i) => (
                        <div key={i}>
                          {i === 1 && <code>for val in data:</code>}
                          <button
                            className={s.slot}
                            onClick={() => {
                              const slots = [...d.slots];
                              slots[i] = '';
                              update({ slots, traced: false });
                              setTrace(0);
                            }}
                          >
                            <Icon step={3} n={2} />{' '}
                            {slot ||
                              `[Slot ${i + 1}: ${['Tạo vùng nhớ mới', 'Lọc theo ngưỡng', 'Chèn phần tử'][i]}]`}
                          </button>
                        </div>
                      ))}
                      <code>return result</code>
                    </div>
                    <p className={s.muted}>
                      Khay khối mã — Nhấp hoặc Tab/Enter để đặt:
                    </p>
                    <div className={s.tokenBank}>
                      {[
                        ['result = []', 0],
                        ['result = data.copy()', 0],
                        ['result = list(data)', 0],
                        ['result = data', 0],
                        ['if val >= threshold:', 1],
                        ['result.append(val)', 2],
                      ].map(([token, index]) => (
                        <button
                          key={token}
                          onClick={() => {
                            const slots = [...d.slots];
                            slots[Number(index)] = String(token);
                            update({ slots, traced: false });
                            setTrace(0);
                          }}
                        >
                          <code>{token}</code>
                          <small>
                            {token === 'result = data' ? 'Bẫy Alias · ' : ''}
                            Slot {Number(index) + 1} <Icon step={3} n={3} />
                          </small>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
                <div className={s.stack}>
                  <div className={s.codeCard}>
                    <div className={s.editorHeader}>
                      <span className={s.dots}>
                        <i />
                        <i />
                        <i />
                      </span>
                      <Icon step={3} n={4} /> solution.py{' '}
                      <small>Python 3.12.2</small>
                      <Icon step={3} n={5} />
                    </div>
                    <Code
                      code={assembled}
                      active={trace ? [1, 3, 4, 5][trace - 1] : -1}
                    />
                    <div className={s.runBar}>
                      <button className={s.primary} onClick={() => runTrace()}>
                        <Icon step={3} n={6} /> Chạy từng bước
                      </button>
                      <button
                        className={s.secondary}
                        onClick={() => runTrace(true)}
                      >
                        <Icon step={3} n={7} /> Chạy hết
                      </button>
                      <small>{trace ? `Bước ${trace}/4` : 'Sẵn sàng'}</small>
                      <button
                        className={s.iconButton}
                        aria-label="Khởi động lại mô phỏng"
                        onClick={() => {
                          setTrace(0);
                          update({ traced: false });
                        }}
                      >
                        <Icon step={3} n={8} />
                      </button>
                    </div>
                  </div>
                  <Card>
                    <h2>
                      <Icon step={3} n={9} /> Thử nghiệm đối chứng &amp; Tái dự
                      đoán
                    </h2>
                    <p>
                      Đổi đầu vào sang <code>data = [5, 15, 25]</code>,
                      threshold = 15. Với hàm lọc đúng, <code>len(result)</code>{' '}
                      bằng bao nhiêu?
                    </p>
                    <div className={s.counterChoices}>
                      {['1', '2', '3'].map((v) => (
                        <Choice
                          key={v}
                          name="counter"
                          value={v}
                          selected={d.counter}
                          onChange={(counter) => update({ counter })}
                          title={`${v} phần tử`}
                        />
                      ))}
                    </div>
                    <button
                      className={s.textButton}
                      onClick={() => {
                        setAlternate(!alternate);
                        setTrace(0);
                        update({ traced: false });
                      }}
                    >
                      <Icon step={3} n={10} /> Chuyển đổi tập dữ liệu: [
                      {(alternate ? [10, 20, 30] : [5, 15, 25]).join(', ')}]
                    </button>
                    {d.counter && (
                      <p className={d.counter === '2' ? s.green : s.amber}>
                        {d.counter === '2'
                          ? 'Đúng: [15, 25], gồm 2 phần tử.'
                          : 'Chỉ giữ các phần tử lớn hơn hoặc bằng 15.'}
                      </p>
                    )}
                  </Card>
                </div>
                <div className={s.stack}>
                  <Card>
                    <div className={s.titleRow}>
                      <Icon step={3} n={11} />
                      <h2>Bảng biến &amp; Ô nhớ (Heap)</h2>
                      <small className={s.monoBadge}>ID Pointer</small>
                    </div>
                    <div className={s.heapValue}>
                      <b>
                        data <small>(Tham số gốc)</small>
                      </b>
                      <code>@0x7fa1</code>
                      <pre>[{input.join(', ')}]</pre>
                      <small className={s.green}>
                        <Icon step={3} n={12} /> Không thay đổi
                      </small>
                    </div>
                    <p className={s.inset}>
                      <code>0x7fa1 ≠ 0x7fa9</code>
                      <br />
                      Độc lập vùng nhớ
                    </p>
                    <div className={s.heapValue}>
                      <b>
                        result <small>(List mới)</small>
                      </b>
                      <code>@0x7fa9</code>
                      <pre>
                        {traceResult
                          ? `[${traceResult.join(', ')}]`
                          : '[Đang chờ khởi tạo…]'}
                      </pre>
                    </div>
                    <div className={s.binGrid}>
                      <div className={s.inset}>
                        <small>threshold</small>
                        <br />
                        <code>15</code>
                      </div>
                      <div className={s.inset}>
                        <small>val hiện tại</small>
                        <br />
                        <code>
                          {trace >= 2
                            ? filtered[Math.min(trace - 2, 1)]
                            : 'None'}
                        </code>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div className={s.titleRow}>
                      <Icon step={3} n={13} />
                      <h2>
                        Nhật ký biến đổi
                        <br />
                        (trước → sau)
                      </h2>
                      <small>Delta log</small>
                    </div>
                    {[
                      `T0: Khởi tạo data = [${input.join(', ')}]`,
                      `T1: result = ${d.slots[0] === 'result = []' ? '[]' : `[${input.join(', ')}]`}`,
                      `T2: Lọc ≥ 15 → [${filtered.join(', ')}]`,
                      'T3: return result (list mới)',
                    ].map((line, i) => (
                      <p
                        className={`${s.logEntry} ${trace < i ? s.faded : ''}`}
                        key={i}
                      >
                        {line}
                      </p>
                    ))}
                    {d.traced ? (
                      <p className={s.success}>
                        <Icon step={3} n={14} /> Không phát hiện biến đổi list
                        đầu vào.
                      </p>
                    ) : (
                      <p className={s.muted}>
                        Chạy mô phỏng để kiểm tra từng bước.
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            )}
            {d.step === 4 && (
              <div className={s.sandboxGrid}>
                <aside className={s.stack}>
                  <Card>
                    <div className={s.eyebrow}>
                      THỬ THÁCH ĐỘC LẬP <Icon step={4} n={3} />
                    </div>
                    <h3>Pure Function &amp; Immutability</h3>
                    <p>
                      Viết hàm{' '}
                      <code>clean_and_boost_scores(raw_scores, bonus)</code>:
                      loại bỏ số âm (&lt;0), cộng thưởng,{' '}
                      <b>không biến đổi list gốc.</b>
                    </p>
                    <div className={s.contract}>
                      <p>
                        Input <code>raw_scores: list[float]</code>
                      </p>
                      <p>
                        Bonus <code>bonus: float</code>
                      </p>
                      <p>
                        Output <code>list[float] (round 2)</code>
                      </p>
                    </div>
                    <p className={s.green}>
                      <Icon step={4} n={4} /> id(result) ≠ id(raw_scores)
                    </p>
                    <p className={s.red}>
                      <Icon step={4} n={5} /> Không mutate dữ liệu đầu vào
                    </p>
                  </Card>
                  <Card>
                    <div className={s.titleRow}>
                      <h3>Gợi ý 3 Tầng</h3>
                      <small>TRỢ GIẢNG</small>
                    </div>
                    {[
                      'Nguyên lý & Bộ nhớ',
                      'Cấu trúc vòng lặp',
                      'Lời giải mẫu',
                    ].map((title, i) => (
                      <div className={s.hintLevel} key={title}>
                        <button
                          onClick={() => {
                            setHelp(help === i + 1 ? 0 : i + 1);
                            if (i === 2) update({ solutionUsed: true });
                          }}
                        >
                          <b>{i + 1}</b> {title} <Icon step={4} n={i + 6} />
                          {i === 2 && <small>Tham khảo</small>}
                        </button>
                        {help === i + 1 && (
                          <div>
                            {i === 0 ? (
                              'Tạo list mới rồi thêm kết quả đã lọc. Mỗi phần tử hợp lệ được cộng bonus và làm tròn 2 chữ số.'
                            ) : i === 1 ? (
                              <pre>
                                {
                                  'result = []\nfor score in raw_scores:\n    if score >= 0:\n        # thêm điểm mới\nreturn result'
                                }
                              </pre>
                            ) : (
                              <>
                                <pre>{SOLUTION_CODE}</pre>
                                <button
                                  className={s.secondary}
                                  onClick={() => {
                                    update({ code: SOLUTION_CODE });
                                    setResult(null);
                                  }}
                                >
                                  Đưa lời giải vào trình soạn thảo
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </Card>
                  <Card>
                    <small>
                      Target Allocator: <code>id(res) ≠ id(raw)</code>
                    </small>
                  </Card>
                </aside>
                <div className={s.stack}>
                  <div className={s.codeCard}>
                    <div className={s.editorHeader}>
                      <button
                        className={!showTests ? s.editorTabActive : ''}
                        onClick={() => setShowTests(false)}
                      >
                        <Icon step={4} n={9} /> solution.py ●
                      </button>
                      <button
                        className={showTests ? s.editorTabActive : ''}
                        onClick={() => setShowTests(true)}
                      >
                        test_runner.py
                      </button>
                      <small>{runtimeStatus || 'CPython 3.12'}</small>
                      <button
                        disabled={running}
                        onClick={() => {
                          update({
                            code: d.code
                              .replace(/\t/g, '    ')
                              .split('\n')
                              .map((line) => line.trimEnd())
                              .join('\n'),
                          });
                          setResult(null);
                        }}
                      >
                        <Icon step={4} n={10} /> Format
                      </button>
                      <button
                        disabled={running}
                        onClick={() => {
                          update({ code: STARTER_CODE });
                          setResult(null);
                        }}
                      >
                        <Icon step={4} n={11} /> Reset
                      </button>
                      <kbd>Ctrl + Enter</kbd>
                    </div>
                    {showTests ? (
                      <Code
                        code={
                          '# Các kiểm tra công khai\nassert f([6.5, -1, 8], 0.5) == [7.0, 8.5]\nassert f([], 2.0) == []\nraw = [0, -2, 3]\nres = f(raw, 1)\nassert raw == [0, -2, 3]\nassert res is not raw\n# Kiểm tra bổ sung khi nộp: số âm, 0, làm tròn, thứ tự\n# f = clean_and_boost_scores'
                        }
                      />
                    ) : (
                      <div className={s.editorBody}>
                        <div aria-hidden="true" className={s.lineNumbers}>
                          {d.code.split('\n').map((_, i) => (
                            <div key={i}>{String(i + 1).padStart(2, '0')}</div>
                          ))}
                        </div>
                        <textarea
                          className={s.codeInput}
                          aria-label="Mã Python"
                          value={d.code}
                          spellCheck={false}
                          maxLength={15000}
                          disabled={running}
                          onChange={(e) => {
                            update({ code: e.target.value });
                            setResult(null);
                          }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              run(false);
                            }
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const el = e.currentTarget;
                              const start = el.selectionStart;
                              const end = el.selectionEnd;
                              update({
                                code:
                                  d.code.slice(0, start) +
                                  '    ' +
                                  d.code.slice(end),
                              });
                              requestAnimationFrame(() => {
                                el.selectionStart = el.selectionEnd = start + 4;
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                    <div className={s.runBar}>
                      <small className={s.green}>
                        {running
                          ? runtimeStatus
                          : result
                            ? `${passed}/${result.tests.length} kiểm tra đạt`
                            : 'Sẵn sàng chạy mã của bạn'}
                      </small>
                      {running ? (
                        <button className={s.secondary} onClick={cancelRun}>
                          Dừng chạy
                        </button>
                      ) : (
                        <>
                          <button
                            className={s.secondary}
                            disabled={busy}
                            onClick={() => run(false)}
                          >
                            <Icon step={4} n={12} /> Chạy thử
                          </button>
                          <button
                            className={s.primary}
                            disabled={busy}
                            onClick={() => run(true)}
                          >
                            <Icon step={4} n={13} />{' '}
                            {busy ? 'Đang lưu…' : 'Nộp & Chấm điểm'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={s.equalColumns}>
                    <div className={`${s.codeCard} ${s.console}`}>
                      <div className={s.editorHeader}>
                        <span className={s.dots}>
                          <i />
                          <i />
                          <i />
                        </span>{' '}
                        Console Output{' '}
                        <small>
                          {result
                            ? result.error
                              ? 'error'
                              : `${result.duration} ms`
                            : 'chưa chạy'}
                        </small>
                      </div>
                      <pre aria-live="polite">
                        {result
                          ? [
                              result.output,
                              result.error,
                              ...result.tests.map(
                                (t) =>
                                  `${t.passed ? '✓' : '✗'} ${t.name}: ${t.passed ? 'PASSED' : 'FAILED'}`,
                              ),
                            ]
                              .filter(Boolean)
                              .join('\n')
                          : '> Chạy mã để xem kết quả thật tại đây.'}
                      </pre>
                    </div>
                    <Card>
                      <div className={s.titleRow}>
                        <Icon step={4} n={14} />
                        <h3>Thẩm định I/O &amp; Edge Cases</h3>
                        <small className={s.green}>
                          <Icon step={4} n={15} />{' '}
                          {result
                            ? `${passed}/${result.tests.length} Passed`
                            : 'Chưa chạy'}
                        </small>
                      </div>
                      {result?.tests.map((t) => (
                        <div className={s.testResult} key={t.name}>
                          <span className={t.passed ? s.green : s.red}>
                            {t.passed ? <Icon step={4} /> : '✗'}
                          </span>
                          <div>
                            {t.name}
                            <small>{t.detail}</small>
                          </div>
                          <b className={t.passed ? s.green : s.red}>
                            {t.passed ? 'OK' : 'FAIL'}
                          </b>
                        </div>
                      ))}
                      <p className={s.muted}>
                        <Icon step={4} n={17} /> +2 kiểm tra bổ sung khi nộp bài
                      </p>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {message && (
          <div className={s.feedback} role="status">
            <span>{message}</span>
            <button
              className={s.iconButton}
              aria-label="Đóng thông báo"
              onClick={() => setMessage('')}
            >
              ×
            </button>
          </div>
        )}
        {hint && (
          <aside
            className={`${s.hintPopup} ${isAdmin ? s.hintPopupWide : ''}`}
            role="status"
          >
            <strong>Gợi ý cứu trợ</strong>
            <p>{HINTS[d.step - 1]}</p>
            {isAdmin && (
              <div className={s.answerKey}>
                <strong>
                  <span className={s.adminTag}>ADMIN</span> Đáp án đầy đủ 4 bước
                </strong>
                {ANSWER_KEY.map((section, i) => (
                  <section
                    key={section.title}
                    className={i + 1 === d.step ? s.answerKeyNow : ''}
                  >
                    <h4>{section.title}</h4>
                    {section.lines.map((line) => (
                      <code key={line}>{line}</code>
                    ))}
                  </section>
                ))}
              </div>
            )}
            <button className={s.secondary} onClick={() => setHint(false)}>
              Đã hiểu
            </button>
          </aside>
        )}
      </main>
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerLeft}>
            <button
              className={s.textButton}
              onClick={() =>
                d.step > 1
                  ? changeStep(d.step - 1)
                  : window.location.assign('/courses/python')
              }
            >
              <Icon step={d.step} n={footerIcons[0]} /> Quay lại
            </button>
            <small className={s.green}>
              <Icon step={d.step} n={footerIcons[1]} />{' '}
              {saveStatus || 'Đang tải tiến độ'}
            </small>
          </div>
          <span className={s.framework}>
            <Icon step={d.step} n={footerIcons[2]} /> Chuẩn khung hình:{' '}
            <b>4 bước FACT + PRIMM</b>
          </span>
          <div className={s.footerRight}>
            <button className={s.textButton} onClick={() => setHint(!hint)}>
              <Icon step={d.step} n={footerIcons[3]} />{' '}
              {isAdmin ? 'Gợi ý + đáp án (admin)' : 'Gợi ý cứu trợ'}
            </button>
            {d.step < 4 ? (
              <button
                className={s.primary}
                disabled={!enrolled || loading || !canAdvance(d)}
                onClick={() => changeStep(d.step + 1)}
              >
                Tiếp tục bước tiếp theo{' '}
                <Icon step={d.step} n={footerIcons[4]} />
              </button>
            ) : (
              <a className={s.primary} href="/courses/python">
                {completed ? 'Về khóa học' : 'Xem tiến độ khóa học'}{' '}
                <Icon step={4} n={22} />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
