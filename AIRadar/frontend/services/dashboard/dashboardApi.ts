import { api } from '../common/api';

export interface MetricData {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
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
  description: string;
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
  change: number | 'new';
  score?: number;
}

export interface DashboardResponse {
  keywordDictionary: KeywordDefinition[];
  metrics: MetricData[]; // 아직 일부 레거시 호환을 위해 남겨둘 수 있으나, 빈 배열로 처리
}

export interface SimilarKeyword {
  keyword: string;
  similarity: number;
}

export interface WordCloudData {
  text: string;
  value: number;
  similarKeywords?: SimilarKeyword[];
}

import { mockKeywordDictionary } from './KeywordDict';

export const fetchDashboardData = async (_token?: string | null): Promise<DashboardResponse> => {
  return {
    keywordDictionary: mockKeywordDictionary,
    metrics: []
  };
};

export const fetchWordCloudData = async (source: 'NEWS' | 'PAPER' | 'GITHUB', limit: number = 50): Promise<WordCloudData[]> => {
  try {
    const response: any = await api.get('/dashboard/wordcloud', { params: { source, limit } });
    const rawData = Array.isArray(response) ? response : response?.data;

    if (rawData && rawData.length > 0) {
      return rawData.map((item: any) => ({
        text: item.keyword,
        value: item.count,
        similarKeywords: item.similarKeywords
      }));
    }
    return [];
  } catch (error) {
    console.error("WordCloud API Error:", error);
    return [];
  }
};