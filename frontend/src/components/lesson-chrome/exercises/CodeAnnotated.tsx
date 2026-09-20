// Dịch từ màn Stitch "4. CODE-ANNOTATED — Chú giải mã lệnh". Bản gốc vẽ
// đường nối cong từ dòng code sang khung chú giải; ở đây đơn giản hoá thành
// danh sách chú giải xếp cạnh khối code, đánh số cùng màu chấm để vẫn đối
// chiếu được — bỏ animation vẽ đường nối SVG cho gọn.
import CodeBlock, { CodeBlockLine } from './CodeBlock';

export interface Annotation {
  label: string;
  detail: React.ReactNode;
}

export interface CodeAnnotatedProps {
  filename?: string;
  langTag?: string;
  code: CodeBlockLine[];
  annotations: Annotation[];
}

export default function CodeAnnotated({ filename, langTag, code, annotations }: CodeAnnotatedProps) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
        <CodeBlock filename={filename} langTag={langTag} lines={code} />
      </div>
      <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {annotations.map((a, i) => (
          <div
            key={i}
            style={{
              background: 'var(--edu-card-bg)',
              border: '1px solid var(--edu-sidebar-border)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--edu-t1)', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--edu-accent)', flexShrink: 0 }} />
              {a.label}
            </div>
            <div style={{ color: 'var(--edu-t3)', marginTop: 4 }}>{a.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
