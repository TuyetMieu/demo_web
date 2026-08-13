'use client';

// Port roadmap.html (partial include trong dashboard.html) — markup 1:1.
// Logic render/kéo-thả nằm nguyên trong roadmap.js + main.js (legacy).
/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export default function RoadmapSection() {
  return (
    <div className="page" id="page-roadmap">
      <div className="rm-root">
        {/* Tab bar (pinned roadmaps + Cá nhân + nút Browse) */}
        <div className="rm-tabbar" id="rm-tabbar"></div>

        {/* Stats pill (done/active/locked của roadmap đang xem) */}
        <div className="rm-stats-pill" id="rm-stats-pill"></div>

        {/* Flow chính: spine + sections (main + nhánh trái/phải) */}
        <div className="rm-flow-scroll">
          {/* Intro: mục đích trang — định hướng vào các khóa học trên nền tảng */}
          <div className="rm-page-intro">
            <span className="rm-page-intro-icon">🧭</span>
            <div>
              <div className="rm-page-intro-title">Lộ trình học tập</div>
              <p className="rm-page-intro-sub">
                Hoàn thành <a className="rm-page-intro-link" href="/questionaire">bộ khảo sát</a> để nhận lộ trình sinh riêng
                cho bạn, hoặc chọn một lộ trình có sẵn. Chặng có huy hiệu <span className="rm-page-intro-chip">📚</span> gắn
                với khóa học trên nền tảng — tiến độ tự cập nhật khi bạn hoàn thành bài học.
              </p>
            </div>
          </div>
          <div className="rm-my-header" id="rm-my-header" style={{ display: 'none' }}></div>
          <div className="rm-flow-wrap" id="rm-flow-wrap"></div>
        </div>

        {/* Cá nhân — canvas kéo-thả */}
        <div id="roadmap-personal-view">
          <div className="rm-personal-hd">
            <div className="rm-personal-hd-left">
              <div className="rm-personal-icon">✏️</div>
              <div>
                <div className="rm-personal-label">Lộ trình cá nhân của tôi</div>
                <div className="rm-personal-sub">Kéo thả · Nhấn đúp để đổi tên · Click mũi tên để xóa</div>
              </div>
            </div>
            <div className="rm-personal-hd-right">
              <button className="rm-ai-btn" onClick={() => W().handlePersonalRoadmapAI()} title="Chỉ dành cho tài khoản Premium">
                🤖 Tạo bằng AI <span className="rm-premium-badge">Premium</span>
              </button>
              <button className="rm-save-btn" onClick={() => W().savePersonalRoadmap()}>💾 Lưu lộ trình</button>
            </div>
          </div>

          {/* Visual toolbar */}
          <div className="rmv-toolbar">
            <button className="rmv-btn rmv-btn-add" onClick={() => W().rmVAddNode()}>
              <span>➕</span> Thêm node
            </button>
            <button className="rmv-btn rmv-btn-connect" id="rm-vbtn-connect" onClick={() => W().rmVToggleConnect()}>
              <span>🔗</span> Nối node
            </button>
            <button className="rmv-btn rmv-btn-clear" onClick={() => W().rmVClearAll()}>
              <span>🗑️</span> Xóa hết
            </button>
            <div className="rmv-hint" id="rm-vhint">Click &quot;Thêm node&quot; để bắt đầu</div>
            <div className="rmv-zoom-wrap">
              <button className="rmv-zoom-btn" onClick={() => W().rmVZoomOut()} title="Thu nhỏ (Ctrl+Scroll)">−</button>
              <span className="rmv-zoom-label" id="rm-vzoom-label">100%</span>
              <button className="rmv-zoom-btn" onClick={() => W().rmVZoomIn()} title="Phóng to (Ctrl+Scroll)">+</button>
              <button className="rmv-zoom-btn rmv-zoom-reset" onClick={() => W().rmVZoomReset()} title="Reset zoom">↺</button>
            </div>
          </div>

          {/* Canvas */}
          <div id="rm-visual-canvas" tabIndex={0}>
            <div id="rm-vcontent">
              <svg id="rm-arrows-svg" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
          </div>
        </div>

        {/* Browse grid (26 lộ trình, pin/unpin) */}
        <div className="rm-browse-backdrop" id="rm-browse-backdrop" onClick={() => W().roadmapCloseBrowse()}></div>
        <div className="rm-browse" id="rm-browse" role="dialog" aria-label="Khám phá lộ trình">
          <div className="rm-browse-hd">
            <span className="rm-browse-title">Khám phá lộ trình</span>
            <button className="rm-browse-close" onClick={() => W().roadmapCloseBrowse()} aria-label="Đóng">
              <span data-icon="x" data-size="16"></span>
            </button>
          </div>
          <div className="rm-browse-search-wrap">
            <span data-icon="search" data-size="14" style={{ color: 'var(--t3)' }}></span>
            <input
              type="text"
              id="rm-browse-search"
              placeholder="Tìm lộ trình..."
              onInput={(e) => W().roadmapBrowseSearch(e.currentTarget.value)}
              autoComplete="off"
            />
          </div>
          <div className="rm-browse-list" id="rm-browse-list"></div>
        </div>

        {/* Detail Drawer */}
        <div className="rm-drawer-backdrop" id="rm-drawer-backdrop" onClick={() => W().roadmapCloseDrawer()}></div>
        <div className="rm-drawer" id="rm-drawer" role="dialog" aria-label="Chi tiết node">
          <div className="rm-drawer-hd">
            <h2 id="rm-drawer-title">—</h2>
            <button className="rm-drawer-close" onClick={() => W().roadmapCloseDrawer()} aria-label="Đóng">
              <span data-icon="x" data-size="16"></span>
            </button>
          </div>
          <div className="rm-drawer-body">
            <div className="rm-drawer-status" id="rm-drawer-status"></div>
            <p className="rm-drawer-desc" id="rm-drawer-desc"></p>
            <div className="rm-drawer-resources" id="rm-drawer-resources"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
