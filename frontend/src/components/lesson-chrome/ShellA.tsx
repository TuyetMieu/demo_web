// Vỏ A — thẻ "fact/concept": dịch từ màn Stitch "1. fact — sự thật cú pháp
// Python". Dùng cho slide đọc thông tin, không tương tác (Fact, Concept,
// Recap...). Nhiều thẻ liên tiếp có thể lướt qua nhau — `dotIndex`/`dotCount`
// vẽ chấm carousel như bản gốc.
import styles from './ShellA.module.css';

export interface ShellAProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  dotCount?: number;
  dotIndex?: number;
}

export default function ShellA({ icon, title, description, dotCount, dotIndex = 0 }: ShellAProps) {
  return (
    <section className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {!!dotCount && dotCount > 1 && (
        <div className={styles.dots}>
          {Array.from({ length: dotCount }, (_, i) => (
            <span key={i} className={i === dotIndex ? styles.dotActive : styles.dot} />
          ))}
        </div>
      )}
    </section>
  );
}
