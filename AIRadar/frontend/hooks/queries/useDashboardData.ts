import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '@/services/dashboard/dashboardApi';

// 대시보드 전체 데이터를 한 번에 가져오는 쿼리 훅
export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardData,
  });
};
