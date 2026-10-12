// Trang chủ: lưới biểu tượng của mọi khóa học, bấm vào để mở trang chi tiết.
// Dữ liệu từ danh mục tĩnh (src/lib/catalog.ts) — không gọi API vì mọi route
// /api/courses* đều đòi đăng nhập mà frontend không còn trang đăng nhập.
import type { Metadata } from 'next';

import CourseGlyph from '@/components/CourseGlyph';
import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES } from '@/lib/catalog';

import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Programming EDU — Khóa học',
};

export default function HomePage() {
  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      {/* .page cao tối thiểu bằng khung nhìn: style.css (đặt min-height cho body)
          không nạp ở trang này, body co theo nội dung thì nền gradient bị đứt
          một đường ngang ở đáy khối nội dung. */}
      <div className={styles.page}>
        <SiteHeader />
        <main className={styles.main}>
          <h1 className={styles.title}>Khóa học</h1>
          <p className={styles.sub}>Chọn một khóa để xem giáo trình chi tiết.</p>
  
          <ul className={styles.grid}>
            {COURSES.map((course) => (
              <li key={course.id} className={styles.cell}>
                {/* <a> thường (tải lại trang) thay vì next/link: trang chi tiết các
                    khóa CSDL nạp script legacy tự gắn sự kiện một lần lúc nạp, đi
                    client-side thì chúng không chạy lại (bẫy đã gặp ở ô chấm sao
                    — xem comment trong courses/[courseId]/page.tsx). */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a className={styles.tile} href={`/courses/${course.id}`}>
                  <span className={styles.icon}>
                    <CourseGlyph color={course.color} accent={course.accent} mark={course.mark} />
                  </span>
                  <span className={styles.label}>{course.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </>
  );
}
