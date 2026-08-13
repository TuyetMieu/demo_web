// Port test_e2.py — Unit test 4A-E2: PE_runSQL trên 20 bài, verify E1
// backward-compatible + E2 mới + E3-scope honest-error. Case giữ NGUYÊN.
import { expect, test } from '@playwright/test';

import { expectEngineReady, login, openLesson } from './helpers';

type Mode = ['rows_eq', number] | ['rows_eq_min', number] | ['honest_error', string];

const EXPECTED: Record<number, Mode> = {
  // E1 backward (unchanged)
  1: ['rows_eq', 1],   // WHERE id=101 → Elden Ring (60)
  2: ['rows_eq', 1],   // WHERE p_id=7 → DragonLord
  3: ['rows_eq', 7],   // WHERE publisher.name='Rockstar' → 7
  4: ['rows_eq', 2],   // WHERE player.username='DragonLord' → 2
  5: ['rows_eq', 3],   // WHERE player_id=9 → 3
  6: ['rows_eq', 1],   // WHERE dlc_no=2 AND ref_game_id=300 → 1
  7: ['rows_eq', 5],   // WHERE publisher.name='Supergiant' → 5
  8: ['rows_eq', 5],   // WHERE studio_name='Valve' → 5
  // E3-engine
  9: ['rows_eq', 1],   // IN-subquery → Alice
  15: ['rows_eq', 3],  // JSON->> GROUP BY theme → 3 themes
  20: ['rows_eq', 3],  // CASE WHEN + GROUP BY alias → 3 security levels
  // E3-equiv — honest-error
  16: ['honest_error', 'spatial'],
  17: ['honest_error', 'ORM'],
  19: ['honest_error', '%s'],
  // E2 mới
  10: ['rows_eq', 3],
  11: ['rows_eq_min', 2],
  12: ['rows_eq', 3],
  13: ['rows_eq', 5],
  14: ['rows_eq', 3],
  18: ['rows_eq', 4],
};

test.describe('PE_runSQL — 20 bài Basic (4A-E2)', () => {
  test('run all lessons', async ({ page }) => {
    await login(page);
    await openLesson(page);
    await expectEngineReady(page);

    const failures: string[] = [];

    for (const idxStr of Object.keys(EXPECTED).sort((a, b) => +a - +b)) {
      const idx = +idxStr;
      const [mode, expectedVal] = EXPECTED[idx];

      const r = await page.evaluate((i) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const w = window as any;
        const lc = w.LESSON_CONTENT['db_design'];
        const lesson = lc.lessons[i - 1];
        if (!lesson) return { ok: false, error: `lesson ${i} not found` };
        const sql = lesson.step_4?.expected_sql || lesson.step_3?.expected_sql;
        if (!sql) return { ok: false, error: 'no expected_sql' };
        const schema =
          lesson.step_4?.schema ||
          (lesson.step_3?.drag_map
            ? {
                table_name: lesson.step_3.drag_map.table.name,
                columns: lesson.step_3.drag_map.table.columns,
                data: lesson.step_3.drag_map.table.dataRows,
              }
            : {});
        if (lesson.step_4?.related_schemas) schema.related_schemas = lesson.step_4.related_schemas;
        let result;
        try {
          result = w.PE_runSQL(sql, schema, null);
        } catch (e) {
          return { ok: false, error: 'EXCEPTION: ' + (e as Error).message, sql };
        }
        return {
          ok: !result.error && !result.pending,
          error: result.error || null,
          pending: !!result.pending,
          pendingMsg: result.msg || null,
          sql,
          rowCount: result.rows ? result.rows.length : 0,
        };
      }, idx);

      if (mode === 'rows_eq') {
        if (!r.ok) failures.push(`Bài ${idx}: error — ${r.error}`);
        else if (r.rowCount !== expectedVal) failures.push(`Bài ${idx}: ${r.rowCount} rows != ${expectedVal}`);
      } else if (mode === 'rows_eq_min') {
        if (!r.ok) failures.push(`Bài ${idx}: error — ${r.error}`);
        else if (r.rowCount < (expectedVal as number)) failures.push(`Bài ${idx}: ${r.rowCount} < ${expectedVal}`);
      } else {
        // honest_error: PE_runSQL trả {pending:true, msg chứa 'E3'} — không silent-wrong
        const pmsg = (r.pendingMsg || r.error || '') as string;
        const hasPending = r.pending || !r.ok;
        if (!(hasPending && pmsg.includes('E3'))) {
          failures.push(
            r.ok
              ? `Bài ${idx}: SILENT-WRONG — OK với ${r.rowCount} rows (E3-scope)!`
              : `Bài ${idx}: msg thiếu E3 marker: ${pmsg.slice(0, 80)}`,
          );
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
