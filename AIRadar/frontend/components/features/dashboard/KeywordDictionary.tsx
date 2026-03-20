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

  // 검색 트래킹 (Debounced)
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
    
    // 해당 카테고리의 첫 번째 아이템 미리 선택
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
    <div className="w-full bg-white dark:bg-[#151726] rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">
      
      {/* ── Top Header Section (Title + Search) ─────────────────────────── */}
      <div className="px-10 py-5 flex items-end justify-between shrink-0">
        <div
          className="flex items-start gap-4 cursor-pointer group"
          onClick={handleReset}
        >
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-[var(--color-accent)]/10 transition-colors">
            <BookOpen className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--color-accent)]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-[var(--color-accent)] transition-colors">AI 키워드 백과</h2>
            <p className="text-[13px] font-bold text-gray-400 dark:text-gray-500">핵심 AI 기술 트렌드와 개념을 쉽게 찾아보세요.</p>
          </div>
        </div>

        {/* Search Bar on the Right */}
        <div className="relative w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="키워드 검색 (한/영)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            /* ── Step 1: Pretty 4-Card Category Selection ────────────────────────── */
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 px-10 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {CATEGORY_MAP.map((cat, idx) => {
                const Icon = cat.icon;
                const count = cat.id === '전체' ? data.length : data.filter(d => d.category === cat.id).length;

                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id === '전체' ? null : cat.id)}
                    whileHover={{ scale: 1.02, translateY: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col p-8 rounded-[28px] border border-gray-100 dark:border-gray-800 transition-all h-full min-h-[200px] text-left group relative bg-white dark:bg-[#1a1c2e] hover:shadow-xl hover:border-[var(--color-accent)]/30"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-6 shadow-sm group-hover:bg-[var(--color-accent)]/10 transition-colors">
                      <Icon className="w-5 h-5 text-gray-700 dark:text-gray-100 group-hover:text-[var(--color-accent)] transition-colors" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h4 className="text-[19px] font-extrabold text-gray-800 dark:text-gray-100 mb-1 tracking-tight group-hover:text-[var(--color-accent)] transition-colors">{cat.id}</h4>
                      <p className="text-[12px] font-bold text-gray-400 tracking-wider lowercase">{count} Keywords</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            /* ── Step 2: Professional Split Panel View ────────────────────────────── */
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex"
            >
              <div className="w-[380px] px-10 pb-8 overflow-y-auto space-y-2.5 custom-scrollbar">
                {filteredData.map((item) => {
                  const isActive = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left p-5 rounded-[20px] border transition-all relative flex items-center justify-between group ${isActive
                          ? 'bg-gray-50 border-gray-200 shadow-sm'
                          : 'bg-white dark:bg-[#1a1c2e] border-gray-100 dark:border-gray-800 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                        <span className={`font-bold text-base transition-colors ${isActive ? 'text-[var(--color-accent)]' : 'text-gray-800 dark:text-gray-100'}`}>{item.term}</span>
                        <span className="text-[13px] font-medium text-gray-400">{item.englishTerm}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent)]' : 'text-gray-300 opacity-0 group-hover:opacity-100'} transition-all`} />
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 px-10 pb-8 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {selectedItem ? (
                    <motion.div
                      key={selectedId}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="bg-white dark:bg-gray-900/40 rounded-[24px] border border-gray-100 dark:border-gray-800 p-9 min-h-full"
                    >
                      <div className="mb-6">
                        <h2 className="text-[22px] font-bold text-gray-900 dark:text-gray-50 mb-1 leading-tight tracking-tight">
                          {selectedItem.term}
                        </h2>
                        <p className="text-sm font-medium text-gray-400 mb-4 tracking-tight font-mono">
                          {selectedItem.englishTerm}
                        </p>
                        <div className="inline-flex px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[var(--color-accent)] text-[10px] font-bold mb-6">
                          {selectedItem.category}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h5 className="text-[12px] font-bold text-gray-400 mb-2">설명</h5>
                          <p className="text-[14.5px] font-medium leading-[1.7] text-gray-800 dark:text-gray-200">
                            {selectedItem.description || "설명을 불러오지 못했어요."}
                          </p>
                        </div>

                        {selectedItem.details && (
                          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Developer</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-white">
                                {selectedItem.details.developer}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Release Date</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-white">
                                {selectedItem.details.launchDate}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                      <BookOpen className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-lg font-bold">키워드를 선택하면 설명이 여기 나와요</p>
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
