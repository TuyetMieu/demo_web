'use client';

// Những thứ nổi lên TRÊN bài học: "+10 điểm · Combo x3", pháo giấy khi code
// chạy đúng, hộp huy hiệu mới, và thanh thông báo dưới đáy.
//
// Dùng createPortal ra `document.body` vì LessonChrome có vùng cuộn riêng —
// để trong cây thẻ thì hiệu ứng bị cắt theo khung cuộn đó.
import { createPortal } from 'react-dom';

import c from './studio-chrome.module.css';
import type { Award } from './useLessonData';

export default function LessonOverlays({
  pop,
  onPopEnd,
  celebrate,
  onCelebrateEnd,
  awards,
  onDismissAwards,
  message,
  onDismissMessage,
}: {
  pop: { id: number; text: string } | null;
  onPopEnd: () => void;
  /** Đổi số để chạy lại animation; 0 = không có gì. */
  celebrate: number;
  onCelebrateEnd: () => void;
  awards: Award[];
  onDismissAwards: () => void;
  message: string;
  onDismissMessage: () => void;
}) {
  return (
    <>
      {pop &&
        createPortal(
          <div key={`pop-${pop.id}`} className={c.pop} role="status" onAnimationEnd={onPopEnd}>
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
              if (e.target === e.currentTarget) onCelebrateEnd();
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
              <button type="button" onClick={onDismissAwards}>
                Tuyệt vời!
              </button>
            </div>
          </div>,
          document.body,
        )}
      {message && (
        <div className={c.toast} role="status">
          <p>{message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={onDismissMessage}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
