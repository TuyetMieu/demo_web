/**
 * lesson_db.hydrate.js — điền streak (header) + xp (player pill) cho trang
 * /lesson/db_design{,_tc,_nc}. Thay {{ streak }} / {{ xp }} mà Jinja bơm
 * server-side trong lesson_db_design.html.
 *
 * Chạy sau engine lesson_db_design.js: chỉ đụng 2 node text, không tranh chấp
 * với engine (engine không ghi đè #streak-count / .xp-text).
 */
(function () {
  'use strict';

  fetch('/api/stats')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s) return;
      var el = document.getElementById('streak-count');
      if (el) el.textContent = String(s.streakDays || 0);
    })
    .catch(function () {});

  fetch('/api/user')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (u) {
      if (!u) return;
      var el = document.querySelector('.xp-text');
      if (el) el.textContent = (u.xp || 0) + '/2000';
    })
    .catch(function () {});
})();
