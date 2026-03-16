'use client';

import { useState } from 'react';
import { MetricCard, KeywordTrendList, KeywordBarChart, KeywordRadarChart, KeywordDictionary, GithubTrendingCard, PaperListCard } from '@/components/features/dashboard';
import { TrendingUp, TrendingDown, Activity, ListOrdered, Loader2 } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/queries/useDashboardData';

type DashboardTab = 'overview' | 'analytics' | 'dictionary';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
        <p>실시간 AI 트렌드 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="text-red-500 font-medium">데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  // API 응답 데이터 매핑 로직 (아이콘 등 UI 전용 데이터 추가)
  const metricsData = data.metrics.map((m, i) => {
    let icon;
    if (i === 0) icon = <TrendingUp className="w-6 h-6" />;
    else if (i === 1) icon = <TrendingDown className="w-6 h-6 text-yellow-500" />;
    else if (i === 2) icon = <Activity className="w-6 h-6 text-red-500" />;
    else icon = <ListOrdered className="w-6 h-6 text-gray-500 dark:text-gray-400" />;

    return { ...m, icon };
  });

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Tab Navigation (Sub-header) */}
      <div className="sticky top-[64px] z-40 w-full bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '트렌드 요약' },
              { id: 'analytics', label: '심층 분석' },
              { id: 'dictionary', label: 'AI 백과' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`relative py-4 text-sm font-bold transition-all duration-200 ${activeTab === tab.id
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-accent)] rounded-full shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col gap-8">

          {/* Tab Content: 트렌드 요약 (Overview) */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8">
              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricsData.map((m, i) => (
                  <MetricCard key={i} title={m.title} value={m.value} subtitle={m.subtitle} icon={m.icon} trend={m.trend} />
                ))}
              </div>

              {/* Technical Analysis List */}
              <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">기술 분석</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 -mt-4">각 AI 키워드의 라이프사이클 현황 및 트렌드 점수</p>
                <KeywordTrendList data={data.keywords} />
              </div>

              {/* GitHub Trending + Latest Papers Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GithubTrendingCard />
                <PaperListCard />
              </div>
            </div>
          )}

          {/* Tab Content: 심층 분석 (Analytics) */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <KeywordBarChart data={data.barData} />
              <KeywordRadarChart data={data.radarData} />
            </div>
          )}

          {/* Tab Content: AI 백과 (Dictionary) */}
          {activeTab === 'dictionary' && (
            <div className="w-full">
              <KeywordDictionary data={data.keywordDictionary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
