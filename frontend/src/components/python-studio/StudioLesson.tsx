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
//
// File này giờ CHỈ còn phần điều phối. Trước đây nó là 2.058 dòng với 31
// useState và cả phần render của 15 loại màn; cắt ra thành:
//
//   screens/          một component cho mỗi loại màn, nhận props, không đọc
//                     state dùng chung (screens/index.tsx phân tuyến)
//   runner/           hợp đồng `Runner` + bản chạy bằng Pyodide trong Worker
//   useCodeRunner.ts  cầu nối React cho bộ chạy, và luật "chạy & nộp" của bài
//   useLessonData.ts  mọi thứ hỏi backend về bài học
//   useLessonDraft.ts bản nháp + tự lưu xuống localStorage
//   useLessonProgress.ts  màn đang mở, màn đã đúng, điểm/combo, hiệu ứng
//   cta.ts            luật của nút CTA dưới đáy (hàm thuần)
//   answer-key.ts     bảng đáp án cho admin (hàm thuần)
import { useMemo } from 'react';

import LessonChrome from '@/components/lesson-chrome/LessonChrome';
import ShellB from '@/components/lesson-chrome/ShellB';
import c from './studio-chrome.module.css';
import AdminAnswerKey from './AdminAnswerKey';
import LessonOverlays from './LessonOverlays';
import { answerKeyFor } from './answer-key';
import { firstUnfinished, primaryCta, type Action, type Cta } from './cta';
import { useLessonRun } from './useCodeRunner';
import { motionFor, recallFor } from '@/lib/lesson-motion';
import { useLessonData } from './useLessonData';
import { useLessonDraft } from './useLessonDraft';
import { useLessonProgress } from './useLessonProgress';
import LessonScreenView from './screens';
import { ICON } from './screens/chrome';
import {
  buildScreens,
  EMPTY_SCORE,
  gameOf,
  isRunnableGame,
  quizPercent,
  screenVerdict,
  type LessonScreen,
} from '@/lib/studio-lesson';

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
  // Bản nháp trước, vì hook dữ liệu cần `restore` để nạp lại nháp đúng lúc có
  // nội dung bài (giữ nguyên thứ tự cũ: một lần render, không nhảy màn).
  const draftState = useLessonDraft({ courseId, lessonNo });
  const data = useLessonData({ courseId, lessonNo, onDraftReady: draftState.restore });
  const {
    lesson,
    meta,
    user,
    streak,
    totalLessons,
    enrolled,
    completed,
    loading,
    loadError,
    empty,
    busy,
    message,
    setMessage,
    xpGained,
    awards,
    setAwards,
    enroll,
  } = data;
  const load = data.reload;
  const d = draftState.draft;
  const update = draftState.update;
  const saveStatus = draftState.saveStatus;

  const motionFile = data.motionFile;
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

  const progress = useLessonProgress({
    screens,
    draft: d,
    setDraft: draftState.setDraft,
    update,
    scored: Boolean(play),
    clearMessage: () => setMessage(''),
  });
  const {
    checkedKey,
    setCheckedKey,
    runVerdicts,
    setRunVerdicts,
    gameRuns,
    setGameRuns,
    pop,
    setPop,
    celebrate,
    setCelebrate,
    flash,
    setFlash,
    held,
    setHeld,
    hintOpen,
    setHintOpen,
    hintIndex,
    setHintIndex,
    procedureOpen,
    setProcedureOpen,
    answerOpen,
    setAnswerOpen,
    markDone,
    updateGame,
    goTo,
    award,
  } = progress;

  /**
   * Chạy & nộp bài: giữ worker Python nguội sẵn giữa các lượt, nạp runtime từ
   * lúc mở bài, và áp luật của bài khi nộp. Chi tiết Worker/Pyodide nằm sau
   * seam `Runner` — xem runner/types.ts.
   */
  const lessonRun = useLessonRun({
    lesson,
    screens,
    draft: d,
    busy,
    scored: Boolean(play),
    update,
    markDone,
    goTo,
    award,
    setCheckedKey,
    setRunVerdicts,
    setGameRuns,
    setMessage,
    setCelebrate,
    // `quizScore` do TRÌNH DUYỆT chấm (AGENTS.md: server tin con số này, chỉ
    // chặn trần XP bằng `lessons.xp_reward`).
    saveCompletion: () => data.complete(play ? quizPercent(screens, d, boss) : 100),
  });
  const { running, runtimeStatus, result, run, runGame } = lessonRun;
  const cancelRun = lessonRun.cancel;
  const complete = () => data.complete(play ? quizPercent(screens, d, boss) : 100);

  // ---------- Trạng thái màn hiện tại ----------

  const checked = Boolean(scr && checkedKey === scr.key);
  const verdict =
    lesson && scr && checked
      ? isRunnableGame(game)
        ? (runVerdicts[scr.key] ?? null)
        : screenVerdict(lesson, scr, d)
      : null;
  // Phần nội dung của S4 mà VỎ còn cần biết (nút CTA, nút gợi ý, màn tổng kết).
  // Những gì chỉ màn sandbox dùng đã nằm trong screens/SandboxScreen.tsx.
  const hints = lesson?.step_4?.hints ?? [];
  const gate = Boolean(lesson?.step_4?.gate);

  const hasNextLesson = totalLessons > 0 && lessonNo < totalLessons;

  /** Nhãn/màu/hành động của nút CTA — quy tắc nằm trong cta.ts (hàm thuần). */
  function primary(): Cta {
    return primaryCta({
      lesson,
      scr,
      screens,
      draft: d,
      game,
      checked,
      verdict,
      completed,
      hasNextLesson,
      lessonNo,
      running,
      busy,
      result,
    });
  }

  function doAction(action: Action) {
    if (action === 'leave') return leave();
    if (action === 'nextLesson')
      return window.location.assign(`/lesson/${courseId}?lesson=${lessonNo}`);
    if (action === 'toSandbox')
      return goTo(screens.findIndex((x) => x.kind === 'sandbox') + 1);
    if (action === 'toBlocked') {
      const missing = firstUnfinished(screens, d);
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

  // ---------- Vỏ ----------

  const cta = primary();
  const adminKey = user?.role === 'admin' ? answerKeyFor({ lesson, scr, game, draft: d }) : null;
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
        <LessonOverlays
          pop={pop}
          onPopEnd={() => setPop(null)}
          celebrate={celebrate}
          onCelebrateEnd={() => setCelebrate(0)}
          awards={awards}
          onDismissAwards={() => setAwards([])}
          message={message}
          onDismissMessage={() => setMessage('')}
        />
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
      {lesson && scr && (
        <LessonScreenView
          lesson={lesson}
          scr={scr}
          screens={screens}
          motion={motionEntry}
          recall={recall}
          metaLabel={meta?.title}
          draft={d}
          update={update}
          clearChecked={() => setCheckedKey('')}
          checked={checked}
          // Băng phản hồi chỉ hiện khi đã bấm Kiểm tra ở ĐÚNG màn này.
          verdict={checked ? verdict : null}
          game={game}
          updateGame={updateGame}
          flash={flash}
          setFlash={setFlash}
          held={held}
          onHold={setHeld}
          gameRun={scr ? gameRuns[scr.key] : undefined}
          gradedRun={scr ? runVerdicts[scr.key]?.result : undefined}
          onRunGame={(grade) => {
            if (game) runGame(scr.key, game, grade);
          }}
          onBreakCombo={() => {
            if (play) update({ score: { ...score, combo: 0 } });
          }}
          running={running}
          runtimeStatus={runtimeStatus}
          result={result}
          onRun={() => run(false)}
          onStop={cancelRun}
          busy={busy}
          setMessage={setMessage}
          hint={{
            open: hintOpen,
            index: hintIndex,
            onUnlock: setHintIndex,
            onClose: () => setHintOpen(false),
          }}
          procedure={{ open: procedureOpen, toggle: () => setProcedureOpen((o) => !o) }}
          completed={completed}
          xpGained={xpGained}
          xpReward={meta?.xpReward ?? 0}
          onFinish={() => doAction(primary().action)}
        />
      )}
      {adminKey && (
        <AdminAnswerKey
          answerKey={adminKey}
          open={answerOpen}
          onToggle={() => setAnswerOpen((o) => !o)}
          onFill={() => {
            setCheckedKey('');
            setHeld(null);
            if (adminKey.fill) update(adminKey.fill);
          }}
        />
      )}
    </>,
  );
}
