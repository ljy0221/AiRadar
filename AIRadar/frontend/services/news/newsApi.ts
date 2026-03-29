// services/newsApi.ts
// 뉴스 데이터 API 서비스
// 실제 API 엔드포인트 연동: GET /api/v1/news

import { api } from '../common/api';
import type { NewsListParams, DailyNewsGroup, PagedNewsFeed } from '@/types/news';

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// GET /api/v1/news (paged response)
export const fetchNewsFeed = async (params?: NewsListParams): Promise<PagedNewsFeed> => {
  return api.get('/news', { params });
};

// Legacy helper: groups only
export const fetchNewsList = async (params?: NewsListParams): Promise<DailyNewsGroup[]> => {
  const feed = await fetchNewsFeed(params);
  return feed.groups || [];
};

// GET /api/v1/news/{articleId}
export const fetchNewsDetail = async (articleId: string): Promise<any> => {
  return api.get(`/news/${articleId}`);
};

// GET /api/v1/news/available-dates
export const fetchAvailableDates = async (params: { region?: string; category?: string } = {}): Promise<{ dates: string[]; count: number; startDate: string | null; endDate: string | null }> => {
  return api.get('/news/available-dates', { params });
};

