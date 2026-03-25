'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Loading from '@/app/loading';
import { TimelineFilter } from './TimelineFilter';
import { TimelineItem, TimelineItemData } from './TimelineItem';
import { TrendingKeywords } from './TrendingKeywords';
import { useNewsListQuery, useInfiniteNewsQuery } from '@/hooks/queries/useNewsQuery';
import { useBookmarksQuery } from '@/hooks/queries/useUserQuery';
import { usePersonalizedNewsQuery } from '@/hooks/queries/useRecommendationQuery';
import { useAuth } from '../auth/AuthContext';
import { useTracking } from '@/hooks/useTracking';
import { Sparkles, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { NewsListItem, DailyNewsGroup, NewsCategory } from '@/types/news';

// NewsListItem → TimelineItemData 매핑 함수
function toTimelineItemData(news: NewsListItem, bookmarkedIds: Set<string>): TimelineItemData {
  return {
    id: news.articleId,
    type: 'news',
    category: categoryLabel(news.category),
    region: news.region === 'DOMESTIC' ? '국내' : '해외',
    title: news.title,
    summary: news.summary ?? '',
    publisher: news.source,
    date: formatDate(news.publishedAt),
    hashtags: news.keywords || [],
    isHot: news.score >= 0.8,
    url: news.url,
    isBookmarked: news.isBookmarked || bookmarkedIds.has(news.articleId),
  };
}

function categoryLabel(cat: NewsListItem['category']): string {
  const map: Record<string, string> = {
    LLM: '대형 언어 모델',
    Vision: '비전 AI',
    Semiconductor: '반도체',
    ETC: '기타 뉴스',
  };
  return map[cat] ?? cat;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const NewsTimelineTab = () => {
  const { isLoggedIn } = useAuth();
  const { trackArticleClick } = useTracking();
  const [regionFilter, setRegionFilter] = useState<'all' | 'domestic' | 'international'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // 0) 북마크 목록 조회 (로그인 시에만)
  const { data: bookmarks } = useBookmarksQuery();
  const bookmarkedIds = useMemo(() => new Set(bookmarks?.map(b => b.articleId) || []), [bookmarks]);

  const region =
    regionFilter === 'domestic' ? 'DOMESTIC' : regionFilter === 'international' ? 'GLOBAL' : undefined;

  // 1) 기본 조회 (최근 일자 확인용)
  const {
    data: recentGroups,
    isLoading: isRecentLoading,
    isError: isRecentError
  } = useNewsListQuery({ region }); // API 필터 제거 (전체 뉴스를 가져와 로컬 필터링 수행)

  const availableDates = useMemo(() =>
    recentGroups ? recentGroups.map(group => group.date) : [],
    [recentGroups]
  );

  // 화면에 표시할 날짜 결정 (선택된 날짜가 없으면 가장 최신 날짜)
  const displayDate = selectedDate || (availableDates.length > 0 ? availableDates[0] : null);

  // 2) 특정 날짜 무한 스크롤 : displayDate 기준으로 활성화
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInfiniteLoading,
    isError: isInfiniteError
  } = useInfiniteNewsQuery({ region, date: displayDate || undefined }); // API 필터 제거

  // 0) 개인화 추천 피드 (로그인 시 & 기본 상태일 때만)
  const { data: recommendations } = usePersonalizedNewsQuery(5, isLoggedIn);

  // 날짜 기반 데이터 병합 처리 (displayDate 단일 날짜만)
  const mergedGroups = useMemo<DailyNewsGroup[]>(() => {
    if (infiniteData && infiniteData.pages.length > 0) {
      const flattened = infiniteData.pages.flat();
      const map = new Map<string, NewsListItem[]>();
      for (const group of flattened) {
        if (!map.has(group.date)) map.set(group.date, []);
        map.get(group.date)!.push(...group.items);
      }
      return Array.from(map.entries())
        .filter(([date]) => date === displayDate)
        .map(([date, items]) => ({ date, items }));
    }
    
    if (recentGroups && displayDate) {
      const targetGroup = recentGroups.find(g => g.date === displayDate);
      if (targetGroup) return [targetGroup];
    }

    return [];
  }, [displayDate, infiniteData, recentGroups]);

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
  
  // 렌더링할 단일 날짜 그룹 (없으면 null)
  const currentGroup = mergedGroups.length > 0 ? mergedGroups[0] : null;

  // 동적으로 수집된 키워드/카테고리 리스트
  const availableKeywords = useMemo(() => {
    if (!currentGroup) return [];
    const keys = new Set<string>();
    currentGroup.items.forEach(item => {
      const itemKeys = item.keywords && item.keywords.length > 0 
        ? item.keywords 
        : [categoryLabel(item.category)];
      itemKeys.forEach(k => keys.add(k));
    });
    return Array.from(keys);
  }, [currentGroup]);

  // 필터링 적용된 최종 리스트
  const filteredItems = useMemo(() => {
    if (!currentGroup) return [];
    if (activeCategory === 'ALL') return currentGroup.items;
    
    return currentGroup.items.filter(item => {
      const itemKeys = item.keywords && item.keywords.length > 0 
        ? item.keywords 
        : [categoryLabel(item.category)];
      return itemKeys.includes(activeCategory);
    });
  }, [currentGroup, activeCategory]);

  // 로딩 밑 에러 상태 체크
  const isLoading = displayDate ? (isInfiniteLoading && mergedGroups.length === 0) : isRecentLoading;
  const isError = displayDate ? (isInfiniteError && mergedGroups.length === 0) : (isRecentError && recentGroups === undefined);

  // 무한 스크롤 Intersection Observer 세팅
  const observerRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [handleObserver, displayDate]);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <div className="w-full flex justify-center py-20">
        <p className="text-sm text-red-500">뉴스 데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 추천 뉴스 섹션 (로그인 시 & default 화면일 때만) */}
        {isLoggedIn && !selectedDate && recommendations && recommendations.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 italic tracking-tight uppercase">오늘의 추천 뉴스</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.slice(0, 4).map((rec) => (
                <a
                  key={rec.articleId}
                  href={rec.url || (rec.articleId.startsWith('http') ? rec.articleId : `/news/${rec.articleId}`)}
                  target={(rec.url || rec.articleId.startsWith('http')) ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={() => trackArticleClick(rec.articleId)}
                  className="group relative bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 p-5 rounded-2xl hover:shadow-xl hover:border-[var(--color-accent)]/30 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-black rounded-md uppercase tracking-wider">
                      {rec.reason === 'ALS' ? '맞춤 추천' : rec.reason === 'KEYWORD_MATCH' ? '관심 키워드' : '인기 뉴스'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{rec.source}</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug group-hover:text-[var(--color-accent)] transition-colors mb-3">
                    {rec.title}
                  </h4>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-1.5 overflow-hidden">
                      {rec.keywords.slice(0, 2).map(kw => (
                        <span key={kw} className="text-[10px] text-gray-400 truncate">#{kw}</span>
                      ))}
                    </div>
                    <div className="text-[10px] font-bold text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      읽어보기 <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}



        <TimelineFilter
          currentCategory={regionFilter}
          setCategory={setRegionFilter}
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          availableKeywords={availableKeywords}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />

        <div className="mt-4 flex flex-col gap-10">
          {currentGroup ? (
            <div className="relative">
              {/* 날짜 헤더 영역과 좌우 화살표 */}
              <div className="inline-flex items-center gap-3 mb-8 relative z-10 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-90 shrink-0" />
                
                <button
                  onClick={() => handlePrevDay(currentGroup.date)}
                  className="p-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                  title="이전 날짜 (과거)"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-accent)]" />
                </button>
                
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200 min-w-[100px] text-center tracking-tight">
                  {currentGroup.date.replace(/-/g, '.')}
                </h3>
                
                <button
                  onClick={() => handleNextDay(currentGroup.date)}
                  className={`p-1 px-2 rounded-lg transition-colors group ${availableDates[0] === currentGroup.date || !availableDates.includes(currentGroup.date) && new Date(currentGroup.date) >= new Date() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50 cursor-pointer'}`}
                  disabled={availableDates[0] === currentGroup.date || !availableDates.includes(currentGroup.date) && new Date(currentGroup.date) >= new Date()}
                  title="다음 날짜 (최신)"
                >
                  <ChevronRight className={`w-4 h-4 text-gray-400 ${availableDates[0] === currentGroup.date || !availableDates.includes(currentGroup.date) && new Date(currentGroup.date) >= new Date() ? '' : 'group-hover:text-[var(--color-accent)]'}`} />
                </button>
              </div>

              {/* 해당 날짜의 뉴스 아이템 리스트 래퍼 */}
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item, iIdx) => (
                    <TimelineItem key={item.articleId || iIdx} data={toTimelineItemData(item, bookmarkedIds)} />
                  ))}
                </div>
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
                <p className="text-sm">해당 날짜에 조회된 뉴스가 없습니다.</p>
              </div>
            )
          )}

          {/* 특정 날짜 선택 시 무한스크롤용 옵저버 타겟 */}
          {displayDate && currentGroup && (
            <div ref={observerRef} className="w-full h-10 flex justify-center items-center mt-6">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  뉴스를 더 불러오는 중...
                </div>
              )}
              {!hasNextPage && !isFetchingNextPage && (
                <p className="text-xs text-gray-400 font-bold">마지막 뉴스입니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
