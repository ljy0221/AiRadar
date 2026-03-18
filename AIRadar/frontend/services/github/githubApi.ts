// services/githubApi.ts
// GitHub Archive 데이터 API 서비스
// 현재: Mock 데이터 반환 / 실제 백엔드 연동 시 TODO 주석 확인 후 교체

import type { GithubListParams, GithubRepo } from '@/types/github';

import { MOCK_GITHUB_REPOS } from './githubRaw';

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// TODO: replace with real API → api.get('/github/repos', { params })
export const fetchGithubRepos = async (params?: GithubListParams): Promise<GithubRepo[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let result = [...MOCK_GITHUB_REPOS];

      if (params?.language) result = result.filter((r) => r.language === params.language);
      if (params?.aiOnly) result = result.filter((r) => r.aiRelevance);

      // 정렬
      if (params?.sortBy === 'starDelta7d') {
        result.sort((a, b) => b.starDelta7d - a.starDelta7d);
      } else if (params?.sortBy === 'weeklyCommits') {
        result.sort((a, b) => b.weeklyCommits - a.weeklyCommits);
      } else {
        result.sort((a, b) => b.stars - a.stars);
      }

      resolve(result);
    }, 600);
  });
};

// 급상승 레포 Top N 반환 (starDelta7d 기준)
// TODO: replace with real API → api.get('/github/trending', { params: { limit } })
export const fetchTrendingRepos = async (limit = 5): Promise<GithubRepo[]> => {
  const all = await fetchGithubRepos({ aiOnly: true, sortBy: 'starDelta7d' });
  return all.slice(0, limit);
};
