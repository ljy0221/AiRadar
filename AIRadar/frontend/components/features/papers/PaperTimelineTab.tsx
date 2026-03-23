// components/features/papers/PaperTimelineTab.tsx
'use client';

import { useState, useMemo } from 'react';
import { TimelineItem, TimelineItemData } from '../news/TimelineItem';
import { usePaperDailyQuery } from '@/hooks/queries/usePaperQuery';
import { useBookmarksQuery } from '@/hooks/queries/useUserQuery';
import { usePersonalizedPapersQuery } from '@/hooks/queries/useRecommendationQuery';
import { useAuth } from '../auth/AuthContext';
import { PaperFilter } from './PaperFilter';
import { Sparkles, ExternalLink, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import Loading from '@/app/loading';
import { CalendarModal } from '@/components/common';

// PaperItem → TimelineItemData 매핑 함수
function toTimelineItemData(paper: any, bookmarkedIds: Set<string>): TimelineItemData {
  return {
    id: paper.paperId,
    type: 'paper',
    category: paper.category,
    region: 'GLOBAL', // 논문은 기본적으로 글로벌 성격
    title: paper.title,
    summary: paper.summary || paper.abstractText || '요약 정보가 없습니다.',
    publisher: `${paper.source} · ${paper.authors?.join(', ') || '알 수 없음'}`,
    date: formatDate(paper.publishedAt),
    hashtags: paper.keywords || (paper.researchArea ? [paper.researchArea] : []),
    url: paper.url || '',
    isBookmarked: paper.isBookmarked || bookmarkedIds.has(paper.paperId),
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export const PaperTimelineTab = () => {
  const { isLoggedIn } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // 0) 북마크 목록 조회 (로그인 시에만)
  const { data: bookmarks } = useBookmarksQuery();
  const bookmarkedIds = useMemo(() => new Set(bookmarks?.map(b => b.articleId) || []), [bookmarks]);

  // 1) 기본 조회 (가용 날짜 확인용)
  const { 
    data: recentGroups, 
    isLoading: isRecentLoading, 
    isError: isRecentError 
  } = usePaperDailyQuery();

  const availableDates = useMemo(() => 
    recentGroups ? recentGroups.map(group => group.date) : [], 
    [recentGroups]
  );

  // 화면에 표시할 날짜 결정 (선택된 날짜가 없으면 가장 최신 날짜)
  const displayDate = selectedDate || (availableDates.length > 0 ? availableDates[0] : null);

  // 0) 개인화 논문 추천 피드 (로그인 시 & 날짜 미선택 시)
  const { data: recommendations } = usePersonalizedPapersQuery(4, isLoggedIn && !selectedDate);

  // 2) 특정 날짜 조회
  const { 
    data: filteredGroups, 
    isLoading: isFilteredLoading, 
    isError: isFilteredError 
  } = usePaperDailyQuery(displayDate ? { date: displayDate } : undefined);

  const currentGroup = filteredGroups?.[0] || null;

  // 화살표 네비게이션 핸들러
  const handlePrevDay = (currentStr: string) => {
    setActiveCategory('ALL'); // 날짜 변경 시 필터 초기화
    const d = new Date(currentStr);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const handleNextDay = (currentStr: string) => {
    setActiveCategory('ALL'); // 날짜 변경 시 필터 초기화
    const d = new Date(currentStr);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isLoading = displayDate ? isFilteredLoading : isRecentLoading;
  const isError = displayDate ? isFilteredError : isRecentError;

  if (isLoading) return <Loading />;
  if (isError) return <div className="py-20 text-center text-red-500">데이터를 불러오지 못했습니다.</div>;

  return (
    <div className="w-full flex flex-col items-center py-6">
      <div className="w-full max-w-4xl">
        
        {/* 추천 논문 섹션 (로그인 시 & 날짜 미선택 시) */}
        {isLoggedIn && !selectedDate && recommendations && recommendations.length > 0 && (
          <div className="mb-12 px-4 text-center md:text-left">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 italic tracking-tight uppercase">오늘의 추천 논문</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec) => (
                <a
                  key={rec.paperId}
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 p-5 rounded-2xl hover:shadow-xl hover:border-[var(--color-accent)]/30 transition-all duration-300 flex flex-col h-full text-left"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-black rounded-md uppercase tracking-wider">
                      {rec.reason === 'ALS' ? '맞춤 추천' : rec.reason === 'KEYWORD_MATCH' ? '관심 키워드' : '인기 논문'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">
                      {rec.authors?.[0] || 'Unknown'} {rec.authors?.length > 1 ? '외' : ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug group-hover:text-[var(--color-accent)] transition-colors mb-3">
                    {rec.title}
                  </h4>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-1.5 overflow-hidden">
                      {rec.keywords?.slice(0, 2).map(kw => (
                        <span key={kw} className="text-[10px] text-gray-400 truncate">#{kw}</span>
                      ))}
                      {!rec.keywords?.length && rec.researchArea && (
                        <span className="text-[10px] text-gray-400 truncate">#{rec.researchArea}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      원문보기 <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="px-4">
        {/* 통합 필터 섹션 (뉴스 섹션 스타일 적용) */}
        <div className="bg-gray-50/50 dark:bg-[#11121A] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-12">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">일별 논문 탐색</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCalendarOpen(true)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                  selectedDate 
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20 shadow-sm' 
                    : 'border-gray-200 dark:border-gray-800/80 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#171924] hover:bg-gray-50 dark:hover:bg-[#1c1f2e]'
                }`}
              >
                <CalendarDays className={`w-4 h-4 ${selectedDate ? 'text-[var(--color-accent)]' : 'text-gray-500 dark:text-gray-400'}`} />
                {selectedDate ? selectedDate.replace(/-/g, '.') : '날짜 선택'}
              </button>
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-800/80 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1c1f2e] transition-colors"
                  title="필터 초기화"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 카테고리/키워드 필터 칩 */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['ALL', ...Array.from(new Set(currentGroup?.items.map((item: any) => item.category) || []))].map(keyword => {
              const isActive = activeCategory === keyword;
              return (
                <button
                  key={keyword}
                  onClick={() => setActiveCategory(keyword)}
                  className={`shrink-0 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                    isActive
                      ? 'border-emerald-500/80 text-emerald-500 bg-emerald-500/5'
                      : 'border-gray-300 dark:border-gray-800/80 text-gray-600 dark:text-gray-400 bg-transparent hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  {keyword === 'ALL' ? '전체' : keyword}
                </button>
              );
            })}
          </div>
        </div>

        <CalendarModal 
          isOpen={isCalendarOpen} 
          onClose={() => setIsCalendarOpen(false)}
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <div className="flex flex-col gap-10">
          {currentGroup ? (
            <div key={currentGroup.date} className="relative">
              {/* 날짜 헤더 영역과 좌우 화살표 */}
              <div className="flex items-center gap-3 mb-6 relative z-10 bg-white dark:bg-[#0b0c10] py-2 sticky top-[60px] md:top-[70px]">
                <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] opacity-80 shrink-0" />
                
                <button
                  onClick={() => handlePrevDay(currentGroup.date)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors group ml-2"
                  title="이전 날짜 (과거)"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-accent)]" />
                </button>
                
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 min-w-[140px] text-center">
                  {currentGroup.date.replace(/-/g, '.')}
                </h3>
                
                <button
                  onClick={() => handleNextDay(currentGroup.date)}
                  className={`p-1.5 rounded-full transition-colors group ${availableDates[0] === currentGroup.date || !availableDates.includes(currentGroup.date) && new Date(currentGroup.date) >= new Date() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'}`}
                  disabled={availableDates[0] === currentGroup.date || !availableDates.includes(currentGroup.date) && new Date(currentGroup.date) >= new Date()}
                  title="다음 날짜 (최신)"
                >
                  <ChevronRight className={`w-5 h-5 text-gray-400 ${availableDates[0] === currentGroup.date || !availableDates.includes(currentGroup.date) && new Date(currentGroup.date) >= new Date() ? '' : 'group-hover:text-[var(--color-accent)]'}`} />
                </button>
              </div>

              {/* 해당 날짜의 논문 아이템 리스트 래퍼 (왼쪽 세로선 포함) */}
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-2">
                <div className="flex flex-col gap-4">
                  {currentGroup.items
                    .filter((item: any) => activeCategory === 'ALL' || item.category === activeCategory)
                    .map((item: any, iIdx: number) => (
                      <TimelineItem key={item.paperId || iIdx} data={toTimelineItemData(item, bookmarkedIds)} />
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center py-20 text-gray-400 text-sm">
              조회된 논문이 없습니다.
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
