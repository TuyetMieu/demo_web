'use client';

// Trang Luyện tập ĐỘC LẬP — vào thẳng /practice, chọn một khóa đã đăng ký rồi
// làm quiz ngay, không cần đi qua trang chi tiết khóa nào.
//
// ── HỢP ĐỒNG DỮ LIỆU — chép theo comment đầu review_quiz.js ─────────────────
// Component này viết lại bằng React (không nhúng review_quiz.js vì đây là trang
// Next.js thuần), nhưng PHẢI khớp từng điểm dưới đây, nếu không sẽ tái diễn
// đúng ba lỗi mà file đó đã mô tả:
//
//  1. POST /api/courses/:id/quiz/generate -> { ok, quiz_id, questions }
//     questions[i] = { index, question, options }
//       · `index` là số thứ tự TỪ 0 — KHÔNG phải `question_no`. Đọc sai thì mọi
//         radio cùng name="qundefined", chọn câu này bỏ chọn câu kia.
//       · `options` là mảng CHUỖI — KHÔNG phải [{id, text}]. Đọc `o.text` thì
//         mọi lựa chọn hiện nhãn rỗng.
//       · Response KHÔNG có `total` — lấy questions.length.
//
//  2. POST /api/quizzes/:id/submit  <-  { answers }
//     `answers` là mảng THEO VỊ TRÍ: answers[i] là GIÁ TRỊ đã chọn của câu thứ
//     i (backend chấm bằng `answers?.[i]`, so sánh chuỗi với q.correct). Gửi
//     mảng object thì điểm luôn 0.
//
//  3. Response chấm điểm: { ok, score, total, detail }
//     detail[i] = { question, given, correct, is_correct, explanation }
//     KHÔNG có `percentage`, `your_answer`, `correct_answer` — tự tính phần trăm.
//
// Endpoint sinh đề dùng bản RANDOM (`generate`) đúng theo yêu cầu nghiệp vụ cho
// luồng ngoài dashboard, KHÔNG dùng `generate-review` (bản có trọng số).

import { useCallback, useEffect, useState } from 'react';

import HeaderBar from '@/components/HeaderBar';
import PageStyles from '@/components/PageStyles';
import PeRouterBridge from '@/components/PeRouterBridge';
import Sidebar from '@/components/Sidebar';
import LegacyScripts from '@/components/LegacyScripts';
import { apiFetch, asList } from '@/lib/api';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Question = { index: number; question: string; options: string[] };
type Detail = {
  question: string;
  given: string | null;
  correct: string | number;
  is_correct: boolean;
  explanation: string | null;
};
type Result = { score: number; total: number; detail: Detail[] };
type EnrolledCourse = { id: string; title: string };

/** Lỗi backend có dạng { error: { status, message, detail }, request_id }. */
function errMessage(body: any, fallback: string): string {
  const e = body?.error;
  if (e && typeof e === 'object') return e.message || fallback;
  return typeof e === 'string' && e ? e : fallback;
}

export default function PracticePage() {
  const [courses, setCourses] = useState<EnrolledCourse[] | null>(null);
  const [courseId, setCourseId] = useState('');
  const [userName, setUserName] = useState('—');
  const [streak, setStreak] = useState(0);

  const [phase, setPhase] = useState<'idle' | 'loading' | 'quiz' | 'grading' | 'result'>('idle');
  const [error, setError] = useState('');
  const [quizId, setQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  // answers[i] = giá trị đã chọn của câu thứ i (null = chưa trả lời).
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    (async () => {
      // apiFetch chứ không phải fetch tương đối: pe-bridge chưa nạp lúc này.
      const [enrolled, stats, user]: any[] = await Promise.all([
        apiFetch('/api/enrolled').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch('/api/stats').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        apiFetch('/api/user').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      ]);
      // Backend trả dạng BỌC { ok, enrolled: [...] }, không phải mảng trần.
      const list = asList<any>(enrolled, 'enrolled').map((c) => ({
        id: String(c.id ?? c.courseId),
        title: c.title || String(c.id ?? c.courseId),
      }));
      setCourses(list);
      if (list.length) setCourseId(list[0].id);
      setStreak(stats?.streak ?? 0);
      setUserName(user?.name || '—');
      // Đặt title SAU khi dữ liệu về, không phải ngay lúc mount: metadata của
      // layout gốc được Next áp sau lượt hydrate đầu nên gán sớm sẽ bị đè lại
      // thành "Programming EDU" (đúng lỗi đã gặp ở trang chi tiết khóa học).
      document.title = 'Luyện tập – Programming EDU';
    })();
  }, []);

  const start = useCallback(async () => {
    if (!courseId) return;
    setPhase('loading');
    setError('');
    setResult(null);
    try {
      const res = await apiFetch(`/api/courses/${encodeURIComponent(courseId)}/quiz/generate`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errMessage(body, 'Không tạo được đề luyện tập.'));
        setPhase('idle');
        return;
      }
      const qs: Question[] = body?.questions || [];
      if (!qs.length) {
        setError('Đề trả về không có câu hỏi nào.');
        setPhase('idle');
        return;
      }
      setQuizId(body.quiz_id);
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setPhase('quiz');
    } catch {
      setError('Lỗi mạng, thử lại sau.');
      setPhase('idle');
    }
  }, [courseId]);

  const submit = useCallback(async () => {
    if (quizId == null) return;
    const unanswered = answers.filter((a) => a == null).length;
    if (unanswered && !confirm(`Còn ${unanswered} câu chưa trả lời. Nộp luôn?`)) return;

    setPhase('grading');
    try {
      const res = await apiFetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Mảng THEO VỊ TRÍ. Câu bỏ trống gửi null — backend coi null là sai.
        body: JSON.stringify({ answers }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errMessage(body, 'Nộp bài thất bại.'));
        setPhase('quiz');
        return;
      }
      setResult({
        score: body.score ?? 0,
        // Response KHÔNG có `total` ở generate; ở submit thì có — vẫn phòng hờ.
        total: body.total ?? questions.length,
        detail: body.detail || [],
      });
      setPhase('result');
    } catch {
      setError('Lỗi mạng, bài chưa được nộp.');
      setPhase('quiz');
    }
  }, [quizId, answers, questions.length]);

  const answered = answers.filter((a) => a != null).length;
  const pct = result && result.total ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <>
      <PageStyles hrefs={["/static/css/style.css","/static/css/dashboard.css","/static/css/pages.css","/static/css/dark-mode.css","/static/css/chatbot.css","/static/css/course_detail.css","/static/css/edu-theme.css","/static/css/edu-dashboard.css","/static/css/edu-course-detail.css"]} />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <PeRouterBridge />
      <Sidebar activePage="courses" />

      <div id="main">
        <HeaderBar
          title="Luyện tập"
          subtitle="Chọn một khóa đã đăng ký và ôn lại bằng đề random từ các bài bạn đã hoàn thành"
          userName={userName}
          streak={streak}
        />

        <div className="page active">
          <div className="cd-block" style={{ maxWidth: 860, margin: '0 auto 22px' }}>
            <div className="cd-block-hd">
              <div className="cd-block-icon">🎯</div>
              <h3>Chọn khóa để luyện tập</h3>
            </div>
            <div className="cd-block-body">
              {courses === null ? (
                <p>Đang tải danh sách khóa học…</p>
              ) : courses.length === 0 ? (
                <p>
                  Bạn chưa đăng ký khóa học nào.{' '}
                  <button
                    type="button"
                    className="quiz-btn secondary"
                    onClick={() => { (window as any).peGoTab?.('courses'); }}
                  >
                    Khám phá khóa học
                  </button>
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={phase === 'loading' || phase === 'quiz' || phase === 'grading'}
                    aria-label="Khóa học"
                    style={{
                      height: 42, minWidth: 260, padding: '0 12px', borderRadius: 10,
                      border: '1px solid var(--edu-input-border)',
                      background: 'var(--edu-input-bg)', color: 'var(--edu-t1)',
                      font: 'inherit', fontSize: 14,
                    }}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="quiz-btn primary"
                    onClick={start}
                    disabled={!courseId || phase === 'loading' || phase === 'grading'}
                  >
                    {phase === 'loading' ? 'Đang tạo đề…' : phase === 'quiz' || phase === 'result' ? 'Làm đề khác' : 'Bắt đầu'}
                  </button>
                </div>
              )}
              {error && (
                <p style={{ marginTop: 12, color: '#b91c1c', fontSize: 14 }} role="alert">{error}</p>
              )}
            </div>
          </div>

          {(phase === 'quiz' || phase === 'grading') && (
            <div className="cd-block" style={{ maxWidth: 860, margin: '0 auto' }}>
              <div className="cd-block-hd">
                <div className="cd-block-icon">🧠</div>
                <h3>Đề luyện tập</h3>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--edu-t4)' }}>
                  Đã trả lời {answered}/{questions.length}
                </span>
              </div>
              <div className="cd-block-body">
                {questions.map((q, i) => {
                  // `index` từ backend là chuẩn; thiếu thì lấy vị trí trong mảng.
                  const no = q.index != null ? q.index : i;
                  return (
                    <div className="quiz-q" key={no}>
                      <p className="quiz-q-text">{no + 1}. {q.question}</p>
                      {(q.options || []).map((opt, oi) => (
                        <label className="quiz-opt" key={oi}>
                          <input
                            type="radio"
                            name={`q${no}`}
                            value={opt}
                            checked={answers[i] === opt}
                            onChange={() => {
                              setAnswers((prev) => {
                                const next = [...prev];
                                next[i] = opt;
                                return next;
                              });
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="quiz-btn primary"
                  onClick={submit}
                  disabled={phase === 'grading'}
                >
                  {phase === 'grading' ? 'Đang chấm…' : 'Nộp bài'}
                </button>
              </div>
            </div>
          )}

          {phase === 'result' && result && (
            <div className="cd-block" style={{ maxWidth: 860, margin: '0 auto' }}>
              <div className="cd-block-hd">
                <div className="cd-block-icon">📊</div>
                <h3>Kết quả</h3>
              </div>
              <div className="cd-block-body">
                <p className="quiz-score">Điểm: {result.score}/{result.total} ({pct}%)</p>
                {result.detail.map((r, i) => (
                  <div className={`quiz-review-item ${r.is_correct ? 'correct' : 'wrong'}`} key={i}>
                    <p className="quiz-q-text">{i + 1}. {r.question}</p>
                    <p>
                      Bạn chọn: <b>{r.given != null ? String(r.given) : '(bỏ trống)'}</b>
                      {' — '}Đáp án đúng: <b>{String(r.correct)}</b>
                    </p>
                    {r.explanation ? <p className="quiz-explain">{r.explanation}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chuông thông báo + menu người dùng ở header — dùng chung với các trang
          khác (xem edu-chrome.js). Không nạp review_quiz.js: trang này tự xử lý
          quiz bằng React. */}
      <LegacyScripts srcs={['/static/js/edu-chrome.js']} />
    </>
  );
}
