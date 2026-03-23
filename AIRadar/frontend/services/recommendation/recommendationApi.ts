import { api } from '../common/api';

export interface RecommendationItem {
  articleId: string;
  title: string;
  source: string;
  region: 'DOMESTIC' | 'GLOBAL';
  category: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  keywords: string[];
  publishedAt: string;
  reason: 'ALS' | 'KEYWORD_MATCH' | 'COLD_START';
  url?: string;
}

export const recommendationApi = {
  // 개인화 피드 조회
  getPersonalizedFeed: (size = 20): Promise<RecommendationItem[]> =>
    api.get(`/recommendations/news?size=${size}`),

  // 트렌딩 키워드 조회
  getTrendingKeywords: (limit = 20): Promise<string[]> =>
    api.get(`/recommendations/trending?limit=${limit}`),

  // 시간대별 트렌딩 키워드 조회
  getHourlyTrendingKeywords: (limit = 10): Promise<string[]> =>
    api.get(`/recommendations/trending/hourly?limit=${limit}`),
};
