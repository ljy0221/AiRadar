// services/newsApi.ts
// 뉴스 데이터 API 서비스
// 실제 API 엔드포인트 연동: GET /api/v1/news

import { api } from '../common/api';
import type { NewsListParams, DailyNewsGroup } from '@/types/news';

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// GET /api/v1/news
export const fetchNewsList = async (params?: NewsListParams): Promise<DailyNewsGroup[]> => {
  return api.get('/news', { params });
};

// GET /api/v1/news/{articleId}
export const fetchNewsDetail = async (articleId: string): Promise<any> => {
  return api.get(`/news/${articleId}`);
};


