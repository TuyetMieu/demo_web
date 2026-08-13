'use client';

// Port chatbot.html (Jinja partial include ở 6 trang) — markup 1:1.
// Logic nằm nguyên trong chatbot.js (legacy); handler gọi global.
/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export default function Chatbot() {
  return (
    <>
      {/* Floating Chat Button */}
      <button id="chatbot-toggle" className="chatbot-floating-btn" aria-label="Mở trợ lý AI">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="chatbot-btn-icon">
          <path d="M12 1L13.8 9.2L22 11L13.8 12.8L12 21L10.2 12.8L2 11L10.2 9.2L12 1Z" />
          <path d="M19.5 2L20.5 6L24 7L20.5 8L19.5 12L18.5 8L15 7L18.5 6L19.5 2Z" opacity="0.75" />
          <path d="M5 15L5.8 17.7L8.5 18.5L5.8 19.3L5 22L4.2 19.3L1.5 18.5L4.2 17.7L5 15Z" opacity="0.65" />
        </svg>
        <div className="chatbot-badge">
          <span className="chatbot-pulse"></span>
        </div>
      </button>

      {/* Chat Window */}
      <div id="chatbot-window" className="chatbot-window chatbot-hidden">
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-avatar">
              <i className="fas fa-robot"></i>
            </div>
            <div className="chatbot-header-text">
              <h3>Ichatbot</h3>
              <span className="chatbot-status"><span className="chatbot-status-dot"></span> Trực tuyến</span>
            </div>
          </div>
          <button id="chatbot-close" className="chatbot-close-btn" aria-label="Đóng chat">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div id="chatbot-messages" className="chatbot-messages">
          <div className="chatbot-message chatbot-message-ai">
            <div className="chatbot-message-avatar">
              <i className="fas fa-sparkles"></i>
            </div>
            <div className="chatbot-message-content">
              <div className="chatbot-message-bubble">
                Chào bạn! 👋 Tôi là Ichatbot, trợ lý AI của bạn. Hãy hỏi tôi bất kỳ điều gì về lập trình hoặc học tập! 🚀
              </div>
            </div>
          </div>
        </div>

        <div id="chatbot-image-preview" className="chatbot-image-preview chatbot-hidden">
          <div className="chatbot-preview-item">
            {/* Không đặt src="" — React cảnh báo (browser có thể tải lại cả trang);
                chatbot.js sẽ gán .src khi user đính kèm ảnh */}
            <img id="chatbot-preview-img" alt="Preview" />
            <button className="chatbot-preview-remove" onClick={() => W().removeChatbotImage()} aria-label="Xóa hình ảnh">
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div className="chatbot-input-area">
          <div className="chatbot-quick-actions">
            <button className="chatbot-quick-btn" onClick={() => W().quickChatbotAsk('Giải thích code này')}>
              <i className="fas fa-lightbulb"></i>
              <span>Giải thích</span>
            </button>
            <button className="chatbot-quick-btn" onClick={() => W().quickChatbotAsk('Tối ưu code')}>
              <i className="fas fa-wand-magic-sparkles"></i>
              <span>Tối ưu</span>
            </button>
            <button className="chatbot-quick-btn" onClick={() => W().generateChatbotRoadmap()}>
              <i className="fas fa-map"></i>
              <span>Lộ trình</span>
            </button>
          </div>

          <div className="chatbot-input-box">
            <label htmlFor="chatbot-image-upload" className="chatbot-attach-btn" title="Đính kèm hình ảnh">
              <i className="fas fa-paperclip"></i>
              <input type="file" id="chatbot-image-upload" className="chatbot-hidden" accept="image/*" title="Chọn hình ảnh" />
            </label>
            <input
              id="chatbot-input"
              type="text"
              placeholder="Nhập câu hỏi..."
              className="chatbot-input"
              autoComplete="off"
            />
            <button id="chatbot-send-btn" className="chatbot-send-btn" aria-label="Gửi">
              <i className="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
