'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  ChevronRight,
  Hash,
  Diamond,
  Hexagon,
  Circle,
  Square,
  Zap,
  Cpu,
  RotateCcw,
  ExternalLink,
  Target,
  MoreHorizontal,
  X,
  LayoutGrid
} from 'lucide-react';
import { useTracking } from '@/hooks/useTracking';
import type { KeywordDefinition } from '@/services/dashboard/dashboardApi';

interface KeywordDictionaryProps {
  data: KeywordDefinition[];
}

const CATEGORY_MAP = [
  { id: '전체', icon: LayoutGrid, isHighlight: true },
  { id: '개념/이론', icon: Diamond },
  { id: '모델/아키텍처', icon: Hexagon },
  { id: '학습/기법', icon: Circle },
];

export const KeywordDictionary = ({ data }: KeywordDictionaryProps) => {
  const { trackSearch } = useTracking();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch =
        item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.englishTerm.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !activeCategory || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data, searchTerm, activeCategory]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) return;
    const timer = setTimeout(() => {
      trackSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, trackSearch]);

  const selectedItem = useMemo(() =>
    data.find(d => d.id === selectedId) || null
    , [data, selectedId]);

  const handleCategorySelect = (catId: string | null) => {
    setActiveCategory(catId);
    setViewMode('detail');

    const firstItem = data.find(d => !catId || d.category === catId);
    if (firstItem) setSelectedId(firstItem.id);
  };

  const handleReset = () => {
    setActiveCategory(null);
    setSelectedId(null);
    setSearchTerm('');
    setViewMode('grid');
  };

  return (
    <div className="w-full bg-white dark:bg-[#070a0e] rounded-[32px] border border-gray-200 dark:border-gray-800/50 shadow-sm flex flex-col h-[calc(100vh-170px)] min-h-[600px] max-h-[900px] overflow-hidden transition-all duration-300">

      <div className="px-6 md:px-10 py-4 md:py-6 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 border-b border-gray-50 dark:border-gray-800/50 md:border-none">
        <div
          className="flex items-start gap-3 md:gap-4 cursor-pointer group"
          onClick={handleReset}
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-[var(--color-accent)]/10 transition-colors">
            <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--color-accent)]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-[var(--color-accent)] transition-colors">AI 키워드 백과</h2>
            <p className="text-[11px] md:text-[13px] font-bold text-gray-400 dark:text-gray-500 line-clamp-1 md:line-clamp-none">핵심 AI 기술 트렌드와 개념을 쉽게 찾아보세요.</p>
          </div>
        </div>

        <AnimatePresence>
          {viewMode === 'detail' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative w-full md:w-[280px] pointer-events-auto"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-3.5 md:h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="키워드 검색 (한/영)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 md:py-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm md:text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all font-medium"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 px-6 md:px-10 pb-8 md:pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 overflow-y-auto md:overflow-hidden scrollbar-hide"
            >
              {CATEGORY_MAP.map((cat, idx) => {
                const Icon = cat.icon;
                const count = cat.id === '전체' ? data.length : data.filter(d => d.category === cat.id).length;

                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id === '전체' ? null : cat.id)}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col p-6 md:p-7 rounded-[24px] md:rounded-[28px] border border-gray-100 dark:border-white/[0.08] transition-all h-full min-h-[140px] md:min-h-[160px] text-left group relative bg-white dark:bg-[#161d27] hover:shadow-xl hover:border-[var(--color-accent)]/30"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/[0.15] flex items-center justify-center mb-4 md:mb-6 shadow-sm group-hover:bg-[var(--color-accent)]/10 transition-colors">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-white group-hover:text-[var(--color-accent)] transition-colors" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h4 className="text-lg md:text-[19px] font-bold text-gray-800 dark:text-[#ffffff] mb-0.5 md:mb-1 tracking-tight group-hover:text-[var(--color-accent)] transition-colors">{cat.id}</h4>
                      <p className="text-[10px] md:text-[12px] font-bold text-gray-400 dark:text-[#6b7a8d] tracking-wider lowercase">{count} Keywords</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col lg:flex-row overflow-hidden"
            >
              <div className={`flex-col w-full lg:w-[380px] px-6 md:px-10 pb-8 overflow-y-auto space-y-2.5 custom-scrollbar transition-all duration-300 ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="lg:hidden py-4 shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[var(--color-accent)] transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" /> 카테고리 목록
                  </button>
                </div>

                {filteredData.map((item) => {
                  const isActive = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left p-4 md:p-5 rounded-[18px] md:rounded-[20px] border transition-all relative flex items-center justify-between group ${isActive
                        ? 'bg-gray-50 dark:bg-[#161d27] border-gray-200 dark:border-white/[0.15] shadow-sm'
                        : 'bg-white dark:bg-[#161d27] border-gray-100 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                        }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                        <span className={`font-bold text-[15px] md:text-base transition-colors ${isActive ? 'text-[var(--color-accent)]' : 'text-gray-800 dark:text-[#ffffff]'}`}>{item.term}</span>
                        <span className="text-[12px] md:text-[13px] font-bold text-gray-400 dark:text-[#6b7a8d]">{item.englishTerm}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? 'text-[var(--color-accent)]' : 'text-gray-300 opacity-0 lg:group-hover:opacity-100'} transition-all`} />
                    </button>
                  );
                })}
              </div>

              <div className={`flex-1 flex-col px-6 md:px-10 pb-8 overflow-y-auto custom-scrollbar transition-all duration-500 ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
                <div className="lg:hidden py-4 shrink-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-2 text-xs font-black text-[var(--color-accent)] uppercase tracking-widest"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" /> 키워드 목록으로
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {selectedItem ? (
                    <motion.div
                      key={selectedId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white dark:bg-[#161d27] rounded-[24px] md:rounded-[28px] border border-gray-100 dark:border-white/[0.08] p-6 md:p-10 min-h-fit lg:min-h-full shadow-sm"
                    >
                      <div className="mb-6 md:mb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="inline-flex w-fit px-3 py-1 rounded-full border border-gray-200 dark:border-white/[0.15] bg-white dark:bg-white/5 text-[var(--color-accent)] text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                            {selectedItem.category}
                          </div>

                        </div>
                        <h2 className="text-2xl md:text-[28px] font-bold text-gray-900 dark:text-[#ffffff] mb-1 leading-tight tracking-tight">
                          {selectedItem.term}
                        </h2>
                        <p className="text-sm md:text-base font-bold text-gray-400 dark:text-[#6b7a8d] tracking-tight italic">
                          {selectedItem.englishTerm}
                        </p>
                      </div>

                      <div className="space-y-8 md:space-y-10">
                        <div className="relative">
                          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[var(--color-accent)]/20 rounded-full" />
                          <h5 className="text-[11px] md:text-[12px] font-black text-gray-400 mb-3 uppercase tracking-[0.2em]">핵심 설명</h5>
                          <p className="text-base md:text-[17px] font-medium leading-[1.7] text-gray-800 dark:text-gray-200">
                            {selectedItem.description || "상세 설명을 준비 중입니다."}
                          </p>
                        </div>

                        {selectedItem.details && (
                          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            <div className="flex flex-col gap-1.5 p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Developer / Source</span>
                              <span className="text-[15px] font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-gray-400" />
                                {selectedItem.details.developer}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Launch</span>
                              <span className="text-[15px] font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Target className="w-4 h-4 text-gray-400" />
                                {selectedItem.details.launchDate}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 lg:py-0">
                      <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6 opacity-40">
                        <BookOpen className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-lg font-bold opacity-50">키워드를 선택하여 지식을 탐구해 보세요</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
