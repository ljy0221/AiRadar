// services/githubApi.ts
// GitHub Archive 데이터 API 서비스
// 현재: Mock 데이터 반환 / 실제 백엔드 연동 시 TODO 주석 확인 후 교체

import type { GithubListParams, GithubRepo } from '@/types/github';

// 서비스를 실제 구동 환경에 맞게 Mock API로 교체합니다.
import { api } from '../common/api';

// ─────────────────────────────────────────────────────────────
// MockMixedItemDto (백엔드 응답 형태)
// ─────────────────────────────────────────────────────────────
interface MockGithubItemDto {
  type: 'github';
  id: string;          // github_repos.repo_id
  title: string;       // github_repos.repo_name
  summary: string;     // github_repos.description
  category: string | null;
  source: string;
  url: string;
  publishedAt: string; // github_repos.snapshot_date
}

function toGithubRepo(dto: MockGithubItemDto, idx: number): GithubRepo {
  return {
    repoId: dto.id || dto.title,
    repoName: dto.title,
    description: dto.summary || '',
    language: 'TypeScript', // 백엔드 응답에 언어 정보가 없으므로 임시 표시
    topics: [],
    // 통계치도 백엔드 MOCK 응답에 없으므로 UI 구동을 위해 임시 생성
    stars: Math.max(10000 - idx * 1000, 1000), 
    forks: Math.max(1000 - idx * 100, 100),
    openIssues: 50,
    weeklyCommits: 20,
    starDelta7d: Math.max(500 - idx * 50, 50),
    aiRelevance: true,
    keywords: [],
    batchDate: dto.publishedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

export const fetchGithubRepos = async (params?: GithubListParams): Promise<GithubRepo[]> => {
  const limit = params?.size ?? 10;
  const response = await api.get('/mock/github', {
    params: { limit },
  });

  // axios 인터셉터가 response.data를 반환한다고 가정
  const raw = response as unknown as MockGithubItemDto[];
  const items = raw.filter((i) => i.type === 'github');

  return items.map((item, idx) => toGithubRepo(item, idx));
};

export const fetchTrendingRepos = async (limit = 3): Promise<GithubRepo[]> => {
  return fetchGithubRepos({ size: limit });
};
