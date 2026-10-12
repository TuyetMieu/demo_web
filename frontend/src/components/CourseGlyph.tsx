import { useId } from 'react';

export type GlyphKind = 'python' | 'game' | 'db' | 'table' | 'engine';

/**
 * Biểu tượng khóa học vẽ bằng SVG, mỗi khóa một hình riêng (không phải một khuôn
 * chung đổi màu): Python = hai khối lồng nhau có "mắt", mini-game = tay cầm,
 * thiết kế CSDL = hình trụ nhiều lớp, SQL = bảng dữ liệu có dòng chọn,
 * Database Engine = bánh răng. Tô gradient hai màu thương hiệu của khóa
 * (catalog.ts); chi tiết nhỏ màu trắng nên đọc rõ ở cả nền sáng lẫn tối.
 *
 * `aria-hidden`: tên khóa đã có ở nhãn bên cạnh, biểu tượng chỉ để trang trí.
 */
export default function CourseGlyph({
  color,
  accent,
  kind,
  size = 72,
}: {
  color: string;
  accent: string;
  kind: GlyphKind;
  size?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const a = `${uid}a`;
  const b = `${uid}b`;
  const fa = `url(#${a})`;
  const fb = `url(#${b})`;

  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <linearGradient id={b} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>

      {kind === 'python' && (
        <g>
          {/* hai khối lồng nhau — xanh phía trên, đỏ phía dưới — mỗi khối một "mắt" */}
          <rect x="10" y="9" width="34" height="32" rx="12" fill={color} />
          <rect x="28" y="31" width="34" height="32" rx="12" fill={accent} stroke="#fff" strokeOpacity="0.9" strokeWidth="2.5" />
          <circle cx="22" cy="20" r="3" fill="#fff" />
          <circle cx="50" cy="52" r="3" fill="#fff" />
        </g>
      )}

      {kind === 'game' && (
        <g>
          <rect x="15" y="15" width="14" height="7" rx="3.5" fill={accent} />
          <rect x="43" y="15" width="14" height="7" rx="3.5" fill={accent} />
          <rect x="7" y="20" width="58" height="34" rx="17" fill={fa} />
          {/* phím điều hướng + hai nút */}
          <rect x="16" y="33" width="16" height="6" rx="3" fill="#fff" />
          <rect x="21" y="28" width="6" height="16" rx="3" fill="#fff" />
          <circle cx="47" cy="33" r="3.6" fill="#fff" fillOpacity="0.95" />
          <circle cx="54" cy="40" r="3.6" fill="#fff" fillOpacity="0.7" />
        </g>
      )}

      {kind === 'db' && (
        <g>
          <path d="M14 17v38c0 4.4 9 8 22 8s22-3.6 22-8V17z" fill={fa} />
          <ellipse cx="36" cy="17" rx="22" ry="8" fill={fb} />
          <ellipse cx="36" cy="17" rx="22" ry="8" fill="#fff" fillOpacity="0.28" />
          <path d="M14 29c0 4.4 9 8 22 8s22-3.6 22-8M14 42c0 4.4 9 8 22 8s22-3.6 22-8" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="2.4" />
        </g>
      )}

      {kind === 'table' && (
        <g>
          {/* JOIN: hai tập dữ liệu giao nhau, phần giao sáng lên */}
          <defs>
            <clipPath id={`${uid}j`}>
              <circle cx="27" cy="36" r="21" />
            </clipPath>
          </defs>
          <circle cx="27" cy="36" r="21" fill={fa} />
          <circle cx="45" cy="36" r="21" fill={fb} fillOpacity="0.92" />
          <circle cx="45" cy="36" r="21" fill="#fff" clipPath={`url(#${uid}j)`} />
          <path d="M31 30h10M31 36h10M31 42h6" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}

      {kind === 'engine' && (
        <g transform="translate(36 36)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect key={deg} x="-4.5" y="-29" width="9" height="12" rx="3" fill={fb} transform={`rotate(${deg})`} />
          ))}
          <circle r="22" fill={fa} />
          <circle r="9" fill="#fff" fillOpacity="0.95" />
          <circle r="3.6" fill={color} />
        </g>
      )}
    </svg>
  );
}
