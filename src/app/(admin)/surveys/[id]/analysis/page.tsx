import SurveyAnalysisContent from "./SurveyAnalysisContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SurveyAnalysisPage({ params }: PageProps) {
  const { id } = await params;
  return <SurveyAnalysisContent surveyId={id} />;
}
