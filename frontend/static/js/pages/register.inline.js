    /* ── PARTICLES ── */
    const colors = ['#42A5F5', '#1565C0', '#EF5350', '#C62828', '#FFFFFF'];
    const pc = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 2 + Math.random() * 4;
      p.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${6 + Math.random() * 14}s;animation-delay:${Math.random() * -20}s;opacity:${(0.3 + Math.random() * 0.5).toFixed(2)}`;
      pc.appendChild(p);
    }

    /* ── TOGGLE PASSWORD ── */
    function togglePwd(id, btn) {
      const input = document.getElementById(id);
      input.type = input.type === 'text' ? 'password' : 'text';
      btn.innerHTML = input.type === 'password'
        ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    }

    /* ── RIPPLE ── */
    function addRipple(btn, e) {
      const rect = btn.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple';
      const size = Math.max(rect.width, rect.height) * 1.5;
      r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    }

    /* ── FIELD ERROR HELPERS ── */
    function clearFieldErrors() {
      document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
      document.querySelectorAll('.field.has-error').forEach(el => { el.classList.remove('has-error'); });
    }

    function showFieldErrors(errors) {
      clearFieldErrors();
      const fieldMap = { name: 'reg-name-error', email: 'reg-email-error', phone: 'reg-phone-error', password: 'reg-password-error' };
      const groupMap = { name: 'field-group-name', email: 'field-group-email', phone: 'field-group-phone', password: 'field-group-password' };
      for (const [field, msg] of Object.entries(errors)) {
        const errEl = document.getElementById(fieldMap[field]);
        const groupEl = document.getElementById(groupMap[field]);
        if (errEl) errEl.textContent = msg;
        if (groupEl) groupEl.classList.add('has-error');
      }
    }

    /* ── HANDLE REGISTER ── */
    async function handleRegister(e) {
      addRipple(e.currentTarget, e);
      clearFieldErrors();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;

      if (!name || !password) { showError('Vui lòng điền họ tên và mật khẩu.'); return; }
      if (!email && !phone) { showError('Vui lòng nhập email hoặc số điện thoại.'); return; }

      setLoading(true);

      try {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ name, email, phone, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.errors) {
            showFieldErrors(data.errors);
            return;
          }
          let errMsg = 'Đăng ký thất bại.';
          if (typeof data.error === 'string') {
            errMsg = data.error;
          } else if (data.error && typeof data.error === 'object' && data.error.message) {
            errMsg = data.error.message;
          }
          throw new Error(errMsg);
        }

        document.getElementById('successOverlay').classList.add('show');
        setTimeout(() => {
          document.getElementById('successOverlay').classList.remove('show');
          window.location.href = '/questionaire';
        }, 1500);

      } catch (err) {
        showError(err.message || 'Đăng ký thất bại, vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }

    function setLoading(on) {
      document.getElementById('regBtn').disabled = on;
      document.getElementById('regBtnText').textContent = on ? 'Đang tạo tài khoản...' : 'Tạo tài khoản';
      document.getElementById('regSpinner').style.display = on ? 'block' : 'none';
    }

    function showError(msg) {
      document.getElementById('errorMsg').textContent = msg;
      const t = document.getElementById('errorToast');
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }

    (function () {
      const oauthErrors = {
        email_exists:    'Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng mật khẩu.',
        google_failed:   'Đăng nhập Google thất bại. Vui lòng thử lại.',
        facebook_failed: 'Đăng nhập Facebook thất bại. Vui lòng thử lại.',
      };
      const err = new URLSearchParams(window.location.search).get('error');
      if (err && oauthErrors[err]) showError(oauthErrors[err]);
    })();

    function prefetchRoute(url) {
      if (!document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
      }
    }
