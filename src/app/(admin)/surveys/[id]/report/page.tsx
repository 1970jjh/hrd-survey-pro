import SurveyReportContent from "./SurveyReportContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SurveyReportPage({ params }: PageProps) {
  const { id } = await params;
  return <SurveyReportContent surveyId={id} />;
}
