// Dịch từ màn Stitch "4. FEEDBACK — Trạng thái Trả lời Đúng/Sai". Bản gốc
// hiện thành dải banner đè lên bottom bar (rộng hết màn hình); ở đây đặt
// làm 1 thẻ trong dòng nội dung để không phải sửa lại LessonChrome cho một
// trường hợp riêng — cùng thông tin (icon, tiêu đề, giải thích), khác vị trí.
import styles from './exercises.module.css';

export interface FeedbackBannerProps {
  correct: boolean;
  title: string;
  explanation: React.ReactNode;
}

export default function FeedbackBanner({ correct, title, explanation }: FeedbackBannerProps) {
  return (
    <div
      className={styles.feedbackBanner}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: correct ? 'var(--st-ok-bg)' : 'var(--st-err-bg)',
        border: `1px solid ${correct ? 'var(--st-ok-line)' : 'var(--st-err-line)'}`,
        borderRadius: 14,
        padding: '16px 18px',
        marginTop: 16,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: correct ? 'var(--st-ok-text)' : 'var(--st-err-text)',
          color: 'var(--edu-panel-bg-solid)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontWeight: 700,
        }}
      >
        {correct ? '✓' : '✕'}
      </span>
      <div>
        <div style={{ fontWeight: 700, color: correct ? 'var(--st-ok-text)' : 'var(--st-err-text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--edu-t2)', marginTop: 4 }}>{explanation}</div>
      </div>
    </div>
  );
}
