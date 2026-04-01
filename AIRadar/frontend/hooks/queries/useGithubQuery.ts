import { useQuery } from '@tanstack/react-query';
import { fetchGithubRepos } from '@/services/github/githubApi';
import type { GithubListParams } from '@/types/github';

export const useGithubReposQuery = (params?: GithubListParams) => {
  return useQuery({
    queryKey: ['github', 'repos', params?.date, params?.limit, params?.dailyWindow, params?.monthlyWindow],
    queryFn: () => fetchGithubRepos(params),
    staleTime: 1000 * 60 * 5,
  });
};
