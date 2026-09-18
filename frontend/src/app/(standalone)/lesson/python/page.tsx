import PythonStudio from '@/components/python-studio/PythonStudio';
import StudioLesson from '@/components/python-studio/StudioLesson';
import { PYTHON_LESSON_NUMBER } from '@/lib/python-studio';

// Course links pass a zero-based lesson index; the lessons table numbers rows
// from 1 (sort_order). Lesson 11 (List & Mutability) is the hand-built studio;
// every other lesson renders from lessons.content_json, which the admin fills by
// importing a PDF or Markdown file.
export default async function LessonPythonPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const index = Number(lesson);
  const sortOrder =
    lesson === undefined || !Number.isInteger(index) || index < 0
      ? PYTHON_LESSON_NUMBER
      : index + 1;

  if (sortOrder === PYTHON_LESSON_NUMBER) return <PythonStudio />;
  return <StudioLesson courseId="python" lessonNo={sortOrder} />;
}
