// services/newsApi.ts
// 뉴스 데이터 API 서비스
// 실제 API 엔드포인트 연동: GET /api/v1/news, /api/v1/news/paged

import { api } from '../common/api';
import type { NewsListParams, DailyNewsGroup, PagedNewsFeed } from '@/types/news';

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// GET /api/v1/news/paged
export const fetchNewsFeed = async (params?: NewsListParams): Promise<PagedNewsFeed> => {
  return api.get('/news/paged', { params });
};

// GET /api/v1/news (legacy grouped list)
export const fetchNewsList = async (params?: NewsListParams): Promise<DailyNewsGroup[]> => {
  return api.get('/news', { params });
};

// GET /api/v1/news/{articleId}
export const fetchNewsDetail = async (articleId: string): Promise<any> => {
  return api.get(`/news/${articleId}`);
};

// GET /api/v1/news/available-dates
export const fetchAvailableDates = async (params: { region?: string; category?: string } = {}): Promise<{ dates: string[]; count: number; startDate: string | null; endDate: string | null }> => {
  return api.get('/news/available-dates', { params });
};
