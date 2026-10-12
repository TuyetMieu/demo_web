/* EDU-FX — hiệu ứng tương tác nhẹ, dùng chung mọi trang.
   Chỉ làm 3 việc, cố ý không thêm nữa để khỏi rối mắt:
   1) đốm sáng xanh/đỏ trôi theo chuột phía sau nội dung (CSS: html::before/::after)
   2) card: đốm sáng bám con trỏ; thẻ khoá học còn nghiêng 3D rất nhẹ
   3) nút chính "hút" về phía con trỏ vài px
   Tắt toàn bộ khi người dùng bật "giảm chuyển động" hoặc thiết bị cảm ứng. */
(function () {
  'use strict';
  if (window.__eduFx) return;
  window.__eduFx = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 0) đăng nhập ⇄ đăng ký: hai khung trượt đổi chỗ rồi mới chuyển trang */
  document.addEventListener('click', function (e) {
    if (reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var link = e.target.closest && e.target.closest('a[href="/login"],a[href="/register"]');
    var split = document.querySelector('.auth-split');
    if (!link || !split || split.classList.contains('auth-leaving')) return;
    var form = split.querySelector('.auth-form-side'), brand = split.querySelector('.auth-brand-side');
    var dx = 0;
    if (form && brand && brand.offsetParent !== null) {
      var f = form.getBoundingClientRect(), b = brand.getBoundingClientRect();
      dx = (b.left + b.width / 2) - (f.left + f.width / 2);
    }
    e.preventDefault();
    split.style.setProperty('--dx', dx.toFixed(0) + 'px');
    split.classList.add('auth-leaving');
    setTimeout(function () { location.href = link.getAttribute('href'); }, 410);
  });

  if (reduce || !fine) return;

  var CARD = '.section-card,.study-cal-card,.mini-rm-card,.lb-card,.dash-progress-card,.edu-lb-teaser,' +
             '.cd-block,.cd-card,.stat-card,.prof-stat-card,.course-card,.sk-set,.forum-post-card,' +
             '.card,.brand-canvas,[data-fx]';
  var TILT = '.course-card,[data-fx="tilt"]';
  var MAGNET = '.btn-main,.btn-primary,.card-btn-enroll,.card-btn-enrolled,.dash-hero-btn,.continue-btn,' +
               '.dash-progress-btn,.dash-prog-cta,.cd-enroll-btn';

  function start() {
    /* 1) đốm sáng theo chuột */
    var root = document.documentElement;
    var tx = innerWidth / 2, ty = innerHeight / 3;
    var ax = tx, ay = ty, bx = tx, by = ty, raf = 0;
    function frame() {
      // đèn xanh bám sát con trỏ; đèn đỏ đuổi theo chậm hơn → vệt sáng xanh-đỏ phía sau chuột
      ax += (tx - ax) * 0.3; ay += (ty - ay) * 0.3;
      bx += (tx - bx) * 0.11; by += (ty - by) * 0.11;
      root.style.setProperty('--ax', ax.toFixed(1) + 'px');
      root.style.setProperty('--ay', ay.toFixed(1) + 'px');
      root.style.setProperty('--bx', bx.toFixed(1) + 'px');
      root.style.setProperty('--by', by.toFixed(1) + 'px');
      raf = (Math.abs(tx - ax) + Math.abs(ty - ay) > 0.5) ? requestAnimationFrame(frame) : 0;
    }

    var activeCard = null, activeMagnet = null;
    function resetTilt(el) {
      if (!el) return;
      el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    }
    function resetMagnet(el) {
      if (!el) return;
      el.classList.remove('fx-magnet');
      el.style.removeProperty('--tx'); el.style.removeProperty('--ty2');
    }

    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      root.classList.add('fx-on');
      if (!raf) raf = requestAnimationFrame(frame);

      var t = e.target;
      if (!t || !t.closest) return;

      /* 2) card */
      var card = t.closest(CARD);
      if (activeCard && activeCard !== card) { resetTilt(activeCard); activeCard = null; }
      if (card) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--cx', x.toFixed(0) + 'px');
        card.style.setProperty('--cy', y.toFixed(0) + 'px');
        if (card.matches(TILT)) {
          card.style.setProperty('--ry', (((x / r.width) - 0.5) * 6).toFixed(2) + 'deg');
          card.style.setProperty('--rx', ((0.5 - (y / r.height)) * 5).toFixed(2) + 'deg');
        }
        activeCard = card;
      }

      /* 3) nút hút */
      var m = t.closest(MAGNET);
      if (activeMagnet && activeMagnet !== m) { resetMagnet(activeMagnet); activeMagnet = null; }
      if (m && !m.disabled) {
        var mr = m.getBoundingClientRect();
        m.classList.add('fx-magnet');
        m.style.setProperty('--tx', ((e.clientX - (mr.left + mr.width / 2)) * 0.12).toFixed(1) + 'px');
        m.style.setProperty('--ty2', ((e.clientY - (mr.top + mr.height / 2)) * 0.2).toFixed(1) + 'px');
        activeMagnet = m;
      }
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', function () {
      root.classList.remove('fx-on');
      resetTilt(activeCard); activeCard = null;
      resetMagnet(activeMagnet); activeMagnet = null;
    });
  }

  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
