import { useQuery } from '@tanstack/react-query';
import { fetchNewsDetail, fetchNewsList } from '@/services/news/newsApi';
import type { NewsListParams } from '@/types/news';

// 뉴스 목록 쿼리 훅
export const useNewsListQuery = (params?: NewsListParams) => {
  return useQuery({
    queryKey: ['news', 'list', params?.region, params?.category],
    queryFn: () => fetchNewsList(params),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
};

// 뉴스 상세 쿼리 훅
export const useNewsDetailQuery = (articleId: string) => {
  return useQuery({
    queryKey: ['news', 'detail', articleId],
    queryFn: () => fetchNewsDetail(articleId),
    enabled: !!articleId, // articleId가 있을 때만 호출
    staleTime: 1000 * 60 * 10, // 10분 캐싱
  });
};
