/**
 * Danh mục khóa học tĩnh — nguồn duy nhất cho trang chủ và trang chi tiết.
 *
 * Vì sao tĩnh: mọi route `/api/courses*` của backend đều đòi JWT, mà giao diện
 * đăng nhập đã bị gỡ khỏi frontend. Đọc danh mục từ API thì khách nào cũng nhận
 * 401 và trang chủ trống trơn. Nội dung dưới đây chép từ `prisma/seed-courses.js`
 * (id, tiêu đề, phụ đề, thẻ, cấp độ, thời lượng) và số bài lấy thẳng từ
 * `curricula.json` — cùng nguồn trang chi tiết đang dùng để vẽ giáo trình, nên
 * hai chỗ không thể lệch số bài.
 *
 * Sửa seed thì phải sửa cả file này (xem bẫy "hai nguồn danh sách bài" trong
 * AGENTS.md — đây là nguồn thứ ba của cùng một loại lệch).
 */
import type { GlyphKind } from '@/components/CourseGlyph';
import CURRICULA_JSON from '@/lib/curricula.json';

type Curriculum = { modules?: { title: string; lessons: string[] }[] };
const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, Curriculum>;

export type Level = 'beginner' | 'intermediate' | 'advanced';

export type CatalogCourse = {
  id: string;
  /** Nhãn ngắn dưới biểu tượng ở trang chủ. */
  label: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  level: Level;
  duration: string;
  lessons: number;
  rating: number;
  /** Ảnh bìa ở hero trang chi tiết (đường dẫn trong /public). */
  image: string;
  /** Hai màu thương hiệu của khóa — vẽ biểu tượng ở trang chủ. */
  color: string;
  accent: string;
  /** Hình biểu tượng riêng của khóa (xem CourseGlyph.tsx). */
  icon: GlyphKind;
  /** Trang bài học của khóa. */
  lessonUrl: string;
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

/** Số bài = tổng bài của mọi module trong giáo trình; khóa không có giáo trình dùng `fallback`. */
function lessonCount(id: string, fallback: number): number {
  const modules = CURRICULA[id]?.modules;
  if (!modules?.length) return fallback;
  return modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export const COURSES: CatalogCourse[] = [
  {
    id: 'python',
    label: 'Python',
    title: 'Lập trình Python từ Zero đến Hero',
    subtitle: 'Từ cú pháp cơ bản đến AI/Machine Learning',
    description:
      'Giáo trình 40 bài chạy ngay trong trình duyệt: đọc hiểu từng dòng, lắp ghép mã rồi tự viết '
      + 'và chạy thử, có chấm tự động. Đi từ biến, vòng lặp, hàm tới file, class, thread và process.',
    tag: 'NGÔN NGỮ LẬP TRÌNH',
    level: 'beginner',
    duration: '~40 giờ',
    lessons: lessonCount('python', 40),
    rating: 4.8,
    image: '/static/images/python.webp',
    color: '#2563EB',
    accent: '#E5334B',
    icon: 'python',
    lessonUrl: '/lesson/python',
  },
  {
    id: 'python_advanced',
    label: 'Python Mini-game',
    title: 'Python Advanced — học qua mini-game',
    subtitle: '40 bài PE Python học qua mini-game',
    description:
      'Cùng giáo trình 40 bài PE Python v3 nhưng học bằng game: ghép code rồi chạy thật, săn lỗi, '
      + 'nối lệnh với ý nghĩa, theo dõi biến, combo điểm và trận Boss cuối mỗi chặng.',
    tag: 'MINI-GAME',
    level: 'intermediate',
    duration: '~40 giờ',
    lessons: lessonCount('python_advanced', 40),
    rating: 4.8,
    image: '/static/images/python.webp',
    color: '#E5334B',
    accent: '#FB7185',
    icon: 'game',
    lessonUrl: '/lesson/python_advanced',
  },
  {
    id: 'db_design',
    label: 'Thiết kế CSDL',
    title: 'Thiết kế CSDL: Từ ý tưởng đến hệ dữ liệu hoàn chỉnh',
    subtitle: 'Phần 1 — Xây nền tảng GameHub',
    description:
      'Từ thực thể đầu tiên đến hệ CSDL hoàn chỉnh: ER Diagram, khóa chính/ngoại, chuẩn hóa 1NF→4NF và SQL ứng dụng thực tế.',
    tag: 'DATABASE & BACKEND',
    level: 'beginner',
    duration: '~6 giờ',
    lessons: 20,
    rating: 4.8,
    image: '/static/images/db_design.webp',
    color: '#1E40AF',
    accent: '#38BDF8',
    icon: 'db',
    lessonUrl: '/lesson/db_design',
  },
  {
    id: 'db_design_tc',
    label: 'SQL nâng cao',
    title: 'SQL nâng cao, Dữ liệu lớn & Hiệu năng',
    subtitle: 'GameHub Community — mạng xã hội của gamers',
    description:
      'Advanced SQL (Trigger, Procedure, Recursive CTE), Big Data & Analytics, Storage & Indexing — '
      + 'xây mạng cộng đồng gamers của GameHub.',
    tag: 'DATABASE & BACKEND',
    level: 'intermediate',
    duration: '~7 giờ',
    lessons: 21,
    rating: 4.8,
    image: '/static/images/db_design_tc.webp',
    color: '#2563EB',
    accent: '#E5334B',
    icon: 'table',
    lessonUrl: '/lesson/db_design_tc',
  },
  {
    id: 'db_design_nc',
    label: 'Database Engine',
    title: 'Bên trong Database Engine: Tối ưu, Giao dịch & Phục hồi',
    subtitle: 'GameHub Marketplace — sàn giao dịch vật phẩm',
    description:
      'Query Processing & Optimization, Concurrency Control, Crash Recovery — vận hành chợ giao dịch triệu người dùng của GameHub.',
    tag: 'DATABASE & BACKEND',
    level: 'advanced',
    duration: '~9 giờ',
    lessons: 25,
    rating: 4.8,
    image: '/static/images/db_design_nc.webp',
    color: '#BE123C',
    accent: '#F87171',
    icon: 'engine',
    lessonUrl: '/lesson/db_design_nc',
  },
];

export function findCourse(id: string): CatalogCourse | undefined {
  return COURSES.find((c) => c.id === id);
}
