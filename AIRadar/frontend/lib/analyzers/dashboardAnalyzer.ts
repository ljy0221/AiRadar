import { MetricData, KeywordTrend, ChartData, DashboardResponse } from '@/services/dashboardApi';
import { MOCK_LIFECYCLE, MOCK_DAILY_DATA, TechLifecycleDto, TechKeywordDailyDto } from '@/services/raw/techKeywordRaw';

export const analyzeDashboardData = (): DashboardResponse => {
  // 1. Metrics 계산
  const risingCount = MOCK_LIFECYCLE.filter(k => k.status === 'RISING').length;
  const decliningCount = MOCK_LIFECYCLE.filter(k => k.status === 'DECLINING').length;
  
  const peakKeywords = MOCK_LIFECYCLE.filter(k => k.status === 'PEAK');
  const peakAvgScore = peakKeywords.length > 0 
    ? peakKeywords.reduce((acc, k) => acc + k.trendScore, 0) / peakKeywords.length 
    : 0;
    
  const metrics: MetricData[] = [
    { 
      title: getTopKeywordByStatus('RISING') || "없음", 
      value: risingCount.toString(), 
      subtitle: "이번 주 떠오르는 기술", 
      trend: 'up' 
    },
    { 
      title: getLowestKeywordByStatus('DECLINING') || "없음", 
      value: decliningCount.toString(), 
      subtitle: "이번 주 사라지는 기술", 
      trend: 'down' 
    },
    { 
      title: `평균 ${peakAvgScore.toFixed(1)}점`, 
      value: peakKeywords.length.toString(), 
      subtitle: "피크 상태 기술" 
    },
    { 
      title: `${MOCK_LIFECYCLE.length}개 카테고리`, 
      value: MOCK_LIFECYCLE.length.toString(), 
      subtitle: "추적 중인 키워드" 
    },
  ];

  // 2. Keywords List 변환
  const keywords: KeywordTrend[] = MOCK_LIFECYCLE.map(k => ({
    name: k.keyword,
    status: mapStatusToKorean(k.status),
    trendScore: k.trendScore,
    changeRate: k.velocity, // 임시로 velocity를 변동률로 사용
    weeklyGrowth: k.weekOverWeek
  }));

  // 3. Bar Chart Data 변환
  const barData = MOCK_LIFECYCLE.map(k => ({
    name: k.keyword,
    score: k.trendScore,
    color: getColorByStatus(k.status)
  }));

  // 4. Radar Chart Data 변환 (Trend Score 높은 3개)
  const topRadarKeywords = [...MOCK_LIFECYCLE]
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 3);
    
  const radarData = topRadarKeywords.map(k => ({
    subject: k.keyword,
    trendScore: Math.round(k.trendScore),
    growth: Math.max(0, Math.round(k.weekOverWeek)), // 음수 방지
    fullMark: 100
  }));

  // 5. 시계열(Interest) Chart Data 변환
  const interestData: Record<string, ChartData[]> = {};
  for (const [keyword, dailyArr] of Object.entries(MOCK_DAILY_DATA)) {
    interestData[keyword] = dailyArr.map(d => ({
      date: formatDateString(d.statDate),
      mentionCount: d.mentionCount,
      searchVol: d.searchCount, 
      sentimentScore: d.avgSentiment
    }));
  }

  return {
    metrics,
    keywords,
    barData,
    radarData,
    interestData
  };
};

// --- Helper Functions ---

const getTopKeywordByStatus = (status: TechLifecycleDto['status']): string | null => {
  const filtered = MOCK_LIFECYCLE.filter(k => k.status === status);
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => b.trendScore - a.trendScore);
  return filtered[0].keyword;
};

const getLowestKeywordByStatus = (status: TechLifecycleDto['status']): string | null => {
  const filtered = MOCK_LIFECYCLE.filter(k => k.status === status);
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => a.weekOverWeek - b.weekOverWeek); // 제일 많이 떨어진 걸 찾음
  return filtered[0].keyword;
};

const mapStatusToKorean = (status: TechLifecycleDto['status']): KeywordTrend['status'] => {
  switch (status) {
    case 'RISING': return '떠오르는 중';
    case 'PEAK': return '최고조';
    case 'STABLE': return '안정기';
    case 'DECLINING': return '하락세';
  }
};

const getColorByStatus = (status: TechLifecycleDto['status']): string => {
  switch (status) {
    case 'RISING': return '#10b981'; // green
    case 'PEAK': return '#ef4444';   // red
    case 'STABLE': return '#6b7280'; // gray
    case 'DECLINING': return '#eab308'; // yellow
  }
};

const formatDateString = (dateStr: string): string => {
  // '2026-03-10' -> '03. 10.'
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}. ${parts[2]}.`;
  }
  return dateStr;
};
