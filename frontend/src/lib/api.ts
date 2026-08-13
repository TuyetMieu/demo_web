/**
 * api.ts — fetch backend cho code React (KHÔNG dành cho JS legacy).
 *
 * Vì sao không dùng fetch('/api/...') tương đối: URL đó chỉ được pe-bridge.js
 * rewrite sang origin backend SAU khi bridge nạp xong, nhưng nhiều trang chỉ
 * mount <LegacyScripts> sau khi data đã fetch xong (component return null khi
 * chưa có data) → gà-và-trứng: fetch đầu tiên đập vào Next :3000 và 404.
 *
 * apiFetch trỏ thẳng NEXT_PUBLIC_API_URL + đính "Authorization: Bearer" từ
 * localStorage (cùng key pe_access/pe_refresh với pe-bridge.js) + thử refresh
 * token đúng 1 lần khi 401 — mirror tối thiểu logic của bridge.
 */

const LS_ACCESS = 'pe_access';
const LS_REFRESH = 'pe_refresh';

function origin(): string {
  const w = window as unknown as { __PE_API_ORIGIN?: string };
  return w.__PE_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

function ls(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const base = origin();
  const send = (access: string | null) => {
    const headers = new Headers(opts.headers || {});
    if (access && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${access}`);
    return fetch(base + path, { ...opts, headers });
  };

  let res = await send(ls(LS_ACCESS));
  if (res.status === 401) {
    const refresh = ls(LS_REFRESH);
    if (refresh) {
      const rr = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (rr.ok) {
        const d = await rr.json().catch(() => null);
        if (d?.access) {
          try {
            localStorage.setItem(LS_ACCESS, d.access);
          } catch {
            /* private mode */
          }
          res = await send(d.access);
        }
      }
    }
  }
  return res;
}

/**
 * Bóc danh sách ra khỏi "vỏ" response của backend NestJS.
 *
 * Backend trả dạng bọc: {ok: true, enrolled: [...]}, {ok: true, courses: [...]}.
 * Nhiều component trước đây kiểm tra `Array.isArray(data)` rồi mới `.find(...)`
 * — với dạng bọc thì điều kiện đó LUÔN SAI, nên kết quả luôn rỗng. Hậu quả thật
 * đã gặp: trang chi tiết khoá học không bao giờ biết người dùng đã đăng ký (nút
 * luôn hiện "Đăng ký ngay"), và trang chi tiết các khoá không phải db_design
 * tưởng khoá không tồn tại rồi chuyển hướng thẳng về dashboard.
 *
 * Hàm này chấp nhận cả hai dạng để không phá client cũ.
 */
export function asList<T = Record<string, unknown>>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

/**
 * Tìm bản ghi đăng ký của một khoá học.
 * Chấp nhận cả `id` lẫn `courseId` vì response từng dùng tên khác nhau.
 */
export function findEnrollment(
  enrolledList: Array<Record<string, unknown>>,
  courseId: string,
): Record<string, unknown> | null {
  return (
    enrolledList.find((e) => e.id === courseId || e.courseId === courseId) ?? null
  );
}
