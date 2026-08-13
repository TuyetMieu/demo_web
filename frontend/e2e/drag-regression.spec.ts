// Port regression_b6.py — Step-3 drag regression Bài 6 composite PK + Bài 10 E2:
// Path A: PE_runSQL trên step_4.expected_sql; Path B: PE_parseWhereRows (drag_game.js).
import { expect, test } from '@playwright/test';

import { login, openLesson } from './helpers';

// (lesson_idx, where_input, expected_matched_count_pathB, expected_first_row_substring)
const REGRESSION_TESTS: [number, string, number, string][] = [
  [6, "dlc_no = 2 AND ref_game_id = 300", 1, 'Blood and Wine'],
  [10, "member_id = 'M01'", 1, 'Minh'],
];

// Path A expected: Bài 6 = 1 row, Bài 10 = 3 rows (LIMIT 3 trong GROUP BY query)
const PATH_A_EXPECTED_ROWS: Record<number, number> = { 6: 1, 10: 3 };

test.describe('Step-3 drag regression (B6 + B10)', () => {
  test('PE_runSQL + PE_parseWhereRows', async ({ page }) => {
    await login(page);
    await openLesson(page);
    await page.waitForFunction(
      () => typeof (window as unknown as { PE_parseWhereRows?: unknown }).PE_parseWhereRows === 'function',
      undefined,
      { timeout: 15_000 },
    );

    const failures: string[] = [];

    for (const [lessonIdx, whereInput, expectedCountB, expectedSubstr] of REGRESSION_TESTS) {
      await openLesson(page, lessonIdx);
      await page.waitForTimeout(1500);
      const expectedCountA = PATH_A_EXPECTED_ROWS[lessonIdx];

      // Path A
      const resA = await page.evaluate((args) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const w = window as any;
        const lesson = w.LESSON_CONTENT['db_design'].lessons[args.idx - 1];
        if (!lesson) return { ok: false, error: 'lesson not found' };
        const s4 = lesson.step_4;
        if (!s4 || !s4.expected_sql) return { ok: false, error: 'no step_4' };
        const schema = Object.assign({}, s4.schema);
        if (s4.related_schemas) schema.related_schemas = s4.related_schemas;
        const result = w.PE_runSQL(s4.expected_sql, schema, null);
        if (result.error) return { ok: false, error: result.error };
        return { ok: true, rowCount: result.rows.length, firstRow: (result.rows[0] || []).join(' | ') };
      }, { idx: lessonIdx });

      if (!resA.ok) failures.push(`Bài ${lessonIdx} A: ${resA.error}`);
      else if (resA.rowCount !== expectedCountA)
        failures.push(`Bài ${lessonIdx} A: ${resA.rowCount} != ${expectedCountA}`);
      else if (expectedSubstr && !(resA.firstRow || '').toLowerCase().includes(expectedSubstr.toLowerCase()))
        failures.push(`Bài ${lessonIdx} A: row='${resA.firstRow}' thiếu '${expectedSubstr}'`);

      // Path B
      const resB = await page.evaluate((args) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const w = window as any;
        const lesson = w.LESSON_CONTENT['db_design'].lessons[args.idx - 1];
        const s4 = lesson.step_4;
        const primaryCols = s4.schema.columns.map((c: any) => (typeof c === 'string' ? c : c.name));
        const primaryData = s4.schema.data || [];
        const matched = w.PE_parseWhereRows(args.whereInput, { columns: primaryCols, dataRows: primaryData });
        if (matched === null) return { ok: false, error: 'parseWhereRows returned null' };
        return { ok: true, matchedCount: matched.length };
      }, { idx: lessonIdx, whereInput });

      if (!resB.ok) failures.push(`Bài ${lessonIdx} B: ${resB.error}`);
      else if (resB.matchedCount !== expectedCountB)
        failures.push(`Bài ${lessonIdx} B: ${resB.matchedCount} != ${expectedCountB}`);
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
