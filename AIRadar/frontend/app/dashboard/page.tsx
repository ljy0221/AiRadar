'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { MetricCard, KeywordTrendList, KeywordBarChart, KeywordRadarChart, KeywordDictionary, GithubTrendingCard, ModelComparison, WordCloudChart, KeywordInsightPanel, GithubTabContents } from '@/components/features/dashboard';
import { TrendingUp, TrendingDown, Activity, ListOrdered, Loader2 } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/queries/useDashboardData';
import Loading from '@/app/loading';

type DashboardTab = 'overview' | 'dictionary' | 'github';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { data, isLoading, isError } = useDashboardSummary();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mouseNearTop, setMouseNearTop] = useState(false);
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up');
  const [isAtTop, setIsAtTop] = useState(true);
  const { scrollY } = useScroll();

  // URL 쿼리 파라미터에서 탭 상태를 읽어와 초기화 및 동기화
  useEffect(() => {
    const tabParam = searchParams.get('tab') as DashboardTab;
    if (tabParam && ['overview', 'dictionary', 'github'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // 탭 변경 시 상태 업데이트 및 URL 쿼리 파라미터 반영
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
              { id: 'overview', label: '주요 키워드' },
              { id: 'dictionary', label: 'AI 백과' },
              { id: 'github', label: 'GitHub' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as DashboardTab)}
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
      <div className={`flex-1 w-full mx-auto pb-2 ${activeTab === 'overview' ? 'max-w-none pt-0' : 'max-w-7xl px-4 md:px-8 pt-6'}`}>
        <div className="flex flex-col gap-0 h-full">

          {/* Tab Content: 주요 키워드 (Overview) - 워드클라우드 단독 강조 레이아웃 */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-0 w-full animate-in fade-in duration-700 h-full">
              <div className="w-full h-[calc(100vh-140px)] flex">
                <WordCloudChart isFullPage={true} />
              </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
