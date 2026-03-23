// services/paper/paperApi.ts
import { api } from '../common/api';
import { PaperListItem, DailyPaperGroup, PaperListParams } from '@/types/paper';

export const paperApi = {
  // 일별 그룹화된 논문 목록 조회 (실서버 연동)
  // GET /api/v1/papers
  getPapers: async (params?: PaperListParams): Promise<DailyPaperGroup[]> => {
    // api interceptor가 response.data.data를 자동으로 반환하도록 설정되어 있음
    const response = await api.get<DailyPaperGroup[]>('/papers', {
      params,
    });
    
    // axios interceptor에서 data 필드만 이미 추출해 보냈을 것이므로 형변환하여 반환
    return response as unknown as DailyPaperGroup[];
  },

  // 특정 논문 상세 정보 조회 (추후 사용 가능)
  // GET /api/v1/papers/{paperId}
  getPaperDetail: async (paperId: string): Promise<PaperListItem> => {
    return api.get(`/papers/${paperId}`);
  }
};
