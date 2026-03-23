import { api } from '../common/api';

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
  description?: string;
  details?: KeywordDefinition['details'];
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
  // 모델 상세 정보 (선택항목)
  details?: {
    developer?: string;
    launchDate?: string;
    parameters?: string;
    contextWindow?: string;
    strengths?: string[];
  };
}

export interface ModelPerformance {
  modelName: string;
  category: string;
  benchmarks: {
    name: string;
    score: number;
    fullMark: number;
  }[];
}

export interface RankingItem {
  rank: number;
  keyword: string;
  change: number | 'new'; // 순위 변동 (양수: 상승, 음수: 하락, 0: 유지, 'new': 신규 진입)
  score?: number;
}

export interface DashboardResponse {
  metrics: MetricData[];
  keywords: KeywordTrend[];
  barData: { name: string; score: number; color: string }[];
  radarData: { subject: string; trendScore: number; growth: number; fullMark: number }[];
  keywordDictionary: KeywordDefinition[];
  modelComparison: ModelPerformance[];
  interestData: Record<string, ChartData[]>;
  rankingData: RankingItem[];
  popularSearches: RankingItem[];
}

import { mockKeywordDictionary } from './KeywordDict';


import { analyzeDashboardData } from '@/lib/analyzers/dashboardAnalyzer';

// --- Mock API Fetcher ---
// 실제 백엔드 연동 전까지 네트워크 딜레이를 흉내내는 Mock API입니다.
// 나중에는 return api.get('/dashboard') 형식으로 교체합니다.
export const fetchDashboardData = async (): Promise<DashboardResponse> => {
  try {
    // 1. 진짜 백엔드 서버(172.26.5.50)에서 계산된 Lifecycle 데이터 훔쳐오기
    // 데이터 형식: [{ keyword: "RAG", status: "GROWING", trendScore: 85.2, ... }]
    const response: any = await api.get('/dashboard/lifecycle');
    const realLifecycleData = Array.isArray(response) ? response : response?.data;
    // 2. 기존 프론트엔드 анали저(Analyzer)를 그대로 실행해서 UI 뼈대와 디자인 완성본 가져오기
    const dashboardResponse = analyzeDashboardData(mockKeywordDictionary);
    // 3. 뼈대만 있는 dashboardResponse에 진짜 '점수'와 '상태' 덮어씌우기 
    if (realLifecycleData && realLifecycleData.length > 0) {

      // (A) 대시보드 메인 표(Table) 데이터 덮어씌우기
      dashboardResponse.keywords = realLifecycleData.map((realData: any) => ({
        name: realData.keyword,
        status:
          realData.status === 'GROWING' || realData.status === 'RISING' ? '떠오르는 중' :
            realData.status === 'PEAK' ? '최고조' :
              realData.status === 'DECLINING' ? '하락세' : '안정기',
        trendScore: Number(realData.trendScore),
        changeRate: Number(realData.velocity),
        weeklyGrowth: Number(realData.weekOverWeek)
      }));
      // (B) 실시간 기술 랭킹 (Top 5) 데이터 덮어씌우기 (스크린샷 부분)
      dashboardResponse.rankingData = realLifecycleData
        .sort((a: any, b: any) => b.trendScore - a.trendScore)
        .slice(0, 5)
        .map((realData: any, i: number) => ({
          rank: i + 1,
          keyword: realData.keyword,
          // 랭킹 등락 기호는 백엔드에 아직 없으므로 당분간 가상 유지 (디자인 안 깨짐)
          change: i === 0 ? 'new' : Math.floor(Math.random() * 5) - 2,
          score: Number(realData.trendScore)
        }));
    }
    return dashboardResponse;
  } catch (error) {
    console.error("Dashboard API Error:", error);
    // 만약 백엔드 서버가 아직 재배포가 안 돼서 404가 뜨면?
    // 무식하게 뻗지 말고 조용히 기존 가짜 데이터를 띄워줍니다 (안전 장치)
    return analyzeDashboardData(mockKeywordDictionary);
  }
};