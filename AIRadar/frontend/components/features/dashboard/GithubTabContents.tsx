'use client';

import { TrendingRepoCard } from './TrendingRepoCard';
import { useGithubReposQuery } from '@/hooks/queries/useGithubQuery';
import Loading from '@/app/loading';

export const GithubTabContents = () => {
  // 상위 5개 레포지토리만 가져오기
  const { data, isLoading, isError } = useGithubReposQuery({ limit: 5 });

  if (isLoading) {
    return <div className="py-20"><Loading /></div>;
  }

  if (isError || !data?.repos) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <p className="text-red-500 font-medium">GitHub 데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">급상승 GitHub 레포지토리</h2>
      </div>

      <div className="flex flex-col gap-8">
        {data.repos.map((repo, idx) => (
          <TrendingRepoCard key={repo.repoId} repo={repo} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
};
