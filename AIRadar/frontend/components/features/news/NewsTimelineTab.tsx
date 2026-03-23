'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Loading from '@/app/loading';
import { TimelineFilter } from './TimelineFilter';
import { TimelineItem, TimelineItemData } from './TimelineItem';
import { useNewsListQuery, useInfiniteNewsQuery } from '@/hooks/queries/useNewsQuery';
import { usePersonalizedNewsQuery } from '@/hooks/queries/useRecommendationQuery';
import { useAuth } from '../auth/AuthContext';
import { useTracking } from '@/hooks/useTracking';
import { Sparkles, ExternalLink } from 'lucide-react';
import type { NewsListItem, DailyNewsGroup } from '@/types/news';

// NewsListItem → TimelineItemData 매핑 함수
function toTimelineItemData(news: NewsListItem): TimelineItemData {
  return {
    id: news.articleId,
    category: categoryLabel(news.category),
    region: news.region === 'DOMESTIC' ? '국내' : '해외',
    title: news.title,
    summary: news.summary ?? '',
    publisher: news.source,
    date: formatDate(news.publishedAt),
    hashtags: [],
    isHot: news.score >= 0.8,
    url: news.url,
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

  const region =
    regionFilter === 'domestic' ? 'DOMESTIC' : regionFilter === 'international' ? 'GLOBAL' : undefined;

  // 0) 개인화 추천 피드 (로그인 시에만)
  const { data: recommendations } = usePersonalizedNewsQuery(5, isLoggedIn);

  // 1) 기본 조회 (최근 4일) : selectedDate가 없을 때 활성화
  const {
    data: recentGroups,
    isLoading: isRecentLoading,
    isError: isRecentError
  } = useNewsListQuery({ region });

  // 2) 특정 날짜 무한 스크롤 : selectedDate가 있을 때만 활성화
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInfiniteLoading,
    isError: isInfiniteError
  } = useInfiniteNewsQuery({ region, date: selectedDate || undefined });

  // 날짜 기반으로 그룹화 병합 처리
  const mergedGroups = useMemo<DailyNewsGroup[]>(() => {
    if (!selectedDate) {
      if (!recentGroups) return [];
      // 일별 7개로 제한
      return recentGroups.map(group => ({
        ...group,
        items: group.items.slice(0, 7)
      }));
    }

    if (!infiniteData) return [];

    const flattened = infiniteData.pages.flat();
    const map = new Map<string, NewsListItem[]>();

    for (const group of flattened) {
      if (!map.has(group.date)) map.set(group.date, []);
      map.get(group.date)!.push(...group.items);
    }

    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [selectedDate, recentGroups, infiniteData]);

  // 달력 모달 등에서 활성화할 수 있는 전체 가용 날짜 리스트 (기본 조회 데이터 기준)
  const availableDates = useMemo(() =>
    recentGroups ? recentGroups.map(group => group.date) : [],
    [recentGroups]
  );

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
  }, [handleObserver, selectedDate]);

  const isLoading = selectedDate ? isInfiniteLoading : isRecentLoading;
  const isError = selectedDate ? isInfiniteError : isRecentError;

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
      <div className="w-full max-w-4xl">
        {/* 추천 뉴스 섹션 (로그인 시 & 날짜 미선택 시) */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec) => (
                <a
                  key={rec.articleId}
                  href={rec.url || (rec.articleId.startsWith('http') ? rec.articleId : `/news/${rec.articleId}`)}
                  target={(rec.url || rec.articleId.startsWith('http')) ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackArticleClick(rec.articleId);
                  }}
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
        />

        <div className="mt-8 flex flex-col gap-10">
          {mergedGroups.map((group, gIdx) => (
            <div key={group.date || gIdx} className="relative">
              {/* 날짜 헤더 영역 */}
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] opacity-80" />
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {group.date.replace(/-/g, '.')}
                </h3>

                {/* 4일치 기본 화면에서 '더보기' 버튼: 클릭 시 해당 일자 상세 필터(selectedDate)로 전환 */}
                {!selectedDate && (
                  <button
                    onClick={() => setSelectedDate(group.date)}
                    className="ml-auto text-[13px] font-bold text-gray-400 hover:text-[var(--color-accent)] transition-colors"
                  >
                    이 날짜 뉴스 전체 보기 →
                  </button>
                )}
              </div>

              {/* 해당 날짜의 뉴스 아이템 리스트 래퍼 (왼쪽 세로선 포함) */}
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-2">
                <div className="flex flex-col gap-4">
                  {group.items.map((item, iIdx) => (
                    <TimelineItem key={item.articleId || iIdx} data={toTimelineItemData(item)} />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* 특정 날짜 선택 시 무한스크롤용 옵저버 타겟 */}
          {selectedDate && (
            <div ref={observerRef} className="w-full h-10 flex justify-center items-center mt-6">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  뉴스를 더 불러오는 중...
                </div>
              )}
              {!hasNextPage && mergedGroups.length > 0 && !isFetchingNextPage && (
                <p className="text-xs text-gray-400 font-bold">마지막 뉴스입니다.</p>
              )}
            </div>
          )}

          {mergedGroups.length === 0 && (
            <div className="w-full flex justify-center py-20 text-gray-400 text-sm">
              조회된 뉴스가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
