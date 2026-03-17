'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Minus } from 'lucide-react';

interface RankingItem {
  rank: number;
  keyword: string;
  change: number | 'new' | '-';
}

const mockRankings: RankingItem[] = [
  { rank: 1, keyword: 'OpenAI Sora v2 공개', change: 2 },
  { rank: 2, keyword: 'NVIDIA H200 수요 폭증', change: 'new' },
  { rank: 3, keyword: 'Claude 3.5 Sonnet 성능', change: -1 },
  { rank: 4, keyword: '애플 AI 인텔리전스', change: 5 },
  { rank: 5, keyword: '테슬라 FSD 12.5 업데이트', change: 1 },
  { rank: 6, keyword: '구글 Gemini 1.5 Pro', change: -2 },
  { rank: 7, keyword: '마이크로소프트 파이-3 실습', change: 'new' },
  { rank: 8, keyword: 'AI 하드웨어 보안 이슈', change: -1 },
  { rank: 9, keyword: '자율주행 규제 변화', change: 3 },
  { rank: 10, keyword: '에이전틱 AI 아키텍처', change: '-' },
];

export const TrendingKeywords = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 자동 롤링 효과
  useEffect(() => {
    if (isExpanded) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockRankings.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isExpanded]);

  const renderChange = (change: number | 'new' | '-') => {
    if (change === 'new') return <span className="text-emerald-500 text-[10px] font-bold">NEW</span>;
    if (change === '-') return <Minus className="w-3 h-3 text-gray-400" />;
    if (typeof change === 'number') {
      if (change > 0) return <span className="text-red-500 text-[10px] flex items-center">▲{change}</span>;
      if (change < 0) return <span className="text-blue-500 text-[10px] flex items-center">▼{Math.abs(change)}</span>;
      return <Minus className="w-3 h-3 text-gray-400" />;
    }
    return null;
  };

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
                {mockRankings.map((item) => (
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
          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1a1c2e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-[60] py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 px-4 py-2">
              <div className="flex flex-col">
                {mockRankings.slice(0, 5).map((item) => (
                  <div key={item.rank} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 px-2 rounded transition-colors group cursor-pointer">
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
                {mockRankings.slice(5, 10).map((item) => (
                  <div key={item.rank} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 px-2 rounded transition-colors group cursor-pointer">
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
