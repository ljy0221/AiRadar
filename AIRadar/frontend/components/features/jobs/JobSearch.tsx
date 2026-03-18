'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const JobSearch = () => {
  const [query, setQuery] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const fullTitle = '당신의 직업, AI는 어떻게 볼까요?';
  const router = useRouter();

  useEffect(() => {
    let i = 0;
    setDisplayedTitle('');
    const timer = setInterval(() => {
      setDisplayedTitle(fullTitle.slice(0, i + 1));
      i++;
      if (i >= fullTitle.length) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const performSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      // 임시 -> frontend-developer로 이동
      router.push(`/jobs/frontend-developer`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const trendingTags = ['프론트엔드', '데이터 분석가', 'AI 엔지니어', 'PM'];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[90vh] pb-32 px-4">
      <div className="text-center mb-10 min-h-[140px] flex flex-col justify-end">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[var(--color-text-primary)]">
          {displayedTitle.split('AI').map((part, index, array) => (
            <span key={index}>
              {part}
              {index < array.length - 1 && (
                <span className="text-[var(--color-accent)] mx-1">AI</span>
              )}
            </span>
          ))}
          <span className="animate-pulse font-light ml-1">|</span>
        </h1>
        <p className="text-base md:text-lg text-gray-400 dark:text-gray-500 leading-relaxed max-w-lg mx-auto">
          <span className="font-bold text-gray-900 dark:text-gray-100">324개 직업</span>의 AI 대체 가능성과 미래 전망을<br />
          데이터 기반으로 분석해드려요.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <form onSubmit={handleSearch} className="relative mb-6">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="프론트엔드 개발자"
            className="w-full pl-16 pr-6 py-5 rounded-full text-lg shadow-md border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all dark:bg-[#1a1c2e] hover:shadow-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm opacity-60 mr-2">인기 검색어:</span>
          {trendingTags.map((tag) => (
            <button
              key={tag}
              onClick={() => performSearch(tag)}
              className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm hover:bg-[var(--color-accent)] hover:text-white transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
