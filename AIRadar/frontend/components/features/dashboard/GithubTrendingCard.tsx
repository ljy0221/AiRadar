import { TrendingUp, TrendingDown, Star, GitFork, Flame } from 'lucide-react';
import { useGithubReposQuery } from '@/hooks/queries/useGithubQuery';

export const GithubTrendingCard = () => {
  const { data, isLoading, isError } = useGithubReposQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm animate-pulse h-64" />
    );
  }

  if (isError || !data?.repos) {
    return (
      <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center h-32">
        <p className="text-sm text-red-500">GitHub 데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-bold">급상승 GitHub 레포</h2>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">7일 스타 증감 기준</span>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        {data.repos.map((repo, idx) => (
          <div key={repo.repoId} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
            {/* 순위 */}
            <span className="text-2xl font-black text-gray-200 dark:text-gray-700 w-8 text-center shrink-0">
              {idx + 1}
            </span>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:text-[var(--color-accent)] cursor-pointer">
                {repo.repoName}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {repo.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {repo.stars.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  {repo.forks.toLocaleString()}
                </span>
                {repo.language && (
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">
                    {repo.language}
                  </span>
                )}
              </div>
            </div>

            {/* 스타 델타 */}
            {repo.starDelta7d !== null ? (
              <div className={`flex items-center gap-1 text-xs font-bold shrink-0 ${repo.starDelta7d >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {repo.starDelta7d >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {repo.starDelta7d >= 0 ? '+' : ''}{repo.starDelta7d.toLocaleString()}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-bold shrink-0 text-gray-400 dark:text-gray-500">
                집계중
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
