// services/githubApi.ts

import type { GithubListParams, GithubApiResponse } from '@/types/github';
import { api } from '../common/api';

export const fetchGithubRepos = async (params?: GithubListParams): Promise<GithubApiResponse> => {
  return await api.get('/github', { params });
};

