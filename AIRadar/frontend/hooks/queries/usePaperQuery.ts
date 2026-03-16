import { useQuery } from '@tanstack/react-query';
import { fetchPaperDetail, fetchPaperList } from '@/services/paperApi';
import type { PaperListParams } from '@/types/paper';

// 논문 목록 쿼리 훅
export const usePaperListQuery = (params?: PaperListParams) => {
  return useQuery({
    queryKey: ['papers', 'list', params?.category, params?.researchArea],
    queryFn: () => fetchPaperList(params),
    staleTime: 1000 * 60 * 10, // 10분 캐싱
  });
};

// 논문 상세 쿼리 훅
export const usePaperDetailQuery = (paperId: string) => {
  return useQuery({
    queryKey: ['papers', 'detail', paperId],
    queryFn: () => fetchPaperDetail(paperId),
    enabled: !!paperId,
    staleTime: 1000 * 60 * 30, // 30분 캐싱 (논문 내용은 잘 바뀌지 않음)
  });
};
