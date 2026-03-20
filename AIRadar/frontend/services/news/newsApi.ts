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
  const response = await api.get<DailyNewsGroup[]>('/news', {
    params, // { region, category, date } 파라미터 전달
  });

  // api 인터셉터가 response.data를 알아서 반환하도록 설정되어 있습니다.
  return response as unknown as DailyNewsGroup[];
};


