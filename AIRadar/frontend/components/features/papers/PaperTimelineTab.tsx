'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { TimelineItem, TimelineItemData } from '../news/TimelineItem';
import { useAvailablePaperDates, useInfinitePaperQuery } from '@/hooks/queries/usePaperQuery';
import { usePersonalizedPapersQuery } from '@/hooks/queries/useRecommendationQuery';
import { useBookmarksQuery } from '@/hooks/queries/useUserQuery';
import { useAuth } from '../auth/AuthContext';
import Loading from '@/app/loading';
import { CalendarModal } from '@/components/common';
import type { DailyPaperGroup } from '@/types/paper';

// PaperItem → TimelineItemData 매핑 함수
function toTimelineItemData(paper: any, bookmarkedIds: Set<string>): TimelineItemData {
  return {
    id: paper.paperId,
    type: 'paper',
    category: paper.category,
    region: 'GLOBAL',
    title: paper.title,
    summary: paper.summary || paper.abstractText || '요약 정보가 없습니다.',
    publisher: `${paper.source || 'arXiv'} · ${paper.authors?.join(', ') || '알 수 없음'}`,
    date: formatDate(paper.publishedAt),
    hashtags: paper.keywords || (paper.researchArea ? [paper.researchArea] : []),
    url: paper.url || '',
    isBookmarked: paper.isBookmarked || bookmarkedIds.has(paper.paperId),
    reason: paper.reason, // 추천 사유 추가
  };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

interface PaperTimelineTabProps {
  activeTab?: string;
}

export const PaperTimelineTab: React.FC<PaperTimelineTabProps> = ({ activeTab = 'daily' }) => {
  const { isLoggedIn } = useAuth();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const infiniteAnchorRef = useRef<HTMLElement | null>(null);

  // 북마크 목록 조회
  const { data: bookmarks } = useBookmarksQuery();
  const bookmarkedIds = useMemo(() => new Set(bookmarks?.map(b => b.articleId) || []), [bookmarks]);

  // 1) 가용 날짜 조회
  const { data: availableData } = useAvailablePaperDates({
    // 서브 필터는 클라이언트에서 처리하므로 전체 날짜를 가져옵니다.
  });

  const availableDates = useMemo(() =>
    availableData?.dates || [],
    [availableData]
  );

  // 화면에 표시할 날짜 결정 (선택된 날짜가 없으면 가장 최신 날짜)
  const displayDate = startDate || (availableDates.length > 0 ? availableDates[0] : null);

  // 특정 날짜/범위 조회
  const isRangeSelected = !!(startDate && endDate && startDate !== endDate);

  const {
    data: infinitePaperData,
    isLoading: isInfiniteLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError: isInfiniteError
  } = useInfinitePaperQuery({
    category: activeCategory !== 'ALL' ? activeCategory : undefined,
    date: !isRangeSelected ? (startDate || displayDate || undefined) : undefined,
    startDate: isRangeSelected ? startDate : undefined,
    endDate: isRangeSelected ? endDate : undefined,
    size: 30
  }, !!(isRangeSelected ? (startDate || endDate) : (startDate || displayDate)));

  // 0) 개인화 추천 논문 조회 (로그인 시에만)
  const { data: recommendations, isLoading: isRecLoading } = usePersonalizedPapersQuery(10, isLoggedIn);

  const mergedGroups = useMemo<DailyPaperGroup[]>(() => {
    const sourceGroups = infinitePaperData?.pages.flatMap((p) => p.groups || []) || [];

    if (!sourceGroups || sourceGroups.length === 0) return [];

    const groupedMap = new Map<string, DailyPaperGroup['items']>();
    sourceGroups.forEach((group) => {
      const prev = groupedMap.get(group.date) || [];
      groupedMap.set(group.date, [...prev, ...group.items]);
    });

    const normalized = Array.from(groupedMap.entries()).map(([date, items]) => ({ date, items }));

    // 범위 선택 시에는 시작일(과거)부터 최신순(오름차순)으로 정렬하여 타임라인 흐름 강조
    if (isRangeSelected) {
      return [...normalized].sort((a, b) => a.date.localeCompare(b.date));
    }

    return normalized;
  }, [infinitePaperData, isRangeSelected]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const target = infiniteAnchorRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        fetchNextPage();
      }
    }, { rootMargin: '300px' });

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 헤더 표시용 텍스트
  const headerText = useMemo(() => {
    if (startDate && endDate && startDate !== endDate) {
      return `${startDate.replace(/-/g, '.')} - ${endDate.replace(/-/g, '.')}`;
    }
    if (mergedGroups.length > 0) return mergedGroups[0].date.replace(/-/g, '.');
    return (displayDate || new Date().toISOString().split('T')[0]).replace(/-/g, '.');
  }, [mergedGroups, displayDate, startDate, endDate]);

  // 모든 그룹에서 가용한 카테고리(키워드) 추출
  const availableKeywords = useMemo(() => {
    if (mergedGroups.length === 0) return [];
    const keys = new Set<string>();
    mergedGroups.forEach(group => {
      group.items.forEach((item: any) => {
        if (item.category) keys.add(item.category);
      });
    });
    return Array.from(keys);
  }, [mergedGroups]);

  const dateDisplayText = useMemo(() => {
    if (!startDate) return '날짜 선택';
    if (!endDate || startDate === endDate) return startDate.replace(/-/g, '.');
    return `${startDate.replace(/-/g, '.')} - ${endDate.replace(/-/g, '.')}`;
  }, [startDate, endDate]);

  const handleRangeSelect = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
    setActiveCategory('ALL');
  };

  // 화살표 네비게이션 핸들러
  const handlePrevDay = (currentStr: string) => {
    setActiveCategory('ALL');
    const [y, m, d] = currentStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    const newDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    setStartDate(newDate);
    setEndDate(newDate);
  };

  const handleNextDay = (currentStr: string) => {
    setActiveCategory('ALL');
    const [y, m, d] = currentStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    const newDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    setStartDate(newDate);
    setEndDate(newDate);
  };

  const isLoading = isInfiniteLoading || (activeTab === 'recommend' && isRecLoading);
  const isError = isInfiniteError;

  if (isLoading) return <Loading />;
  if (isError) return <div className="py-20 text-center text-red-500">데이터를 불러오지 못했습니다.</div>;

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="px-1">
          {/* 추천 섹션 (로그인 중이며 추천 탭이거나 데일리 탭의 최상단일 때) */}
          {isLoggedIn && recommendations && recommendations.length > 0 && (activeTab === 'recommend' || (!startDate && !endDate && activeTab === 'daily')) && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 italic tracking-tight uppercase">오늘의 추천 논문</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.slice(0, activeTab === 'recommend' ? 12 : 3).map((rec) => (
                  <a
                    key={rec.paperId}
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 p-5 rounded-2xl hover:shadow-xl hover:border-[var(--color-accent)]/30 transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-black rounded-md uppercase tracking-wider">
                        {rec.reason === 'ALS' ? '맞춤 추천' : rec.reason === 'KEYWORD_MATCH' ? '관심 키워드' : '인기 논문'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">{rec.researchArea}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug group-hover:text-[var(--color-accent)] transition-colors mb-3">
                      {rec.title}
                    </h4>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex gap-1.5 overflow-hidden">
                        {rec.keywords?.slice(0, 2).map(kw => (
                          <span key={kw} className="text-[10px] text-gray-400 truncate">#{kw}</span>
                        ))}
                      </div>
                      <div className="text-[10px] font-bold text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                        원문 보기 <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {activeTab === 'recommend' && <div className="mt-12 border-b border-gray-100 dark:border-gray-800" />}
            </div>
          )}

          {activeTab === 'daily' && (
            <>
              {/* 1. 필터 카드 섹션 (뉴스 섹션 TimelineFilter와 동일 구도) */}
              <div className="bg-gray-50/50 dark:bg-[#11121A] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-12">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest italic">Paper Exploration</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCalendarOpen(true)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl text-xs sm:text-sm font-bold transition-colors ${startDate
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800/80 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#171924] hover:bg-gray-50 dark:hover:bg-[#1c1f2e]'
                        }`}
                    >
                      <CalendarDays className={`w-4 h-4 ${startDate ? 'text-[var(--color-accent)]' : 'text-gray-500 dark:text-gray-400'}`} />
                      {dateDisplayText}
                    </button>
                    {(startDate || endDate) && (
                      <button
                        onClick={() => handleRangeSelect(null, null)}
                        className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-800/80 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1c1f2e] transition-colors"
                        title="필터 초기화"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 카테고리 필터 칩 */}
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {['ALL', ...availableKeywords].map((keyword) => {
                    const isActive = activeCategory === keyword;
                    return (
                      <button
                        key={keyword as string}
                        onClick={() => setActiveCategory(keyword as string)}
                        className={`shrink-0 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${isActive
                          ? 'border-emerald-500/80 text-emerald-500 bg-emerald-500/5'
                          : 'border-gray-300 dark:border-gray-800/80 text-gray-600 dark:text-gray-400 bg-transparent hover:border-gray-400 dark:hover:border-gray-600'
                          }`}
                      >
                        {keyword === 'ALL' ? '전체' : (keyword as string)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 타임라인 리스트 (뉴스 섹션과 동일하게 세로선 및 헤더 적용) */}
              <div className="flex flex-col gap-10">
                {mergedGroups.length > 0 ? (
                  <div className="relative">
                    {/* 날짜 헤더 영역 */}
                    <div className="inline-flex items-center gap-3 mb-8 relative z-10 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-90 shrink-0" />

                      {(!startDate || (startDate === endDate)) && (
                        <button
                          onClick={() => handlePrevDay(mergedGroups[0].date)}
                          className="p-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-accent)]" />
                        </button>
                      )}

                      <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200 min-w-[100px] text-center tracking-tight">
                        {headerText}
                      </h3>

                      {(!startDate || (startDate === endDate)) && (
                        <button
                          onClick={() => handleNextDay(mergedGroups[0].date)}
                          className={`p-1 px-2 rounded-lg transition-colors group ${availableDates[0] === mergedGroups[0].date || (!availableDates.includes(mergedGroups[0].date) && new Date(mergedGroups[0].date) >= new Date()) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50 cursor-pointer'}`}
                          disabled={availableDates[0] === mergedGroups[0].date || (!availableDates.includes(mergedGroups[0].date) && new Date(mergedGroups[0].date) >= new Date())}
                        >
                          <ChevronRight className={`w-4 h-4 text-gray-400 ${availableDates[0] === mergedGroups[0].date || (!availableDates.includes(mergedGroups[0].date) && new Date(mergedGroups[0].date) >= new Date()) ? '' : 'group-hover:text-[var(--color-accent)]'}`} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-12">
                      {mergedGroups.map((group) => {
                        const filteredGroupItems = group.items;

                        return (
                          <div key={group.date} className="flex flex-col gap-6">
                            {/* 개별 날짜 구분 헤더 */}
                            {isRangeSelected && (
                              <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest bg-gray-50/50 dark:bg-gray-900/50 px-3 py-1 rounded-full border border-gray-100 dark:border-white/5">
                                  {group.date.replace(/-/g, '.')}
                                </span>
                                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {filteredGroupItems.map((item: any, iIdx: number) => (
                                <TimelineItem key={item.paperId || iIdx} data={toTimelineItemData(item, bookmarkedIds)} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="w-full h-10 flex justify-center items-center mt-6">
                      {isFetchingNextPage && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          이전 논문 로딩 중...
                        </div>
                      )}
                      {!isFetchingNextPage && hasNextPage && (
                        <p ref={infiniteAnchorRef} className="text-xs text-gray-400 font-bold">스크롤하면 이전 논문을 불러옵니다.</p>
                      )}
                      {(!hasNextPage && !isFetchingNextPage) && (
                        <p className="text-xs text-gray-400 font-bold">마지막 논문입니다.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  displayDate && (
                    <div className="w-full flex flex-col items-center justify-center py-20 text-gray-400">
                      <div className="flex items-center gap-3 mb-6 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-2xl border border-gray-100 dark:border-white/5">
                        <button onClick={() => handlePrevDay(displayDate)} className="p-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                          <ChevronLeft className="w-4 h-4 text-gray-400" />
                        </button>
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[100px] text-center">{displayDate.replace(/-/g, '.')}</span>
                        <button onClick={() => handleNextDay(displayDate)} className="p-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <p className="text-sm">해당 날짜에 조회된 논문이 없습니다.</p>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        <CalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          availableDates={availableDates}
          startDate={startDate}
          endDate={endDate}
          onRangeSelect={handleRangeSelect}
        />
      </div>
    </div>
  );
};
