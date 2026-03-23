// components/features/papers/PaperTimelineTab.tsx
'use client';

import { useState, useMemo } from 'react';
import { TimelineItem, TimelineItemData } from '../news/TimelineItem';
import { usePaperDailyQuery } from '@/hooks/queries/usePaperQuery';
import { useBookmarksQuery } from '@/hooks/queries/useUserQuery';
import { usePersonalizedPapersQuery } from '@/hooks/queries/useRecommendationQuery';
import { useAuth } from '../auth/AuthContext';
import { PaperFilter } from './PaperFilter';
import { Sparkles, ExternalLink } from 'lucide-react';
import Loading from '@/app/loading';

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
  
  // 0) 북마크 목록 조회 (로그인 시에만)
  const { data: bookmarks } = useBookmarksQuery();
  const bookmarkedIds = useMemo(() => new Set(bookmarks?.map(b => b.articleId) || []), [bookmarks]);

  // 0) 개인화 논문 추천 피드 (로그인 시 & 날짜 미선택 시)
  const { data: recommendations } = usePersonalizedPapersQuery(4, isLoggedIn && !selectedDate);

  // 1) 기본 조회 (최근 4일)
  const { 
    data: recentGroups, 
    isLoading: isRecentLoading, 
    isError: isRecentError 
  } = usePaperDailyQuery();

  // 2) 특정 날짜 조회 (selectedDate가 있을 때만 활성화)
  const { 
    data: filteredGroups, 
    isLoading: isFilteredLoading, 
    isError: isFilteredError 
  } = usePaperDailyQuery(selectedDate ? { date: selectedDate } : undefined);

  // 현재 보여줄 날짜 그룹 결정
  const renderedGroups = useMemo(() => {
    if (selectedDate) {
      return filteredGroups || [];
    }
    
    // 초기 화면: 일별 최대 7개로 제한
    if (!recentGroups) return [];
    return recentGroups.map(group => ({
      ...group,
      items: group.items.slice(0, 7)
    }));
  }, [selectedDate, filteredGroups, recentGroups]);

  // 가용 날짜 리스트 추출 (기본 조회 데이터 기준)
  const availableDates = useMemo(() => {
    return recentGroups ? recentGroups.map(group => group.date) : [];
  }, [recentGroups]);

  const isLoading = selectedDate ? isFilteredLoading : isRecentLoading;
  const isError = selectedDate ? isFilteredError : isRecentError;

  if (isLoading) return <Loading />;
  if (isError) return <div className="py-20 text-center text-red-500">데이터를 불러오지 못했습니다.</div>;

  return (
    <div className="w-full flex flex-col items-center py-6">
      <div className="w-full max-w-4xl">
        
        {/* 추천 논문 섹션 (로그인 시 & 날짜 미선택 시) */}
        {isLoggedIn && !selectedDate && recommendations && recommendations.length > 0 && (
          <div className="mb-12 px-4">
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
                  className="group relative bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 p-5 rounded-2xl hover:shadow-xl hover:border-[var(--color-accent)]/30 transition-all duration-300 flex flex-col h-full"
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
        {/* 날짜 필터 섹션 */}
        <PaperFilter 
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <div className="flex flex-col gap-10">
          {renderedGroups.map((group, gIdx) => (
            <div key={group.date || gIdx} className="relative">
              {/* 날짜 헤더 영역 */}
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] opacity-80" />
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {group.date.replace(/-/g, '.')}
                </h3>
                
                {/* 특정 날짜 미선택 시 나타나는 '더보기' 버튼 */}
                {!selectedDate && (
                  <button
                    onClick={() => setSelectedDate(group.date)}
                    className="ml-auto text-[13px] font-bold text-gray-400 hover:text-[var(--color-accent)] transition-colors"
                  >
                    이 날짜 논문 전체 보기→
                  </button>
                )}
              </div>

              {/* 해당 날짜의 논문 아이템 리스트 래퍼 (왼쪽 세로선 포함) */}
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-2">
                <div className="flex flex-col gap-4">
                  {group.items.map((item, iIdx) => (
                    <TimelineItem key={item.paperId || iIdx} data={toTimelineItemData(item, bookmarkedIds)} />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {renderedGroups.length === 0 && (
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
