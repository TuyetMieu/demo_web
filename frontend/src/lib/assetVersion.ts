/**
 * Tem phiên bản cho asset tĩnh trong /public/static (giữ idiom `theme.css?v=3`
 * của base.html cũ).
 *
 * VÌ SAO CẦN: file trong public/ KHÔNG đi qua bundler nên Fast Refresh không
 * theo dõi chúng. Khi sửa đồng thời một component và file css/js của nó, HMR áp
 * ngay JSX mới nhưng thẻ <link>/<script> vẫn giữ nguyên src → trình duyệt dùng
 * lại bản cũ trong bộ nhớ, ra giao diện lai markup-mới/asset-cũ.
 *
 * Đã gặp hai lần: cụm control ở header mất display:flex nên xếp dọc (CSS cũ),
 * và thẻ phụ trang Xếp hạng kẹt ở "Đang tải…" (edu-dashboard.js cũ, chưa có
 * hàm đổ dữ liệu). Đổi số này làm URL đổi theo, trình duyệt nạp bản mới.
 *
 * BUMP mỗi khi sửa bất kỳ file nào trong public/static/css hoặc public/static/js.
 */
export const ASSET_VERSION = '2026-08-13e';

/** Gắn ?v= cho asset nội bộ; bỏ qua URL tuyệt đối (CDN) và href đã có query. */
export function withAssetVersion(url: string): string {
  if (/^[a-z]+:\/\//i.test(url) || url.includes('?')) return url;
  return `${url}?v=${ASSET_VERSION}`;
}
