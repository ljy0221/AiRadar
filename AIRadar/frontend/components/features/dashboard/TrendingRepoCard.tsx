'use client';

import { useState } from 'react';
import { Star, GitFork, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { GithubRepo } from '@/types/github';

const CHART_COLORS = {
  stars: '#facc15', // yellow-400
  forks: '#9ca3af', // gray-400
};

export const TrendingRepoCard = ({ repo, rank }: { repo: GithubRepo, rank: number }) => {
  const [chartTab, setChartTab] = useState<'daily' | 'monthly'>('daily');

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'typescript': return '#3178c6';
      case 'javascript': return '#f1e05a';
      case 'python': return '#3572A5';
      case 'cpp': case 'c++': return '#f34b7d';
      case 'go': return '#00ADD8';
      case 'rust': return '#dea584';
      default: return '#8b949e';
    }
  };

  const currentData = chartTab === 'daily' ? repo.daily : repo.monthly;

  return (
    <div className="bg-white dark:bg-[#1a1c2e] p-6 lg:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row gap-8 lg:gap-12">
      <div className="lg:w-1/3 flex flex-col pt-2">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/20">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate hover:text-[var(--color-accent)] cursor-pointer">
              {repo.repoId}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              {repo.language && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getLanguageColor(repo.language) }}
                  />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
                {repo.stars > 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-4 h-4" />
                {repo.forks > 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
          {repo.description}
        </p>

        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">최근 7일 트렌드</p>
          {repo.starDelta7d !== null ? (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${repo.starDelta7d >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
              {repo.starDelta7d >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {repo.starDelta7d >= 0 ? '+' : ''}{repo.starDelta7d.toLocaleString()} 스타
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-50 dark:bg-gray-800 text-gray-400">
              <span className="text-xs">데이터 집계 중</span>
            </div>
          )}
        </div>
      </div>

      <div className="lg:w-2/3 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">레포지토리 활동 내역</h4>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setChartTab('daily')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${chartTab === 'daily'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              일간
            </button>
            <button
              onClick={() => setChartTab('monthly')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${chartTab === 'monthly'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              월간
            </button>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl p-4 border border-gray-100 dark:border-gray-800/50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="stars" name="스타" stroke={CHART_COLORS.stars} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="forks" name="포크" stroke={CHART_COLORS.forks} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
