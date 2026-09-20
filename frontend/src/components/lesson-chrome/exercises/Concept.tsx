// Dịch từ màn Stitch "2. CONCEPT — Khái niệm Biến": thẻ định nghĩa thuật ngữ,
// tự đứng độc lập (không cần ShellB bọc ngoài vì không có tiêu đề riêng).
import shellStyles from '../ShellB.module.css';
import CodeBlock, { CodeBlockLine } from './CodeBlock';

export interface ConceptProps {
  termIcon: React.ReactNode;
  term: string;
  description: string;
  code?: CodeBlockLine[];
}

export default function Concept({ termIcon, term, description, code }: ConceptProps) {
  return (
    <section className={shellStyles.card}>
      <span className={shellStyles.eyebrow} style={{ marginBottom: 20 }}>
        {termIcon}
        {term}
      </span>
      <p className={shellStyles.description} style={{ fontSize: 16, marginTop: 0, marginBottom: 20 }}>
        {description}
      </p>
      {code && <CodeBlock lines={code} showDots={false} />}
    </section>
  );
}
