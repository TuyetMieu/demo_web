// Dịch từ màn Stitch "6. TRACE-TABLE — Bảng theo dõi biến": khối code +
// bảng nhập giá trị biến qua từng bước lặp.
import CodeBlock, { CodeBlockLine } from './CodeBlock';

export interface TraceRow {
  step: string;
  values: Record<string, string | null>; // null = ô còn trống, cần nhập
}

export interface TraceTableProps {
  filename?: string;
  code: CodeBlockLine[];
  columns: string[];
  rows: TraceRow[];
  answers: Record<string, string>; // key `${rowIndex}-${col}`
  onAnswerChange: (key: string, value: string) => void;
}

export default function TraceTable({ filename, code, columns, rows, answers, onAnswerChange }: TraceTableProps) {
  const filledCount = rows.reduce(
    (acc, row, i) =>
      acc + columns.filter((c) => row.values[c] !== null || answers[`${i}-${c}`]?.trim()).length,
    0,
  );
  const totalCells = rows.length * columns.length;

  return (
    <div>
      <CodeBlock filename={filename} lines={code} />
      <div style={{ background: 'var(--edu-card-bg)', borderRadius: 12, marginTop: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--edu-t2)',
          }}
        >
          <span>📊 TRẠNG THÁI BỘ NHỚ</span>
          <span>{filledCount}/{totalCells} giá trị</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--edu-accent-soft)' }}>
              <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 700, color: 'var(--edu-t1)' }}>Bước</th>
              {columns.map((c) => (
                <th key={c} style={{ padding: '8px 14px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--edu-accent-text)' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--edu-sidebar-border)' }}>
                <td style={{ padding: '8px 14px', color: 'var(--edu-t2)' }}>{row.step}</td>
                {columns.map((c) => {
                  const given = row.values[c];
                  const key = `${i}-${c}`;
                  return (
                    <td key={c} style={{ padding: '8px 14px', textAlign: 'center' }}>
                      {given !== null ? (
                        <span style={{ background: 'var(--edu-accent-soft)', borderRadius: 999, padding: '2px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {given}
                        </span>
                      ) : (
                        <input
                          value={answers[key] || ''}
                          onChange={(e) => onAnswerChange(key, e.target.value)}
                          style={{
                            width: 48,
                            textAlign: 'center',
                            border: '1.5px solid var(--st-slot-border)',
                            borderRadius: 999,
                            padding: '2px 4px',
                            font: 'inherit',
                            fontFamily: 'JetBrains Mono, monospace',
                            background: 'var(--edu-panel-bg-solid)',
                            color: 'var(--edu-t1)',
                          }}
                          aria-label={`${row.step} - ${c}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
