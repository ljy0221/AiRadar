'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { MetricCard, KeywordTrendList, KeywordBarChart, KeywordRadarChart, KeywordDictionary, GithubTrendingCard, ModelComparison, RankingList, KeywordInsightPanel, GithubTabContents } from '@/components/features/dashboard';
import { TrendingUp, TrendingDown, Activity, ListOrdered, Loader2 } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/queries/useDashboardData';
import Loading from '@/app/loading';

type DashboardTab = 'overview' | 'analytics' | 'dictionary' | 'github';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mouseNearTop, setMouseNearTop] = useState(false);
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up');
  const [isAtTop, setIsAtTop] = useState(true);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;

    // 스크롤 방향 감지 (20px 이상 움직임 감지 시)
    if (latest > previous && latest > 20) setScrollDir('down');
    else setScrollDir('up');

    // 최상단 여부 (20px 이내)
    if (latest < 20) setIsAtTop(true);
    else setIsAtTop(false);
  });

  if (isLoading) {
    return <Loading />;
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

  // 조건: 최상단에 있거나, 위로 스크롤 중이거나, 마우스가 위쪽에 있을 때 표시
  const isVisible = isAtTop || scrollDir === 'up' || mouseNearTop;

  return (
    <div
      className="w-full flex flex-col min-h-screen relative"
      onMouseMove={(e) => {
        // 뷰포트 기준 상단 140px 이내에 마우스가 있으면 강제 표시
        if (e.clientY < 140) setMouseNearTop(true);
        else setMouseNearTop(false);
      }}
      onMouseLeave={() => setMouseNearTop(false)}
    >
      {/* Tab Navigation (Sub-header) with Smart Hide/Show Effect */}
      <motion.div
        initial={false}
        animate={{
          y: isVisible ? 0 : -48,
          opacity: isVisible ? 1 : 0
        }}
        transition={{ duration: 0.15, ease: isVisible ? 'easeOut' : 'easeIn' }}
        className="sticky top-[56px] z-40 w-full bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex h-10 items-center space-x-8">
            {[
              { id: 'overview', label: '트렌드 요약' },
              { id: 'analytics', label: '심층 분석' },
              { id: 'dictionary', label: 'AI 백과' },
              { id: 'github', label: 'GitHub' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`relative h-full px-1 text-[14px] font-bold transition-all duration-200 ${activeTab === tab.id
                  ? 'text-[var(--color-accent)]'
                  : 'text-gray-500 hover:text-[var(--color-accent)]'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-2">
        <div className="flex flex-col gap-0">

          {/* Tab Content: 트렌드 요약 (Overview) */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricsData.map((m, i) => (
                  <MetricCard key={i} title={m.title} value={m.value} subtitle={m.subtitle} icon={m.icon} trend={m.trend} />
                ))}
              </div>

              {/* Rankings Row: 실시간 기술 랭킹 (Header Inside Reverted) */}
              <div className="grid grid-cols-1 gap-6">
                <RankingList
                  title="실시간 기술 랭킹"
                  subtitle="최근 검색 및 인용 빈도가 급격하게 상승 중인 핵심 AI 기술"
                  data={data.rankingData}
                />
              </div>

              {/* Technical Analysis: Restore KeywordInsightPanel */}
              <div className="grid grid-cols-1 gap-6">
                <KeywordInsightPanel
                  title="기술 분석"
                  subtitle="각 AI 키워드의 라이프사이클 현황 및 트렌드 점수"
                  data={data.keywords}
                />
              </div>
            </div>
          )}

          {/* Tab Content: 심층 분석 (Analytics) */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <KeywordBarChart data={data.barData} />
                <KeywordRadarChart data={data.radarData} />
              </div>

              {/* 모델 성능 비교 차트 추가 */}
              <ModelComparison data={data.modelComparison} />
            </div>
          )}

          {/* Tab Content: AI 백과 (Dictionary) */}
          {activeTab === 'dictionary' && (
            <div className="w-full">
              <KeywordDictionary data={data.keywordDictionary} />
            </div>
          )}

          {/* Tab Content: GitHub 인사이트 (Github) */}
          {activeTab === 'github' && (
            <div className="w-full">
              <GithubTabContents />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
