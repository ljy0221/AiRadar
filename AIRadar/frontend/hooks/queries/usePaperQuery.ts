import { useQuery } from '@tanstack/react-query';
import { paperApi } from '@/services/paper/paperApi';
import { PaperListParams } from '@/types/paper';

// 일별 그룹화된 논문 목록 쿼리 훅 (실서버 연동)
// params가 없으면(최초 진입 시) 최근 4일치 데이터를 가져옴
export const usePaperDailyQuery = (params?: PaperListParams) => {
  return useQuery({
    queryKey: ['papers', 'daily', params],
    queryFn: () => paperApi.getPapers(params),
    staleTime: 1000 * 60 * 10, // 10분
  });
};

// 가용 날짜 조회 훅
export const useAvailablePaperDates = (params: { category?: string; researchArea?: string } = {}) => {
  return useQuery({
    queryKey: ['papers', 'available-dates', params],
    queryFn: () => paperApi.getAvailableDates(params),
    staleTime: 1000 * 60 * 5, // 5분
  });
};
