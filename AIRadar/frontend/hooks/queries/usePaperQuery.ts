import { useQuery } from '@tanstack/react-query';
import { paperApi } from '@/services/paper/paperApi';
import { PaperListParams } from '@/types/paper';
export const usePaperDailyQuery = (params?: PaperListParams) => {
  return useQuery({
    queryKey: ['papers', 'daily', params],
    queryFn: () => paperApi.getPapers(params),
    staleTime: 1000 * 60 * 10,
  });
};

export const useAvailablePaperDates = (params: { category?: string; researchArea?: string } = {}) => {
  return useQuery({
    queryKey: ['papers', 'available-dates', params],
    queryFn: () => paperApi.getAvailableDates(params),
    staleTime: 1000 * 60 * 5,
  });
};
