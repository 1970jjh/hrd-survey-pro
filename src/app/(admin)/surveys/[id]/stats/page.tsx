"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import SurveyStatsContent from "./SurveyStatsContent";

export default function SurveyStatsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const surveyId = params.id as string;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <SurveyStatsContent surveyId={surveyId} />;
}
