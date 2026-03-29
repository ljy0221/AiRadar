// services/paper/paperApi.ts
import { api } from '../common/api';
import { PaperListItem, DailyPaperGroup, PaperListParams, PagedPaperFeed } from '@/types/paper';

export const paperApi = {
  // 일별 그룹화된 논문 목록 조회 (실서버 연동)
  // GET /api/v1/papers
  getPaperFeed: async (params?: PaperListParams): Promise<PagedPaperFeed> => {
    const response = await api.get<PagedPaperFeed>('/papers', {
      params,
    });
    return response as unknown as PagedPaperFeed;
  },

  getPapers: async (params?: PaperListParams): Promise<DailyPaperGroup[]> => {
    const feed = await paperApi.getPaperFeed(params);
    return feed.groups || [];
  },

  // 특정 논문 상세 정보 조회 (추후 사용 가능)
  // GET /api/v1/papers/{paperId}
  getPaperDetail: async (paperId: string): Promise<PaperListItem> => {
    return api.get(`/papers/${paperId}`);
  },

  // 가용 날짜 조회
  // GET /api/v1/papers/available-dates
  getAvailableDates: async (params: { category?: string; researchArea?: string } = {}): Promise<{ dates: string[]; count: number; startDate: string | null; endDate: string | null }> => {
    return api.get('/papers/available-dates', { params });
  }
};
