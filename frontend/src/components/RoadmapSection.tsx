'use client';

// Trang "Lộ trình" — mạch học TUYẾN TÍNH (1 lộ trình gốc, không rẽ nhánh).
// Markup ở đây chỉ là khung; toàn bộ render/kéo-thả nằm trong
// roadmap.js (danh mục + mạch chặng) và main.js (canvas tab Tùy chỉnh).
/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export default function RoadmapSection() {
  return (
    <div className="page" id="page-roadmap">
      <div className="rm-root">
        {/* Tab bar — "Tùy chỉnh" luôn đứng đầu, rồi tới các lộ trình đã ghim */}
        <div className="rm-tabbar" id="rm-tabbar"></div>

        {/* Stats pill (đã học / đang học / chưa học của lộ trình đang xem) */}
        <div className="rm-stats-pill" id="rm-stats-pill"></div>

        {/* Mạch lộ trình */}
        <div className="rm-flow-scroll">
          <div className="rm-page-intro">
            <span className="rm-page-intro-icon">🧭</span>
            <p className="rm-page-intro-sub">
              Mỗi lộ trình là một mạch thẳng, học lần lượt từ trên xuống. Chặng có nhãn{' '}
              <span className="rm-page-intro-chip">📚 Khóa học</span> gắn với khóa học trên nền tảng — tiến độ tự cập
              nhật khi bạn học. Muốn lộ trình riêng? Làm{' '}
              <a className="rm-page-intro-link" href="/questionaire">bộ khảo sát</a> hoặc tự dựng ở tab{' '}
              <b>Tùy chỉnh</b>.
            </p>
          </div>

          {/* Header lộ trình: tên, mô tả, vòng tiến độ */}
          <div className="rm-head" id="rm-head" style={{ display: 'none' }}></div>

          {/* Danh sách chặng (render bởi roadmap.js) */}
          <div className="rm-flow-wrap" id="rm-flow-wrap"></div>
        </div>

        {/* ── Tab "Tùy chỉnh" — canvas kéo-thả để tự dựng lộ trình ── */}
        <div id="roadmap-personal-view">
          <div className="rm-personal-hd">
            <div className="rm-personal-hd-left">
              <div className="rm-personal-icon">✏️</div>
              <div>
                <div className="rm-personal-label">Lộ trình tùy chỉnh của tôi</div>
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

          <div id="rm-visual-canvas" tabIndex={0}>
            <div id="rm-vcontent">
              <svg id="rm-arrows-svg" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
          </div>
        </div>

        {/* ── Panel khám phá lộ trình ── */}
        <div className="rm-browse-backdrop" id="rm-browse-backdrop" onClick={() => W().roadmapCloseBrowse()}></div>
        <div className="rm-browse" id="rm-browse" role="dialog" aria-label="Khám phá lộ trình">
          <div className="rm-browse-hd">
            <div>
              <span className="rm-browse-title">Khám phá lộ trình</span>
              <span className="rm-browse-sub">26 lộ trình nghề nghiệp · click để mở, dấu + để ghim</span>
            </div>
            <button className="rm-browse-close" onClick={() => W().roadmapCloseBrowse()} aria-label="Đóng">
              <span data-icon="x" data-size="16"></span>
            </button>
          </div>
          <div className="rm-browse-search-wrap">
            <span data-icon="search" data-size="14"></span>
            <input
              type="text"
              id="rm-browse-search"
              placeholder="Tìm lộ trình… (frontend, dữ liệu, bảo mật…)"
              onInput={(e) => W().roadmapBrowseSearch(e.currentTarget.value)}
              autoComplete="off"
            />
          </div>
          <div className="rm-browse-list" id="rm-browse-list"></div>
        </div>

        {/* ── Drawer chi tiết chặng ── */}
        <div className="rm-drawer-backdrop" id="rm-drawer-backdrop" onClick={() => W().roadmapCloseDrawer()}></div>
        <div className="rm-drawer" id="rm-drawer" role="dialog" aria-label="Chi tiết chặng học">
          <div className="rm-drawer-hd">
            <div className="rm-drawer-hd-body">
              <span className="rm-drawer-step" id="rm-drawer-step"></span>
              <h2 id="rm-drawer-title">—</h2>
            </div>
            <button className="rm-drawer-close" onClick={() => W().roadmapCloseDrawer()} aria-label="Đóng">
              <span data-icon="x" data-size="16"></span>
            </button>
          </div>
          <div className="rm-drawer-body">
            <div className="rm-drawer-status" id="rm-drawer-status"></div>
            <p className="rm-drawer-desc" id="rm-drawer-desc"></p>
            <div className="rm-drawer-topics-wrap" id="rm-drawer-topics"></div>
            <div className="rm-drawer-resources" id="rm-drawer-resources"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
