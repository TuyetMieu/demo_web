import PageStyles from '@/components/PageStyles';
import PythonStudio from '@/components/python-studio/PythonStudio';
import StudioLesson from '@/components/python-studio/StudioLesson';
import { PYTHON_LESSON_NUMBER } from '@/lib/python-studio';

const STUDIO_CSS = [
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

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

  if (sortOrder === PYTHON_LESSON_NUMBER)
    return (
      <>
        <PageStyles hrefs={STUDIO_CSS} />
        <PythonStudio />
      </>
    );
  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <StudioLesson courseId="python" lessonNo={sortOrder} />
    </>
  );
}
