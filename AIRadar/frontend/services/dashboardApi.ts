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

export interface DashboardResponse {
  metrics: MetricData[];
  keywords: KeywordTrend[];
  barData: { name: string; score: number; color: string }[];
  radarData: { subject: string; trendScore: number; growth: number; fullMark: number }[];
  interestData: Record<string, ChartData[]>;
}

// --- Mock Data ---
const generateInterestData = (baseVol: number, baseMentions: number, baseSentiment: number) => {
  return Array.from({ length: 7 }).map((_, i) => ({
    date: `03. 0${i + 1}.`,
    mentionCount: baseMentions + Math.floor(Math.random() * 20),
    searchVol: baseVol + Math.floor(Math.random() * 10),
    sentimentScore: baseSentiment + Math.floor(Math.random() * 10) - 5,
  }));
};

const mockDashboardData: DashboardResponse = {
  metrics: [
    { title: "Agentic Workflow", value: "2", subtitle: "이번 주 떠오르는 기술", trend: 'up' },
    { title: "Prompt Engineering", value: "1", subtitle: "이번 주 사라지는 기술", trend: 'down' },
    { title: "평균 90.2점", value: "2", subtitle: "피크 상태 기술" },
    { title: "6개 카테고리", value: "6", subtitle: "추적 중인 키워드" },
  ],
  keywords: [
    { name: 'Agentic Workflow', status: '떠오르는 중', trendScore: 78.5, changeRate: 15.2, weeklyGrowth: 42.5 },
    { name: 'RAG', status: '최고조', trendScore: 92.1, changeRate: 2.4, weeklyGrowth: 5.1 },
    { name: 'Vision Transformers', status: '최고조', trendScore: 88.3, changeRate: 3.8, weeklyGrowth: 12.3 },
    { name: 'Mixture of Experts', status: '떠오르는 중', trendScore: 71.2, changeRate: 18.5, weeklyGrowth: 55.2 },
    { name: 'Fine-tuning', status: '안정기', trendScore: 65.5, changeRate: 5.1, weeklyGrowth: -8.4 },
    { name: 'Prompt Engineering', status: '하락세', trendScore: 52.3, changeRate: 12.3, weeklyGrowth: -18.7 },
  ],
  barData: [
    { name: 'Agentic Workflow', score: 78.5, color: '#10b981' },
    { name: 'RAG', score: 92.1, color: '#ef4444' },
    { name: 'Vision Transformers', score: 88.3, color: '#ef4444' },
    { name: 'Mixture of Experts', score: 71.2, color: '#10b981' },
    { name: 'Fine-tuning', score: 65.5, color: '#6b7280' },
    { name: 'Prompt Engineering', score: 52.3, color: '#eab308' },
  ],
  radarData: [
    { subject: 'Agentic Workflow', trendScore: 78, growth: 42, fullMark: 100 },
    { subject: 'RAG', trendScore: 92, growth: 5, fullMark: 100 },
    { subject: 'Vision Transformers', trendScore: 88, growth: 12, fullMark: 100 },
  ],
  interestData: {
    'Agentic Workflow': generateInterestData(20, 40, 75),
    'RAG': generateInterestData(50, 80, 85),
    'Vision Transformers': generateInterestData(45, 60, 80),
    'Mixture of Experts': generateInterestData(15, 30, 65),
  }
};

// --- Mock API Fetcher ---
// 실제 백엔드 연동 전까지 네트워크 딜레이를 흉내내는 Mock API입니다.
// 나중에는 return api.get('/dashboard') 형식으로 교체합니다.
export const fetchDashboardData = async (): Promise<DashboardResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDashboardData);
    }, 800); // 0.8초 딜레이
  });
};
