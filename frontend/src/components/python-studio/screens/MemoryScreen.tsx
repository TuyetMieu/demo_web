'use client';

// S1 · Mô hình bộ nhớ: biến trên stack trỏ tới object nào trên heap.
import Visual from '@/components/lesson-chrome/exercises/Visual';

import { ScreenShell } from './chrome';
import type { ShellProps } from './props';

export default function MemoryScreen({ lesson, scr, metaLabel }: ShellProps) {
  const m = lesson.step_1?.memory;
  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title="Biến trỏ tới đâu trong bộ nhớ?"
      description={m?.assertion ? `${m.assertion} → ${m.assertionResult ?? ''}` : undefined}
    >
      <Visual
        stack={(m?.stack ?? []).map((row) => ({
          name: row.name,
          address: row.ptr || '—',
          note: row.label || '',
        }))}
        heap={
          m?.heap
            ? [
                {
                  tag: m.heap.type || 'PyObject',
                  address: m.heapAddr || '—',
                  refcount: m.heap.refcount ?? 1,
                  rows: (m.heap.cells ?? []).map((cell) => ({
                    label: cell.id || 'Giá trị',
                    value: cell.value,
                  })),
                },
              ]
            : []
        }
      />
    </ScreenShell>
  );
}
