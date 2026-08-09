      /* ── PARTICLES ── */
      const colors = ["#EF5350", "#C62828", "#42A5F5", "#1565C0", "#FFFFFF"];
      const pc = document.getElementById("particles");
      for (let i = 0; i < 30; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        const size = 2 + Math.random() * 4;
        p.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${6 + Math.random() * 14}s;animation-delay:${Math.random() * -20}s;opacity:${(0.3 + Math.random() * 0.5).toFixed(2)}`;
        pc.appendChild(p);
      }

      /* ── TOGGLE PASSWORD ── */
      function togglePwd(id, btn) {
        const input = document.getElementById(id);
        input.type = input.type === "text" ? "password" : "text";
        btn.innerHTML =
          input.type === "password"
            ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
            : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      }

      /* ── RIPPLE ── */
      function addRipple(btn, e) {
        const rect = btn.getBoundingClientRect();
        const r = document.createElement("span");
        r.className = "ripple";
        const size = Math.max(rect.width, rect.height) * 1.5;
        r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(r);
        r.addEventListener("animationend", () => r.remove());
      }

      /* ── FIELD ERROR HELPERS ── */
      function clearFieldErrors() {
        document.querySelectorAll(".field-error").forEach((el) => {
          el.textContent = "";
        });
        document.querySelectorAll(".field.has-error").forEach((el) => {
          el.classList.remove("has-error");
        });
      }

      function showFieldErrors(errors) {
        clearFieldErrors();
        const fieldMap = {
          email: "login-email-error",
          password: "login-password-error",
        };
        const groupMap = {
          email: "field-group-email",
          password: "field-group-password",
        };
        for (const [field, msg] of Object.entries(errors)) {
          const errEl = document.getElementById(fieldMap[field]);
          const groupEl = document.getElementById(groupMap[field]);
          if (errEl) errEl.textContent = msg;
          if (groupEl) groupEl.classList.add("has-error");
        }
      }

      /* ── HANDLE LOGIN ── */
      async function handleLogin(e) {
        addRipple(e.currentTarget, e);
        clearFieldErrors();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        if (!email || !password) {
          showError("Vui lòng nhập email hoặc số điện thoại và mật khẩu.");
          return;
        }

        setLoading(true);

        try {
          const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();
          if (!res.ok) {
            if (data.errors) {
              showFieldErrors(data.errors);
              return;
            }
            let errMsg = "Sai email/số điện thoại hoặc mật khẩu.";
            if (typeof data.error === 'string') {
              errMsg = data.error;
            } else if (data.error && typeof data.error === 'object' && data.error.message) {
              errMsg = data.error.message;
            }
            throw new Error(errMsg);
          }

          const nextUrl = "/dashboard?streak=1";
          document.getElementById("successOverlay").classList.add("show");
          setTimeout(() => {
            document.getElementById("successOverlay").classList.remove("show");
            window.location.href = nextUrl;
          }, 1500);
        } catch (err) {
          showError(err.message || "Đăng nhập thất bại, vui lòng thử lại.");
        } finally {
          setLoading(false);
        }
      }

      /* ── HANDLE FORGOT PASSWORD ── */
      async function handleForgot() {
        const email = document.getElementById("login-email").value.trim();
        if (!email) {
          showError("Vui lòng nhập email để khôi phục mật khẩu.");
          return;
        }

        try {
          /* ── [BACKEND] GỌI API QUÊN MẬT KHẨU ──────────────────────────
           *
           *  const res = await fetch('https://api.yourbackend.com/auth/forgot-password', {
           *    method: 'POST',
           *    headers: { 'Content-Type': 'application/json' },
           *    body: JSON.stringify({ email }),
           *  });
           *  if (!res.ok) throw new Error('Không tìm thấy email này.');
           *
           * ───────────────────────────────────────────────────────────────── */

          await new Promise((r) => setTimeout(r, 1000)); // Xóa dòng này khi có API thật
          document
            .getElementById("successOverlay")
            .querySelector(".success-title").textContent = "Email đã được gửi!";
          document
            .getElementById("successOverlay")
            .querySelector(".success-sub").textContent =
            "Kiểm tra hộp thư để đặt lại mật khẩu.";
          document.getElementById("successOverlay").classList.add("show");
          setTimeout(
            () =>
              document
                .getElementById("successOverlay")
                .classList.remove("show"),
            3000,
          );
        } catch (err) {
          showError(err.message);
        }
      }

      function setLoading(on) {
        document.getElementById("loginBtn").disabled = on;
        document.getElementById("loginBtnText").textContent = on
          ? "Đang đăng nhập..."
          : "Đăng nhập";
        document.getElementById("loginSpinner").style.display = on
          ? "block"
          : "none";
      }

      function showError(msg) {
        document.getElementById("errorMsg").textContent = msg;
        const t = document.getElementById("errorToast");
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 3500);
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
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.href = url;
          document.head.appendChild(link);
        }
      }

      document.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          const btn = document.getElementById("loginBtn");
          if (!btn.disabled) {
            e.preventDefault();
            btn.click();
          }
        }
      });
