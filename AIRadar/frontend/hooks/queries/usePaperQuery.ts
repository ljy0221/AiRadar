import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { paperApi } from '@/services/paper/paperApi';
import { PaperListParams } from '@/types/paper';
export const usePaperDailyQuery = (params?: PaperListParams, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['papers', 'daily', params],
    queryFn: () => paperApi.getPapers(params),
    staleTime: 1000 * 60 * 10,
    enabled,
  });
};

export const useAvailablePaperDates = (params: { category?: string; researchArea?: string } = {}) => {
  return useQuery({
    queryKey: ['papers', 'available-dates', params],
    queryFn: () => paperApi.getAvailableDates(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useInfinitePaperQuery = (params: PaperListParams = {}, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['papers', 'infinite', params],
    queryFn: ({ pageParam }) =>
      paperApi.getPaperFeed({
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
