'use client';

// Dựng mọi bài lưu ở `lessons.content_json` theo schema studio-lesson/v1 (kết
// quả của bộ nhập PDF/Markdown và của scripts/pe-v3) bằng khung
// LessonChrome — vỏ dịch từ Stitch, xem trước ở /admin/lesson-chrome-demo:
// thanh tiến độ trên đầu, MỘT thẻ nội dung mỗi màn, một nút CTA dưới đáy.
//
// Khác bản cũ ở chỗ chia màn: trước đây mỗi bước S1–S4 là một trang nhồi nhiều
// thẻ; giờ mỗi phần (ngữ cảnh, giải thích, từng câu hỏi, khung lắp ghép,
// sandbox…) là một màn riêng — buildScreens() trong @/lib/studio-lesson quyết
// định danh sách đó và tự bỏ phần tài liệu nguồn không có.
//
// Bài List & Mutability dựng tay vẫn dùng PythonStudio.tsx, không đi qua đây.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { apiFetch, asList, findEnrollment } from '@/lib/api';
import LessonBrief from '@/components/lesson-chrome/LessonBrief';
import LessonChrome from '@/components/lesson-chrome/LessonChrome';
import ShellB from '@/components/lesson-chrome/ShellB';
import Assemble from '@/components/lesson-chrome/exercises/Assemble';
import Classify from '@/components/lesson-chrome/exercises/Classify';
import CodeAnnotated from '@/components/lesson-chrome/exercises/CodeAnnotated';
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import CodeMotion from '@/components/lesson-chrome/exercises/CodeMotion';
import Console, { ConsoleLine } from '@/components/lesson-chrome/exercises/Console';
import FeedbackBanner from '@/components/lesson-chrome/exercises/FeedbackBanner';
import HintSheet from '@/components/lesson-chrome/exercises/HintSheet';
import MatchPairs from '@/components/lesson-chrome/exercises/MatchPairs';
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import Misconception from '@/components/lesson-chrome/exercises/Misconception';
import Parsons from '@/components/lesson-chrome/exercises/Parsons';
import Recap from '@/components/lesson-chrome/exercises/Recap';
import SandboxEditor, {
  SandboxTestRow,
} from '@/components/lesson-chrome/exercises/SandboxEditor';
import SelfExplain from '@/components/lesson-chrome/exercises/SelfExplain';
import SpotError from '@/components/lesson-chrome/exercises/SpotError';
import TraceTable from '@/components/lesson-chrome/exercises/TraceTable';
import TrueFalse from '@/components/lesson-chrome/exercises/TrueFalse';
import Visual from '@/components/lesson-chrome/exercises/Visual';
import { fetchMotion, motionFor, recallFor, type MotionFile } from '@/lib/lesson-motion';
import { toCodeLines } from '@/lib/py-highlight';
import c from './studio-chrome.module.css';
import {
  buildScreens,
  correctIndex,
  EMPTY_SCORE,
  gameAnswered,
  gameOf,
  initialLessonDraft,
  isGraded,
  isRunnableGame,
  letterKey,
  optionDetail,
  optionText,
  parsonsCode,
  quizPercent,
  scoreCheck,
  screenVerdict,
  SELF_EXPLAIN_MIN,
  type GameState,
  type LessonDraft,
  type LessonScreen,
  type PlayGame,
  type StudioLesson as Lesson,
} from '@/lib/studio-lesson';

type TestResult = { name: string; passed: boolean; detail: string };
type Award = { name?: string | null; description?: string | null; icon?: string | null };
type RunResult = {
  tests: TestResult[];
  output: string;
  error?: string;
  /** Tóm tắt của bộ chấm về thread/process mô phỏng — hiện mờ dưới console. */
  notes?: string[];
  duration: number;
  version: string;
};

const ICON = {
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
function paragraphs(text?: string): React.ReactNode {
  if (!text || !text.includes('\n\n')) return text;
  return text.split(/\n{2,}/).map((part, i) => (
    <span key={i} style={{ display: 'block', marginTop: i ? 8 : 0 }}>
      {part}
    </span>
  ));
}

/** Nhãn nhỏ trên mỗi thẻ: "S2 · Bẫy ngộ nhận". */
function eyebrowOf(scr: LessonScreen): { icon: React.ReactNode; label: string } {
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
function indentOf(line: string): number {
  return Math.floor((line.length - line.trimStart().length) / 4);
}

export default function StudioLesson({
  courseId,
  lessonNo,
  courseName = 'Python',
}: {
  courseId: string;
  lessonNo: number;
  /** Tên khoá hiện trên thanh trên cùng và nút đăng ký. */
  courseName?: string;
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [meta, setMeta] = useState<{ title: string; xpReward: number } | null>(null);
  const [user, setUser] = useState<{ id: number; name: string; xp: number; role?: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [d, setD] = useState<LessonDraft>(() => initialLessonDraft({}));
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [completed, setCompleted] = useState(false);
  const [checkedKey, setCheckedKey] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  /** Kết quả chấm của game chạy code (parsons/debug), theo khoá màn. */
  const [runVerdicts, setRunVerdicts] = useState<
    Record<string, { correct: boolean; explain: string; result: RunResult }>
  >({});
  /** Lần chạy gần nhất của từng game có editor (debug). */
  const [gameRuns, setGameRuns] = useState<Record<string, RunResult>>({});
  /** "+10 điểm · Combo x3" bật lên rồi tự tắt. */
  const [pop, setPop] = useState<{ id: number; text: string } | null>(null);
  /** Hiệu ứng ăn mừng khi code chạy đúng — đổi số để chạy lại animation. */
  const [celebrate, setCelebrate] = useState(0);
  const [awards, setAwards] = useState<Award[]>([]);
  const [xpGained, setXpGained] = useState<number | null>(null);
  /** Phản hồi tức thì trong game (nối nhầm, bấm phải dòng bẫy). */
  const [flash, setFlash] = useState('');
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Hoạt hình sinh từ ví dụ minh hoạ (scripts/pe-v3/motion.py). Thiếu file thì bài chạy như cũ. */
  const [motionFile, setMotionFile] = useState<MotionFile | null>(null);
  const motionEntry = useMemo(
    () => motionFor(motionFile, lessonNo, lesson?.step_1?.code?.source),
    [motionFile, lessonNo, lesson],
  );
  const recall = useMemo(() => recallFor(motionFile, lessonNo), [motionFile, lessonNo]);
  const screens = useMemo(
    () => (lesson ? buildScreens(lesson, { motion: Boolean(motionEntry), recall: Boolean(recall) }) : []),
    [lesson, motionEntry, recall],
  );
  const scr: LessonScreen | undefined = screens[d.step - 1];
  const play = lesson?.play;
  const boss = Boolean(play?.boss);
  const game = lesson ? gameOf(lesson, scr) : undefined;
  const score = d.score ?? EMPTY_SCORE;
  const draftKey = user ? `pe-studio-lesson-v1:${user.id}:${courseId}:${lessonNo}` : null;
  const update = (changes: Partial<LessonDraft>) => setD((prev) => ({ ...prev, ...changes }));

  async function json(path: string, options?: RequestInit) {
    const response = await apiFetch(path, options);
    if (response.status === 401) {
      window.location.assign(
        '/login?next=' + encodeURIComponent(`/lesson/${courseId}?lesson=${lessonNo - 1}`),
      );
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false)
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message ||
              // Bộ lọc lỗi của backend gói lỗi thành { error: { status, message } }.
              (typeof body.error === 'object' ? body.error?.message : body.error) ||
              `Không thể kết nối (${response.status}).`,
      );
    return body;
  }

  async function load() {
    setLoading(true);
    setLoadError('');
    setEmpty(false);
    // Tải song song với bài; lỗi thì fetchMotion trả null chứ không ném.
    const motionPromise = fetchMotion(courseId);
    try {
      const [profile, enrollments] = await Promise.all([
        json('/api/user'),
        json('/api/enrolled'),
      ]);
      const enrollment = findEnrollment(asList(enrollments, 'enrolled'), courseId);
      setUser(profile);
      setEnrolled(Boolean(enrollment));
      setTotalLessons(Number(enrollment?.totalLessons) || 0);
      // Streak chỉ để hiện trên thanh trên cùng — hỏng thì bỏ qua, không chặn bài.
      void apiFetch('/api/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((stats) => setStreak(Number(stats?.streak) || 0))
        .catch(() => undefined);

      // Quản trị viên xem trước bài học mà không cần ghi danh; backend cũng cho
      // đọc content nhưng vẫn chặn nộp bài.
      if (!enrollment && profile.role !== 'admin') {
        setLoading(false);
        return;
      }

      const payload = await json(
        `/api/courses/${encodeURIComponent(courseId)}/lessons/${lessonNo}/content`,
      );
      const content = payload.lesson?.contentJson as Lesson | null;
      setMeta({
        title: payload.lesson?.title || `Bài ${lessonNo}`,
        xpReward: payload.lesson?.xpReward || 0,
      });
      setCompleted(Boolean(payload.completed));

      // A lesson row can exist with no studio content yet (or only the legacy
      // {text} wrapper). Say so plainly instead of rendering an empty shell.
      // Bài "rỗng" xét trên nội dung thật: màn nhắc lại bài trước không được che việc này.
      if (!content || !buildScreens(content).length) {
        setEmpty(true);
        setLoading(false);
        return;
      }
      const loadedMotion = await motionPromise;
      setMotionFile(loadedMotion);
      const list = buildScreens(content, {
        motion: Boolean(motionFor(loadedMotion, lessonNo, content.step_1?.code?.source)),
        recall: Boolean(recallFor(loadedMotion, lessonNo)),
      });
      setLesson(content);

      let restored = initialLessonDraft(content);
      try {
        const stored = JSON.parse(
          localStorage.getItem(`pe-studio-lesson-v1:${profile.id}:${courseId}:${lessonNo}`) ||
            'null',
        );
        if (stored && typeof stored.code === 'string') {
          restored = {
            ...restored,
            ...stored,
            // Bản nháp cũ đánh số theo 4 bước S; giờ danh sách màn dài hơn nên
            // phải kẹp lại cho khỏi rơi ra ngoài mảng.
            step: Math.min(list.length, Math.max(1, Number(stored.step) || 1)),
            done: stored.done && typeof stored.done === 'object' ? stored.done : {},
            games: stored.games && typeof stored.games === 'object' ? stored.games : {},
            score:
              stored.score && typeof stored.score === 'object'
                ? { ...EMPTY_SCORE, ...stored.score }
                : EMPTY_SCORE,
            code: String(stored.code).slice(0, 15000),
          };
        }
      } catch {
        /* A missing or corrupt draft must not block the lesson. */
      }
      setD(restored);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không kết nối được backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const init = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(init);
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [courseId, lessonNo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = meta?.title
      ? `${meta.title} · Python Studio | Programming Edu`
      : 'Python Studio | Programming Edu';
  }, [meta?.title]);

  useEffect(() => {
    if (!draftKey || !lesson) return;
    const save = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(d));
        setSaveStatus('Đã lưu bản nháp trên máy');
      } catch {
        setSaveStatus('Không lưu được bản nháp trên trình duyệt này');
      }
    }, 400);
    return () => clearTimeout(save);
  }, [d, draftKey, lesson]);


  async function enroll() {
    setBusy(true);
    try {
      await json(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    try {
      const body = await json(`/api/lessons/${lessonNo}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonTitle: meta?.title,
          xpEarned: meta?.xpReward || undefined,
          // Khoá có mini-game gửi điểm thật (tỉ lệ màn đúng ngay lần đầu);
          // backend dùng nó để chia XP trong khung 50–100% xp_reward.
          quizScore: play ? quizPercent(screens, d, boss) : 100,
        }),
      });
      setCompleted(true);
      if (typeof body.xpGained === 'number') setXpGained(body.xpGained);
      if (Array.isArray(body.newAchievements) && body.newAchievements.length)
        setAwards(body.newAchievements as Award[]);
      setMessage(
        body.alreadyCompleted
          ? 'Bài này đã hoàn thành trước đó — không cộng XP lần hai.'
          : 'Đã lưu hoàn thành bài học.',
      );
    } catch (error) {
      setMessage(`Chưa lưu được tiến độ: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelRun() {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    setRunning(false);
  }

  /**
   * Chạy `code` với bộ test của bài trong Pyodide (worker riêng mỗi lần) rồi
   * gọi onDone. Dùng chung cho sandbox và các game chạy code.
   */
  function execute(code: string, onDone: (data: RunResult) => void) {
    const four = lesson?.step_4;
    if (!four) return;
    setMessage('');
    setRunning(true);
    setRuntimeStatus('Đang tải Python…');
    const instance = new Worker('/static/js/studio-lesson.worker.js');
    worker.current = instance;
    const expire = (text: string) => {
      cancelRun();
      setRuntimeStatus('');
      onDone({ tests: [], output: '', error: text, duration: 0, version: '' });
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
          () => expire('Chương trình vượt giới hạn 5 giây. Kiểm tra vòng lặp vô hạn.'),
          5000,
        );
        setRuntimeStatus('Đang chạy và kiểm tra…');
        return;
      }
      cancelRun();
      setRuntimeStatus(data.version ? `CPython ${data.version}` : '');
      onDone(data);
    };
    instance.postMessage({
      code,
      tests: four.tests ?? [],
      forbid: four.forbid ?? [],
      files: four.files ?? [],
    });
  }

  function passedAll(data: RunResult): boolean {
    const total = lesson?.step_4?.tests?.length ?? 0;
    return (
      !data.error &&
      total > 0 &&
      data.tests.length === total &&
      data.tests.every((t: TestResult) => t.passed)
    );
  }

  function run(submit: boolean) {
    if (running || busy) return;
    if (!lesson?.step_4) return;
    const sandboxAt = screens.findIndex((x) => x.kind === 'sandbox');
    const blocked = screens
      .slice(0, sandboxAt < 0 ? 0 : sandboxAt)
      .some((x) => isGraded(x.kind) && !d.done[x.key]);
    if (submit && blocked) {
      setMessage('Hãy hoàn thành các màn học phía trước trước khi nộp bài.');
      return;
    }
    setResult(null);
    // Cửa tự kiểm tra chỉ mở lời giải sau lần NỘP đầu, đạt hay chưa đạt.
    if (submit && !d.submitted) update({ submitted: true });
    execute(d.code, (data) => {
      setResult(data);
      // Chỉ lượt NỘP mới ghi nhận: chạy thử đạt hết vẫn phải bấm nộp thì tiến
      // độ mới được lưu, nếu không học viên tưởng xong mà backend không biết.
      if (submit && passedAll(data)) {
        markDone('s4-sandbox');
        if (play) setCelebrate((n) => n + 1);
        void complete();
        // Nộp đạt là xong phần thực hành: đưa thẳng sang màn tổng kết để bấm
        // tiếp sang bài sau, không bắt bấm thêm "Tiếp tục".
        const recapAt = screens.findIndex((x) => x.kind === 'recap');
        if (recapAt >= 0) goTo(recapAt + 1);
      }
    });
  }

  /** Mã đang chấm của game chạy code. */
  function gameCode(g: PlayGame): string {
    const st = d.games?.[g.id] ?? {};
    if (g.type === 'parsons') return parsonsCode(g, st.picked ?? []);
    if (g.type === 'debug') return st.code ?? g.code;
    return '';
  }

  /** "Kiểm tra" ở game chạy code: chạy thật, đạt hết test mới tính đúng. */
  function runGame(key: string, g: PlayGame, grade: boolean) {
    if (running || busy) return;
    setGameRuns((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    execute(gameCode(g), (data) => {
      setGameRuns((prev) => ({ ...prev, [key]: data }));
      if (!grade) return;
      const correct = passedAll(data);
      const failed = data.tests.filter((t) => !t.passed);
      setRunVerdicts((prev) => ({
        ...prev,
        [key]: {
          correct,
          result: data,
          explain: correct
            ? `Chương trình chạy đúng — đạt cả ${data.tests.length} ca kiểm thử.`
            : data.error
              ? `Python báo lỗi khi chạy: ${data.error.trim().split('\n').slice(-1)[0]}`
              : `Trượt ${failed.length}/${data.tests.length} ca: ${failed
                  .slice(0, 2)
                  .map((t) => t.name)
                  .join('; ')}.`,
        },
      }));
      setCheckedKey(key);
      award(key, correct);
      if (correct) {
        markDone(key);
        setCelebrate((n) => n + 1);
      }
    });
  }

  /** Cộng điểm (chỉ khoá có mini-game). clean=false: đúng nhưng đã nhầm trước đó. */
  function award(key: string, correct: boolean, clean = correct) {
    if (!play) return;
    let s = d.score ?? EMPTY_SCORE;
    if (correct && !clean) s = scoreCheck(s, key, false).score;
    const r = scoreCheck(s, key, correct);
    update({ score: r.score });
    if (r.gained > 0)
      setPop((prev) => ({
        id: (prev?.id ?? 0) + 1,
        text: `+${r.gained} điểm${r.score.combo >= 3 ? ` · Combo x${r.score.combo} 🔥` : ''}`,
      }));
  }

  function updateGame(id: string, changes: Partial<GameState>) {
    setCheckedKey('');
    setD((prev) => ({
      ...prev,
      games: { ...prev.games, [id]: { ...(prev.games?.[id] ?? {}), ...changes } },
    }));
  }

  function markDone(key: string) {
    setD((prev) => ({ ...prev, done: { ...prev.done, [key]: true } }));
  }

  function goTo(step: number) {
    setCheckedKey('');
    setHintOpen(false);
    setMessage('');
    setD((prev) => ({ ...prev, step: Math.min(screens.length, Math.max(1, step)) }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ---------- Trạng thái màn hiện tại ----------

  const checked = Boolean(scr && checkedKey === scr.key);
  const verdict =
    lesson && scr && checked
      ? isRunnableGame(game)
        ? (runVerdicts[scr.key] ?? null)
        : screenVerdict(lesson, scr, d)
      : null;
  const hints = lesson?.step_4?.hints ?? [];
  const tests = lesson?.step_4?.tests ?? [];
  const procedure = lesson?.step_4?.procedure ?? [];
  const files = lesson?.step_4?.files ?? [];
  const contracts = lesson?.step_4?.contracts ?? [];
  const gate = Boolean(lesson?.step_4?.gate);
  // Ví dụ minh hoạ (PE v3) dùng dữ liệu KHÁC đề bài: chỉ hiện ở màn giải thích,
  // không gắn vào câu dự đoán hay thẻ ngộ nhận như mã ví dụ của bài v2.
  const lessonCode =
    lesson?.step_1?.code?.kind === 'demo' ? undefined : lesson?.step_1?.code?.source;
  // Chỉ dựng ô soạn mã khi thật sự có mã Python để làm: bài quy trình thuần
  // (không code khởi tạo, không lời giải, không ca chấm) thì editor chỉ gây rối.
  const showEditor = Boolean(
    tests.length || lesson?.step_4?.starterCode || lesson?.step_4?.solutionCode || !procedure.length,
  );

  /** Đã có câu trả lời để bấm "Kiểm tra" chưa. */
  function answered(): boolean {
    if (!scr || !lesson) return false;
    if (scr.kind === 'predict') return Boolean(d.predict);
    if (scr.kind === 'mcq') return d.mcq[scr.index ?? 0] !== undefined;
    if (scr.kind === 'classify')
      return (lesson.step_2?.classify?.tokens ?? []).every((t) => d.bins[t.label]);
    if (scr.kind === 'selfExplain') return d.explanation.trim().length > 0;
    if (scr.kind === 'scaffold')
      return (lesson.step_3?.scaffold?.slots ?? []).every((slot) => d.slots[slot.n]);
    if (scr.kind === 'counter') return Boolean(d.counter);
    if (scr.kind === 'game') return game ? gameAnswered(lesson, game, d) : false;
    return true;
  }

  /** Đáp án của màn đang mở, chỉ dựng cho tài khoản admin. `fill` là phần bản
   *  nháp điền sẵn đáp án để admin đi nhanh qua bài khi kiểm tra nội dung.
   *  Bài vốn chấm ở trình duyệt (content_json gửi nguyên cho học viên) nên
   *  bảng này không lộ thêm dữ liệu nào. */
  function answerKey(): {
    rows: { label: string; value: string }[];
    code?: string;
    fill?: Partial<LessonDraft>;
  } | null {
    if (!lesson || !scr) return null;
    if (scr.kind === 'predict') {
      const options = lesson.step_1?.predict?.options ?? [];
      const i = options.findIndex((o) => o.correct);
      if (i < 0) return null;
      return {
        rows: [{ label: 'Đáp án', value: `${letterKey(i)}. ${options[i].title}` }],
        fill: { predict: letterKey(i) },
      };
    }
    if (scr.kind === 'mcq') {
      const at = scr.index ?? 0;
      const q = lesson.step_2?.mcq?.[at];
      const i = q ? correctIndex(q) : -1;
      if (!q || i < 0) return null;
      return {
        rows: [{ label: 'Đáp án', value: `${letterKey(i)}. ${optionText(q.options[i])}` }],
        fill: { mcq: { ...d.mcq, [at]: letterKey(i) } },
      };
    }
    if (scr.kind === 'classify') {
      const classify = lesson.step_2?.classify;
      if (!classify) return null;
      return {
        rows: classify.bins.map((bin) => ({
          label: bin.title,
          value:
            classify.tokens
              .filter((t) => t.bin === bin.key)
              .map((t) => t.label)
              .join(', ') || '—',
        })),
        fill: { bins: Object.fromEntries(classify.tokens.map((t) => [t.label, t.bin])) },
      };
    }
    if (scr.kind === 'selfExplain') {
      const selfExplain = lesson.step_2?.selfExplain;
      const rubric = selfExplain?.rubric ?? [];
      if (!rubric.length) {
        // Bài v3 có lời giải thích mẫu (mức 2/2). Bài v2 thì không: placeholder
        // chính là mô tả mức điểm tối đa của ngân hàng đề, dùng tạm để đối chiếu.
        const sample = selfExplain?.sample
          ? selfExplain.sample
          : selfExplain?.placeholder
            ? `Bài mẫu (admin điền sẵn): ${selfExplain.placeholder}`
            : '';
        const passes =
          sample.length >= SELF_EXPLAIN_MIN.chars &&
          sample.split(/\s+/).filter(Boolean).length >= SELF_EXPLAIN_MIN.words;
        return {
          rows: [
            ...(selfExplain?.sample ? [{ label: 'Lời giải thích mẫu', value: selfExplain.sample }] : []),
            ...(selfExplain?.placeholder && !selfExplain?.sample
              ? [{ label: 'Tiêu chí đạt điểm tối đa', value: selfExplain.placeholder }]
              : []),
            {
              label: 'Cách chấm',
              value: `Không có rubric từ khoá — chỉ yêu cầu tối thiểu ${SELF_EXPLAIN_MIN.words} từ / ${SELF_EXPLAIN_MIN.chars} ký tự.`,
            },
          ],
          fill: passes ? { explanation: sample } : undefined,
        };
      }
      return {
        rows: rubric.map((r) => ({ label: r.label, value: r.keywords.join(' / ') })),
        fill: { explanation: rubric.map((r) => r.keywords[0]).filter(Boolean).join('; ') },
      };
    }
    if (scr.kind === 'scaffold') {
      const slots = lesson.step_3?.scaffold?.slots ?? [];
      return {
        rows: slots.map((slot) => ({ label: `Slot ${slot.n}`, value: slot.answer })),
        fill: { slots: Object.fromEntries(slots.map((slot) => [slot.n, slot.answer])) },
      };
    }
    if (scr.kind === 'counter') {
      const counter = lesson.step_3?.counter;
      const i = counter ? counter.options.indexOf(counter.correct) : -1;
      if (!counter || i < 0) return null;
      return {
        rows: [{ label: 'Đáp án', value: `${letterKey(i)}. ${counter.correct}` }],
        fill: { counter: letterKey(i) },
      };
    }
    if (scr.kind === 'game' && game) {
      const fillGame = (state: GameState) => ({ games: { ...d.games, [game.id]: state } });
      switch (game.type) {
        case 'traceTable':
          return {
            rows: Object.entries(game.answers).map(([k, v]) => {
              const [row, col] = k.split('-');
              return { label: `${game.rows[Number(row)]?.step} · ${col}`, value: v };
            }),
            fill: fillGame({ cells: { ...game.answers } }),
          };
        case 'match':
          return {
            rows: game.pairs.map((p) => ({ label: p.left, value: p.right })),
            fill: fillGame({ matched: Object.fromEntries(game.pairs.map((_, i) => [i, i])) }),
          };
        case 'trueFalse':
          return {
            rows: game.items.map((it) => ({ label: it.answer ? 'ĐÚNG' : 'SAI', value: it.statement })),
            fill: fillGame({
              tf: Object.fromEntries(game.items.map((it, i) => [i, it.answer ? 'true' : 'false'])),
            }),
          };
        case 'fill': {
          const slots = lesson.step_3?.scaffold?.slots ?? [];
          return {
            rows: slots.map((slot) => ({ label: `Ô ${slot.n}`, value: slot.answer })),
            fill: { slots: Object.fromEntries(slots.map((slot) => [slot.n, slot.answer])) },
          };
        }
        case 'parsons':
          return {
            rows: [],
            code: parsonsCode(game, game.lines.map((l) => l.id)),
            fill: fillGame({ picked: game.lines.map((l) => l.id) }),
          };
        case 'spotError':
          return {
            rows: [
              { label: 'Dòng lỗi', value: String(game.line) },
              { label: 'Lỗi', value: game.label },
            ],
            fill: fillGame({ line: game.line }),
          };
        case 'debug':
          return {
            rows: [{ label: 'Lỗi cần sửa', value: game.label }],
            code: lesson.step_4?.solutionCode,
            fill: lesson.step_4?.solutionCode
              ? fillGame({ code: lesson.step_4.solutionCode })
              : undefined,
          };
        case 'selfExplain': {
          const sample = lesson.step_2?.selfExplain?.sample ?? '';
          return {
            rows: sample ? [{ label: 'Lời giải thích mẫu', value: sample }] : [],
            fill: sample ? { explanation: sample } : undefined,
          };
        }
      }
    }
    if (scr.kind === 'sandbox') {
      const solution = lesson.step_4?.solutionCode;
      if (!solution && !tests.length) return null;
      return {
        // Ca kiểm tra stdout của bài PE là cả một chuỗi exec(...) — in ra chỉ
        // gây rối, lời giải mẫu bên dưới đã đủ để đối chiếu.
        rows: tests
          .filter((t) => t.call.length <= 120 && !t.call.includes('exec('))
          .map((t) => ({ label: t.name || 'Ca kiểm thử', value: `${t.call} → ${t.expect}` })),
        code: solution,
        fill: solution ? { code: solution } : undefined,
      };
    }
    return null;
  }

  /** Nút CTA dưới đáy: nhãn, màu và hành động của màn đang mở. */
  type Action =
    | 'leave'
    | 'nextLesson'
    | 'toSandbox'
    | 'toBlocked'
    | 'complete'
    | 'submit'
    | 'check'
    | 'retry'
    | 'next';

  /** Màn có chấm mà học viên chưa làm đúng — chặn việc kết thúc bài. */
  function firstUnfinished(): LessonScreen | undefined {
    return screens.find((x) => isGraded(x.kind) && !d.done[x.key]);
  }

  const hasNextLesson = totalLessons > 0 && lessonNo < totalLessons;

  /** Nút CTA dưới đáy: nhãn, màu và HÀNH ĐỘNG của màn đang mở.
   *
   *  Trả về tên hành động chứ không trả closure: hàm này chạy ngay trong lúc
   *  render, mà closure lại chạm tới worker ref bên trong run() — React cấm
   *  đọc ref khi đang render (react-hooks/refs). Bấm nút mới gọi doAction().
   */
  function primary(): {
    label: string;
    tone: 'accent' | 'ok' | 'err';
    disabled?: boolean;
    action: Action;
  } {
    if (!scr) return { label: 'Về khóa học', tone: 'accent', action: 'leave' };

    if (scr.kind === 'recap') {
      // Học xong thì đi thẳng sang bài kế tiếp, không bắt quay về danh sách.
      if (completed)
        return hasNextLesson
          ? { label: `Bài ${lessonNo + 1} →`, tone: 'ok', action: 'nextLesson' }
          : { label: 'Về khóa học →', tone: 'ok', action: 'leave' };
      // Chưa làm xong màn nào đó thì không cho kết thúc bài — kể cả khi mở lại
      // từ bản nháp cũ và nhảy thẳng tới đây.
      const missing = firstUnfinished();
      if (missing)
        return {
          label: `Còn phải làm: ${eyebrowOf(missing).label}`,
          tone: 'err',
          action: 'toBlocked',
        };
      if (tests.length)
        return { label: 'Nộp bài ở màn trước', tone: 'accent', action: 'toSandbox' };
      // Bài lab desktop / bài quy trình không có ca chấm nào chạy được trong
      // trình duyệt, nên hoàn thành do người học tự xác nhận ở đây.
      return {
        label: busy ? 'Đang lưu…' : 'Đánh dấu đã hoàn thành ✓',
        tone: 'accent',
        disabled: busy,
        action: 'complete',
      };
    }

    if (scr.kind === 'sandbox') {
      if (!tests.length) return { label: 'Tiếp tục →', tone: 'accent', action: 'next' };
      if (d.done[scr.key]) return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
      return {
        label: running ? 'Đang chấm…' : 'Nộp & Chấm điểm',
        tone: result && result.tests.some((t) => !t.passed) ? 'err' : 'accent',
        disabled: running || busy,
        action: 'submit',
      };
    }

    if (isGraded(scr.kind)) {
      if (isRunnableGame(game) && running)
        return { label: 'Đang chạy code…', tone: 'accent', disabled: true, action: 'check' };
      if (!checked)
        return {
          label: isRunnableGame(game) ? '▶ Chạy & kiểm tra' : 'Kiểm tra',
          tone: 'accent',
          disabled: !answered(),
          action: 'check',
        };
      if (verdict && !verdict.correct)
        return { label: 'Thử lại', tone: 'err', action: 'retry' };
      return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
    }

    return { label: 'Tiếp tục →', tone: 'accent', action: 'next' };
  }

  function doAction(action: Action) {
    if (action === 'leave') return leave();
    if (action === 'nextLesson')
      return window.location.assign(`/lesson/${courseId}?lesson=${lessonNo}`);
    if (action === 'toSandbox')
      return goTo(screens.findIndex((x) => x.kind === 'sandbox') + 1);
    if (action === 'toBlocked') {
      const missing = firstUnfinished();
      if (missing) goTo(screens.indexOf(missing) + 1);
      return;
    }
    if (action === 'complete') return void complete();
    if (action === 'submit') return run(true);
    if (action === 'check') {
      if (!scr || !lesson) return;
      setFlash('');
      if (game && isRunnableGame(game)) return runGame(scr.key, game, true);
      setCheckedKey(scr.key);
      const v = screenVerdict(lesson, scr, d);
      if (v) {
        const misses = game?.type === 'match' ? (d.games?.[game.id]?.misses ?? 0) : 0;
        award(scr.key, v.correct, v.correct && !misses);
      }
      if (v?.correct) markDone(scr.key);
      return;
    }
    if (action === 'retry') return setCheckedKey('');
    if (scr) markDone(scr.key);
    goTo(d.step + 1);
  }

  function leave() {
    window.location.assign(`/courses/${courseId}`);
  }


  // ---------- Nội dung từng màn ----------

  function sandboxRows(): SandboxTestRow[] {
    return tests.map((t, i) => {
      const got = result?.tests?.[i];
      return {
        label: t.name || t.call,
        detail: got?.detail,
        status: !result || !got ? 'pending' : got.passed ? 'pass' : 'fail',
      };
    });
  }

  function consoleLines(): ConsoleLine[] | null {
    if (!result) return null;
    const lines: ConsoleLine[] = [];
    if (result.output)
      for (const line of result.output.replace(/\n$/, '').split('\n')) lines.push({ text: line });
    if (result.error) lines.push({ text: result.error, tone: 'err' });
    for (const note of result.notes ?? []) lines.push({ text: note, tone: 'muted' });
    if (!lines.length) {
      // Ô soạn mã trống hoặc chỉ có chú thích thì "không in ra gì" là vô nghĩa
      // với người học — nói thẳng là chưa có lệnh nào chạy.
      const runnable = d.code
        .split('\n')
        .some((line) => line.trim() && !line.trim().startsWith('#'));
      lines.push({
        text: runnable
          ? 'Chương trình chạy xong, không in ra gì (thêm print() để xem kết quả).'
          : 'Chưa có lệnh nào để chạy — ô soạn mã đang trống hoặc chỉ có dòng chú thích.',
        tone: 'muted',
      });
    }
    return lines;
  }

  function renderScaffold(title?: string) {
    if (!lesson || !scr) return null;
    const three = lesson.step_3;
    const scaffold = three?.scaffold;
    if (!scaffold) return null;
    const eyebrow = eyebrowOf(scr);
    const shell = (node: React.ReactNode, extra?: { title?: string; description?: React.ReactNode }) => (
      <ShellB
        eyebrowIcon={eyebrow.icon}
        eyebrowLabel={eyebrow.label}
        metaLabel={meta?.title}
        title={title ?? extra?.title ?? ''}
        description={extra?.description}
      >
        {node}
        {checked && verdict && (
          <FeedbackBanner
            correct={verdict.correct}
            title={verdict.correct ? 'Chính xác!' : 'Chưa đúng — thử lại nhé'}
            explanation={verdict.explain}
          />
        )}
      </ShellB>
    );
    const slotOf = (line: string) => /\{\{\s*slot(\d+)\s*\}\}/.exec(line);
    const placed = new Set(Object.values(d.slots));
    return shell(
      <>
        <Assemble
          filename="main.py"
          langTag="Python 3.12"
          lines={scaffold.template
            .replace(/\s+$/, '')
            .split('\n')
            .map((line, i) => {
              const hit = slotOf(line);
              if (!hit) return { num: i + 1, before: line };
              const n = Number(hit[1]);
              return {
                num: i + 1,
                before: line.slice(0, hit.index),
                slotId: `slot${n}`,
                after: line.slice((hit.index ?? 0) + hit[0].length),
              };
            })}
          filled={Object.fromEntries(
            Object.entries(d.slots).map(([n, label]) => [`slot${n}`, label]),
          )}
          bank={scaffold.bank.filter((b) => !placed.has(b.label)).map((b) => b.label)}
          heldToken={held}
          onHold={setHeld}
          onFillSlot={(slotId) => {
            if (!held) return;
            setCheckedKey('');
            update({ slots: { ...d.slots, [Number(slotId.replace('slot', ''))]: held } });
            setHeld(null);
          }}
        />
        <button
          type="button"
          className={c.resetLink}
          onClick={() => {
            setCheckedKey('');
            update({ slots: {} });
            setHeld(null);
          }}
        >
          Đặt lại các slot
        </button>
      </>,
      {
        title: three?.task?.title || 'Lắp lại khung mã',
        description: three?.task?.body,
      },
    );
  }

  function gameConsole(data: RunResult | undefined): ConsoleLine[] | null {
    if (!data) return null;
    const lines: ConsoleLine[] = [];
    if (data.output)
      for (const line of data.output.replace(/\n$/, '').split('\n')) lines.push({ text: line });
    if (data.error) lines.push({ text: data.error, tone: 'err' });
    if (!lines.length) lines.push({ text: 'Chương trình chạy xong, không in ra gì.', tone: 'muted' });
    return lines;
  }

  function gameRows(data: RunResult | undefined): SandboxTestRow[] {
    return tests.map((t, i) => {
      const got = data?.tests?.[i];
      return {
        label: t.name || t.call,
        detail: got?.detail,
        status: !data || !got ? 'pending' : got.passed ? 'pass' : 'fail',
      };
    });
  }

  function renderGame(
    g: PlayGame,
    shell: (node: React.ReactNode, extra?: Partial<React.ComponentProps<typeof ShellB>>) => React.ReactNode,
  ) {
    if (!lesson || !scr) return null;
    const st = d.games?.[g.id] ?? {};
    const flashNote = flash ? (
      <div className={`${c.note} ${c.noteWarn}`} role="status">
        {flash}
      </div>
    ) : null;

    if (g.type === 'traceTable')
      return shell(
        <TraceTable
          filename="vi_du.py"
          code={toCodeLines(g.code)}
          columns={g.columns}
          rows={g.rows}
          answers={st.cells ?? {}}
          onAnswerChange={(key, value) => updateGame(g.id, { cells: { ...st.cells, [key]: value } })}
        />,
        {
          title: g.title,
          description: 'Chạy chương trình trong đầu: sau mỗi dòng, biến nào đổi và đổi thành gì? Chuỗi gõ có hay không có nháy đều được.',
        },
      );

    if (g.type === 'match') {
      const matched = st.matched ?? {};
      return shell(
        <>
          <MatchPairs
            left={g.pairs.map((p, i) => ({ id: String(i), content: p.left }))}
            right={g.rightOrder.map((i) => ({ id: String(i), content: g.pairs[i].right }))}
            matched={Object.fromEntries(Object.entries(matched).map(([l, r]) => [l, String(r)]))}
            pendingLeft={st.pending == null ? null : String(st.pending)}
            onPickLeft={(id) => {
              setFlash('');
              updateGame(g.id, { pending: Number(id) });
            }}
            onPickRight={(id) => {
              const left = st.pending;
              if (left == null) return;
              if (Number(id) === left) {
                setFlash('');
                updateGame(g.id, { matched: { ...matched, [left]: left }, pending: null });
              } else {
                setFlash(`Chưa khớp: "${g.pairs[left].left}" không làm "${g.pairs[Number(id)].right}". Thử cặp khác.`);
                updateGame(g.id, { pending: null, misses: (st.misses ?? 0) + 1 });
              }
            }}
          />
          {flashNote}
        </>,
        { title: g.title, description: 'Bấm một dòng lệnh bên trái, rồi bấm việc nó làm bên phải.' },
      );
    }

    if (g.type === 'trueFalse')
      return shell(
        <ol className={c.tfList}>
          {g.items.map((it, i) => (
            <li key={i}>
              <p>{g.prompt ? <code>{it.statement}</code> : it.statement}</p>
              <TrueFalse
                selected={st.tf?.[i] ?? null}
                onSelect={(value) => updateGame(g.id, { tf: { ...st.tf, [i]: value } })}
                correctValue={it.answer ? 'true' : 'false'}
                checked={checked}
              />
            </li>
          ))}
        </ol>,
        {
          title: g.title,
          description: g.prompt ? (
            <>
              <code>{g.prompt}</code>
              <br />
              Mỗi đáp án dưới đây chọn Đúng hoặc Sai, rồi bấm Kiểm tra.
            </>
          ) : (
            'Mỗi câu chọn Đúng hoặc Sai, rồi bấm Kiểm tra.'
          ),
        },
      );

    if (g.type === 'fill') return renderScaffold(g.title);

    if (g.type === 'parsons') {
      const picked = st.picked ?? [];
      const revealed = st.revealed ?? [];
      const head = g.head ? g.head.split('\n') : [];
      const tail = g.tail ? g.tail.split('\n') : [];
      const byId = new Map(
        [...g.lines, ...g.distractors].map((l) => [l.id, l] as const),
      );
      const run = runVerdicts[scr.key]?.result;
      return shell(
        <>
          <Parsons
            filename="main.py"
            builtLines={[
              ...head.map((text, i) => ({
                id: `h${i}`,
                content: text.trim() || ' ',
                indent: indentOf(text),
                fixed: true,
              })),
              ...picked.map((id) => {
                const text = byId.get(id)?.text ?? '';
                return { id, content: text.trim(), indent: indentOf(text) };
              }),
            ]}
            tailLines={tail.map((text, i) => ({
              id: `t${i}`,
              content: text.trim() || ' ',
              indent: indentOf(text),
              fixed: true,
            }))}
            pool={g.order
              .filter((id) => !picked.includes(id))
              .map((id) => {
                const item = byId.get(id)!;
                const reason = 'reason' in item ? (item.reason as string) : undefined;
                return { id, content: item.text, distractorReason: reason };
              })}
            revealed={revealed}
            onPick={(id) => {
              setFlash('');
              updateGame(g.id, { picked: [...picked, id] });
            }}
            onAttemptDistractor={(id) => {
              const item = g.distractors.find((x) => x.id === id);
              setFlash(`Bẫy! Dòng này sai vì: ${item?.reason ?? 'không đúng yêu cầu'}. Chuỗi combo bị ngắt.`);
              updateGame(g.id, { revealed: [...revealed, id] });
              if (play) update({ score: { ...score, combo: 0 } });
            }}
          />
          <div className={c.gameTools}>
            <button
              type="button"
              className={c.resetLink}
              disabled={!picked.length}
              onClick={() => updateGame(g.id, { picked: picked.slice(0, -1) })}
            >
              ↩ Gỡ dòng cuối
            </button>
            <button
              type="button"
              className={c.resetLink}
              disabled={!picked.length}
              onClick={() => updateGame(g.id, { picked: [] })}
            >
              Xếp lại từ đầu
            </button>
          </div>
          {flashNote}
          {checked && run && (
            <div className={c.runResult}>
              <Console title="KẾT QUẢ CHẠY main.py" meta={`${run.duration} ms`} lines={gameConsole(run)} />
              <ul className={c.runTests}>
                {gameRows(run).map((row, i) => (
                  <li key={i} className={row.status === 'pass' ? c.runPass : c.runFail}>
                    {row.status === 'pass' ? '✓' : '✕'} {row.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>,
        {
          title: g.title,
          description:
            'Bấm từng dòng theo đúng thứ tự để ghép thành chương trình. Cẩn thận: trong kho có dòng bẫy. Ghép xong bấm ▶ để chạy thật với các ca kiểm thử.',
        },
      );
    }

    if (g.type === 'spotError') {
      const hits = new Set(g.lines?.length ? g.lines : [g.line]);
      return shell(
        <SpotError
          filename="main.py"
          lines={toCodeLines(g.code).map((line, i) => {
            const num = g.firstLine + i;
            return { num, content: line.content, errorLabel: hits.has(num) ? g.label : undefined };
          })}
          selected={st.line ?? null}
          onSelect={(num) => updateGame(g.id, { line: num })}
          correctLine={checked ? (st.line != null && hits.has(st.line) ? st.line : g.line) : undefined}
          checked={checked}
        />,
        { title: g.title, description: 'Chương trình này chạy được nhưng cho kết quả SAI. Bấm vào dòng gây ra lỗi.' },
      );
    }

    if (g.type === 'debug') {
      const run = gameRuns[scr.key];
      return shell(
        <>
          <SandboxEditor
            filename="main.py"
            langTag={runtimeStatus || 'CPython 3.12'}
            code={st.code ?? g.code}
            onCodeChange={(code) => updateGame(g.id, { code })}
            running={running}
            onRun={() => runGame(scr.key, g, false)}
            onStop={cancelRun}
            consoleLines={gameConsole(run)}
            consoleMeta={run ? `${run.duration} ms` : runtimeStatus}
            tests={gameRows(run)}
            disabled={busy}
          />
          <details className={c.panel}>
            <summary>Gợi ý: tên lỗi</summary>
            <p className={c.panelNote}>{g.label}</p>
          </details>
          <button
            type="button"
            className={c.resetLink}
            onClick={() => updateGame(g.id, { code: g.code })}
          >
            Khôi phục code ban đầu
          </button>
        </>,
        {
          title: g.title,
          description:
            'Code dưới đây có MỘT lỗi thường gặp. Bấm "Chạy thử" để xem ca nào trượt, sửa lại rồi bấm ▶ Chạy & kiểm tra.',
        },
      );
    }

    // selfExplain
    const min = play?.selfExplainMinWords ?? SELF_EXPLAIN_MIN.words;
    return shell(
      <SelfExplain
        value={d.explanation}
        onChange={(value) => {
          setCheckedKey('');
          update({ explanation: value });
        }}
        placeholder={lesson.step_2?.selfExplain?.placeholder}
        rubricLabels={[]}
        requirement={`Viết thành một câu, ít nhất ${min} từ.`}
      />,
      { title: lesson.step_2?.selfExplain?.prompt || g.title },
    );
  }

  function renderScreen() {
    if (!lesson || !scr) return null;
    const eyebrow = eyebrowOf(scr);
    const shell = (node: React.ReactNode, extra?: Partial<React.ComponentProps<typeof ShellB>>) => (
      <ShellB
        eyebrowIcon={eyebrow.icon}
        eyebrowLabel={eyebrow.label}
        metaLabel={meta?.title}
        title={extra?.title ?? ''}
        description={extra?.description}
        centered={extra?.centered}
      >
        {node}
        {checked && verdict && (
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

    const one = lesson.step_1;
    const two = lesson.step_2;
    const three = lesson.step_3;
    const four = lesson.step_4;

    // Màn mở đầu "một màn" theo Figma: tự có tiêu đề, không bọc trong thẻ ShellB.
    if (scr.kind === 'brief' && one?.brief) return <LessonBrief {...one.brief} />;

    if (scr.kind === 'context') {
      const ctx = one?.context;
      const facts = [
        ctx?.example && { label: 'Ví dụ', value: ctx.example },
        ctx?.prereq && { label: 'Học trước', value: ctx.prereq },
        ctx?.files?.length && { label: 'File trong thư mục bài', value: ctx.files.join(', '), code: true },
      ].filter((x): x is { label: string; value: string; code?: boolean } => Boolean(x));
      return shell(
        <>
          {(ctx?.level || gate) && (
            <div className={c.tags}>
              {ctx?.level && <span className={c.tag}>{ctx.level}</span>}
              {gate && <span className={`${c.tag} ${c.tagGate}`}>Cửa tự kiểm tra</span>}
            </div>
          )}
          {facts.length > 0 && (
            <dl className={c.facts}>
              {facts.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.code ? <code>{row.value}</code> : row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {lessonCode && (
            <CodeBlock
              filename={one?.code?.filename || 'example.py'}
              langTag={one?.code?.version || 'Python 3.12'}
              lines={toCodeLines(lessonCode)}
            />
          )}
        </>,
        { title: ctx?.title || lesson.title || 'Ngữ cảnh', description: paragraphs(ctx?.body) },
      );
    }

    // Nhắc lại bài trước: mục tiêu một dòng + hoạt hình của chính bài đó (tự chạy, có nút dừng).
    if (scr.kind === 'recall' && recall) {
      const prev = recall.lesson;
      return shell(
        <>
          <dl className={c.facts}>
            <div>
              <dt>Bài {recall.no}</dt>
              <dd>{prev.goal || prev.title}</dd>
            </div>
            {prev.myth && (
              <div>
                <dt>Hay nhầm</dt>
                <dd>{prev.myth}</dd>
              </div>
            )}
          </dl>
          {prev.code && prev.steps?.length ? (
            <CodeMotion code={prev.code} steps={prev.steps} autoPlay compact label={`Nhắc lại bài ${recall.no}`} />
          ) : null}
        </>,
        { title: `Nhắc lại: ${prev.title}`, description: 'Xem nhanh bài trước chạy ra sao — bài này xây tiếp lên đó.' },
      );
    }

    // Ví dụ minh hoạ chạy từng bước: thay vì đọc đoạn văn, bấm Tiếp để xem biến đổi.
    if (scr.kind === 'motion' && motionEntry?.code && motionEntry.steps) {
      return shell(<CodeMotion code={motionEntry.code} steps={motionEntry.steps} />, {
        title: 'Xem code chạy từng bước',
        description: 'Bấm Tiếp (hoặc phím →) để chạy từng dòng và nhìn biến thay đổi.',
      });
    }

    if (scr.kind === 'explain') {
      const rows = one?.explain ?? [];
      const demo = one?.code?.kind === 'demo';
      // Cửa tự kiểm tra không có mã ví dụ: chỉ còn các ý cần nắm trước khi tự viết.
      if (!one?.code?.source)
        return shell(
          <ol className={c.trace}>
            {rows.map((row, i) => (
              <li key={i}>
                <b>{row.title || `Ý ${row.n ?? i + 1}`}</b>
                <span>{row.body}</span>
              </li>
            ))}
          </ol>,
          { title: 'Những điều cần nắm trước khi tự viết' },
        );
      // Khoá có mini-game bỏ màn "Ngộ nhận" riêng: gộp thành một dòng cảnh báo ở đây.
      const myth =
        play && one?.misconception?.body ? (
          <div className={`${c.note} ${c.noteWarn}`}>
            <strong>Ngộ nhận hay gặp: {one.misconception.title?.replace(/^["“]|["”]$/g, '')}</strong>
            <br />
            {one.misconception.body}
          </div>
        ) : null;
      return shell(
        <>
          <CodeAnnotated
            filename={one.code.filename || 'example.py'}
            langTag={one.code.version || 'Python 3.12'}
            code={toCodeLines(one.code.source)}
            annotations={rows.map((row, i) => ({
              label: row.title || `Ý ${row.n ?? i + 1}`,
              detail: row.body,
            }))}
          />
          {myth}
        </>,
        demo
          ? {
              title: 'Ví dụ minh hoạ cơ chế',
              description: 'Cùng cơ chế với bài, nhưng dữ liệu khác — đọc hiểu rồi tự áp dụng vào đề.',
            }
          : { title: 'Đọc lại ví dụ theo từng ý' },
      );
    }

    if (scr.kind === 'memory') {
      const m = one?.memory;
      return shell(
        <Visual
          stack={(m?.stack ?? []).map((row) => ({
            name: row.name,
            address: row.ptr || '—',
            note: row.label || '',
          }))}
          heap={
            m?.heap
              ? [
                  {
                    tag: m.heap.type || 'PyObject',
                    address: m.heapAddr || '—',
                    refcount: m.heap.refcount ?? 1,
                    rows: (m.heap.cells ?? []).map((cell) => ({
                      label: cell.id || 'Giá trị',
                      value: cell.value,
                    })),
                  },
                ]
              : []
          }
        />,
        {
          title: 'Biến trỏ tới đâu trong bộ nhớ?',
          description: m?.assertion ? `${m.assertion} → ${m.assertionResult ?? ''}` : undefined,
        },
      );
    }

    if (scr.kind === 'misconception')
      return (
        <Misconception
          myth={one?.misconception?.title || 'Ngộ nhận thường gặp'}
          correction={one?.misconception?.body}
          exampleLabel={(one?.misconception?.code ?? lessonCode) ? 'Ví dụ của bài' : undefined}
          langTag={one?.code?.version}
          code={
            (one?.misconception?.code ?? lessonCode)
              ? toCodeLines((one?.misconception?.code ?? lessonCode)!)
              : undefined
          }
        />
      );

    if (scr.kind === 'predict') {
      const predict = one?.predict;
      return shell(
        <Mcq
          filename={predict?.code ? 'solution.py' : one?.code?.filename || 'example.py'}
          langTag={one?.code?.version || 'Python 3.12'}
          code={(predict?.code || lessonCode) ? toCodeLines((predict?.code || lessonCode)!) : undefined}
          options={(predict?.options ?? []).map((o, i) => ({
            key: letterKey(i),
            label: o.title,
            // Giải thích của phương án lộ luôn đáp án: chỉ hiện sau khi đã kiểm tra.
            sub: checked ? o.detail : undefined,
          }))}
          selected={d.predict || null}
          onSelect={(key) => {
            setCheckedKey('');
            update({ predict: key });
          }}
          correctKey={letterKey((predict?.options ?? []).findIndex((o) => o.correct))}
          checked={checked}
        />,
        { title: predict?.question || 'Dự đoán kết quả' },
      );
    }

    if (scr.kind === 'mcq') {
      const i = scr.index ?? 0;
      const q = two?.mcq?.[i];
      if (!q) return null;
      return shell(
        <Mcq
          options={q.options.map((o, oi) => ({
            key: letterKey(oi),
            label: optionText(o),
            sub: checked ? optionDetail(o) : undefined,
          }))}
          selected={d.mcq[i] ?? null}
          onSelect={(key) => {
            setCheckedKey('');
            update({ mcq: { ...d.mcq, [i]: key } });
          }}
          correctKey={letterKey(correctIndex(q))}
          checked={checked}
        />,
        { title: q.question },
      );
    }

    if (scr.kind === 'classify') {
      const classify = two?.classify;
      if (!classify) return null;
      return shell(
        <>
          <Classify
            bins={classify.bins.map((bin) => ({
              key: bin.key,
              label: bin.title,
              sub: bin.subtitle || bin.desc || '',
              items: classify.tokens.filter((t) => d.bins[t.label] === bin.key).map((t) => t.label),
            }))}
            pool={classify.tokens.filter((t) => !d.bins[t.label]).map((t) => t.label)}
            heldToken={held}
            onHold={setHeld}
            onDrop={(binKey) => {
              if (!held) return;
              setCheckedKey('');
              update({ bins: { ...d.bins, [held]: binKey } });
              setHeld(null);
            }}
          />
          <button
            type="button"
            className={c.resetLink}
            onClick={() => {
              setCheckedKey('');
              update({ bins: {} });
              setHeld(null);
            }}
          >
            Xếp lại từ đầu
          </button>
        </>,
        { title: classify.instruction || 'Xếp mỗi thẻ vào đúng nhóm' },
      );
    }

    if (scr.kind === 'selfExplain')
      return shell(
        <SelfExplain
          value={d.explanation}
          onChange={(value) => {
            setCheckedKey('');
            update({ explanation: value });
          }}
          placeholder={two?.selfExplain?.placeholder}
          rubricLabels={(two?.selfExplain?.rubric ?? []).map((r) => r.label)}
          requirement={`Viết thành câu, ít nhất ${SELF_EXPLAIN_MIN.words} từ — người chấm sẽ đọc phần này.`}
        />,
        { title: two?.selfExplain?.prompt || 'Giải thích cách làm của bạn' },
      );

    if (scr.kind === 'scaffold') return renderScaffold();

    if (scr.kind === 'trace')
      return shell(
        <ol className={c.trace}>
          {(three?.trace?.steps ?? []).map((row, i) => (
            <li key={i}>
              {row.label && <b>{row.label}</b>}
              <span>{row.text}</span>
            </li>
          ))}
        </ol>,
        {
          title: 'Nhật ký biến đổi',
          description: three?.task?.rule || three?.task?.body,
        },
      );

    if (scr.kind === 'counter') {
      const counter = three?.counter;
      if (!counter) return null;
      return shell(
        <Mcq
          options={counter.options.map((opt, i) => ({ key: letterKey(i), label: opt }))}
          selected={d.counter || null}
          onSelect={(key) => {
            setCheckedKey('');
            update({ counter: key });
          }}
          correctKey={letterKey(counter.options.indexOf(counter.correct))}
          checked={checked}
        />,
        { title: counter.question },
      );
    }

    if (scr.kind === 'game' && game) return renderGame(game, shell);

    if (scr.kind === 'sandbox') {
      const io = four?.task?.io ?? [];
      return (
        <ShellB
          eyebrowIcon={eyebrow.icon}
          eyebrowLabel={eyebrow.label}
          metaLabel={meta?.title}
          title={four?.task?.title || 'Thử thách độc lập'}
          description={paragraphs(four?.task?.body)}
        >
          {four?.env && <div className={`${c.note} ${c.noteWarn}`}>{four.env}</div>}
          {boss ? (
            <div className={`${c.note} ${c.boss}`} role="status">
              <strong>⚔️ Trận Boss của chặng.</strong> Không có gợi ý — tự viết và nộp. Lời giải mẫu chỉ mở
              sau lần nộp đầu, và xem nó thì điểm trận này bị giới hạn ở 60%.
            </div>
          ) : (
            gate &&
            !d.submitted && (
              <div className={c.note} role="status">
                <strong>Cửa tự kiểm tra.</strong> Tự viết và nộp lần đầu trước — lời giải mẫu chỉ mở sau lần nộp
                đó. Mở gợi ý vẫn được, nhưng lượt này sẽ ghi nhận là có hỗ trợ.
              </div>
            )
          )}
          {io.length > 0 && (
            <dl className={c.io}>
              {io.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd><code>{row.value}</code></dd>
                </div>
              ))}
            </dl>
          )}
          {contracts.length > 0 && (
            <details className={c.panel} open={contracts.length <= 2}>
              <summary>
                Mô tả hàm <span>{contracts.map((k) => k.sig.split('(')[0]).join(' · ')}</span>
              </summary>
              <ul className={c.contracts}>
                {contracts.map((k) => (
                  <li key={k.sig}>
                    <code className={c.sig}>{k.sig}</code>
                    {k.does && <p>{k.does}</p>}
                    <dl>
                      {k.takes && (<div><dt>Nhận</dt><dd>{k.takes}</dd></div>)}
                      {k.gives && (<div><dt>Trả</dt><dd>{k.gives}</dd></div>)}
                      {k.effect && (<div><dt>Tác dụng</dt><dd>{k.effect}</dd></div>)}
                      {k.call && (<div><dt>Gọi</dt><dd><code>{k.call}</code></dd></div>)}
                    </dl>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {files.length > 0 && (
            <details className={c.panel}>
              <summary>
                File trong thư mục bài <span>{files.map((f) => f.name).join(' · ')}</span>
              </summary>
              <p className={c.panelNote}>
                Đặt sẵn cạnh main.py mỗi lần chạy (chỉ đọc). Bộ chấm còn dùng thêm dữ liệu mới bạn chưa thấy.
              </p>
              {files.map((f) => (
                <CodeBlock
                  key={f.name}
                  filename={f.name}
                  langTag={f.kind === 'data' ? 'dữ liệu · UTF-8' : 'file cấp sẵn'}
                  lines={
                    f.kind === 'data'
                      ? f.content.split('\n').map((line, i) => ({ num: i + 1, content: line || ' ' }))
                      : toCodeLines(f.content.replace(/\n+$/, ''))
                  }
                />
              ))}
            </details>
          )}
          {/* Bài quy trình: các bước phải làm trên máy thật. Không có mã Python
              nào để chạy nên KHÔNG hiện ô soạn mã — trước đây bài loại này đổ
              đáp án đã chú-thích-hoá vào editor, bấm "Chạy thử" ra console
              rỗng và người học tưởng hỏng. */}
          {procedure.length > 0 && (
            <div className={c.procedure}>
              <div className={c.procedureHead}>
                <strong>Quy trình tham chiếu</strong>
                <button
                  type="button"
                  className={c.resetLink}
                  onClick={() => setProcedureOpen((o) => !o)}
                >
                  {procedureOpen ? 'Ẩn đi' : 'Hiện các bước'}
                </button>
              </div>
              {procedureOpen ? (
                <CodeBlock
                  filename="terminal"
                  langTag="chạy trên máy của bạn"
                  lines={procedure.map((line, i) => ({ num: i + 1, content: line }))}
                />
              ) : (
                <p>
                  Tự làm trước trên máy rồi mới mở đối chiếu — {procedure.length} bước.
                </p>
              )}
            </div>
          )}
          {showEditor && (
            <SandboxEditor
              filename="main.py"
              langTag={runtimeStatus || 'CPython 3.12'}
              code={d.code}
              onCodeChange={(code) => update({ code })}
              running={running}
              onRun={() => run(false)}
              onStop={cancelRun}
              onShowSolution={
                four?.solutionCode && (!gate || d.submitted)
                  ? () => {
                      update({ code: four.solutionCode!, solutionUsed: true, assisted: true });
                      setMessage('Đã chèn lời giải mẫu. Hãy đọc hiểu trước khi nộp.');
                    }
                  : undefined
              }
              placeholder={
                tests.length
                  ? undefined
                  : 'Bài này thực hành trên máy lab nên không có ca chấm tự động. Ô này dùng làm nháp: gõ thử rồi bấm "Chạy thử" (chỉ thư viện chuẩn chạy được trong trình duyệt).'
              }
              consoleLines={consoleLines()}
              consoleMeta={result ? `${result.duration} ms` : runtimeStatus}
              tests={sandboxRows()}
              disabled={busy}
            />
          )}
          {hintOpen && hints.length > 0 && (
            <HintSheet
              levels={hints.map((h, i) => ({
                title: h.title,
                // Tầng "lời giải từng phần" là code nhiều dòng: giữ nguyên thụt lề.
                body: h.body.includes('\n') ? <pre className={c.hintCode}>{h.body}</pre> : h.body,
                locked: i > hintIndex,
              }))}
              openIndex={hintIndex}
              onUnlock={setHintIndex}
              onBackToCode={() => setHintOpen(false)}
              onContinueWriting={() => setHintOpen(false)}
            />
          )}
        </ShellB>
      );
    }

    // recap
    const graded = screens.filter((x) => isGraded(x.kind));
    const done = graded.filter((x) => d.done[x.key]).length;
    const firstTry = graded.filter((x) => score.firstTry[x.key] === true).length;
    const xpText =
      completed && xpGained !== null
        ? `+${xpGained} XP`
        : completed
          ? `+${meta?.xpReward ?? 0} XP`
          : `${meta?.xpReward ?? 0} XP`;
    if (play)
      return (
        <Recap
          xpLabel={xpText}
          title={
            completed ? (boss ? '⚔️ Đã hạ Boss của chặng!' : 'Đã hoàn thành bài học!') : 'Tổng kết bài học'
          }
          description={
            (completed
              ? boss
                ? 'Chặng tiếp theo đã mở khoá. '
                : 'Tiến độ và XP đã được lưu. '
              : tests.length
                ? 'Nộp bài ở màn sandbox để ghi nhận hoàn thành. '
                : 'Xác nhận khi bạn đã làm xong. ') +
            `XP nhận được tính theo số game bạn làm đúng ngay lần đầu (${firstTry}/${graded.length}).` +
            (d.assisted ? ' Lượt này có dùng gợi ý/lời giải nên điểm bị giới hạn.' : '')
          }
          stats={[
            { icon: '⭐', value: String(score.points), label: 'Điểm trong bài' },
            { icon: '🔥', value: `x${score.bestCombo}`, label: 'Combo cao nhất' },
            { icon: '🎯', value: `${firstTry}/${graded.length || 0}`, label: 'Đúng ngay lần đầu' },
          ]}
          facts={[
            ...(lesson.step_1?.explain ?? []).map((row) => row.body),
            lesson.step_1?.misconception?.body
              ? `Tránh ngộ nhận: ${lesson.step_1.misconception.body}`
              : undefined,
          ]
            .filter((x): x is string => Boolean(x))
            .slice(0, 3)}
          onFinish={() => doAction(primary().action)}
        />
      );
    return (
      <Recap
        xpLabel={completed ? `+${meta?.xpReward ?? 0} XP` : `${meta?.xpReward ?? 0} XP`}
        title={completed ? 'Đã hoàn thành bài học!' : 'Tổng kết bài học'}
        description={
          (completed
            ? 'Tiến độ và XP đã được lưu. Bạn có thể quay lại luyện tập bất cứ lúc nào.'
            : tests.length
              ? 'Bài này chấm tự động — nộp bài ở màn sandbox để ghi nhận hoàn thành.'
              : 'Bài này thực hành trên máy lab nên không có ca chấm tự động. Xác nhận khi bạn đã làm xong.') +
          (d.assisted
            ? gate
              ? ' Lượt này có dùng gợi ý/lời giải: cửa tự kiểm tra tính là "có hỗ trợ" — hãy tự làm lại với dữ liệu mới.'
              : ' Lượt này có dùng gợi ý/lời giải — thử làm lại không mở gợi ý để chắc kiến thức.'
            : '')
        }
        stats={[
          { icon: '🎯', value: `${done}/${graded.length || 0}`, label: 'Câu đã làm đúng' },
          {
            icon: '🧪',
            // Kết quả chạy không lưu qua lần tải trang; bài có test chỉ hoàn thành
            // được qua lượt nộp đạt hết ca, nên đã hoàn thành = đạt đủ.
            value: `${result ? result.tests.filter((t) => t.passed).length : completed ? tests.length : 0}/${tests.length}`,
            label: 'Ca kiểm thử đạt',
          },
          { icon: '📚', value: `${screens.length - 1}`, label: 'Màn đã học' },
        ]}
        facts={[
          lesson.step_1?.context?.body,
          ...(lesson.step_1?.explain ?? []).map((row) => row.body),
          lesson.step_1?.misconception?.body
            ? `Tránh ngộ nhận: ${lesson.step_1.misconception.body}`
            : undefined,
        ]
          .filter((x): x is string => Boolean(x))
          .slice(0, 4)}
        onFinish={() => doAction(primary().action)}
      />
    );
  }

  // ---------- Vỏ ----------

  const cta = primary();
  const adminKey = user?.role === 'admin' ? answerKey() : null;
  const reached = screens.reduce(
    (acc, x, i) => (d.done[x.key] ? Math.max(acc, i + 2) : acc),
    1,
  );
  function frame(children: React.ReactNode, over?: Partial<React.ComponentProps<typeof LessonChrome>>) {
    return (
      <LessonChrome
        step={Math.min(d.step, Math.max(1, screens.length || 1))}
        totalSteps={Math.max(1, screens.length || 1)}
        streak={streak}
        points={play ? score.points : undefined}
        courseLabel={
          (boss ? '⚔️ BOSS · ' : '') +
          (lesson?.step_1?.brief?.title || meta?.title
            ? `${courseName} · ` + (lesson?.step_1?.brief?.title || meta?.title)
            : `${courseName} Studio`)
        }
        // Lưu nháp thành công thì giữ đúng câu của Figma; chỉ đổi khi có lỗi.
        saveLabel={saveStatus.startsWith('Không') ? saveStatus : '✓ Tiến độ tự lưu'}
        onClose={leave}
        primaryLabel={cta.label}
        primaryTone={cta.tone}
        primaryDisabled={cta.disabled}
        // doAction() chỉ chạy khi người học bấm nút. Nó đụng worker/timer ref
        // bên trong run(), nhưng ở đây mới chỉ là TRUYỀN handler — không ref nào
        // bị đọc lúc render, nên tắt cảnh báo đúng một dòng này.
        // eslint-disable-next-line react-hooks/refs
        onPrimaryClick={() => doAction(cta.action)}
        onSeek={screens.length > 1 ? goTo : undefined}
        seekMax={Math.max(d.step, Math.min(screens.length, reached))}
        doneSteps={screens.map((x) => completed || Boolean(d.done[x.key]))}
        secondaryLabel={
          hints.length && scr?.kind === 'sandbox' && !boss
            ? hintOpen
              ? '💡 Ẩn gợi ý'
              : gate && !d.assisted
                ? '💡 Gợi ý (tính là có hỗ trợ)'
                : '💡 Gợi ý'
            : undefined
        }
        onSecondaryClick={() => {
          if (!hintOpen && !d.assisted) update({ assisted: true });
          setHintOpen((o) => !o);
        }}
        {...over}
      >
        {children}
        {pop &&
          createPortal(
            <div
              key={`pop-${pop.id}`}
              className={c.pop}
              role="status"
              onAnimationEnd={() => setPop(null)}
            >
              {pop.text}
            </div>,
            document.body,
          )}
        {celebrate > 0 &&
          createPortal(
            <div
              key={`burst-${celebrate}`}
              className={c.burst}
              aria-hidden="true"
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) setCelebrate(0);
              }}
            >
              {['🎉', '✨', '🐍', '⭐', '🎊', '✨', '🎉', '⭐'].map((emoji, i) => (
                <span key={i} style={{ '--i': i } as React.CSSProperties}>
                  {emoji}
                </span>
              ))}
              <strong>▶ Code chạy đúng!</strong>
            </div>,
            document.body,
          )}
        {awards.length > 0 &&
          createPortal(
          <div className={c.awardsBackdrop} role="dialog" aria-modal="true" aria-label="Thành tích mới">
            <div className={c.awards}>
              <p className={c.awardsEyebrow}>THÀNH TÍCH MỚI</p>
              {awards.map((a, i) => (
                <div key={i} className={c.award}>
                  <span>{a.icon || '🏅'}</span>
                  <div>
                    <strong>{a.name || 'Huy hiệu mới'}</strong>
                    {a.description && <p>{a.description}</p>}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setAwards([])}>
                Tuyệt vời!
              </button>
            </div>
          </div>,
            document.body,
          )}
        {message && (
          <div className={c.toast} role="status">
            <p>{message}</p>
            <button type="button" aria-label="Đóng thông báo" onClick={() => setMessage('')}>
              ×
            </button>
          </div>
        )}
      </LessonChrome>
    );
  }

  const info = (title: string, body: React.ReactNode, eyebrow = 'Python Studio') => (
    <ShellB eyebrowIcon={ICON.book} eyebrowLabel={eyebrow} title={title} description={body} centered />
  );

  if (loading)
    return frame(info('Đang tải bài học…', 'Chờ một chút, nội dung đang được lấy từ máy chủ.'), {
      primaryLabel: 'Đang tải…',
      primaryDisabled: true,
      onPrimaryClick: () => undefined,
      onSeek: undefined,
    });

  if (loadError)
    return frame(info('Chưa kết nối được bài học', loadError), {
      primaryLabel: 'Thử lại',
      onPrimaryClick: () => void load(),
      onSeek: undefined,
    });

  if (!enrolled && user?.role !== 'admin')
    return frame(
      info(
        meta?.title || `Bài học ${courseName}`,
        'Đăng ký khóa học miễn phí để mở bài học và lưu tiến độ.',
      ),
      {
        primaryLabel: busy ? 'Đang đăng ký…' : `Đăng ký khóa ${courseName} & bắt đầu`,
        primaryDisabled: busy,
        onPrimaryClick: () => void enroll(),
        onSeek: undefined,
      },
    );

  if (empty)
    return frame(
      info(
        meta?.title || `Bài ${lessonNo}`,
        'Bài học này chưa có nội dung Studio. Quản trị viên có thể nhập nội dung từ file PDF hoặc Markdown trong trang quản trị.',
        'Đang biên soạn',
      ),
      { primaryLabel: 'Về khóa học →', onPrimaryClick: leave, onSeek: undefined },
    );

  return frame(
    <>
      {user?.role === 'admin' && !enrolled && (
        <div className={c.note} role="status">
          <strong>Chế độ xem trước của quản trị viên.</strong> Bạn chưa ghi danh khoá này nên
          tiến độ và XP sẽ không được lưu.
        </div>
      )}
      {completed && scr?.kind !== 'recap' && (
        <div className={`${c.note} ${c.noteOk}`} role="status">
          ✓ Bài này đã hoàn thành và được lưu trên hệ thống. Bạn có thể luyện tập lại.
        </div>
      )}
      {renderScreen()}
      {adminKey && (
        <section className={c.answerKey} aria-label="Đáp án cho quản trị viên">
          <button
            type="button"
            className={c.answerKeyHead}
            aria-expanded={answerOpen}
            onClick={() => setAnswerOpen((o) => !o)}
          >
            <span className={c.adminTag}>ADMIN</span>
            <strong>Đáp án màn này</strong>
            <span className={c.answerKeyToggle}>{answerOpen ? 'Ẩn' : 'Hiện'}</span>
          </button>
          {answerOpen && (
            <>
              {adminKey.rows.length > 0 && (
                <dl>
                  {adminKey.rows.map((row, i) => (
                    <div key={i}>
                      <dt>{row.label}</dt>
                      <dd>
                        <code>{row.value}</code>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {adminKey.code && (
                <CodeBlock
                  filename="main.py"
                  langTag="Lời giải mẫu"
                  lines={toCodeLines(adminKey.code)}
                />
              )}
              {adminKey.fill && (
                <button
                  type="button"
                  className={c.resetLink}
                  onClick={() => {
                    setCheckedKey('');
                    setHeld(null);
                    update(adminKey.fill!);
                  }}
                >
                  Điền sẵn đáp án vào màn này
                </button>
              )}
            </>
          )}
        </section>
      )}
    </>,
  );
}
