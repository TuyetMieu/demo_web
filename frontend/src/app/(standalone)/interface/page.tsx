'use client';

// Port interface.html (mission cpp "Cứu nguy Robot") — markup 1:1.
// CSS: lesson.css + inline style gốc (interface.inline.css).
// Inline script → /static/js/pages/interface.inline.js; {{ streak }}/{{ gems }}
// server bơm → lesson-topbar.hydrate.js.

import { useEffect } from 'react';

import PageStyles from '@/components/PageStyles';
import LegacyScripts from '@/components/LegacyScripts';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

const SCRIPTS = [
  'https://cdn.tailwindcss.com',
  '/static/js/pages/interface.tailwind.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js',
  '/static/js/pages/interface.inline.js',
  '/static/js/main.js',
  '/static/js/pages/lesson-topbar.hydrate.js',
];

export default function InterfacePage() {
  useEffect(() => {
    // lesson.css áp dark tech theme qua selector body.lesson-page — phải gắn class lên <body>
    document.body.classList.add('lesson-page');
    return () => { document.body.classList.remove('lesson-page'); };
  }, []);

  return (
    <div className="lesson-page h-screen flex flex-col overflow-hidden">
      <PageStyles hrefs={["/static/css/lesson.css","/static/css/pages/interface.inline.css","/static/css/edu-theme.css","/static/css/edu-lesson.css"]} />
      <title>CodeQuest Lab - Interactive Learning</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />

      {/* Topbar: Đậm chất Gamification */}
      <nav className="h-20 border-b-2 border-gray-100 flex items-center justify-between px-10 bg-white shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-green-100">
              <i className="fa-solid fa-code"></i>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-gray-800">CODE<span className="text-brand-secondary">GEN Z</span></span>
          </div>

          {/* Progress Tracker */}
          <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
            <i className="fa-solid fa-fire text-orange-500"></i>
            <span className="font-bold text-sm" id="streak-plain">0 Ngày liên tiếp!</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
            <i className="fa-solid fa-gem text-brand-secondary"></i>
            <span id="gems-count" className="font-bold text-brand-secondary">0</span>
          </div>
          <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
            <i className="fa-solid fa-arrow-left"></i> Dashboard
          </a>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* BÊN TRÁI: KHU VỰC TƯ DUY (LOGIC CANVAS) */}
        <section className="w-1/2 p-12 overflow-y-auto bg-white flex flex-col items-center">
          <div className="w-full max-w-xl">
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-extrabold text-gray-800 mb-4">Cứu nguy Robot! 🤖</h2>
              <p className="text-gray-500 text-lg font-medium">Kéo các khối lệnh để giúp Robot quyết định khi nào cần sạc pin nhé.</p>
            </div>

            {/* Canvas Kéo Thả */}
            <div className="bg-gray-50 rounded-[32px] p-10 border-2 border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-green-400"></div>

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
                  <span className="text-xl font-bold text-brand-secondary">THÌ</span>
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
                    &quot;Tiếp tục làm việc&quot;
                  </div>
                </div>
              </div>
            </div>

            {/* Kho khối lệnh (Inventory) */}
            <div className="mt-12 bg-white rounded-3xl p-6 border-2 border-dashed border-gray-200">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">Túi đồ của bạn 🎒</h4>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="logic-card block-orange" draggable data-type="cond" data-val="pin < 20">
                  <i className="fa-solid fa-battery-quarter"></i> Pin &lt; 20%
                </div>
                <div className="logic-card block-orange" draggable data-type="cond" data-val="pin > 80">
                  <i className="fa-solid fa-battery-full"></i> Pin &gt; 80%
                </div>
                <div className="logic-card block-blue" draggable data-type="act" data-val="charge()">
                  <i className="fa-solid fa-plug"></i> Về trạm sạc
                </div>
                <div className="logic-card block-blue" draggable data-type="act" data-val="sleep()">
                  <i className="fa-solid fa-moon"></i> Đi ngủ
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BÊN PHẢI: COMPILER (CODE BOX) */}
        <section className="w-1/2 p-12 bg-[#F7F9FC] flex flex-col items-center">
          <div className="w-full max-w-xl h-full flex flex-col code-window shadow-2xl shadow-blue-900/10">
            {/* Mac-style Window Controls */}
            <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
              <span className="ml-4 text-white/30 font-mono text-xs font-bold uppercase tracking-widest">Compiler v1.0.4</span>
            </div>

            {/* Code Display Area */}
            <div className="flex-1 p-10 font-mono text-xl leading-relaxed overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-brand-secondary">battery_level</span>
                <span className="text-white/40">=</span>
                <span className="text-orange-400">15</span>
                <span className="text-white/20 text-sm italic"># % pin hiện tại</span>
              </div>

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
                <div className="pl-12 text-green-400">work_now()</div>
              </div>

              {/* Console / Terminal */}
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

            {/* Footer Action */}
            <div className="p-8 bg-[#222222] border-t border-white/5 flex justify-between items-center rounded-b-[16px]">
              <p id="hint-box" className="text-xs text-white/30 font-medium max-w-[200px]">Hãy kéo thử khối &apos;Pin &lt; 20%&apos; vào ô trống xem sao!</p>
              <button onClick={() => W().runMission()} className="btn-3d px-10 py-4 bg-brand-primary text-white font-extrabold rounded-2xl flex items-center gap-3 hover:bg-[#4AAE01] shadow-lg shadow-green-900/20 active:scale-95 transition-all uppercase tracking-tight">
                Kiểm tra <i className="fa-solid fa-rocket"></i>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Success Modal (Hidden) */}
      <div id="success-modal" className="fixed inset-0 z-50 bg-white/90 backdrop-blur-md hidden flex items-center justify-center">
        <div className="text-center p-12 bg-white rounded-[40px] shadow-2xl border-4 border-brand-primary max-w-sm w-full mx-4 transform scale-95 transition-transform duration-300">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">🎉</div>
          <h3 className="text-3xl font-black text-gray-800 mb-2">QUÁ ĐỈNH!</h3>
          <p className="text-gray-500 font-medium mb-8">Bạn đã giải được bài toán logic đầu tiên rồi đấy! +50 XP</p>
          <button onClick={() => W().closeModal()} className="btn-3d w-full py-4 bg-brand-secondary text-white font-black rounded-2xl uppercase">Tiếp tục nào</button>
        </div>
      </div>

      <LegacyScripts srcs={SCRIPTS} />
    </div>
  );
}
