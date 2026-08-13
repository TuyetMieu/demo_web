function toggleModule(hd) {
  hd.classList.toggle('open');
  hd.nextElementSibling.classList.toggle('open');
}

function goLesson() {
  var el = document.getElementById('current-lesson');
  if (el) { el.click(); return; }
  window.location = LESSON_URL + '?lesson=' + (CURRENT_LESSON_IDX + 1);
}


function enroll() {
  const btn = document.getElementById('enroll-btn');
  btn.disabled = true; btn.textContent = 'Đang xử lý...';
  fetch('/api/courses/' + COURSE_ID + '/enroll', {
    method: 'POST',
    headers: { 'X-CSRFToken': document.querySelector('meta[name=csrf-token]').content }
  })
  .then(r => r.json())
  .then(d => {
    if (d.ok) window.location.reload();
    else { btn.disabled = false; btn.textContent = 'Đăng ký ngay – Miễn phí'; alert((window.__PE_errMsg ? window.__PE_errMsg(d.error) : d.error) || 'Lỗi, thử lại.'); }
  })
  .catch(() => { btn.disabled = false; btn.textContent = 'Đăng ký ngay – Miễn phí'; });
}

function unenroll() {
  if (!confirm('Bạn có chắc muốn hủy đăng ký khóa học này?')) return;
  const btn = document.getElementById('unenroll-btn');
  btn.disabled = true;
  fetch('/api/courses/' + COURSE_ID + '/enroll', {
    method: 'DELETE',
    headers: { 'X-CSRFToken': document.querySelector('meta[name=csrf-token]').content }
  })
  .then(r => r.json())
  .then(d => { if (d.ok) window.location.reload(); else btn.disabled = false; })
  .catch(() => { btn.disabled = false; });
}

(function () {
  function applyTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    // course_db_design.css ships 53 rules under body.light that never fired
    // because only 'dark' was ever toggled — keep the complement in sync.
    document.body.classList.toggle('light', !isDark);
    var btn = document.getElementById('theme-toggle');
    // Nút cũ chỉ chứa emoji nên ghi đè textContent được. Sidebar mới (dùng
    // chung với dashboard) dựng nút bằng <svg>+<span> — ghi đè sẽ xoá sạch,
    // nên bỏ qua nút có phần tử con (xem main.js applyTheme() — cùng fix).
    if (btn && !btn.firstElementChild) btn.textContent = isDark ? '☀️' : '🌙';
  }
  window.toggleTheme = function () {
    var isDark = !document.body.classList.contains('dark');
    applyTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };
  applyTheme(localStorage.getItem('theme') === 'dark');
})();

/* ── Menu người dùng + chuông thông báo: đã chuyển sang edu-chrome.js ──
   Bản ở đây là bản chép rút gọn với 4 thông báo VIẾT CỨNG, nên vào thẳng
   trang này luôn thấy thông báo giả thay vì thông báo thật. Tệ hơn: từ khi
   điều hướng dashboard ↔ chi tiết khóa học đi client-side, file này vẫn nằm
   trên window sau khi rời trang và ghi đè bản thật của dashboard — quay về
   dashboard là chuông hiện "undefined". Xem đầu edu-chrome.js. */

/* Cuộn tới bài đang học + ô chấm sao: đã chuyển sang React trong
   app/(standalone)/courses/[courseId]/page.tsx. Hai phần đó vốn nằm trong
   IIFE chỉ chạy đúng một lần lúc nạp file; từ khi điều hướng đi client-side,
   mở khóa học thứ hai là React thay hết node mà IIFE không chạy lại — sao
   bấm không lên điểm, trang không cuộn tới bài đang học. */
