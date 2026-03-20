import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchNewsList } from '@/services/news/newsApi';
import type { NewsListParams } from '@/types/news';

// 기본 뉴스 목록 쿼리 훅 (최근 4일치 등 기본 조회용)
export const useNewsListQuery = (params?: NewsListParams) => {
  return useQuery({
    queryKey: ['news', 'list', params?.region, params?.category, params?.date],
    queryFn: () => fetchNewsList(params),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
    enabled: !params?.date, // date가 없을 때만 활성화 (date가 있으면 infinite query 사용)
  });
};

// 특정 날짜 기반 뉴스 무한 스크롤 훅
export const useInfiniteNewsQuery = (params?: NewsListParams) => {
  return useInfiniteQuery({
    queryKey: ['news', 'infinite', params?.region, params?.category, params?.date],
    queryFn: ({ pageParam = 0 }) => fetchNewsList({ ...params, page: pageParam as number, size: 10 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // 마지막 페이지의 아이템 수가 size(10)보다 적으면 더 이상 데이터가 없는 것으로 판단
      if (!lastPage || lastPage.length === 0) return undefined;
      // DailyNewsGroup 배열 구조이므로 그 안의 items 총합 계산
      const totalItems = lastPage.reduce((acc, sum) => acc + sum.items.length, 0);
      return totalItems === 10 ? allPages.length : undefined;
    },
    enabled: !!params?.date, // date가 있을 때만 활성화 유도
  });
};
