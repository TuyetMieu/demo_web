'use client';

// /courses/db_design — course_db_design.html với data-course="db_design".
// CSS đúng tổ hợp gốc (khác course_detail.css — 63 class trùng tên, không load chung).
import CourseDbDesign from '@/components/CourseDbDesign';
import PageStyles from '@/components/PageStyles';

const CSS = [
  '/static/css/style.css',
  '/static/css/dashboard.css',
  '/static/css/pages.css',
  '/static/css/dark-mode.css',
  '/static/css/chatbot.css',
  '/static/css/course_db_design.css',
  '/static/css/edu-theme.css',
  '/static/css/edu-dashboard.css',
  // bố cục 2 cột + hero dạng thẻ, dùng chung với /courses/[courseId]
  '/static/css/edu-course-detail.css',
  '/static/css/edu-db.css',
];

export default function Page() {
  return (
    <>
      <PageStyles hrefs={CSS} />
      <CourseDbDesign courseId="db_design" />
    </>
  );
}
