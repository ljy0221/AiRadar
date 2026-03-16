'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Input } from '@/components/common/Input';
import type { KeywordDefinition } from '@/services/dashboardApi';

interface KeywordDictionaryProps {
  data: KeywordDefinition[];
}

export const KeywordDictionary = ({ data }: KeywordDictionaryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('전체');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 고유 카테고리 추출 ('전체' 추가)
  const categories = ['전체', ...Array.from(new Set(data.map(item => item.category)))];

  // 검색어 및 카테고리에 따른 필터링
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.englishTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = activeCategory === '전체' || item.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [data, searchTerm, activeCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="w-full bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-xl font-bold">AI 키워드 백과</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            핵심 AI 기술 트렌드와 개념을 쉽게 찾아보세요.
          </p>
        </div>

        {/* 검색 및 카테고리 필터 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto overflow-hidden mt-2 xl:mt-0">
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="키워드 검색 (한/영)"
              className="pl-9 pr-3 py-2 text-sm w-full bg-gray-50/80 dark:bg-gray-800/30 border border-gray-200/80 dark:border-gray-700/50 rounded-lg transition-all shadow-sm outline-none focus:outline-none ring-0 focus:ring-0 text-[var(--color-text-primary)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-1 gap-2 overflow-x-auto w-full pb-2 sm:pb-0 no-scrollbar items-center mask-image-fade">
            <div className="flex gap-2 min-w-max px-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 whitespace-nowrap text-sm font-semibold rounded-lg transition-all duration-200 ${activeCategory === cat
                    ? 'bg-white dark:bg-gray-800 text-[var(--color-accent)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 border border-transparent'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 키워드 리스트 영역 */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {filteredData.length > 0 ? (
          filteredData.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`flex flex-col border rounded-xl transition-all duration-300 overflow-hidden ${isExpanded
                  ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5 dark:bg-[var(--color-accent)]/10 shadow-md'
                  : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                  }`}
              >
                {/* 헤더 영역 (항상 보임) */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 w-full text-left"
                >
                  <div className="flex flex-col gap-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {item.term}
                      </span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {item.englishTerm}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 sm:line-clamp-1">
                      {item.summary}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center justify-center p-2 rounded-full bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 shadow-sm self-start sm:self-center">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[var(--color-accent)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* 상세 내용 영역 (펼쳤을 때만 보임) */}
                <div
                  className={`transition-all duration-300 ease-in-out origin-top ${isExpanded ? 'max-h-[500px] opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 overflow-hidden outline-none'
                    }`}
                >
                  <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">상세 설명</h5>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
            <Search className="w-8 h-8 opacity-20" />
            <p>검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
