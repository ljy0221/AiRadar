'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { JobHeader, CoreTaskCard, ScenarioCard, SkillPrepCard } from '@/components/features/jobs';
import { useJobForecast } from '@/hooks/queries/useJobForecast';

export default function JobDetailPage() {
  const params = useParams();
  const idStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const decodedId = idStr ? decodeURIComponent(idStr) : '';

  const { data: jobData, isLoading, isError } = useJobForecast(decodedId);

  const [activeTaskIdx, setActiveTaskIdx] = useState(0);

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (isError || !jobData) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-20 text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">해당 직업 정보를 찾을 수 없거나 데이터를 불러오지 못했습니다.</h2>
        <Link href="/jobs" className="px-6 py-2 bg-[var(--color-accent)] hover:opacity-80 transition text-white rounded-md">
          직업 검색 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  const activeTask = jobData.tasks ? jobData.tasks[activeTaskIdx] : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-screen">
      {/* 백 버튼 */}
      <div className="mb-4">
        <Link href="/jobs" className="inline-flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[var(--color-accent)] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> 직업 검색으로 돌아가기
        </Link>
      </div>

      <JobHeader
        jobTitle={jobData.jobName}
        category={`${jobData.forecastMonth ? jobData.forecastMonth + ' 기준 예측' : 'AI 예측 분석'}`}
      />

      {/* 핵심업무 탭 메뉴 */}
      {jobData.tasks && jobData.tasks.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6 mt-2">
          {jobData.tasks.map((task: any, idx: number) => (
            <button
              key={task.taskKey || idx}
              onClick={() => setActiveTaskIdx(idx)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTaskIdx === idx
                ? 'bg-[#1e293b] text-white shadow-md'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
            >
              핵심업무 {idx + 1}
            </button>
          ))}
        </div>
      )}

      {jobData.keywordInsight && (
        <div className="mb-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1c2e] p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">최근 1달 키워드 기반 공통 분석</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            {jobData.keywordInsight.summary}
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-200 mr-2">뉴스 키워드</span>
              {jobData.keywordInsight.newsKeywords?.map((keyword, idx) => (
                <span key={`${keyword}-${idx}`} className="inline-block px-2 py-1 mr-2 mb-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                  {keyword}
                </span>
              ))}
            </div>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-200 mr-2">논문 키워드</span>
              {jobData.keywordInsight.paperKeywords?.map((keyword, idx) => (
                <span key={`${keyword}-${idx}`} className="inline-block px-2 py-1 mr-2 mb-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTask && (
        <div className="lg:grid lg:grid-cols-12 gap-10 lg:items-stretch">
          {/* 왼쪽 핵심 업무 카드 영역 — 시나리오 카드가 남은 높이를 채워 오른쪽 열과 맞춤 */}
          <div className="lg:col-span-8 flex min-h-0 flex-col gap-6 lg:h-full">
            <CoreTaskCard
              title={activeTask.taskTitle}
              description={activeTask.impactSummary || activeTask.taskDescription}
              sources={[
                { type: 'paper', text: activeTask.evidence?.paper?.note || '분석 중', impact: activeTask.evidence?.paper?.level as any },
                { type: 'news', text: activeTask.evidence?.news?.note || `${activeTask.evidence?.news?.count || 0}건 기반` }
              ]}
            />
            <ScenarioCard
              taskTitle={activeTask.taskTitle}
              description={activeTask.detailedScenario?.automationEffect || ''}
              steps={activeTask.detailedScenario?.steps || []}
            />
          </div>

          {/* 오른쪽 스킬 & 대비 방안 영역 */}
          <div className="hidden min-h-0 lg:col-span-4 lg:flex lg:h-full lg:flex-col">
            <SkillPrepCard
              uniqueSkills={activeTask.humanStrengths || []}
              recommendedSkills={activeTask.recommendedSkills || []}
              tools={activeTask.promisingTools || []}
            />
          </div>

          {/* 모바일 화면용 스킬 카드 */}
          <div className="lg:hidden mt-8">
            <SkillPrepCard
              uniqueSkills={activeTask.humanStrengths || []}
              recommendedSkills={activeTask.recommendedSkills || []}
              tools={activeTask.promisingTools || []}
            />
          </div>
        </div>
      )}
    </div>
  );
}
