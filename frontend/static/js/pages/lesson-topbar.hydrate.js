/**
 * Thay cho giá trị Jinja server bơm ({{ gems }}, {{ streak }}, streak_active)
 * ở topbar các trang interface / lesson_python / lesson_java / lesson_htmlcss:
 * kiến trúc mới render tĩnh nên hydrate bằng /api/user + /api/stats.
 * Markup/class giữ NGUYÊN — script này chỉ điền số và bật đúng class
 * streak-badge-on/off như template gốc làm bằng {% if streak_active %}.
 */
(function () {
  'use strict';

  fetch('/api/user')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (u) {
      if (!u) return;
      var gems = document.getElementById('gems-count');
      if (gems) gems.textContent = (u.gems || 0).toLocaleString('vi-VN');
    })
    .catch(function () {});

  fetch('/api/stats')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s) return;
      var streak = s.streakDays || 0;
      var active = !!s.streakActive;

      var count = document.getElementById('streak-count');
      if (count) {
        count.textContent = streak + ' ngày';
        count.className = 'font-extrabold text-sm ' + (active ? 'text-orange-600' : 'text-gray-400');
      }
      var status = document.getElementById('streak-status');
      if (status) {
        status.className = 'text-xs ' + (active ? 'text-orange-400' : 'text-gray-300');
        status.textContent = active ? 'Đang duy trì! 🔥' : 'Học ngay để giữ chuỗi';
      }
      var badge = document.getElementById('streak-badge');
      if (badge) {
        badge.classList.remove('streak-badge-on', 'streak-badge-off');
        badge.classList.add(active ? 'streak-badge-on' : 'streak-badge-off');
      }
      var fire = document.getElementById('streak-fire');
      if (fire) {
        fire.classList.remove('text-orange-500', 'streak-fire-on', 'text-gray-300', 'streak-fire-off');
        if (active) fire.classList.add('text-orange-500', 'streak-fire-on');
        else fire.classList.add('text-gray-300', 'streak-fire-off');
      }
      // interface.html: "<streak> Ngày liên tiếp!" (span không id — dùng data hook)
      var plain = document.getElementById('streak-plain');
      if (plain) plain.textContent = streak + ' Ngày liên tiếp!';
    })
    .catch(function () {});
})();
