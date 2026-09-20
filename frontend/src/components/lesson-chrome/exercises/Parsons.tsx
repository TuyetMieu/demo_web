// Dịch từ màn Stitch "5. PARSONS — Ghép & Thụt lề mã". Bản gốc kéo-thả tự do
// theo toạ độ + căn thụt lề bằng tay; ở đây đơn giản hoá thành "bấm để nối
// tiếp vào cuối khối mã đang lắp" — vẫn giữ đúng ý: chọn đúng dòng, bỏ qua
// dòng gây nhiễu, thứ tự do người học quyết định qua thứ tự bấm.
import styles from './exercises.module.css';

export interface ParsonsPoolItem {
  id: string;
  content: React.ReactNode;
  /** Dòng nhiễu — cố tình sai cú pháp/logic, không nên được chọn. */
  distractorReason?: string;
}

export interface ParsonsProps {
  filename?: string;
  builtLines: { id: string; content: React.ReactNode; indent: number }[];
  pool: ParsonsPoolItem[];
  onPick: (id: string) => void;
  onAttemptDistractor: (id: string) => void;
}

export default function Parsons({ filename, builtLines, pool, onPick, onAttemptDistractor }: ParsonsProps) {
  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
        </div>
        <div className={styles.codeBody}>
          {builtLines.map((line, i) => (
            <div key={line.id} className={styles.codeLine} style={{ paddingLeft: line.indent * 20 }}>
              <span className={styles.lineNum}>{i + 1}</span>
              <span className={styles.codeText}>{line.content}</span>
            </div>
          ))}
          <div
            style={{
              border: '1px dashed var(--st-code-gutter)',
              borderRadius: 6,
              padding: '6px 12px',
              marginTop: 6,
              fontSize: 11,
              color: 'var(--st-syn-comment)',
              textAlign: 'center',
            }}
          >
            + Bấm một dòng lệnh bên dưới để nối tiếp vào đây
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--edu-t2)', marginBottom: 8 }}>
          DÒNG LỆNH CÒN LẠI &amp; DÒNG GÂY NHIỄU
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pool.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.optionCard}
              onClick={() => (item.distractorReason ? onAttemptDistractor(item.id) : onPick(item.id))}
              style={{ justifyContent: 'space-between' }}
            >
              <code>{item.content}</code>
              {item.distractorReason && (
                <span style={{ fontSize: 11, color: 'var(--st-err-text)', background: 'var(--st-err-bg)', borderRadius: 999, padding: '2px 10px' }}>
                  Nhiễu: {item.distractorReason}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
