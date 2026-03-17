import { MetricData, KeywordTrend, ChartData, DashboardResponse } from '@/services/dashboardApi';
import { MOCK_DAILY_DATA, TechLifecycleDto } from '@/services/raw/techKeywordRaw';

// --- 자체 데이터 분석기 로직 (Client-side Aggregation) ---
const calculateAnalyzedKeywords = (): TechLifecycleDto[] => {
  // 1. 최대값 탐색 (정규화용, 편의상 오늘 데이터 기준)
  let maxPaper = 1;
  let maxGithub = 1;
  let maxNews = 1;

  const entries = Object.entries(MOCK_DAILY_DATA);
  
  entries.forEach(([_, dailyArr]) => {
    const today = dailyArr[dailyArr.length - 1];
    if (today.paperMentions > maxPaper) maxPaper = today.paperMentions;
    if (today.githubActivity > maxGithub) maxGithub = today.githubActivity;
    if (today.newsMentions > maxNews) maxNews = today.newsMentions;
  });

  const getScore = (paper: number, github: number, news: number, sentiment: number) => {
    const pScore = (paper / maxPaper) * 100 * 0.35;
    const gScore = (github / maxGithub) * 100 * 0.35;
    const nScore = (news / maxNews) * 100 * 0.20;
    const sScore = sentiment * 0.10;
    return Math.min(100, Math.max(0, pScore + gScore + nScore + sScore));
  };

  return entries.map(([keyword, dailyArr]) => {
    // 14일치 데이터 기준으로 주간 계산
    const lastWeek = dailyArr.slice(0, 7);
    const thisWeek = dailyArr.slice(7, 14);

    const sumVolume = (arr: typeof dailyArr) => 
      arr.reduce((acc, d) => acc + d.paperMentions + d.githubActivity + d.newsMentions, 0);

    const lastWeekTotal = sumVolume(lastWeek);
    const thisWeekTotal = sumVolume(thisWeek);

    let weekOverWeek = 0;
    if (lastWeekTotal > 0) {
      weekOverWeek = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
    }

    const today = thisWeek[6];
    const yesterday = thisWeek[5];

    const todayScore = getScore(today.paperMentions, today.githubActivity, today.newsMentions, today.avgSentiment);
    const yesterdayScore = getScore(yesterday.paperMentions, yesterday.githubActivity, yesterday.newsMentions, yesterday.avgSentiment);

    const velocity = todayScore - yesterdayScore;

    let status: 'PEAK' | 'RISING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (todayScore >= 85) {
      status = 'PEAK';
    } else if (weekOverWeek >= 20 && velocity > 0) {
      status = 'RISING';
    } else if (weekOverWeek <= -15) {
      status = 'DECLINING';
    }

    return {
      keyword,
      status,
      peakDate: null,
      firstSeenDate: '',
      trendScore: Number(todayScore.toFixed(1)),
      velocity: Number(velocity.toFixed(2)),
      weekOverWeek: Number(weekOverWeek.toFixed(2)),
      relatedKeywords: []
    } as TechLifecycleDto;
  });
};

export const analyzeDashboardData = (originalDictionary: any[]): DashboardResponse => {
  const analyzedData = calculateAnalyzedKeywords();

  // 1. Metrics 계산
  const risingCount = analyzedData.filter(k => k.status === 'RISING').length;
  const decliningCount = analyzedData.filter(k => k.status === 'DECLINING').length;
  
  const peakKeywords = analyzedData.filter(k => k.status === 'PEAK');
  const peakAvgScore = peakKeywords.length > 0 
    ? peakKeywords.reduce((acc, k) => acc + k.trendScore, 0) / peakKeywords.length 
    : 0;

  const topRising = analyzedData.filter(k => k.status === 'RISING').sort((a, b) => b.trendScore - a.trendScore)[0]?.keyword || "없음";
  const worstDeclining = analyzedData.filter(k => k.status === 'DECLINING').sort((a, b) => a.weekOverWeek - b.weekOverWeek)[0]?.keyword || "없음";
    
  const metrics: MetricData[] = [
    { 
      title: topRising, 
      value: risingCount.toString(), 
      subtitle: "이번 주 떠오르는 기술", 
      trend: 'up' 
    },
    { 
      title: worstDeclining, 
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
      title: `${analyzedData.length}개 카테고리`, 
      value: analyzedData.length.toString(), 
      subtitle: "추적 중인 키워드" 
    },
  ];

  // 2. Keywords List 변환
  const keywords: KeywordTrend[] = analyzedData.map(k => ({
    name: k.keyword,
    status: mapStatusToKorean(k.status),
    trendScore: k.trendScore,
    changeRate: k.velocity, // 직접 계산된 velocity 사용
    weeklyGrowth: k.weekOverWeek
  }));

  // 3. Bar Chart Data 변환
  const barData = analyzedData.map(k => ({
    name: k.keyword,
    score: k.trendScore,
    color: getColorByStatus(k.status)
  }));

  // 4. Radar Chart Data 변환 (Trend Score 높은 3개)
  const topRadarKeywords = [...analyzedData]
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 3);
    
  const radarData = topRadarKeywords.map(k => ({
    subject: k.keyword,
    trendScore: Math.round(k.trendScore),
    growth: Math.max(0, Math.round(k.weekOverWeek)), 
    fullMark: 100
  }));

  // 5. 시계열(Interest) Chart Data 변환 (UI 호환을 위해 값 매핑)
  const interestData: Record<string, ChartData[]> = {};
  for (const [keyword, dailyArr] of Object.entries(MOCK_DAILY_DATA)) {
    // 7일치만 그리기 위해 자름 (UI 곡선용 데이터)
    const recent7Days = dailyArr.slice(7, 14);
    interestData[keyword] = recent7Days.map(d => ({
      date: formatDateString(d.date),
      mentionCount: d.paperMentions + d.newsMentions, // 논문+뉴스 합산
      searchVol: d.githubActivity, // Github 활성도 추이
      sentimentScore: d.avgSentiment
    }));
  }

  return {
    metrics,
    keywords,
    barData,
    radarData,
    keywordDictionary: originalDictionary 
  };
};

// --- Helper Functions ---

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
