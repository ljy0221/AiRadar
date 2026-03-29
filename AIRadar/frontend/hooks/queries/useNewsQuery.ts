import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchNewsFeed, fetchNewsList, fetchAvailableDates } from '@/services/news/newsApi';
import type { NewsListParams } from '@/types/news';

// 기본 뉴스 목록 쿼리 훅 (최근 4일치 등 기본 조회용)
export const useNewsListQuery = (params?: NewsListParams, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['news', 'list', params],
    queryFn: () => fetchNewsList(params),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
    enabled,
  });
};

// 특정 날짜 기반 뉴스 무한 스크롤 훅
export const useInfiniteNewsQuery = (params: NewsListParams = {}, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['news', 'infinite', params],
    queryFn: ({ pageParam }) =>
      fetchNewsFeed({
        ...params,
        cursorPublishedAt: (pageParam as { cursorPublishedAt?: string; cursorId?: string } | undefined)?.cursorPublishedAt,
        cursorId: (pageParam as { cursorPublishedAt?: string; cursorId?: string } | undefined)?.cursorId,
      }),
    initialPageParam: undefined as { cursorPublishedAt?: string; cursorId?: string } | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext || !lastPage?.nextCursor) return undefined;
      return {
        cursorPublishedAt: lastPage.nextCursor.publishedAt,
        cursorId: lastPage.nextCursor.id,
      };
    },
    enabled,
  });
};

// 가용 날짜 조회 훅
export const useAvailableNewsDates = (params: { region?: string; category?: string } = {}) => {
  return useQuery({
    queryKey: ['news', 'available-dates', params],
    queryFn: () => fetchAvailableDates(params),
    staleTime: 1000 * 60 * 5, // 5분
    placeholderData: (previousData) => previousData || { dates: [], count: 0, startDate: null, endDate: null },
    retry: 1,
  });
};
