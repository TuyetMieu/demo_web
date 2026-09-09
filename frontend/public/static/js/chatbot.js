/* ═══════════════════════════════════════════════════════════
   GEMINI AI CHATBOT - JavaScript Logic
   ═══════════════════════════════════════════════════════════ */

// Configuration
//
// KHÔNG còn apiKey ở đây. Bản cũ nhét Gemini API key thẳng vào file này — mà
// file này nằm trong /public nên ai mở DevTools cũng đọc được key và dùng hết
// quota trên tài khoản của mình. Giờ frontend chỉ gọi backend (/api/chatbot/*),
// backend mới là bên cầm key và gọi Google.
const CHATBOT_CONFIG = {
    endpoint: '/api/chatbot/message',
    statusEndpoint: '/api/chatbot/status',
    // Số lượt gửi kèm để bot nhớ ngữ cảnh (backend chặn tối đa 20).
    historyTurns: 10,
    // Trần ảnh đính kèm — khớp giới hạn MAX_IMAGE_BASE64 của backend.
    maxImageBytes: 500 * 1024,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
};

// State
let chatbotState = {
    isOpen: false,
    isSending: false,
    selectedImage: null,
    selectedImageType: null,
    // Lịch sử hội thoại {role: 'user'|'model', text}. Backend không lưu hội
    // thoại nên client phải gửi kèm thì bot mới nhớ ngữ cảnh.
    messages: []
};

// DOM Elements
const chatbotElements = {
    toggleBtn: document.getElementById('chatbot-toggle'),
    window: document.getElementById('chatbot-window'),
    closeBtn: document.getElementById('chatbot-close'),
    messagesContainer: document.getElementById('chatbot-messages'),
    input: document.getElementById('chatbot-input'),
    sendBtn: document.getElementById('chatbot-send-btn'),
    imageUpload: document.getElementById('chatbot-image-upload'),
    imagePreview: document.getElementById('chatbot-image-preview'),
    previewImg: document.getElementById('chatbot-preview-img')
};

/**
 * Initialize Chatbot
 */
function initializeChatbot() {
    chatbotElements.toggleBtn?.addEventListener('click', toggleChatbot);
    chatbotElements.closeBtn?.addEventListener('click', toggleChatbot);
    chatbotElements.sendBtn?.addEventListener('click', sendChatbotMessage);
    chatbotElements.input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatbotMessage();
        }
    });
    chatbotElements.imageUpload?.addEventListener('change', handleChatbotImageUpload);
}

/**
 * Toggle Chat Window
 */
function toggleChatbot() {
    chatbotState.isOpen = !chatbotState.isOpen;
    
    if (chatbotState.isOpen) {
        chatbotElements.window.classList.remove('chatbot-hidden');
        chatbotElements.toggleBtn?.classList.add('active');
        chatbotElements.input?.focus();
    } else {
        chatbotElements.window.classList.add('chatbot-hidden');
        chatbotElements.toggleBtn?.classList.remove('active');
    }
}

/**
 * Handle Image Upload
 */
function handleChatbotImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Chặn tại đây cho thông báo rõ ràng, thay vì để backend trả 400 sau khi
    // đã tải nguyên file lên mạng.
    if (CHATBOT_CONFIG.allowedImageTypes.indexOf(file.type) === -1) {
        alert('Chỉ hỗ trợ ảnh JPG, PNG, WEBP, HEIC.');
        removeChatbotImage();
        return;
    }
    if (file.size > CHATBOT_CONFIG.maxImageBytes) {
        alert('Ảnh quá lớn, hãy dùng ảnh dưới 500KB.');
        removeChatbotImage();
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target?.result?.split(',')[1];
        if (base64) {
            chatbotState.selectedImage = base64;
            chatbotState.selectedImageType = file.type;
            displayChatbotImagePreview(event.target?.result);
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Display Image Preview
 */
function displayChatbotImagePreview(src) {
    if (chatbotElements.previewImg) {
        chatbotElements.previewImg.src = src;
        chatbotElements.imagePreview?.classList.remove('chatbot-hidden');
    }
}

/**
 * Remove Image
 */
function removeChatbotImage() {
    chatbotState.selectedImage = null;
    chatbotState.selectedImageType = null;
    chatbotElements.imagePreview?.classList.add('chatbot-hidden');
    if (chatbotElements.imageUpload) {
        chatbotElements.imageUpload.value = '';
    }
}

/**
 * Quick Ask
 */
async function quickChatbotAsk(text) {
    if (chatbotElements.input) {
        chatbotElements.input.value = text;
    }
    await sendChatbotMessage();
}

/**
 * Generate Roadmap
 */
function generateChatbotRoadmap() {
    const topic = prompt('Chủ đề bạn quan tâm? (VD: React, Python, etc)', 'Web Development');
    if (topic && chatbotElements.input) {
        chatbotElements.input.value = `Xây dựng lộ trình học ${topic} chi tiết và thực tế trong 8 tuần.`;
        sendChatbotMessage();
    }
}

/**
 * Add Message to Chat
 */
function addChatbotMessage(text, isUser = false, imageData = null) {
    const messageEl = document.createElement('div');
    messageEl.className = `chatbot-message ${isUser ? 'chatbot-message-user' : 'chatbot-message-ai'}`;
    
    if (!isUser) {
        messageEl.innerHTML = `
            <div class="chatbot-message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="chatbot-message-content">
                <div class="chatbot-message-bubble">${escapeHtml(text)}</div>
            </div>
        `;
    } else {
        let contentHtml = '';
        if (imageData) {
            contentHtml = `<img src="${imageData}" style="border-radius: 8px; margin-bottom: 8px; max-width: 100%; max-height: 150px;">`;
        }
        contentHtml += `<div class="chatbot-message-bubble">${escapeHtml(text)}</div>`;
        
        messageEl.innerHTML = `
            <div class="chatbot-message-content" style="text-align: right;">
                ${contentHtml}
            </div>
            <div class="chatbot-message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
    }
    
    chatbotElements.messagesContainer?.appendChild(messageEl);
    scrollChatbotToBottom();
}

/**
 * Add Typing Indicator
 */
function addChatbotTyping() {
    const messageEl = document.createElement('div');
    messageEl.className = 'chatbot-message chatbot-message-ai';
    messageEl.id = 'chatbot-typing-indicator';
    messageEl.innerHTML = `
        <div class="chatbot-message-avatar">
            <i class="fas fa-sparkles"></i>
        </div>
        <div class="chatbot-message-content">
            <div class="chatbot-message-bubble">
                <div class="chatbot-typing">
                    <div class="chatbot-typing-dot"></div>
                    <div class="chatbot-typing-dot"></div>
                    <div class="chatbot-typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    chatbotElements.messagesContainer?.appendChild(messageEl);
    scrollChatbotToBottom();
}

/**
 * Remove Typing Indicator
 */
function removeChatbotTyping() {
    const typing = document.getElementById('chatbot-typing-indicator');
    typing?.remove();
}

/**
 * Scroll to Bottom
 */
function scrollChatbotToBottom() {
    if (chatbotElements.messagesContainer) {
        setTimeout(() => {
            chatbotElements.messagesContainer.scrollTop = chatbotElements.messagesContainer.scrollHeight;
        }, 0);
    }
}

/**
 * Format Message with Markdown
 */
function formatChatbotMessage(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Gọi backend (backend gọi Gemini).
 *
 * Trả về {text, ok}. Không ném lỗi ra ngoài: mọi tình huống hỏng đều quy về
 * một câu tiếng Việt hiển thị được trong bong bóng chat.
 */
async function callChatbotGemini(prompt, imageBase64 = null) {
    const payload = { history: getChatbotHistory() };
    if (prompt) payload.message = prompt;
    if (imageBase64) {
        payload.image = imageBase64;
        payload.mimeType = chatbotState.selectedImageType || 'image/jpeg';
    }

    try {
        // URL tương đối: pe-bridge.js rewrite sang origin backend và tự đính
        // "Authorization: Bearer" + retry khi 401 — không tự ghép URL/token ở đây.
        const response = await fetch(CHATBOT_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            if (response.status === 401) {
                return { ok: false, text: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục trò chuyện.' };
            }
            if (response.status === 429) {
                return { ok: false, text: 'Bạn đã hỏi khá nhiều rồi 😅 Nghỉ một chút rồi quay lại nhé.' };
            }
            // Backend trả {error: {status, message, detail}} — dùng __PE_errMsg
            // để không hiện "[object Object]".
            const msg = window.__PE_errMsg ? window.__PE_errMsg(data?.error) : data?.error?.message;
            return { ok: false, text: msg || 'Trợ lý AI gặp sự cố. Vui lòng thử lại.' };
        }

        return { ok: true, text: data?.reply || 'Không nhận được phản hồi.' };
    } catch (error) {
        console.error('Chatbot Error:', error);
        return { ok: false, text: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
}

/**
 * Lấy N lượt gần nhất để gửi kèm làm ngữ cảnh.
 * Chỉ gửi phần chữ — ảnh cũ không gửi lại (tốn token, và backend chỉ nhận ảnh
 * của lượt hiện tại).
 */
function getChatbotHistory() {
    return chatbotState.messages.slice(-CHATBOT_CONFIG.historyTurns);
}

/**
 * Send Message
 */
async function sendChatbotMessage() {
    const text = chatbotElements.input?.value?.trim();
    
    if (!text && !chatbotState.selectedImage) return;
    if (chatbotState.isSending) return;

    // Get image preview for display
    const imagePreview = chatbotState.selectedImage 
        ? chatbotElements.previewImg?.src 
        : null;

    // Add user message
    addChatbotMessage(text || '(Hình ảnh)', true, imagePreview);

    // Giữ lại ảnh trước khi removeChatbotImage() xoá state — bản cũ gọi API
    // với chatbotState.selectedImage SAU khi đã xoá nên ảnh không bao giờ được gửi.
    const image = chatbotState.selectedImage;

    // Clear input
    if (chatbotElements.input) {
        chatbotElements.input.value = '';
    }
    removeChatbotImage();

    // Set sending state
    chatbotState.isSending = true;
    addChatbotTyping();

    try {
        // Call API
        const result = await callChatbotGemini(text, image);
        
        // Remove typing indicator
        removeChatbotTyping();
        
        // Chỉ ghi vào lịch sử khi thật sự có câu trả lời — nhét thông báo lỗi
        // ("Lỗi kết nối...") vào history sẽ làm bot tưởng đó là lời nó đã nói.
        if (result.ok) {
            chatbotState.messages.push({ role: 'user', text: text || '(Hình ảnh)' });
            chatbotState.messages.push({ role: 'model', text: result.text });
        }
        
        // Format and display response
        const formatted = formatChatbotMessage(result.text);
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chatbot-message chatbot-message-ai';
        messageEl.innerHTML = `
            <div class="chatbot-message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="chatbot-message-content">
                <div class="chatbot-message-bubble">${formatted}</div>
            </div>
        `;
        
        chatbotElements.messagesContainer?.appendChild(messageEl);
        scrollChatbotToBottom();
        
    } catch (error) {
        removeChatbotTyping();
        addChatbotMessage('Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.', false);
        console.error('Chatbot Error:', error);
    } finally {
        chatbotState.isSending = false;
        chatbotElements.input?.focus();
    }
}

/**
 * Kiểm tra trợ lý AI có sẵn sàng không (backend đã cấu hình GEMINI_API_KEY chưa).
 * Chỉ để log cho dev — không chặn UI, vì lỗi thật sự đã có thông báo lúc gửi.
 */
async function verifyChatbotApiKey() {
    try {
        // Chưa đăng nhập thì đừng ping: route yêu cầu JWT, gọi vào chỉ tạo một
        // lượt 401 + thử refresh vô ích ngay lúc trang vừa mở.
        if (!localStorage.getItem('pe_access')) return;

        const res = await fetch(CHATBOT_CONFIG.statusEndpoint);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.enabled) {
            console.log('✅ Chatbot: sẵn sàng (model ' + data.model + ').');
        } else {
            console.warn('⚠️ Chatbot: backend chưa cấu hình GEMINI_API_KEY trong .env');
        }
    } catch (e) {
        /* offline hoặc backend chưa chạy — bỏ qua, không làm phiền user */
    }
}

/**
 * Initialize on DOM Ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeChatbot();
    verifyChatbotApiKey();
});

// Support for dynamic loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeChatbot();
        verifyChatbotApiKey();
    });
} else {
    initializeChatbot();
    verifyChatbotApiKey();
}
