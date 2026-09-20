'use client';

// Dịch từ Stitch "khung_bài_học_python_lesson_chrome_wrapper" (code.html):
// top bar 56px (đóng bài + progress bar chia đoạn + streak) — vùng nội dung
// đơn cột, căn giữa quang học, max-width 680px — bottom bar 88px (1 nút CTA).
// Dùng chung cho mọi loại bài học (không riêng Python) nên đặt ngoài
// components/python-studio; ăn theo token --edu-*/--st-* đã gom ở
// edu-theme.css + studio-tokens.css (--st-chrome-h/--st-action-h/--st-col/
// --st-card-radius được tạo sẵn từ trước, dùng ở đây).
import styles from './LessonChrome.module.css';

export interface LessonChromeProps {
  /** Bước hiện tại, 1-based. */
  step: number;
  totalSteps: number;
  streak: number;
  onClose?: () => void;
  primaryLabel: string;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  /** Đổi màu nút chính theo kết quả chấm bài. */
  primaryTone?: 'accent' | 'ok' | 'err';
  /** Nút phụ bên trái nút chính (ví dụ "Gợi ý"). */
  secondaryLabel?: React.ReactNode;
  onSecondaryClick?: () => void;
  children: React.ReactNode;
}

export default function LessonChrome({
  step,
  totalSteps,
  streak,
  onClose,
  primaryLabel,
  onPrimaryClick,
  primaryDisabled,
  primaryTone = 'accent',
  secondaryLabel,
  onSecondaryClick,
  children,
}: LessonChromeProps) {
  const primaryClass =
    primaryTone === 'ok'
      ? styles.primaryBtnOk
      : primaryTone === 'err'
        ? styles.primaryBtnErr
        : styles.primaryBtn;
  return (
    <div className={styles.chrome}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <button
            type="button"
            aria-label="Đóng bài học"
            className={styles.closeBtn}
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className={styles.track} title={`Tiến độ bài học: ${step}/${totalSteps}`}>
            {Array.from({ length: totalSteps }, (_, i) => {
              const idx = i + 1;
              const width = idx < step ? '100%' : idx === step ? '50%' : '0%';
              return (
                <div key={idx} className={styles.segment}>
                  <div className={styles.segmentFill} style={{ width }} />
                </div>
              );
            })}
          </div>

          <span className={styles.stepLabel}>{step}/{totalSteps}</span>

          <div className={styles.streakPill}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 23c4.97 0 9-4.03 9-9 0-4.9-3.23-7.5-5.5-9.5-1.12-.99-1.5-2.5-1.5-2.5s-2 2-3 4.5c-.83 2.08-1.5 3-3 3.5-1.04.35-2 .5-2 3.5 0 4.97 4.03 9 9 9z" fillOpacity="0.9" />
              <path d="M12 21c2.76 0 5-2.24 5-5 0-2.5-1.5-3.5-2.5-4.5-.5-.5-.5-1-.5-1s-1 1-1.5 2c-.5 1-1 1.5-2 1.5-.5 0-1 0-1 2 0 2.76 2.24 5 5 5z" fill="var(--edu-panel-bg-solid)" fillOpacity="0.8" />
            </svg>
            <span>{streak}</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentContainer}>
          {/* key={step} để mỗi lần đổi bước là một lần chạy lại animation vào */}
          <div key={step} className={styles.stepEnter}>
            {children}
          </div>
        </div>
      </main>

      <footer className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          {secondaryLabel && (
            <button type="button" className={styles.secondaryBtn} onClick={onSecondaryClick}>
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            className={primaryClass}
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </button>
        </div>
      </footer>
    </div>
  );
}
