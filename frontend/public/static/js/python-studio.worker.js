/* Python executes in a disposable browser worker, never in the NestJS process. */
/* global importScripts, loadPyodide */
self.onmessage = async ({ data }) => {
  try {
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
    py.globals.set('_studio_submit', Boolean(data.submit));
    const json = await py.runPythonAsync(`
import json, traceback, sys
_results = []
_error = None
try:
    _namespace = {"__name__": "__main__"}
    exec(compile(_studio_source, "solution.py", "exec"), _namespace)
    _fn = _namespace.get("clean_and_boost_scores")
    if not callable(_fn):
        raise ValueError("Thiếu hàm clean_and_boost_scores(raw_scores, bonus)")
    _cases = [
        ("Lọc & cộng chuẩn", [6.5, -1.0, 8.0], 0.5, [7.0, 8.5]),
        ("Danh sách rỗng", [], 2.0, []),
        ("Giữ nguyên dữ liệu và tạo list mới", [0, -2, 3], 1, [1, 4]),
    ]
    if _studio_submit:
        _cases += [("Số âm & điểm 0", [-8, -0.5, 0], 0, [0]),
                   ("Làm tròn & thứ tự", [1.234, 1.234, 4.567], 0.111, [1.34, 1.34, 4.68])]
    class _TrackedList(list):
        mutated = False
        def _mark(self): self.mutated = True
        def append(self, x): self._mark(); return super().append(x)
        def extend(self, x): self._mark(); return super().extend(x)
        def clear(self): self._mark(); return super().clear()
        def pop(self, *a): self._mark(); return super().pop(*a)
        def remove(self, x): self._mark(); return super().remove(x)
        def insert(self, *a): self._mark(); return super().insert(*a)
        def sort(self, *a, **kw): self._mark(); return super().sort(*a, **kw)
        def reverse(self): self._mark(); return super().reverse()
        def __setitem__(self, k, v): self._mark(); return super().__setitem__(k, v)
        def __delitem__(self, k): self._mark(); return super().__delitem__(k)
        def __iadd__(self, v): self._mark(); return super().__iadd__(v)
        def __imul__(self, v): self._mark(); return super().__imul__(v)
    for _name, _raw, _bonus, _expected in _cases:
        try:
            _input = list(_raw)
            _actual = _fn(_input, _bonus)
            _tracked = _TrackedList(_raw)
            _fn(_tracked, _bonus)
            _ok = isinstance(_actual, list) and _actual == _expected and _input == _raw and _actual is not _input and not _tracked.mutated
            _detail = "Đạt: kết quả đúng, danh sách gốc được giữ nguyên." if _ok else "Kiểm tra kết quả, làm tròn 2 chữ số và không sửa list đầu vào."
            _results.append({"name": _name, "passed": bool(_ok), "detail": _detail})
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
