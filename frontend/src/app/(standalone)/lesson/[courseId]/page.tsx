'use client';

// Route động /lesson/[courseId] — port logic _LESSON_TEMPLATES/_LESSON_URLS
// của main.py lesson_view():
//   db_design | db_design_tc | db_design_nc → lesson_db_design.html (LessonDbDesign)
//   cpp                                     → redirect /interface
//   khác                                    → redirect /courses/<id>
// (python/java/htmlcss có route TĨNH riêng — Next ưu tiên static trước dynamic.)
import { use, useEffect } from 'react';

import LessonDbDesign from '@/components/LessonDbDesign';
import PageStyles from '@/components/PageStyles';

const DB_COURSES = ['db_design', 'db_design_tc', 'db_design_nc'];
const LESSON_URLS: Record<string, string> = { cpp: '/interface' };

export default function LessonDispatchPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const isDb = DB_COURSES.includes(courseId);

  useEffect(() => {
    if (!isDb) {
      window.location.replace(LESSON_URLS[courseId] || `/courses/${courseId}`);
    }
  }, [courseId, isDb]);

  if (!isDb) return null;
  return (
    <>
      <PageStyles hrefs={['/static/css/lesson_db_design.css', '/static/css/edu-theme.css', '/static/css/edu-db.css']} />
      <LessonDbDesign courseId={courseId} />
    </>
  );
}
