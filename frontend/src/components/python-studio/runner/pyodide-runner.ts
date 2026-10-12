// Bộ chạy bài bằng Pyodide trong Web Worker — bản hiện thực của `Runner`.
//
// Vì sao có file này (bẫy đã ghi trong AGENTS.md): trước đây MỖI lần bấm Chạy /
// Nộp đều `new Worker(...)` rồi `terminate()`, nên runtime Python ~13 MB bị nạp
// lại từ đầu mỗi lượt. Giờ:
//
//  1. `prewarm()` nạp runtime ngay khi học viên MỞ bài. Họ còn mấy màn đọc hiểu
//     phía trước, nên phần chờ rơi vào lúc không ai sốt ruột.
//  2. Worker nguội được GIỮ LẠI giữa các lượt chạy, không dựng lại.
//  3. Giới hạn 5 giây vẫn phải cắt được vòng lặp vô hạn. Pyodide không ngắt
//     được giữa lúc đang chạy nên cách duy nhất vẫn là `terminate()` — nhưng
//     ngay sau đó ta dựng bản thay thế trong nền (`prewarm()`), nên học viên
//     chỉ phải chờ lại khi CHÍNH code của họ treo.
//
// Hợp đồng thông điệp với worker (public/static/js/studio-lesson.worker.js —
// file đó do phía runtime quản, ở đây không sửa):
//   gửi đi : { code, tests, forbid, files, stdin }   ← tên trường cố định
//   nhận về: { type: 'ready' }  rồi  { type: 'result', ...RunResult }
//
// Worker hôm nay là loại MỘT-LƯỢT: nó nạp Pyodide bên trong `onmessage`, chấm,
// rồi coi như xong — chưa giữ runtime lại được. Nên lớp này tự dò:
//   - gửi một thông điệp warmup (`type: 'warmup'`, code rỗng, không ca chấm);
//   - worker nào trả về `{ type: 'idle' }` là loại DÙNG LẠI ĐƯỢC → giữ nó lại,
//     các lượt sau chỉ postMessage, không nạp lại gì;
//   - worker nào trả thẳng `result` cho warmup là loại một-lượt → bỏ nó đi và
//     quay về nếp cũ (một worker mỗi lượt). Phần nạp sẵn vẫn có ích thật: cả
//     runtime giờ cùng origin nên lần nạp sau lấy từ cache HTTP.
// Nhờ vậy file này đúng với worker hôm nay, và tự lên đời khi worker biết giữ
// runtime, không phải sửa lại phía React.
import {
  DEFAULT_LIMITS,
  type RunLimits,
  type RunRequest,
  type RunResult,
  type Runner,
} from './types';

const WORKER_URL = '/static/js/studio-lesson.worker.js';

const TOO_SLOW_LOAD = 'Tải Python quá lâu. Kiểm tra kết nối mạng rồi thử lại.';
const TOO_SLOW_EXEC = 'Chương trình vượt giới hạn 5 giây. Kiểm tra vòng lặp vô hạn.';
const NO_RUNTIME = 'Không tải được bộ chạy Python. Kiểm tra kết nối rồi thử lại.';

function failed(error: string): RunResult {
  return { tests: [], output: '', error, duration: 0, version: '' };
}

export class PyodideRunner implements Runner {
  private worker: Worker | null = null;
  /** none: chưa có worker · warming: đang nạp sẵn · idle: nguội, chờ việc · running: đang chấm. */
  private phase: 'none' | 'warming' | 'idle' | 'running' = 'none';
  /** Worker có giữ được runtime giữa các lượt hay không — dò bằng warmup. */
  private kind: 'unknown' | 'reusable' | 'oneshot' = 'unknown';
  private prewarmed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Đồng hồ đang đếm là mốc nạp runtime (true) hay mốc chạy code (false). */
  private waitingForRuntime = false;
  private pending: {
    settle: (result: RunResult | null) => void;
    status?: (status: string) => void;
  } | null = null;
  private disposed = false;

  constructor(private readonly limits: RunLimits = DEFAULT_LIMITS) {}

  prewarm(): void {
    if (this.disposed || this.worker || this.pending) return;
    // Worker một-lượt thì nạp sẵn lần nữa chẳng được gì: cache đã nóng sau lần
    // đầu, mà bật Pyodide lên lại tốn vài giây CPU của máy học viên.
    if (this.kind === 'oneshot' && this.prewarmed) return;
    this.prewarmed = true;
    this.spawn();
    this.phase = 'warming';
    this.send({ code: '', tests: [], forbid: [], files: [], stdin: [] }, true);
    this.arm(this.limits.readyMs);
  }

  run(request: RunRequest, onStatus?: (status: string) => void): Promise<RunResult | null> {
    if (this.disposed) return Promise.resolve(null);
    // Gọi trùng lượt: phía UI đã chặn bằng cờ `running`, ở đây chỉ để chắc.
    if (this.pending)
      return Promise.resolve(failed('Đang chạy một lượt khác — chờ xong rồi thử lại.'));

    const warm = this.worker !== null && this.phase === 'idle' && this.kind === 'reusable';
    if (!warm) {
      // Chưa chắc worker dùng lại được (hoặc đang nạp sẵn): bỏ nó đi để không
      // có hai bản runtime nạp song song, rồi đi đường nguội như trước.
      this.kill();
      this.spawn();
    }
    onStatus?.(warm ? 'Đang chạy và kiểm tra…' : 'Đang tải Python…');
    const promise = new Promise<RunResult | null>((resolve) => {
      this.pending = { settle: resolve, status: onStatus };
    });
    this.phase = 'running';
    this.send(request, false);
    // Worker nguội chạy code NGAY, nên 5 giây tính từ đây. Worker vừa dựng thì
    // còn phải nạp runtime: chờ `ready` rồi mới bấm đồng hồ 5 giây.
    this.arm(warm ? this.limits.execMs : this.limits.readyMs);
    return promise;
  }

  cancel(): void {
    // Bấm Dừng: không có kết quả nào để hiện (giống nếp cũ), nên trả null.
    this.finish(null, '');
    this.kill();
    this.phase = 'none';
  }

  dispose(): void {
    this.disposed = true;
    this.finish(null);
    this.kill();
    this.phase = 'none';
  }

  // ---------- bên trong ----------

  private spawn() {
    const instance = new Worker(WORKER_URL);
    this.worker = instance;
    instance.onmessage = ({ data }) => {
      if (this.worker !== instance) return; // thông điệp của worker đã bị bỏ
      this.receive(data);
    };
    instance.onerror = () => {
      if (this.worker !== instance) return;
      if (this.pending) {
        this.finish(failed(NO_RUNTIME), '');
        this.kill();
        this.phase = 'none';
        return;
      }
      // Nạp sẵn mà lỗi thì im lặng bỏ qua: lượt chạy thật sẽ thử lại từ đầu.
      this.kill();
      this.phase = 'none';
    };
  }

  private send(request: RunRequest, warmup: boolean) {
    this.worker?.postMessage({
      code: request.code,
      tests: request.tests,
      forbid: request.forbid,
      files: request.files,
      // Giữ nguyên trường stdin của hợp đồng dù lượt này chưa có UI nhập liệu.
      stdin: request.stdin ?? [],
      // Worker biết giữ runtime sẽ hiểu cờ này là "chỉ nạp, chưa chấm gì".
      // Worker một-lượt không biết nó: nó chấm code rỗng với 0 ca — vô hại.
      ...(warmup ? { type: 'warmup' } : null),
    });
  }

  private receive(data: ({ type?: string } & Partial<RunResult>) | null) {
    if (data?.type === 'ready') {
      // Runtime đã nạp xong: từ giờ là code của học viên chạy → bấm 5 giây.
      if (this.pending) {
        this.arm(this.limits.execMs);
        this.pending.status?.('Đang chạy và kiểm tra…');
      }
      return;
    }
    if (data?.type === 'idle') {
      // Worker tự khai là giữ được runtime và đang rỗi.
      this.kind = 'reusable';
      if (!this.pending) {
        this.clearTimer();
        this.phase = 'idle';
      }
      return;
    }
    // Còn lại là `result`.
    if (!this.pending) {
      // Kết quả cho lượt warmup ⇒ worker thuộc loại một-lượt.
      this.kind = 'oneshot';
      this.clearTimer();
      this.kill();
      this.phase = 'none';
      return;
    }
    const result = (data ?? failed(NO_RUNTIME)) as RunResult;
    this.finish(result, result.version ? `CPython ${result.version}` : '');
    if (this.kind === 'reusable') {
      this.phase = 'idle'; // giữ worker lại cho lượt sau
    } else {
      this.kill();
      this.phase = 'none';
    }
  }

  private expire() {
    if (!this.pending) {
      // Hết hạn trong lúc nạp sẵn: dọn worker đi, đừng giữ bộ nhớ vô ích.
      this.kill();
      this.phase = 'none';
      return;
    }
    this.finish(failed(this.waitingForRuntime ? TOO_SLOW_LOAD : TOO_SLOW_EXEC), '');
    // Pyodide không ngắt được giữa lúc đang chạy — chỉ còn cách giết worker.
    this.kill();
    this.phase = 'none';
    // Dựng bản thay thế trong nền để lượt sau không phải chờ nạp lại. Chỉ làm
    // khi worker giữ được runtime; loại một-lượt thì nạp sẵn là tốn công suông.
    if (this.kind === 'reusable') this.prewarm();
  }

  private arm(ms: number) {
    this.clearTimer();
    this.waitingForRuntime = ms === this.limits.readyMs;
    this.timer = setTimeout(() => this.expire(), ms);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private finish(result: RunResult | null, status?: string) {
    this.clearTimer();
    const pending = this.pending;
    this.pending = null;
    if (!pending) return;
    if (status !== undefined) pending.status?.(status);
    pending.settle(result);
  }

  private kill() {
    this.worker?.terminate();
    this.worker = null;
  }
}
