// import { api } from './api';

// --- Type Definitions ---
export interface MetricData {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
  // icon 필드는 컴포넌트 레벨에서 매핑하는 것이 좋습니다 (DTO 역할)
}

export interface KeywordTrend {
  name: string;
  status: '떠오르는 중' | '최고조' | '안정기' | '하락세';
  trendScore: number;
  changeRate: number;
  weeklyGrowth: number;
}

export interface ChartData {
  date: string;
  mentionCount: number;
  searchVol: number;
  sentimentScore: number;
}

export interface KeywordDefinition {
  id: string;
  term: string;
  englishTerm: string;
  category: '개념/이론' | '모델/아키텍처' | '학습/기법' | '기타';
  summary: string;
  description: string;
}

export interface DashboardResponse {
  metrics: MetricData[];
  keywords: KeywordTrend[];
  barData: { name: string; score: number; color: string }[];
  radarData: { subject: string; trendScore: number; growth: number; fullMark: number }[];
  keywordDictionary: KeywordDefinition[];
}

import { analyzeDashboardData } from '@/lib/analyzers/dashboardAnalyzer';

// ... (하단 Mock API Fetcher 부근) ...

// --- Mock API Fetcher ---
// 실제 백엔드 연동 전까지 네트워크 딜레이를 흉내내는 Mock API입니다.
// 나중에는 return api.get('/dashboard') 형식으로 교체합니다.
export const fetchDashboardData = async (): Promise<DashboardResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(analyzeDashboardData());
    }, 800); // 0.8초 딜레이
  });
};
