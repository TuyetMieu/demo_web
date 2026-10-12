/*
 * Generic grader for imported lessons (studio-lesson/v1).
 *
 * Unlike python-studio.worker.js — which hard-codes the List & Mutability
 * cases — this one takes its cases from the lesson's content_json:
 *   { code, tests: [{ name, call, expect }], forbid: ["...", ...], files: [{ name, content }] }
 * `call` and `expect` are both Python expressions evaluated in the learner's
 * own namespace, so a lesson can assert on anything it can express.
 *
 * The grading loop itself lives in studio-harness.py (same folder) so that
 * scripts/pe-v3/check-pyodide.mjs can run the very same code under Node. It
 * adds what PE v3 needs: re-running a whole script with other data, fixture
 * files (data.txt…), and simulated threading / os.fork — Pyodide has neither.
 *
 * Python still runs in a disposable browser worker, never in the NestJS process.
 */
/* global importScripts, loadPyodide */

// Đường dẫn CÙNG ORIGIN tới runtime đã commit vào repo. Root-relative chứ
// không '../../pyodide/…' để khỏi phụ thuộc vào vị trí của chính file worker,
// giống fetch('/static/js/studio-harness.py') bên dưới.
const PYODIDE_DIR = '/pyodide/v0.27.7/';

// Runtime và bộ chấm được GIỮ LẠI giữa các lần chạy. Trước đây worker nạp
// Pyodide bên trong onmessage nên mỗi lần bấm Chạy là nạp lại ~13 MB; phía
// React vì thế phải tạo worker mới cho từng lần. Nay nạp một lần rồi dùng lại.
//
// Vì sao vẫn an toàn với vòng lặp vô hạn: giới hạn 5 giây KHÔNG do worker tự
// cắt — runPythonAsync chặn luôn vòng lặp sự kiện nên worker không tự ngắt
// mình được. Phía React vẫn terminate() worker khi hết giờ, rồi nạp sẵn một
// worker thay thế ở nền. Học viên chỉ chờ lại khi code của chính họ treo.
let runtime = null;

async function getRuntime() {
  if (runtime) return runtime;
  importScripts(PYODIDE_DIR + 'pyodide.js');
  const box = { stray: '' };
  const write = (line) => {
    if (box.stray.length < 4000) box.stray += line.slice(0, 4000 - box.stray.length) + '\n';
  };
  const [py, harness] = await Promise.all([
    loadPyodide({ indexURL: PYODIDE_DIR, stdout: write, stderr: write }),
    // no-cache = vẫn dùng bản trong cache nhưng hỏi lại server (ETag), để bộ
    // chấm luôn khớp với ca kiểm thử vừa nạp vào bài.
    fetch('/static/js/studio-harness.py', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`không tải được bộ chấm (${r.status})`);
      return r.text();
    }),
  ]);
  await py.runPythonAsync(harness);
  runtime = { py, box };
  return runtime;
}

self.onmessage = async ({ data }) => {
  // Làm ấm: nạp runtime rồi báo rảnh, KHÔNG chấm gì. Phía React gửi tin này
  // lúc học viên vừa mở bài, trong khi họ còn đang đọc các màn đầu.
  if (data && data.type === 'warmup') {
    try {
      await getRuntime();
      self.postMessage({ type: 'ready' });
      self.postMessage({ type: 'idle' });
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
    return;
  }

  try {
    const tests = Array.isArray(data.tests) ? data.tests : [];
    const forbid = Array.isArray(data.forbid) ? data.forbid : [];
    const files = Array.isArray(data.files) ? data.files : [];
    // stdin: các dòng input() sẽ đọc lần lượt. Hợp đồng với phía React —
    // tên trường này cố định, đừng đổi.
    const stdin = Array.isArray(data.stdin) ? data.stdin.map(String) : [];

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

    // Runtime Pyodide nằm trong repo (frontend/public/pyodide/v0.27.7/, ~13 MB:
    // pyodide.js + asm.js + asm.wasm + python_stdlib.zip + pyodide-lock.json).
    // Trước đây nạp từ cdn.jsdelivr.net: hai khoá Python chết theo một CDN bên
    // thứ ba, và CSP phải mở connect-src ra domain đó. Cùng origin thì bỏ được
    // cả hai, và bản runtime luôn khớp với bộ chấm trong cùng commit.
    const { py, box } = await getRuntime();
    // Print nào lọt ra ngoài bộ chấm (hiếm) vẫn được giữ lại để hiện cho học
    // viên. Dọn trước mỗi lần chạy vì runtime nay dùng lại giữa các lần.
    box.stray = '';
    self.postMessage({ type: 'ready' });
    const started = performance.now();
    const grade = py.globals.get('_studio_main');
    const result = JSON.parse(
      grade(String(data.code), JSON.stringify(tests), JSON.stringify(files), JSON.stringify(stdin)),
    );
    grade.destroy();
    self.postMessage({
      type: 'result',
      ...result,
      output: (result.output || '') + box.stray,
      duration: Math.round(performance.now() - started),
    });
    // Báo rảnh để phía React biết worker này dùng lại được cho lần chạy sau.
    self.postMessage({ type: 'idle' });
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
