import SurveyResponseContent from "./SurveyResponseContent";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function SurveyResponsePage({ params }: PageProps) {
  const { code } = await params;
  return <SurveyResponseContent code={code} />;
}
