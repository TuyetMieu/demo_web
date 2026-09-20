'use client';

// Vỏ B — thẻ "câu hỏi/bài tập": dịch từ các màn Stitch MCQ / Đúng-sai /
// Fill-blank... Phần lớn trong 27 màn dùng chung khung này (nhãn loại câu
// hỏi + tiêu đề + vùng nội dung tuỳ biến + gợi ý), chỉ khác nội dung bên
// trong `children` (xem thư mục `exercises/`).
import { useState } from 'react';

import styles from './ShellB.module.css';

export interface ShellBProps {
  eyebrowIcon: React.ReactNode;
  eyebrowLabel: string;
  metaLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  centered?: boolean;
  children?: React.ReactNode;
  hint?: { icon: React.ReactNode; label: string; text: React.ReactNode };
  /** true = hiện sẵn gợi ý; mặc định phải bấm nút "Gợi ý" mới mở. */
  hintOpenByDefault?: boolean;
  /** Truyền vào để nút "Gợi ý" nằm ở thanh dưới của LessonChrome điều khiển
   *  thay cho nút trong thẻ (tránh hai nút cùng làm một việc trên màn hình). */
  hintOpen?: boolean;
}

export default function ShellB({
  eyebrowIcon,
  eyebrowLabel,
  metaLabel,
  title,
  description,
  centered,
  children,
  hint,
  hintOpenByDefault = false,
  hintOpen,
}: ShellBProps) {
  const controlled = hintOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(hintOpenByDefault);
  const open = controlled ? hintOpen : internalOpen;

  return (
    <section className={styles.card}>
      <div className={centered ? styles.headerCentered : styles.header}>
        <span className={styles.eyebrow}>
          {eyebrowIcon}
          {eyebrowLabel}
        </span>
        {metaLabel && (
          <span className={styles.meta}>
            <span className={styles.metaDot} />
            {metaLabel}
          </span>
        )}
      </div>

      <h2 className={centered ? styles.titleCentered : styles.title}>{title}</h2>
      {description && (
        <p className={centered ? styles.descriptionCentered : styles.description}>
          {description}
        </p>
      )}

      {children && <div className={styles.content}>{children}</div>}

      {hint && (
        <>
          {!controlled && (
            <button
              type="button"
              className={styles.hintToggle}
              onClick={() => setInternalOpen((o) => !o)}
              aria-expanded={open}
            >
              <span className={styles.hintToggleIcon}>{hint.icon}</span>
              {open ? 'Ẩn gợi ý' : 'Gợi ý'}
            </button>
          )}
          {open && (
            <div className={styles.hintBox}>
              <div className={styles.hintIcon}>{hint.icon}</div>
              <div>
                <div className={styles.hintLabel}>{hint.label}</div>
                <div className={styles.hintText}>{hint.text}</div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
