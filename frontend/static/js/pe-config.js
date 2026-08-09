/**
 * pe-config.js — cấu hình runtime của frontend tĩnh.
 *
 * Trang là HTML/CSS/JS thuần (không build step) nên không có biến môi trường:
 * origin của backend Django khai báo THẲNG ở đây. Sửa 1 dòng khi deploy.
 *
 * File này PHẢI nằm trong <head>, TRƯỚC pe-bridge.js và mọi script legacy —
 * pe-bridge đọc window.__PE_API_ORIGIN ngay lúc nạp để rewrite /api/* và /auth/*.
 *
 * Muốn override mà không sửa file (vd môi trường staging): đặt
 *   <script>window.__PE_API_ORIGIN = 'https://api.example.com';</script>
 * TRƯỚC thẻ <script src="/static/js/pe-config.js">.
 */
window.__PE_API_ORIGIN = window.__PE_API_ORIGIN || 'http://localhost:9000';
