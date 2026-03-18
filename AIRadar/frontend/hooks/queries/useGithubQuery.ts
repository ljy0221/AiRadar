import { useQuery } from '@tanstack/react-query';
import { fetchGithubRepos, fetchTrendingRepos } from '@/services/github/githubApi';
import type { GithubListParams } from '@/types/github';

// GitHub 레포 목록 쿼리 훅
export const useGithubReposQuery = (params?: GithubListParams) => {
  return useQuery({
    queryKey: ['github', 'repos', params?.language, params?.sortBy, params?.aiOnly],
    queryFn: () => fetchGithubRepos(params),
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
};

// 급상승 레포 Top N 쿼리 훅 (대시보드용)
export const useTrendingReposQuery = (limit = 5) => {
  return useQuery({
    queryKey: ['github', 'trending', limit],
    queryFn: () => fetchTrendingRepos(limit),
    staleTime: 1000 * 60 * 5,
  });
};
