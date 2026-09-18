/*
 * Generic grader for imported lessons (studio-lesson/v1).
 *
 * Unlike python-studio.worker.js — which hard-codes the List & Mutability
 * cases — this one takes its cases from the lesson's content_json:
 *   { code, tests: [{ name, call, expect }], forbid: ["...", ...] }
 * `call` and `expect` are both Python expressions evaluated in the learner's
 * own namespace, so a lesson can assert on anything it can express.
 *
 * Python still runs in a disposable browser worker, never in the NestJS process.
 */
/* global importScripts, loadPyodide */
self.onmessage = async ({ data }) => {
  try {
    const tests = Array.isArray(data.tests) ? data.tests : [];
    const forbid = Array.isArray(data.forbid) ? data.forbid : [];

    // Cheap source check first: no point booting a 10 MB runtime to reject this.
    const banned = forbid.filter((token) => String(data.code).includes(token));
    if (banned.length) {
      self.postMessage({
        type: 'result',
        tests: [],
        output: '',
        error: `Bài này không cho phép dùng: ${banned.join(', ')}`,
        duration: 0,
        version: '',
      });
      return;
    }

    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
    let output = '';
    const write = (line) => {
      if (output.length < 12000)
        output += line.slice(0, 12000 - output.length) + '\n';
    };
    const py = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/',
      stdout: write,
      stderr: write,
    });
    self.postMessage({ type: 'ready' });
    const started = performance.now();
    py.globals.set('_studio_source', data.code);
    py.globals.set('_studio_cases', JSON.stringify(tests));
    const json = await py.runPythonAsync(`
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
            _detail = (
                "Đạt: %r" % (_actual,)
                if _ok
                else "Mong đợi %r nhưng nhận %r" % (_expected, _actual)
            )
            _results.append({"name": _name, "passed": bool(_ok), "detail": _detail[:400]})
        except Exception as e:
            _results.append({"name": _name, "passed": False, "detail": str(e)[:400]})
except BaseException:
    _error = traceback.format_exc(limit=4)
json.dumps({"tests": _results, "error": _error, "version": sys.version.split()[0]})
`);
    self.postMessage({
      type: 'result',
      ...JSON.parse(json),
      output,
      duration: Math.round(performance.now() - started),
    });
  } catch (error) {
    self.postMessage({
      type: 'result',
      tests: [],
      output: '',
      error: `Không chạy được Python: ${error.message}`,
      duration: 0,
      version: '',
    });
  }
};
