/**
 * Biểu tượng khóa học vẽ bằng SVG: một khối bo góc màu phụ chồng lên vòng tròn
 * màu chính, chữ viết tắt của khóa nằm trên vòng tròn. Chỉ dùng hai màu thương
 * hiệu của khóa (catalog.ts) nên mỗi khóa có một dáng riêng mà không cần tải ảnh.
 *
 * `aria-hidden`: tên khóa đã có ở nhãn bên cạnh, biểu tượng chỉ để trang trí.
 */
export default function CourseGlyph({
  color,
  accent,
  mark,
  size = 72,
}: {
  color: string;
  accent: string;
  mark: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="36" height="36" rx="10" fill={accent} opacity="0.92" />
      <circle cx="43" cy="43" r="22" fill={color} opacity="0.95" />
      <text
        x="43"
        y="48.5"
        textAnchor="middle"
        fontSize={mark.length > 2 ? 14 : 17}
        fontWeight="700"
        fontFamily="var(--edu-font), system-ui, sans-serif"
        fill="#fff"
      >
        {mark}
      </text>
    </svg>
  );
}
