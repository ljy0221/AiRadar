'use client';

import { RankingItem } from '@/services/dashboard/dashboardApi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RankingListProps {
  title: string;
  subtitle?: string;
  data: RankingItem[];
}

export const RankingList = ({ title, subtitle, data }: RankingListProps) => {
  return (
    <div className="bg-white dark:bg-[#1a1c2e] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full overflow-hidden">
      {title && (
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-black text-[var(--color-text-primary)]">{title}</h3>
            {subtitle && <p className="text-[13px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded tracking-tight uppercase">Live Update</span>
        </div>
      )}

      <div className="flex flex-col flex-1 divide-y divide-gray-100 dark:divide-gray-800/50 px-8 py-4">
        {data.map((item) => {
          const isNew = item.change === 'new';
          const isUp = typeof item.change === 'number' && item.change > 0;
          const isDown = typeof item.change === 'number' && item.change < 0;

          return (
            <div key={item.rank} className="flex items-center py-1.5 group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 rounded-lg transition-colors overflow-hidden">
              {/* 순위 */}
              <div className="w-8 flex-shrink-0">
                <span className={`text-lg font-black ${
                  item.rank <= 3 ? 'text-[var(--color-accent)]' : 'text-gray-400'
                }`}>
                  {item.rank}
                </span>
              </div>

              {/* 키워드 */}
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[var(--color-accent)] transition-colors">
                  {item.keyword}
                </p>
              </div>

              {/* 변동 정보 */}
              <div className="w-16 flex justify-end items-center gap-1 flex-shrink-0">
                {isNew ? (
                  <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase leading-none">New</span>
                ) : isUp ? (
                  <div className="flex items-center text-green-500 font-bold text-xs">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    {item.change}
                  </div>
                ) : isDown ? (
                  <div className="flex items-center text-red-500 font-bold text-xs">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    {Math.abs(item.change as number)}
                  </div>
                ) : (
                  <Minus className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
