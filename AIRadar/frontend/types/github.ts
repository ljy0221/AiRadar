// types/github.ts

export interface GithubDailyActivity {
  label: string;
  snapshotDate: string;
  stars: number | null;
  forks: number | null;
}

export interface GithubMonthlyActivity {
  label: string;
  snapshotDate: string;
  stars: number | null;
  forks: number | null;
}

export interface GithubRepo {
  repoId: string;
  repoName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  starDelta7d: number | null;
  daily: GithubDailyActivity[];
  monthly: GithubMonthlyActivity[];
}

export interface GithubApiResponse {
  requestedDate: string;
  snapshotDate: string;
  dailyWindow: number;
  monthlyWindow: number;
  repos: GithubRepo[];
}

export interface GithubListParams {
  date?: string;
  limit?: number;
  dailyWindow?: number;
  monthlyWindow?: number;
}

