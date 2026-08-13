'use client';

// Port lesson_htmlcss.html — markup 1:1 (xem lesson/python/page.tsx về cơ chế port).

import { useEffect } from 'react';

import PageStyles from '@/components/PageStyles';
import Chatbot from '@/components/Chatbot';
import LegacyScripts from '@/components/LegacyScripts';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

const SCRIPTS = [
  'https://cdn.tailwindcss.com',
  '/static/js/pages/lesson_htmlcss.tailwind.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js',
  '/static/js/pages/lesson_htmlcss.inline.js',
  '/static/js/main.js',
  '/static/js/chatbot.js',
  '/static/js/pages/lesson-topbar.hydrate.js',
];

export default function LessonHtmlcssPage() {
  useEffect(() => {
    // lesson.css áp dark tech theme qua selector body.lesson-page — phải gắn class lên <body>
    document.body.classList.add('lesson-page');
    return () => { document.body.classList.remove('lesson-page'); };
  }, []);

  return (
    <div className="lesson-page h-screen flex flex-col overflow-hidden">
      <PageStyles hrefs={["/static/css/lesson.css","/static/css/pages/lesson_htmlcss.inline.css","/static/css/chatbot.css","/static/css/edu-theme.css","/static/css/edu-lesson.css"]} />
      <title>HTML/CSS - Thiết Kế Responsive</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />

      <nav className="h-20 border-b-2 border-gray-100 flex items-center justify-between px-10 bg-white shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-orange-100">
              <i className="fa-brands fa-html5"></i>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-gray-800">CODE<span className="text-brand-primary">GEN Z</span></span>
          </div>
          <div id="streak-badge" className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-500 streak-badge-off">
            <i id="streak-fire" className="fa-solid fa-fire text-xl transition-all duration-500 text-gray-300 streak-fire-off"></i>
            <div className="flex flex-col leading-tight">
              <span id="streak-count" className="font-extrabold text-sm text-gray-400">0 ngày</span>
              <span id="streak-status" className="text-xs text-gray-300">Học ngay để giữ chuỗi</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
            <i className="fa-solid fa-gem text-brand-primary"></i>
            <span id="gems-count" className="font-bold text-brand-primary">0</span>
          </div>
          <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
            <i className="fa-solid fa-arrow-left"></i> Dashboard
          </a>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <section className="w-1/2 p-12 overflow-y-auto bg-white flex flex-col items-center">
          <div className="w-full max-w-xl">
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-extrabold text-gray-800 mb-4">Thiết Kế Responsive! 📱</h2>
              <p className="text-gray-500 text-lg font-medium">Kéo các khối để CSS quyết định layout nào phù hợp với màn hình điện thoại.</p>
            </div>

            <div className="bg-gray-50 rounded-[32px] p-10 border-2 border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-blue-500"></div>
              <div className="space-y-10">
                <div className="flex items-center flex-wrap gap-4">
                  <span className="text-2xl font-extrabold text-gray-400">NẾU</span>
                  <div className="drop-target" id="zone-cond">
                    <span className="text-gray-500 text-sm placeholder-pulse">Thả điều kiện...</span>
                  </div>
                  <span className="text-2xl font-extrabold text-gray-400">:</span>
                </div>
                <div className="flex items-center gap-4 pl-12">
                  <div className="w-10 h-10 border-l-4 border-b-4 border-gray-200 rounded-bl-2xl"></div>
                  <span className="text-xl font-bold text-brand-primary">THÌ</span>
                  <div className="drop-target" id="zone-act">
                    <span className="text-gray-500 text-sm placeholder-pulse">Thả hành động...</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-extrabold text-gray-400">NGƯỢC LẠI:</span>
                </div>
                <div className="flex items-center gap-4 pl-12">
                  <div className="w-10 h-10 border-l-4 border-b-4 border-gray-200 rounded-bl-2xl"></div>
                  <span className="text-xl font-bold text-gray-400">THÌ</span>
                  <div className="lesson-else-default px-6 py-3 bg-white border-2 border-gray-200 rounded-2xl text-gray-400 font-bold italic shadow-sm">
                    &quot;desktop_view()&quot;
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white rounded-3xl p-6 border-2 border-dashed border-gray-200">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">Túi đồ của bạn 🎒</h4>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="logic-card block-html" draggable data-type="cond" data-val="width < 768">
                  <i className="fa-solid fa-mobile-screen"></i> width &lt; 768px
                </div>
                <div className="logic-card block-html" draggable data-type="cond" data-val="width > 1200">
                  <i className="fa-solid fa-desktop"></i> width &gt; 1200px
                </div>
                <div className="logic-card block-css" draggable data-type="act" data-val="mobile_view()">
                  <i className="fa-solid fa-mobile-screen-button"></i> Mobile view
                </div>
                <div className="logic-card block-css" draggable data-type="act" data-val="desktop_view()">
                  <i className="fa-solid fa-display"></i> Desktop view
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-1/2 p-12 bg-[#F7F9FC] flex flex-col items-center">
          <div className="w-full max-w-xl h-full flex flex-col code-window shadow-2xl shadow-orange-900/10">
            <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
              <span className="ml-4 text-white/30 font-mono text-xs font-bold uppercase tracking-widest">CSS Breakpoint</span>
            </div>

            <div className="flex-1 p-10 font-mono text-xl leading-relaxed overflow-y-auto">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-purple-400">screen_width</span>
                <span className="text-white/40">=</span>
                <span className="text-orange-400">480</span>
                <span className="text-white/20 text-sm italic"># px</span>
              </div>
              <div className="text-white/20 text-sm italic mb-6"># Breakpoint mobile: 768px</div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-pink-500 font-bold">if</span>
                  <span id="code-cond" className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white/20">________</span>
                  <span className="text-white/40">:</span>
                </div>
                <div className="pl-12 flex items-center gap-3">
                  <span id="code-act" className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white/20">________</span>
                </div>
                <div className="text-pink-500 font-bold">else:</div>
                <div className="pl-12 text-green-400">desktop_view()</div>
              </div>
              <div className="mt-16 pt-10 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Output Terminal</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div id="output-text" className="text-sm text-white/40 italic leading-loose">
                  &gt; Đang đợi lệnh từ bạn...
                </div>
              </div>
            </div>

            <div className="p-8 bg-[#222222] border-t border-white/5 flex justify-between items-center rounded-b-[16px]">
              <p id="hint-box" className="text-xs text-white/30 font-medium max-w-[200px]">Hãy kéo &apos;width &lt; 768px&apos; — màn hình 480px là mobile!</p>
              <button onClick={() => W().runMission()} className="btn-3d px-10 py-4 bg-brand-primary text-white font-extrabold rounded-2xl flex items-center gap-3 hover:bg-brand-secondary shadow-lg shadow-orange-900/20 active:scale-95 transition-all uppercase tracking-tight">
                Kiểm tra <i className="fa-solid fa-rocket"></i>
              </button>
            </div>
          </div>
        </section>
      </main>

      <div id="success-modal" className="fixed inset-0 z-50 bg-white/90 backdrop-blur-md hidden flex items-center justify-center">
        <div className="text-center p-12 bg-white rounded-[40px] shadow-2xl border-4 border-brand-primary max-w-sm w-full mx-4">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">🎉</div>
          <h3 className="text-3xl font-black text-gray-800 mb-2">QUÁ ĐỈNH!</h3>
          <p className="text-gray-500 font-medium mb-8">Bạn đã hiểu CSS responsive breakpoint rồi! +50 XP</p>
          <button onClick={() => W().closeModal()} className="btn-3d w-full py-4 bg-brand-primary text-white font-black rounded-2xl uppercase">Tiếp tục nào</button>
        </div>
      </div>

      <Chatbot />
      <LegacyScripts srcs={SCRIPTS} />
    </div>
  );
}
