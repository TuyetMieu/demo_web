'use client';

// S4 · Thử thách độc lập: đề bài, mô tả hàm, file cấp sẵn, ô soạn mã + console
// và các ca kiểm thử. Màn duy nhất có nút "Nộp & Chấm điểm".
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import { ConsoleLine } from '@/components/lesson-chrome/exercises/Console';
import HintSheet from '@/components/lesson-chrome/exercises/HintSheet';
import SandboxEditor from '@/components/lesson-chrome/exercises/SandboxEditor';
import ShellB from '@/components/lesson-chrome/ShellB';
import { toCodeLines } from '@/lib/py-highlight';

import c from '../studio-chrome.module.css';
import type { RunResult } from '../runner/types';
import { eyebrowOf, paragraphs, showEditorOf, testRows } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  | 'lesson'
  | 'scr'
  | 'metaLabel'
  | 'draft'
  | 'update'
  | 'result'
  | 'running'
  | 'runtimeStatus'
  | 'onRun'
  | 'onStop'
  | 'busy'
  | 'setMessage'
  | 'hint'
  | 'procedure'
>;

/**
 * Console của màn sandbox. Khác bản gọn của game ở hai chỗ: hiện thêm `notes`
 * (tóm tắt thread/process mô phỏng của bộ chấm), và khi không in ra gì thì nói
 * rõ là ô soạn mã trống hay chương trình thật sự không in gì.
 */
function consoleLines(result: RunResult | null, code: string): ConsoleLine[] | null {
  if (!result) return null;
  const lines: ConsoleLine[] = [];
  if (result.output)
    for (const line of result.output.replace(/\n$/, '').split('\n')) lines.push({ text: line });
  if (result.error) lines.push({ text: result.error, tone: 'err' });
  for (const note of result.notes ?? []) lines.push({ text: note, tone: 'muted' });
  if (!lines.length) {
    // Ô soạn mã trống hoặc chỉ có chú thích thì "không in ra gì" là vô nghĩa
    // với người học — nói thẳng là chưa có lệnh nào chạy.
    const runnable = code.split('\n').some((line) => line.trim() && !line.trim().startsWith('#'));
    lines.push({
      text: runnable
        ? 'Chương trình chạy xong, không in ra gì (thêm print() để xem kết quả).'
        : 'Chưa có lệnh nào để chạy — ô soạn mã đang trống hoặc chỉ có dòng chú thích.',
      tone: 'muted',
    });
  }
  return lines;
}

export default function SandboxScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  result,
  running,
  runtimeStatus,
  onRun,
  onStop,
  busy,
  setMessage,
  hint,
  procedure: procedureUi,
}: Props) {
  const four = lesson.step_4;
  const eyebrow = eyebrowOf(scr);
  const io = four?.task?.io ?? [];
  const hints = four?.hints ?? [];
  const tests = four?.tests ?? [];
  const procedure = four?.procedure ?? [];
  const files = four?.files ?? [];
  const contracts = four?.contracts ?? [];
  const gate = Boolean(four?.gate);
  const boss = Boolean(lesson.play?.boss);

  return (
    <ShellB
      eyebrowIcon={eyebrow.icon}
      eyebrowLabel={eyebrow.label}
      metaLabel={metaLabel}
      title={four?.task?.title || 'Thử thách độc lập'}
      description={paragraphs(four?.task?.body)}
    >
      {four?.env && <div className={`${c.note} ${c.noteWarn}`}>{four.env}</div>}
      {boss ? (
        <div className={`${c.note} ${c.boss}`} role="status">
          <strong>⚔️ Trận Boss của chặng.</strong> Không có gợi ý — tự viết và nộp. Lời giải mẫu chỉ mở
          sau lần nộp đầu, và xem nó thì điểm trận này bị giới hạn ở 60%.
        </div>
      ) : (
        gate &&
        !draft.submitted && (
          <div className={c.note} role="status">
            <strong>Cửa tự kiểm tra.</strong> Tự viết và nộp lần đầu trước — lời giải mẫu chỉ mở sau lần nộp
            đó. Mở gợi ý vẫn được, nhưng lượt này sẽ ghi nhận là có hỗ trợ.
          </div>
        )
      )}
      {io.length > 0 && (
        <dl className={c.io}>
          {io.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd><code>{row.value}</code></dd>
            </div>
          ))}
        </dl>
      )}
      {contracts.length > 0 && (
        <details className={c.panel} open={contracts.length <= 2}>
          <summary>
            Mô tả hàm <span>{contracts.map((k) => k.sig.split('(')[0]).join(' · ')}</span>
          </summary>
          <ul className={c.contracts}>
            {contracts.map((k) => (
              <li key={k.sig}>
                <code className={c.sig}>{k.sig}</code>
                {k.does && <p>{k.does}</p>}
                <dl>
                  {k.takes && (<div><dt>Nhận</dt><dd>{k.takes}</dd></div>)}
                  {k.gives && (<div><dt>Trả</dt><dd>{k.gives}</dd></div>)}
                  {k.effect && (<div><dt>Tác dụng</dt><dd>{k.effect}</dd></div>)}
                  {k.call && (<div><dt>Gọi</dt><dd><code>{k.call}</code></dd></div>)}
                </dl>
              </li>
            ))}
          </ul>
        </details>
      )}
      {files.length > 0 && (
        <details className={c.panel}>
          <summary>
            File trong thư mục bài <span>{files.map((f) => f.name).join(' · ')}</span>
          </summary>
          <p className={c.panelNote}>
            Đặt sẵn cạnh main.py mỗi lần chạy (chỉ đọc). Bộ chấm còn dùng thêm dữ liệu mới bạn chưa thấy.
          </p>
          {files.map((f) => (
            <CodeBlock
              key={f.name}
              filename={f.name}
              langTag={f.kind === 'data' ? 'dữ liệu · UTF-8' : 'file cấp sẵn'}
              lines={
                f.kind === 'data'
                  ? f.content.split('\n').map((line, i) => ({ num: i + 1, content: line || ' ' }))
                  : toCodeLines(f.content.replace(/\n+$/, ''))
              }
            />
          ))}
        </details>
      )}
      {/* Bài quy trình: các bước phải làm trên máy thật. Không có mã Python
          nào để chạy nên KHÔNG hiện ô soạn mã — trước đây bài loại này đổ
          đáp án đã chú-thích-hoá vào editor, bấm "Chạy thử" ra console
          rỗng và người học tưởng hỏng. */}
      {procedure.length > 0 && (
        <div className={c.procedure}>
          <div className={c.procedureHead}>
            <strong>Quy trình tham chiếu</strong>
            <button type="button" className={c.resetLink} onClick={procedureUi.toggle}>
              {procedureUi.open ? 'Ẩn đi' : 'Hiện các bước'}
            </button>
          </div>
          {procedureUi.open ? (
            <CodeBlock
              filename="terminal"
              langTag="chạy trên máy của bạn"
              lines={procedure.map((line, i) => ({ num: i + 1, content: line }))}
            />
          ) : (
            <p>
              Tự làm trước trên máy rồi mới mở đối chiếu — {procedure.length} bước.
            </p>
          )}
        </div>
      )}
      {showEditorOf(lesson) && (
        <SandboxEditor
          filename="main.py"
          langTag={runtimeStatus || 'CPython 3.12'}
          code={draft.code}
          onCodeChange={(code) => update({ code })}
          running={running}
          onRun={onRun}
          onStop={onStop}
          onShowSolution={
            four?.solutionCode && (!gate || draft.submitted)
              ? () => {
                  update({ code: four.solutionCode!, solutionUsed: true, assisted: true });
                  setMessage('Đã chèn lời giải mẫu. Hãy đọc hiểu trước khi nộp.');
                }
              : undefined
          }
          placeholder={
            tests.length
              ? undefined
              : 'Bài này thực hành trên máy lab nên không có ca chấm tự động. Ô này dùng làm nháp: gõ thử rồi bấm "Chạy thử" (chỉ thư viện chuẩn chạy được trong trình duyệt).'
          }
          consoleLines={consoleLines(result, draft.code)}
          consoleMeta={result ? `${result.duration} ms` : runtimeStatus}
          tests={testRows(lesson, result)}
          disabled={busy}
        />
      )}
      {hint.open && hints.length > 0 && (
        <HintSheet
          levels={hints.map((h, i) => ({
            title: h.title,
            // Tầng "lời giải từng phần" là code nhiều dòng: giữ nguyên thụt lề.
            body: h.body.includes('\n') ? <pre className={c.hintCode}>{h.body}</pre> : h.body,
            locked: i > hint.index,
          }))}
          openIndex={hint.index}
          onUnlock={hint.onUnlock}
          onBackToCode={() => hint.onClose()}
          onContinueWriting={() => hint.onClose()}
        />
      )}
    </ShellB>
  );
}
