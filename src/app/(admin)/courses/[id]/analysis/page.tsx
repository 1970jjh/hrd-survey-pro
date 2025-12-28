import CourseAnalysisContent from "./CourseAnalysisContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseAnalysisPage({ params }: PageProps) {
  const { id } = await params;
  return <CourseAnalysisContent courseId={id} />;
}
