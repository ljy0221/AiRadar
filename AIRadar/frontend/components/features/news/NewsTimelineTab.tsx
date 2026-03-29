'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Loading from '@/app/loading';
import { TimelineFilter } from './TimelineFilter';
import { TimelineItem, TimelineItemData } from './TimelineItem';
import { TrendingKeywords } from './TrendingKeywords';
import { useAvailableNewsDates, useInfiniteNewsQuery } from '@/hooks/queries/useNewsQuery';
import { useBookmarksQuery } from '@/hooks/queries/useUserQuery';
import { usePersonalizedNewsQuery } from '@/hooks/queries/useRecommendationQuery';
import { useAuth } from '../auth/AuthContext';
import { useTracking } from '@/hooks/useTracking';
import { Sparkles, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { NewsListItem, DailyNewsGroup, NewsCategory } from '@/types/news';

const NEWS_CATEGORY_LABEL_TO_CODE: Record<string, NewsCategory> = {
  '대형 언어 모델': 'LLM',
  '비전 AI': 'Vision',
  '반도체': 'Semiconductor',
  '기타 뉴스': 'ETC',
};

const NEWS_CATEGORY_CODE_TO_LABEL: Record<NewsCategory, string> = {
  LLM: '대형 언어 모델',
  Vision: '비전 AI',
  Semiconductor: '반도체',
  ETC: '기타 뉴스',
};

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
  return NEWS_CATEGORY_CODE_TO_LABEL[cat as NewsCategory] ?? cat;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const NewsTimelineTab = () => {
  const { isLoggedIn } = useAuth();
  const { trackArticleClick } = useTracking();
  const [regionFilter, setRegionFilter] = useState<'all' | 'domestic' | 'international'>('all');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // 0) 북마크 목록 조회 (로그인 시에만)
  const { data: bookmarks } = useBookmarksQuery();
  const bookmarkedIds = useMemo(() => new Set(bookmarks?.map(b => b.articleId) || []), [bookmarks]);

  const region =
    regionFilter === 'domestic' ? 'DOMESTIC' : regionFilter === 'international' ? 'GLOBAL' : undefined;

  // 1) 가용 날짜 조회 (필터 연동)
  const { data: availableData } = useAvailableNewsDates({
    region,
    // 서브 필터(키워드)는 클라이언트에서 처리하므로 전체 날짜를 가져옵니다.
  });

  const availableDates = useMemo(() =>
    availableData?.dates || [],
    [availableData]
  );

  // 화면에 표시할 날짜 결정 (선택된 날짜가 없으면 가장 최신 날짜)
  const displayDate = startDate || (availableDates.length > 0 ? availableDates[0] : null);

  // 2) 특정 날짜/범위 뉴스 조회
  const isRangeSelected = !!(startDate && endDate && startDate !== endDate);
  const infiniteAnchorRef = useRef<HTMLElement | null>(null);

  const {
    data: infiniteNewsData,
    isLoading: isInfiniteLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError: isInfiniteError
  } = useInfiniteNewsQuery({
    region,
    category: activeCategory !== 'ALL' ? NEWS_CATEGORY_LABEL_TO_CODE[activeCategory] : undefined,
    date: !isRangeSelected ? (startDate || displayDate || undefined) : undefined,
    startDate: isRangeSelected ? startDate : undefined,
    endDate: isRangeSelected ? endDate : undefined,
    size: 30
  }, !!(isRangeSelected ? (startDate || endDate) : (startDate || displayDate)));

  // 0) 개인화 추천 피드 (로그인 시 & 기본 상태일 때만)
  const { data: recommendations } = usePersonalizedNewsQuery(5, isLoggedIn);

  // 날짜 기반 데이터 병합 처리
  const mergedGroups = useMemo<DailyNewsGroup[]>(() => {
    const sourceGroups = infiniteNewsData?.pages.flatMap((p) => p.groups || []) || [];

    if (!sourceGroups || sourceGroups.length === 0) return [];

    const groupedMap = new Map<string, DailyNewsGroup['items']>();
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
  }, [infiniteNewsData, isRangeSelected]);

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

  // 범위 선택 핸들러
  const handleRangeSelect = useCallback((start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
    setActiveCategory('ALL');
  }, []);

  // 화살표 네비게이션 핸들러 (단일 날짜 모드일 때만 작동 제안)
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

  // 동적으로 수집된 키워드/카테고리 리스트 (모든 그룹에서 수집)
  const availableKeywords = useMemo(() => {
    return ['대형 언어 모델', '비전 AI', '반도체', '기타 뉴스'];
  }, []);

  // 로딩 및 에러 상태 체크
  const isLoading = (isInfiniteLoading && mergedGroups.length === 0);
  const isError = (isInfiniteError && mergedGroups.length === 0);

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
        {isLoggedIn && !startDate && !endDate && recommendations && recommendations.length > 0 && (
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
          startDate={startDate}
          endDate={endDate}
          onRangeSelect={handleRangeSelect}
          availableKeywords={availableKeywords}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />

        <div className="mt-4 flex flex-col gap-10">
          {mergedGroups.length > 0 ? (
            <div className="relative">
              {/* 날짜 헤더 영역과 좌우 화살표 */}
              <div className="inline-flex items-center gap-3 mb-8 relative z-10 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-90 shrink-0" />

                {(!startDate || (startDate === endDate)) && (
                  <button
                    onClick={() => handlePrevDay(mergedGroups[0].date)}
                    className="p-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                    title="이전 날짜 (과거)"
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
                    title="다음 날짜 (최신)"
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 ${availableDates[0] === mergedGroups[0].date || (!availableDates.includes(mergedGroups[0].date) && new Date(mergedGroups[0].date) >= new Date()) ? '' : 'group-hover:text-[var(--color-accent)]'}`} />
                  </button>
                )}
              </div>

              {/* 뉴스 아이템 리스트 (날짜별로 그룹화하여 표시) */}
              <div className="flex flex-col gap-12">
                      {mergedGroups.map((group) => {
                  const filteredGroupItems = group.items;

                  return (
                    <div key={group.date} className="flex flex-col gap-6">
                      {/* 개별 날짜 구분 헤더 (범위 선택 시에만 표시하거나 항상 표시할 수 있음) */}
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
                        {filteredGroupItems.map((item, iIdx) => (
                          <TimelineItem key={item.articleId || iIdx} data={toTimelineItemData(item, bookmarkedIds)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                <p className="text-sm">조회된 뉴스가 없습니다.</p>
              </div>
            )
          )}

          {/* 마지막 뉴스 안내 */}
          {displayDate && mergedGroups.length > 0 && (
            <div className="w-full h-10 flex justify-center items-center mt-6">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  이전 뉴스 로딩 중...
                </div>
              )}
              {!isFetchingNextPage && hasNextPage && (
                <p ref={infiniteAnchorRef} className="text-xs text-gray-400 font-bold">스크롤하면 이전 뉴스를 불러옵니다.</p>
              )}
              {(!hasNextPage && !isFetchingNextPage) && (
                <p className="text-xs text-gray-400 font-bold">마지막 뉴스입니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
