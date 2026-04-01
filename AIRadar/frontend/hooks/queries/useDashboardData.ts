import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '@/services/dashboard/dashboardApi';

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      return fetchDashboardData(token);
    },
  });
};
