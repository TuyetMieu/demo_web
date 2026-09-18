'use client';

/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-page-custom-font */
// Renders any lesson stored as studio-lesson/v1 in lessons.content_json — the
// output of the admin PDF/Markdown import. The hand-built List & Mutability
// lesson keeps its own component (PythonStudio.tsx); this one is data-driven and
// hides whatever the source document did not provide.
import { useEffect, useRef, useState } from 'react';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import { Card, Choice, Code, Icon, Stepper } from './studio-ui';
import {
  assembleScaffold,
  canLeaveStep,
  correctIndex,
  initialLessonDraft,
  optionDetail,
  optionText,
  presentSteps,
  rubricScore,
  type LessonDraft,
  type StudioLesson as Lesson,
} from '@/lib/studio-lesson';
import s from './studio.module.css';

type TestResult = { name: string; passed: boolean; detail: string };
type RunResult = {
  tests: TestResult[];
  output: string;
  error?: string;
  duration: number;
  version: string;
};

export default function StudioLesson({
  courseId,
  lessonNo,
}: {
  courseId: string;
  lessonNo: number;
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [meta, setMeta] = useState<{ title: string; xpReward: number } | null>(
    null,
  );
  const [user, setUser] = useState<{
    id: number;
    name: string;
    xp: number;
    role?: string;
  } | null>(null);
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
  const [hint, setHint] = useState(false);
  const [openHint, setOpenHint] = useState(0);
  const [selectedToken, setSelectedToken] = useState('');
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = lesson ? presentSteps(lesson) : [];
  const current = steps[d.step - 1];
  const draftKey = user
    ? `pe-studio-lesson-v1:${user.id}:${courseId}:${lessonNo}`
    : null;
  const update = (changes: Partial<LessonDraft>) =>
    setD((prev) => ({ ...prev, ...changes }));

  async function json(path: string, options?: RequestInit) {
    const response = await apiFetch(path, options);
    if (response.status === 401) {
      window.location.assign(
        '/login?next=' +
          encodeURIComponent(`/lesson/python?lesson=${lessonNo - 1}`),
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
    setEmpty(false);
    try {
      const [profile, enrollments] = await Promise.all([
        json('/api/user'),
        json('/api/enrolled'),
      ]);
      const enrollment = findEnrollment(
        asList(enrollments, 'enrolled'),
        courseId,
      );
      setUser(profile);
      setEnrolled(Boolean(enrollment));
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
      if (!content || !presentSteps(content).length) {
        setEmpty(true);
        setLoading(false);
        return;
      }
      setLesson(content);

      let restored = initialLessonDraft(content);
      try {
        const stored = JSON.parse(
          localStorage.getItem(
            `pe-studio-lesson-v1:${profile.id}:${courseId}:${lessonNo}`,
          ) || 'null',
        );
        if (stored && typeof stored.code === 'string') {
          restored = {
            ...restored,
            ...stored,
            step: Math.min(
              presentSteps(content).length,
              Math.max(1, Number(stored.step) || 1),
            ),
            code: String(stored.code).slice(0, 15000),
          };
        }
      } catch {
        /* A missing or corrupt draft must not block the lesson. */
      }
      setD(restored);
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
          quizScore: 100,
        }),
      });
      setCompleted(true);
      setMessage(
        body.alreadyCompleted
          ? 'Bài này đã hoàn thành trước đó — không cộng XP lần hai.'
          : 'Đã lưu hoàn thành bài học.',
      );
    } catch (error) {
      setMessage(
        `Code đã đạt, nhưng chưa lưu được tiến độ: ${(error as Error).message}`,
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
  }

  function run(submit: boolean) {
    if (running || busy) return;
    const four = lesson?.step_4;
    if (!four || !lesson) return;
    const blocked = steps
      .slice(0, -1)
      .some((_, i) => !canLeaveStep(lesson, steps, { ...d, step: i + 1 }));
    if (submit && blocked) {
      setMessage('Hãy hoàn thành các bước học trước khi nộp bài.');
      return;
    }
    setMessage('');
    setResult(null);
    setRunning(true);
    setRuntimeStatus('Đang tải Python…');
    const instance = new Worker('/static/js/studio-lesson.worker.js');
    worker.current = instance;
    const expire = (text: string) => {
      cancelRun();
      setRuntimeStatus('');
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
      setRuntimeStatus(data.version ? `CPython ${data.version}` : '');
      setResult(data);
      const tests = four.tests ?? [];
      if (
        submit &&
        !data.error &&
        tests.length > 0 &&
        data.tests.length === tests.length &&
        data.tests.every((t: TestResult) => t.passed)
      )
        void complete();
    };
    instance.postMessage({
      code: d.code,
      tests: four.tests ?? [],
      forbid: four.forbid ?? [],
    });
  }

  function changeStep(step: number) {
    update({ step });
    setMessage('');
    setHint(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function classify(bin: string, token = selectedToken) {
    const tokens = lesson?.step_2?.classify?.tokens ?? [];
    if (!tokens.some((t) => t.label === token)) return;
    setD((prev) => ({
      ...prev,
      bins: { ...prev.bins, [token]: bin },
      classified: false,
    }));
    setSelectedToken('');
  }

  const stepNames = steps.map((x, i) => `S${i + 1}: ${x.label}`);

  // ---------- Step bodies ----------

  function renderStep1() {
    const one = lesson?.step_1;
    if (!one) return null;
    const chosen = one.predict?.options.find((o) => o.id === d.predict);
    return (
      <div className={s.twoColumns}>
        <div>
          {one.context && (
            <Card className={s.scenario}>
              <h2>{one.context.title || 'Ngữ cảnh'}</h2>
              <p>{one.context.body}</p>
            </Card>
          )}
          {one.code && (
            <div className={s.codeCard}>
              <div className={s.editorHeader}>
                <span>{one.code.filename || 'example.py'}</span>
                <small>{one.code.version || 'Python 3.12'}</small>
              </div>
              <Code code={one.code.source} />
            </div>
          )}
          {one.predict && (
            <Card>
              <h2>Cổng dự đoán</h2>
              <p className={s.muted}>{one.predict.question}</p>
              <div className={s.choices}>
                {one.predict.options.map((o) => (
                  <Choice
                    key={o.id}
                    name="predict"
                    value={o.id}
                    selected={d.predict}
                    onChange={(v) => update({ predict: v, predicted: false })}
                    title={o.title}
                    detail={o.detail}
                  />
                ))}
              </div>
              <button
                className={s.primary}
                disabled={!d.predict}
                onClick={() => {
                  update({ predicted: true });
                  setMessage(
                    chosen?.correct
                      ? 'Chính xác! Đọc phần giải thích bên cạnh.'
                      : 'Chưa đúng — mở phần giải thích để xem vì sao.',
                  );
                }}
              >
                Xác nhận dự đoán để mở khóa giải thích
              </button>
            </Card>
          )}
          {one.misconception && (
            <div className={s.warning}>
              <strong>{one.misconception.title || 'Ngộ nhận thường gặp'}</strong>
              <p>{one.misconception.body}</p>
            </div>
          )}
        </div>
        <div>
          {one.memory && renderMemory()}
          {one.explain && one.explain.length > 0 && (
            <Card>
              <div className={s.titleRow}>
                <h2>Vì sao lại như vậy?</h2>
                {!d.predicted && (
                  <span className={s.monoBadge}>Khóa cho đến khi dự đoán</span>
                )}
              </div>
              <div
                className={d.predicted ? s.explanation : s.lockedExplanation}
                aria-hidden={!d.predicted}
              >
                {one.explain.map((row, i) => (
                  <div className={s.logEntry} key={i}>
                    <span className={s.iconBox}>{row.n ?? i + 1}</span>
                    <p>
                      {row.title && <strong>{row.title}: </strong>}
                      {row.body}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  function renderMemory() {
    const m = lesson?.step_1?.memory;
    if (!m) return null;
    return (
      <Card className={s.memory}>
        <div className={s.titleRow}>
          <h2>Mô hình thực thi bộ nhớ</h2>
          {m.heapAddr && (
            <span className={s.monoBadge}>Heap Addr: {m.heapAddr}</span>
          )}
        </div>
        <div className={s.memoryGrid}>
          <div className={s.stack}>
            <h3>STACK (BIẾN TÊN)</h3>
            {(m.stack ?? []).map((v) => (
              <div className={s.alias} key={v.name}>
                {v.label && <small>{v.label}</small>}
                <strong>{v.name}</strong>
                {v.ptr && <small>ptr: {v.ptr}</small>}
              </div>
            ))}
          </div>
          <div className={s.heap}>
            <h3>HEAP (ĐỐI TƯỢNG)</h3>
            {m.heap && (
              <div className={s.heapValue}>
                <div className={s.titleRow}>
                  <strong>{m.heap.type || 'PyObject'}</strong>
                  {typeof m.heap.refcount === 'number' && (
                    <small>ob_refcnt: {m.heap.refcount}</small>
                  )}
                </div>
                <div className={s.cells}>
                  {(m.heap.cells ?? []).map((c, i) => (
                    <div key={i}>
                      <small>[ {i} ]</small>
                      <strong>{c.value}</strong>
                      {c.id && <small>id: {c.id}</small>}
                    </div>
                  ))}
                </div>
                {m.heap.note && <small>{m.heap.note}</small>}
              </div>
            )}
          </div>
        </div>
        {m.assertion && (
          <div className={s.console}>
            <span className={s.consoleLine}>
              {m.assertion}{' '}
              {m.assertionResult && (
                <b className={s.green}>{m.assertionResult}</b>
              )}
            </span>
          </div>
        )}
      </Card>
    );
  }

  function renderStep2() {
    const two = lesson?.step_2;
    if (!two) return null;
    const grouping = two.classify;
    return (
      <div className={s.twoColumns}>
        <div>
          {(two.mcq ?? []).map((q, qi) => (
            <Card key={qi}>
              <div className={s.eyebrow}>Q{qi + 1} · Trắc nghiệm</div>
              <h2>{q.question}</h2>
              <div className={s.choices}>
                {q.options.map((o, oi) => (
                  <Choice
                    key={oi}
                    name={`mcq-${qi}`}
                    value={String(oi)}
                    selected={d.mcq[qi] ?? ''}
                    onChange={(v) =>
                      update({ mcq: { ...d.mcq, [qi]: v }, mcqDone: false })
                    }
                    title={`${String.fromCharCode(65 + oi)}. ${optionText(o)}`}
                    detail={optionDetail(o)}
                  />
                ))}
              </div>
              {qi === (two.mcq?.length ?? 0) - 1 && (
                <button
                  className={s.primary}
                  disabled={(two.mcq ?? []).some(
                    (_, i) => d.mcq[i] === undefined,
                  )}
                  onClick={() => {
                    const all = (two.mcq ?? []).every(
                      (item, i) => Number(d.mcq[i]) === correctIndex(item),
                    );
                    update({ mcqDone: all });
                    setMessage(
                      all
                        ? 'Đúng hết phần trắc nghiệm!'
                        : 'Còn câu chưa đúng — xem lại rồi chọn lại.',
                    );
                  }}
                >
                  Xác nhận phân tích
                </button>
              )}
              {d.mcqDone && q.explanation && (
                <div className={s.feedback}>
                  <p>{q.explanation}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
        <div>
          {grouping && (
            <Card>
              <h2>Phân loại thao tác</h2>
              {grouping.instruction && (
                <p className={s.muted}>{grouping.instruction}</p>
              )}
              <div className={s.tokenQueue}>
                <div className={s.titleRow}>
                  <small>Hàng chờ phân loại:</small>
                  <code>
                    {grouping.tokens.filter((t) => !d.bins[t.label]).length} thẻ
                    còn lại
                  </code>
                </div>
                <div className={s.tokens}>
                  {grouping.tokens.every((t) => d.bins[t.label]) && (
                    <small className={s.queueEmpty}>
                      Đã xếp hết {grouping.tokens.length} thẻ. Bấm thẻ trong nhóm
                      để lấy lại.
                    </small>
                  )}
                  {grouping.tokens
                    .filter((t) => !d.bins[t.label])
                    .map((t) => (
                      <button
                        key={t.label}
                        className={selectedToken === t.label ? s.selected : ''}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', t.label);
                          setSelectedToken(t.label);
                        }}
                        onClick={() => setSelectedToken(t.label)}
                      >
                        {t.label}
                      </button>
                    ))}
                </div>
              </div>
              <div className={s.binGrid}>
                {grouping.bins.map((bin) => {
                  const placed = grouping.tokens.filter(
                    (t) => d.bins[t.label] === bin.key,
                  );
                  return (
                    <div
                      className={s.bin}
                      key={bin.key}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        classify(bin.key, e.dataTransfer.getData('text/plain'));
                      }}
                    >
                      <h3>
                        {bin.title}{' '}
                        {bin.subtitle && <small>{bin.subtitle}</small>}
                      </h3>
                      {bin.desc && <p>{bin.desc}</p>}
                      <div
                        className={`${s.dropZone} ${selectedToken ? s.dropZoneReady : ''}`}
                      >
                        {placed.length > 0 && (
                          <div className={s.tokens}>
                            {placed.map((t) => (
                              <button
                                key={t.label}
                                title="Trả về hàng chờ"
                                onClick={() =>
                                  setD((prev) => {
                                    const bins = { ...prev.bins };
                                    delete bins[t.label];
                                    return { ...prev, bins, classified: false };
                                  })
                                }
                              >
                                {t.label} ×
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          className={s.dropTarget}
                          onClick={() => classify(bin.key)}
                          aria-label={`Thả vào nhóm ${bin.title}`}
                        >
                          {selectedToken
                            ? `Đặt ${selectedToken} vào đây`
                            : placed.length
                              ? 'Thả thêm thẻ vào đây'
                              : `Thả vào nhóm ${bin.title}`}
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
                  Làm lại
                </button>
                <button
                  className={s.darkButton}
                  onClick={() => {
                    const ok = grouping.tokens.every(
                      (t) => d.bins[t.label] === t.bin,
                    );
                    update({ classified: ok });
                    setMessage(
                      ok
                        ? `Đúng cả ${grouping.tokens.length} thao tác!`
                        : 'Chưa đúng hết. Chạm thẻ trong nhóm để đưa về hàng chờ và sửa.',
                    );
                  }}
                >
                  Kiểm tra phân loại
                </button>
              </div>
            </Card>
          )}
          {two.selfExplain && (
            <Card className={s.probe}>
              <h2>Tự giải thích</h2>
              <p className={s.inset}>{two.selfExplain.prompt}</p>
              <textarea
                className={s.explanationInput}
                value={d.explanation}
                placeholder={
                  two.selfExplain.placeholder || 'Nhập lời giải thích của bạn…'
                }
                onChange={(e) =>
                  update({ explanation: e.target.value, explained: false })
                }
              />
              <div className={s.titleRow}>
                <small className={s.muted}>
                  Rubric:{' '}
                  {(two.selfExplain.rubric ?? [])
                    .map((r) => r.label)
                    .join(' · ')}
                </small>
                <button
                  className={s.primary}
                  disabled={!d.explanation.trim()}
                  onClick={() => {
                    const need = (two.selfExplain?.rubric ?? []).length;
                    const got = rubricScore(
                      d.explanation,
                      two.selfExplain?.rubric,
                    );
                    update({ explained: need === 0 || got >= need });
                    setMessage(
                      need === 0 || got >= need
                        ? 'Lời giải thích đã đủ ý theo rubric.'
                        : `Mới đạt ${got}/${need} ý của rubric. Bổ sung rồi gửi lại.`,
                    );
                  }}
                >
                  Gửi lời giải thích
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  function renderStep3() {
    const three = lesson?.step_3;
    if (!three) return null;
    const scaffold = three.scaffold;
    const assembled = scaffold
      ? assembleScaffold(scaffold.template, scaffold.slots, d.slots)
      : '';
    return (
      <div className={s.twoColumns}>
        <div>
          {three.task && (
            <Card>
              <h2>{three.task.title || 'Nhiệm vụ'}</h2>
              {three.task.body && <p>{three.task.body}</p>}
              {three.task.rule && (
                <div className={s.inset}>
                  <strong>Quy tắc: </strong>
                  {three.task.rule}
                </div>
              )}
            </Card>
          )}
          {scaffold && (
            <Card className={s.slotCanvas}>
              <div className={s.titleRow}>
                <h2>Khung lắp ghép</h2>
                <button
                  className={s.textButton}
                  onClick={() => update({ slots: {}, traced: false })}
                >
                  Đặt lại slot
                </button>
              </div>
              <div className={s.tokenBank}>
                {scaffold.bank.map((b) => (
                  <button
                    key={b.label}
                    className={
                      d.slots[b.slot] === b.label ? s.selected : undefined
                    }
                    onClick={() =>
                      update({
                        slots: { ...d.slots, [b.slot]: b.label },
                        traced: false,
                      })
                    }
                  >
                    <code>{b.label}</code>
                    <small>
                      {b.trap ? `${b.trap} · Slot ${b.slot}` : `Slot ${b.slot}`}
                    </small>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div>
          {scaffold && (
            <div className={s.codeCard}>
              <div className={s.editorHeader}>
                <span>solution.py</span>
                <small>Python 3.12</small>
              </div>
              <Code code={assembled} />
              <div className={s.runBar}>
                <button
                  className={s.primary}
                  onClick={() => {
                    const missing = scaffold.slots.find(
                      (slot) => !d.slots[slot.n],
                    );
                    if (missing) {
                      setMessage(
                        `Hãy chọn khối mã cho Slot ${missing.n} trước.`,
                      );
                      return;
                    }
                    const wrong = scaffold.slots.find(
                      (slot) => d.slots[slot.n] !== slot.answer,
                    );
                    update({ traced: !wrong });
                    setMessage(
                      wrong
                        ? `Slot ${wrong.n} chưa đúng. Đọc lại nhiệm vụ rồi thử khối khác.`
                        : 'Khung mã đã đúng.',
                    );
                  }}
                >
                  Kiểm tra khung mã
                </button>
                <small className={d.traced ? s.green : s.muted}>
                  {d.traced ? 'Khung mã đã đúng' : 'Sẵn sàng'}
                </small>
              </div>
            </div>
          )}
          {three.trace && three.trace.steps.length > 0 && d.traced && (
            <Card>
              <h2>Nhật ký biến đổi</h2>
              {three.trace.steps.map((row, i) => (
                <div className={s.logEntry} key={i}>
                  {row.label && <span className={s.monoBadge}>{row.label}</span>}
                  <p>{row.text}</p>
                </div>
              ))}
            </Card>
          )}
          {three.counter && (
            <Card>
              <h2>Tái dự đoán</h2>
              <p className={s.muted}>{three.counter.question}</p>
              <div className={s.counterChoices}>
                {three.counter.options.map((opt) => (
                  <Choice
                    key={opt}
                    name="counter"
                    value={opt}
                    selected={d.counter}
                    onChange={(counter) => update({ counter })}
                    title={opt}
                  />
                ))}
              </div>
              {d.counter && (
                <p
                  className={
                    d.counter === three.counter.correct ? s.green : s.amber
                  }
                >
                  {d.counter === three.counter.correct
                    ? 'Chính xác.'
                    : 'Chưa đúng — chạy lại khung mã và thử lại.'}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

  function renderStep4() {
    const four = lesson?.step_4;
    if (!four) return null;
    const tests = four.tests ?? [];
    const passed = result?.tests.filter((t) => t.passed).length ?? 0;
    return (
      <div className={s.sandboxGrid}>
        <div>
          {four.task && (
            <Card>
              <div className={s.eyebrow}>Thử thách độc lập</div>
              <h2>{four.task.title || 'Bài tập'}</h2>
              {four.task.body && <p>{four.task.body}</p>}
              {(four.task.io ?? []).map((row) => (
                <div className={s.titleRow} key={row.label}>
                  <small>{row.label}</small>
                  <code>{row.value}</code>
                </div>
              ))}
            </Card>
          )}
          {four.hints && four.hints.length > 0 && (
            <Card>
              <h2>Gợi ý theo tầng</h2>
              {four.hints.map((h, i) => (
                <div className={s.hintLevel} key={h.title}>
                  <button
                    className={s.textButton}
                    onClick={() => setOpenHint(openHint === i + 1 ? 0 : i + 1)}
                  >
                    <span className={s.iconBox}>{i + 1}</span> {h.title}
                  </button>
                  {openHint === i + 1 && <p>{h.body}</p>}
                </div>
              ))}
            </Card>
          )}
        </div>
        <div>
          <div className={s.codeCard}>
            <div className={s.editorHeader}>
              <span>solution.py</span>
              <small>{runtimeStatus || 'CPython 3.12'}</small>
            </div>
            <textarea
              className={s.codeInput}
              value={d.code}
              spellCheck={false}
              aria-label="Trình soạn mã Python"
              onChange={(e) => update({ code: e.target.value })}
            />
            <div className={s.runBar}>
              {running ? (
                <button className={s.secondary} onClick={cancelRun}>
                  Dừng
                </button>
              ) : (
                <button className={s.secondary} onClick={() => run(false)}>
                  Chạy thử
                </button>
              )}
              <button
                className={s.primary}
                disabled={running || busy || tests.length === 0}
                onClick={() => run(true)}
              >
                Nộp &amp; Chấm điểm
              </button>
              {four.solutionCode && (
                <button
                  className={s.copySolution}
                  onClick={() => {
                    update({ code: four.solutionCode!, solutionUsed: true });
                    setMessage(
                      'Đã chèn lời giải mẫu. Hãy đọc hiểu trước khi nộp.',
                    );
                  }}
                >
                  Xem lời giải mẫu
                </button>
              )}
            </div>
          </div>
          <div className={s.equalColumns}>
            <div className={s.console}>
              <div className={s.titleRow}>
                <small>Console Output</small>
                <small>{result ? `${result.duration} ms` : 'chưa chạy'}</small>
              </div>
              <pre className={s.consoleLine}>
                {result?.error ||
                  result?.output ||
                  '> Chạy mã để xem kết quả thật tại đây.'}
              </pre>
            </div>
            <Card>
              <div className={s.titleRow}>
                <h2>Thẩm định I/O</h2>
                <small
                  className={
                    result && passed === tests.length ? s.green : s.muted
                  }
                >
                  {result ? `${passed}/${result.tests.length} đạt` : 'Chưa chạy'}
                </small>
              </div>
              {(result?.tests ?? []).map((t) => (
                <div className={s.testResult} key={t.name}>
                  <strong className={t.passed ? s.green : s.red}>
                    {t.passed ? '✓' : '✕'} {t.name}
                  </strong>
                  <small>{t.detail}</small>
                </div>
              ))}
              {!result && (
                <small className={s.muted}>
                  {tests.length} trường hợp kiểm thử sẽ chạy khi bạn nộp bài.
                </small>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Shell ----------

  const stepBody =
    current?.key === 'step_1'
      ? renderStep1()
      : current?.key === 'step_2'
        ? renderStep2()
        : current?.key === 'step_3'
          ? renderStep3()
          : current?.key === 'step_4'
            ? renderStep4()
            : null;

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
            href={`/courses/${courseId}`}
            aria-label="Đóng bài học"
          >
            <Icon step={1} n={16} />
          </a>
          <a className={s.brand} href="/dashboard">
            Programming Edu
          </a>
          <div className={s.breadcrumb}>
            Python Core <Icon step={1} n={17} />{' '}
            <strong>
              Bài {lessonNo}: {meta?.title || '…'}
            </strong>
          </div>
          <div className={s.headerActions}>
            <span className={s.xp}>
              <Icon step={1} n={18} /> {user?.xp ?? '—'} XP
            </span>
            <a
              href="/dashboard#profile"
              className={s.avatar}
              title={user?.name || 'Tài khoản'}
            >
              <Icon step={1} n={20} />
            </a>
          </div>
        </div>
      </header>
      <main className={s.main}>
        {loading ? (
          <Card>
            <p role="status">Đang tải bài học…</p>
          </Card>
        ) : loadError ? (
          <Card>
            <h1>Chưa kết nối được bài học</h1>
            <p role="alert">{loadError}</p>
            <button className={s.primary} onClick={() => void load()}>
              Thử lại
            </button>
          </Card>
        ) : !enrolled && user?.role !== 'admin' ? (
          <Card>
            <span className={s.pill}>PYTHON STUDIO</span>
            <h1>{meta?.title || 'Bài học Python'}</h1>
            <p>Đăng ký khóa học miễn phí để mở bài học và lưu tiến độ.</p>
            <button
              className={s.primary}
              disabled={busy}
              onClick={() => void enroll()}
            >
              {busy ? 'Đang đăng ký…' : 'Đăng ký khóa Python & bắt đầu'}
            </button>
          </Card>
        ) : empty ? (
          <Card>
            <span className={s.pill}>ĐANG BIÊN SOẠN</span>
            <h1>{meta?.title || `Bài ${lessonNo}`}</h1>
            <p>
              Bài học này chưa có nội dung Studio. Quản trị viên có thể nhập nội
              dung từ file PDF hoặc Markdown trong trang quản trị.
            </p>
            <a className={s.primary} href={`/courses/${courseId}`}>
              Về khóa học
            </a>
          </Card>
        ) : (
          <>
            {user?.role === 'admin' && !enrolled && (
              <div className={s.warning} role="status">
                <strong>Chế độ xem trước của quản trị viên</strong>
                <p>
                  Bạn chưa ghi danh khoá này nên tiến độ và XP sẽ không được lưu.
                  Dùng tài khoản học viên nếu muốn kiểm tra phần nộp bài.
                </p>
              </div>
            )}
            <div className={s.banner}>
              <div>
                <span className={s.pill}>
                  ● BƯỚC {d.step}/{steps.length} ·{' '}
                  {current?.label.toUpperCase()}
                </span>
                <span className={s.bannerTitle}>{meta?.title}</span>
              </div>
              <div className={s.badges}>
                {steps.length > 1 && (
                  <Stepper current={d.step} names={stepNames} />
                )}
              </div>
            </div>
            {completed && (
              <div className={s.success} role="status">
                ✓ Bài này đã hoàn thành và được lưu trên hệ thống. Bạn có thể
                luyện tập lại.
              </div>
            )}
            {stepBody}
          </>
        )}
        {message && (
          <div className={s.feedback} role="status">
            <p>{message}</p>
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
          <aside className={s.hintPopup} role="status">
            <strong>Gợi ý cứu trợ</strong>
            <p>
              {lesson?.step_4?.hints?.[0]?.body ||
                'Đọc kỹ đề bài và phần giải thích ở các bước trước.'}
            </p>
            <button className={s.secondary} onClick={() => setHint(false)}>
              Đã hiểu
            </button>
          </aside>
        )}
      </main>
      {!loading && !loadError && enrolled && !empty && (
        <footer className={s.footer}>
          <div className={s.footerInner}>
            <div className={s.footerLeft}>
              <button
                className={s.textButton}
                onClick={() =>
                  d.step > 1
                    ? changeStep(d.step - 1)
                    : window.location.assign(`/courses/${courseId}`)
                }
              >
                Quay lại
              </button>
              <small className={s.green}>
                {saveStatus || 'Đang tải tiến độ'}
              </small>
            </div>
            <div className={s.footerRight}>
              <button className={s.textButton} onClick={() => setHint(!hint)}>
                Gợi ý cứu trợ
              </button>
              {d.step < steps.length ? (
                <button
                  className={s.primary}
                  disabled={!lesson || !canLeaveStep(lesson, steps, d)}
                  onClick={() => changeStep(d.step + 1)}
                >
                  Tiếp tục bước tiếp theo →
                </button>
              ) : (
                <a className={s.primary} href={`/courses/${courseId}`}>
                  {completed ? 'Về khóa học' : 'Xem tiến độ khóa học'} →
                </a>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
