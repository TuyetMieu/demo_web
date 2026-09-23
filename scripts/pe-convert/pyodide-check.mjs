/**
 * Chạy ca kiểm thử S4 của các bài đã chuyển đổi bằng CHÍNH Pyodide 0.27.7 —
 * đúng runtime mà frontend/public/static/js/studio-lesson.worker.js nạp.
 *
 * verify_tests.py chạy bằng CPython trên máy nên không thấy được khác biệt của
 * trình duyệt: Pyodide không có tkinter, không mở được thread, hệ thống file là
 * bộ nhớ ảo. Script này bắt đúng những ca đó trước khi học viên gặp.
 *
 * Pyodide KHÔNG nằm trong dependencies của repo (chỉ dùng khi chuyển đổi nội
 * dung). Cài tạm rồi chạy:
 *
 *   npm i --no-save pyodide@0.27.7
 *   node scripts/pe-convert/pyodide-check.mjs [MA_BAI,MA_BAI...]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const bundle = JSON.parse(readFileSync(join(HERE, 'out', 'lessons.json'), 'utf8'));
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;

// Bản sao vòng chấm của studio-lesson.worker.js. Giữ khớp khi worker đổi.
const HARNESS = `
import json, traceback, sys
_results = []
_error = None
try:
    _namespace = {"__name__": "__main__"}
    exec(compile(_studio_source, "solution.py", "exec"), _namespace)
    for _case in json.loads(_studio_cases):
        _name = _case.get("name") or _case.get("call") or "Kiểm tra"
        try:
            _actual = eval(_case["call"], _namespace)
            _expected = eval(_case["expect"], _namespace)
            _ok = _actual == _expected
            _detail = ("Đạt: %r" % (_actual,)) if _ok else ("Mong đợi %r nhưng nhận %r" % (_expected, _actual))
            _results.append({"name": _name, "passed": bool(_ok), "detail": _detail[:400]})
        except Exception as e:
            _results.append({"name": _name, "passed": False, "detail": str(e)[:400]})
except BaseException:
    _error = traceback.format_exc(limit=4)
json.dumps({"tests": _results, "error": _error, "version": sys.version.split()[0]})
`;

const py = await loadPyodide();
let lessons = 0;
let cases = 0;
const failures = [];
for (const lesson of bundle.lessons) {
  if (only && !only.has(lesson.lesson_code)) continue;
  const step4 = lesson.content_json.step_4 || {};
  const tests = step4.tests || [];
  if (!tests.length) continue;
  lessons += 1;
  cases += tests.length;
  py.globals.set('_studio_source', step4.solutionCode || '');
  py.globals.set('_studio_cases', JSON.stringify(tests));
  const out = JSON.parse(await py.runPythonAsync(HARNESS));
  if (out.error) failures.push(`${lesson.lesson_code}: LỖI CHẠY\n${out.error}`);
  for (const t of out.tests)
    if (!t.passed) failures.push(`${lesson.lesson_code} / ${t.name}: ${t.detail}`);
  if (out.tests.length !== tests.length)
    failures.push(`${lesson.lesson_code}: chỉ chạy ${out.tests.length}/${tests.length} ca`);
}

console.log(`Pyodide: ${lessons} bài, ${cases} ca.`);
if (failures.length) {
  console.log(`${failures.length} ca KHÔNG đạt:`);
  failures.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log('Tất cả ca đạt với lời giải mẫu, chạy bằng chính Pyodide.');
