document.addEventListener("DOMContentLoaded", function() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    // Fetch real course count + lesson count from API
    function _setHeroStats(courseCount, totalHours) {
      const courseEl = document.getElementById('stat-courses');
      if (courseEl) courseEl.textContent = (courseCount > 0 ? courseCount : '5') + '+';
      const hoursEl = document.getElementById('stat-hours');
      if (hoursEl) hoursEl.textContent = (totalHours > 0 ? totalHours : '225') + '+';
    }
    fetch('/api/courses')
      .then(r => r.ok ? r.json() : null)
      .then(courses => {
        if (!Array.isArray(courses) || courses.length === 0) {
          // Not logged in or empty — use real data (5 courses × ~45h avg = 225h)
          _setHeroStats(0, 0);
          // Hide course preview loading state if user not logged in
          const grid = document.getElementById('course-preview-grid');
          const loading = document.getElementById('course-preview-loading');
          if (grid && loading) {
            loading.querySelector('strong').textContent = 'Đăng nhập để xem khóa học';
            loading.querySelector('p').textContent = 'Khám phá 5 khóa học sau khi đăng ký tài khoản miễn phí.';
          }
          return;
        }
        _setHeroStats(courses.length, 0);
        let totalHours = 0;
        courses.forEach(c => {
          const m = (c.duration || '').match(/(\d+)/);
          if (m) totalHours += parseInt(m[1], 10);
        });
        if (totalHours > 0) {
          const hoursEl = document.getElementById('stat-hours');
          if (hoursEl) hoursEl.textContent = totalHours + '+';
        }

        // Render top courses in preview grid
        const grid = document.getElementById('course-preview-grid');
        if (grid && courses.length) {
          grid.innerHTML = '';
          courses.slice(0, 4).forEach(c => {
            const card = document.createElement('a');
            card.href = '/courses/' + (c.id || c.slug || 'python');
            card.className = 'section-card neon-card course-preview-card';
            card.innerHTML = `
              <div class="card-icon neon-icon" style="color:${c.color || '#06B6D4'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </div>
              <strong>${c.title || c.name || 'Khóa học'}</strong>
              <p>${c.description || ''}</p>
              <span class="course-preview-meta">
                ${c.level || ''}${c.duration ? ' · ' + c.duration : ''}
              </span>
            `;
            grid.appendChild(card);
          });
        }
      })
      .catch(() => {
        _setHeroStats(0, 0);
      });
  });
