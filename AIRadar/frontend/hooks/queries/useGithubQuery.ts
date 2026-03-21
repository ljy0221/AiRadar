import { useQuery } from '@tanstack/react-query';
import { fetchGithubRepos } from '@/services/github/githubApi';
import type { GithubListParams } from '@/types/github';

// GitHub 레포 목록 쿼리 훅
export const useGithubReposQuery = (params?: GithubListParams) => {
  return useQuery({
    queryKey: ['github', 'repos', params?.date, params?.limit, params?.dailyWindow, params?.monthlyWindow],
    queryFn: () => fetchGithubRepos(params),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
};
