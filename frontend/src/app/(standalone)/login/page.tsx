'use client';

// Port login.html — markup 1:1. CSS: login.css + chatbot.css (đúng template gốc).
// Inline script gốc → /static/js/pages/login.inline.js (verbatim), main.js giữ nguyên.
// Nút Google/Facebook trỏ thẳng route OAuth của backend NestJS (/auth/google,
// /auth/facebook) — backend redirect về /auth/callback#access=...&refresh=...

import PageStyles from '@/components/PageStyles';
import LegacyScripts from '@/components/LegacyScripts';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

function oauthStart(provider: 'google' | 'facebook') {
  window.location.href = `${W().__PE_API_ORIGIN || ''}/auth/${provider}`;
}

export default function LoginPage() {
  return (
    <>
      <PageStyles hrefs={["/static/css/login.css","/static/css/chatbot.css","/static/css/edu-theme.css","/static/css/edu-auth.css"]} />
      <title>Programming Edu — Đăng nhập</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      <div className="bg-canvas">
        <div className="bg-blob b1"></div>
        <div className="bg-blob b2"></div>
        <div className="bg-blob b3"></div>
        <div className="bg-blob b4"></div>
      </div>
      <div className="grid-overlay"></div>
      <div className="particles" id="particles"></div>

      <div className="page">
        <div className="auth-split">
          {/* LEFT 50%: Form */}
          <div className="auth-form-side">
            <div className="card">
              <div className="logo">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="4" />
                    <path
                      d="M8 6l4-4 4 4M8 18l4 4 4-4M4 12H2m20 0h-2M6.3 6.3l-1.4-1.4M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"
                      stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="logo-text">Programming Edu</span>
              </div>

              <p className="form-title">Chào mừng trở lại!</p>
              <p className="form-subtitle">Tiếp tục hành trình lập trình của bạn 💡</p>

              <div className="field" id="field-group-email">
                <label className="field-label" htmlFor="login-email">Email hoặc số điện thoại</label>
                <div className="field-wrap">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input type="text" id="login-email" placeholder="Email hoặc số điện thoại" autoComplete="username" />
                </div>
                <span className="field-error" id="login-email-error"></span>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="login-password">Mật khẩu</label>
                <div className="field-wrap">
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input type="password" id="login-password" placeholder="••••••••" autoComplete="current-password" />
                  <button
                    className="toggle-eye"
                    onClick={(e) => W().togglePwd('login-password', e.currentTarget)}
                    type="button"
                    aria-label="Toggle password visibility"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                <span className="field-error" id="login-password-error"></span>
              </div>

              <div className="forgot">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    W().handleForgot();
                  }}
                >Quên mật khẩu?</a>
              </div>

              <button className="btn-main" id="loginBtn" onClick={(e) => W().handleLogin(e)} type="button">
                <span className="btn-bg"></span>
                <span className="btn-bg-hover"></span>
                <span className="btn-label">
                  <span id="loginBtnText">Đăng nhập</span>
                  <div className="btn-spinner" id="loginSpinner"></div>
                </span>
              </button>

              <div className="divider"><span>hoặc tiếp tục với</span></div>

              <div className="socials">
                <button className="btn-social" type="button" onClick={() => oauthStart('google')}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button className="btn-social" type="button" onClick={() => oauthStart('facebook')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              </div>

              <p className="switch-text">
                Chưa có tài khoản?{' '}
                <a href="/register" onMouseOver={() => W().prefetchRoute('/register')}>Đăng ký miễn phí</a>
              </p>

              {/* Success Overlay */}
              <div className="success-overlay" id="successOverlay">
                <div className="check-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline className="check-path" points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="success-title">Đăng nhập thành công!</p>
                <p className="success-sub">Tiếp tục học lập trình thôi nào! 🚀</p>
              </div>

              {/* Error Toast */}
              <div className="error-toast" id="errorToast">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span id="errorMsg">Có lỗi xảy ra.</span>
              </div>
            </div>
          </div>

          {/* RIGHT 50%: Brand canvas */}
          <aside className="auth-brand-side">
            <div className="brand-canvas">
              <div className="brand-glow brand-glow--amber"></div>
              <div className="brand-glow brand-glow--indigo"></div>
              <div className="brand-glow brand-glow--emerald"></div>
              <div className="brand-canvas-content">
                <div className="brand-canvas-eyebrow">
                  <span className="brand-canvas-dot"></span>
                  PE_test · Database Design
                </div>
                <h1 className="brand-canvas-title">
                  Học SQL qua<br />
                  <span className="brand-canvas-grad">dự án thực tế</span>
                </h1>
                <p className="brand-canvas-sub">
                  20 bài học tương tác từ ER Model đến Web Services &amp; Password Security.
                  Mỗi bài có schema trực quan, mini-game, và bài tập code thực chiến.
                </p>

                <div className="brand-canvas-stats">
                  <div className="brand-stat">
                    <div className="brand-stat-num">20</div>
                    <div className="brand-stat-lbl">bài học tương tác</div>
                  </div>
                  <div className="brand-stat">
                    <div className="brand-stat-num">3</div>
                    <div className="brand-stat-lbl">module ER/NF/App</div>
                  </div>
                  <div className="brand-stat">
                    <div className="brand-stat-num">Brilliant</div>
                    <div className="brand-stat-lbl">/Duolingo level</div>
                  </div>
                </div>

                <div className="brand-canvas-foot">
                  <span className="brand-pill">🔑 Primary Key</span>
                  <span className="brand-pill">🔗 Foreign Key</span>
                  <span className="brand-pill">⚡ B-Tree</span>
                  <span className="brand-pill">🛡 BCNF</span>
                  <span className="brand-pill">💉 SQL Injection</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* thứ tự script gốc: inline trước, main.js sau (login.html:280-479) */}
      <LegacyScripts srcs={['/static/js/pages/login.inline.js', '/static/js/main.js']} />
    </>
  );
}
