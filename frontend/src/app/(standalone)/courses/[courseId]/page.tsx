// Trang chi tiết khóa học (python, python_advanced, cpp, java, htmlcss).
// Ba khóa db_design* có route tĩnh riêng (courses/db_design*/page.tsx) và được
// Next ưu tiên trước route động này.
//
// Server component: chỉ tra danh mục tĩnh để dựng <title>/description và trả 404
// cho mã khóa lạ. Phần tương tác (accordion giáo trình, chấm sao) ở CourseDetail.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { COURSES, findCourse } from '@/lib/catalog';

import CourseDetail from './CourseDetail';

// Mã khóa ngoài danh mục là 404 ngay, không chạy tới client rồi tự chuyển hướng.
export const dynamicParams = false;

export function generateStaticParams() {
  return COURSES.filter((c) => !c.id.startsWith('db_design')).map((c) => ({ courseId: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const course = findCourse((await params).courseId);
  if (!course) return {};
  return {
    title: `${course.title} – Programming EDU`,
    description: course.description,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!findCourse(courseId)) notFound();
  return <CourseDetail courseId={courseId} />;
}
