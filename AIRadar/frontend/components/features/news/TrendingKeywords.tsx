'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { useHourlyTrendingKeywordsQuery } from '@/hooks/queries/useRecommendationQuery';

export const TrendingKeywords = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: keywords, isLoading, isError } = useHourlyTrendingKeywordsQuery(10);

  const rankings = keywords?.map((keyword, index) => ({
    rank: index + 1,
    keyword,
    change: '-' as const
  })) || [];

  // 자동 롤링 효과
  useEffect(() => {
    if (isExpanded || rankings.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rankings.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isExpanded, rankings.length]);

  const renderChange = (change: number | 'new' | '-') => {
    if (change === 'new') return <span className="text-emerald-500 text-[10px] font-bold">NEW</span>;
    if (change === '-') return <Minus className="w-3 h-3 text-gray-400" />;
    // ... (기타 로직 유지)
    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full mb-8 h-12 flex items-center justify-center bg-white dark:bg-[#1a1c2e] border border-gray-200 dark:border-gray-800 rounded-lg">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-2" />
        <span className="text-xs text-gray-400">급상승 키워드 로딩 중...</span>
      </div>
    );
  }

  if (isError || rankings.length === 0) return null;

  return (
    <div className="w-full mb-8 relative z-[50]">
      <div className="bg-white dark:bg-[#1a1c2e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-visible relative">
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">실시간 급상승</span>
            </div>
            
            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
            
            {/* 롤링되는 키워드 */}
            <div className="flex-1 overflow-hidden h-6 relative">
              <div 
                className="absolute w-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateY(-${currentIndex * 1.5}rem)` }}
              >
                {rankings.map((item) => (
                  <div key={item.rank} className="h-6 flex items-center gap-3">
                    <span className="text-[var(--color-accent)] font-extrabold w-4 text-sm">{item.rank}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px] md:max-w-none">
                      {item.keyword}
                    </span>
                    <div className="ml-auto sm:ml-2">
                       {renderChange(item.change)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button className="ml-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
        </div>

        {/* 확장된 전체 목록 */}
        {isExpanded && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1a1c2e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-[60] py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 px-4">
              <div className="flex flex-col">
                {rankings.slice(0, 5).map((item) => (
                  <div key={item.rank} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 px-2 rounded transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-[var(--color-accent)] italic w-6">{item.rank}</span>
                      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium group-hover:text-[var(--color-accent)] transition-colors">
                        {item.keyword}
                      </span>
                    </div>
                    {renderChange(item.change)}
                  </div>
                ))}
              </div>
              <div className="flex flex-col border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-2 md:pt-0 md:pl-8">
                {rankings.slice(5, 10).map((item) => (
                  <div key={item.rank} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 px-2 rounded transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-[var(--color-accent)] italic w-6">{item.rank}</span>
                      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium group-hover:text-[var(--color-accent)] transition-colors">
                        {item.keyword}
                      </span>
                    </div>
                    {renderChange(item.change)}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 py-2 mt-2 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg border-t border-gray-100 dark:border-gray-800 flex justify-center">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="text-xs text-gray-500 hover:text-[var(--color-accent)] transition-colors flex items-center gap-1"
                >
                  <ChevronUp className="w-3 h-3" /> 접기
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
