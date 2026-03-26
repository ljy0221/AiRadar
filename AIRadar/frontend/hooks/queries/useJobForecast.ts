import { useQuery } from '@tanstack/react-query';
import { fetchJobForecast, JobForecastResponse } from '@/services/jobs/jobApi';

export const useJobForecast = (jobCode: string) => {
  return useQuery<JobForecastResponse, Error>({
    queryKey: ['jobForecast', jobCode],
    queryFn: () => fetchJobForecast(jobCode),
    enabled: !!jobCode,
    staleTime: 1000 * 60 * 5,
  });
};
