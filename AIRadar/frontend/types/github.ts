// types/github.ts
// GitHub Archive 관련 TypeScript 타입 정의
// 백엔드 SilverSchemas.GITHUB_SILVER_SCHEMA 기반

export interface GithubRepo {
  repoId: string;         // 'org/repo' 형식 (예: 'microsoft/BitNet')
  repoName: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  weeklyCommits: number;
  starDelta7d: number;    // 7일간 스타 증감 (양수=성장, 음수=감소)
  aiRelevance: boolean;
  keywords: string[];
  batchDate: string;      // 'YYYY-MM-DD'
}

export interface GithubListParams {
  language?: string;
  aiOnly?: boolean;
  sortBy?: 'stars' | 'starDelta7d' | 'weeklyCommits';
  page?: number;
  size?: number;
}
