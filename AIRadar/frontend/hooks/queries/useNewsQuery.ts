import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchNewsList, fetchAvailableDates } from '@/services/news/newsApi';
import type { NewsListParams } from '@/types/news';

// 기본 뉴스 목록 쿼리 훅 (최근 4일치 등 기본 조회용)
export const useNewsListQuery = (params?: NewsListParams) => {
  return useQuery({
    queryKey: ['news', 'list', params?.region, params?.category, params?.date],
    queryFn: () => fetchNewsList(params),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
};

// 특정 날짜 기반 뉴스 무한 스크롤 훅
export const useInfiniteNewsQuery = (params: NewsListParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['news', 'infinite', params.region, params.category, params.date],
    queryFn: ({ pageParam }) => fetchNewsList({ ...params, date: pageParam || params.date }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      const lastDate = lastPage[lastPage.length - 1].date;
      const d = new Date(lastDate);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    },
    enabled: true,
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
