'use client';

import { MetricCard, KeywordTrendList, KeywordBarChart, KeywordRadarChart, InterestAnalysisChart } from '@/components/features/dashboard';
import { TrendingUp, TrendingDown, Activity, ListOrdered, Loader2 } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/queries/useDashboardData';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

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
    <div className="w-full max-w-7xl px-4 md:px-8 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-gray-500 dark:text-gray-400">실시간 AI 기술 동향 및 키워드 분석</p>
      </div>

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

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KeywordBarChart data={data.barData} />
        <KeywordRadarChart data={data.radarData} />
      </div>

      {/* Interest Analysis (Bottom Full Width) */}
      <div className="w-full">
        <InterestAnalysisChart data={data.interestData} />
      </div>

    </div>
  );
}
