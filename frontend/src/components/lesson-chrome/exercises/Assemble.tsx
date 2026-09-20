// Dịch từ màn Stitch "4. ASSEMBLE — Lắp ráp mã nguồn". Cùng cơ chế "cầm rồi
// thả" như Classify: bấm token trong kho để cầm lên, rồi bấm vào ô trống
// trong code để điền — thay cho kéo-thả tự do.
import styles from './exercises.module.css';

export interface AssembleLine {
  num: number;
  before: React.ReactNode;
  /** Có ô trống trên dòng này thì đặt slotId; dòng thường thì bỏ trống. */
  slotId?: string;
  after?: React.ReactNode;
}

export interface AssembleProps {
  filename?: string;
  langTag?: string;
  lines: AssembleLine[];
  filled: Record<string, string>;
  bank: string[];
  heldToken: string | null;
  onHold: (token: string) => void;
  onFillSlot: (slotId: string) => void;
}

export default function Assemble({
  filename,
  langTag,
  lines,
  filled,
  bank,
  heldToken,
  onHold,
  onFillSlot,
}: AssembleProps) {
  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
          {langTag && <span className={styles.langTag}>{langTag}</span>}
        </div>
        <div className={styles.codeBody}>
          {lines.map((line) => (
            <div key={line.num} className={styles.codeLine}>
              <span className={styles.lineNum}>{line.num}</span>
              <span className={styles.codeText}>
                {line.before}
                {line.slotId && (
                  <button
                    type="button"
                    onClick={() => heldToken && onFillSlot(line.slotId!)}
                    style={{
                      display: 'inline-block',
                      minWidth: 90,
                      margin: '0 4px',
                      padding: '1px 10px',
                      borderRadius: 6,
                      border: filled[line.slotId] ? '1px solid var(--st-slot-border)' : '1.5px dashed var(--st-slot-border)',
                      background: filled[line.slotId] ? 'rgba(255,255,255,.08)' : 'transparent',
                      color: 'var(--st-syn-plain)',
                      font: 'inherit',
                      fontWeight: 700,
                      cursor: heldToken ? 'pointer' : 'default',
                    }}
                  >
                    {filled[line.slotId] || (heldToken ? 'thả vào đây' : '···')}
                  </button>
                )}
                {line.after}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--edu-card-bg)', borderRadius: 12, padding: 14, marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--edu-t2)', marginBottom: 8 }}>
          KHO TỪ KHOÁ {heldToken ? `— đang cầm "${heldToken}"` : '(bấm để cầm lên)'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bank.length === 0 && <span style={{ fontSize: 12, color: 'var(--edu-t3)' }}>Hết token.</span>}
          {bank.map((token) => (
            <button
              key={token}
              type="button"
              className={styles.chip}
              onClick={() => onHold(token)}
              style={heldToken === token ? { borderColor: 'var(--edu-accent)', background: 'var(--edu-accent-soft)' } : undefined}
            >
              {token}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
