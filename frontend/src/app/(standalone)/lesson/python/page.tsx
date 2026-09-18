import PythonStudio from '@/components/python-studio/PythonStudio';

// Every Python lesson link opens the studio now; the old CODEGEN Z mission page
// (LegacyPythonLesson) was removed, so the `lesson` query param no longer picks
// a different screen.
export default function LessonPythonPage() {
  return <PythonStudio />;
}
