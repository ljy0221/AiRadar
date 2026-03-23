// components/features/profile/BookmarkList.tsx
'use client';

import { useMemo, useState } from 'react';
import { useBookmarksQuery } from '@/hooks/queries/useUserQuery';
import { fetchNewsDetail } from '@/services/news/newsApi';
import { paperApi } from '@/services/paper/paperApi';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Bookmark, Clock, Loader2, Trash2 } from 'lucide-react';
import { bookmarkApi } from '@/services/bookmarks/bookmarkApi';
import { userQueryKeys } from '@/hooks/queries/useUserQuery';
import { BookmarkItem } from '@/types/user';

export const BookmarkList = () => {
  const [activeTab, setActiveTab] = useState<'news' | 'paper'>('news');
  const queryClient = useQueryClient();

  const handleDelete = async (id: string) => {
    if (!confirm('북마크를 해제하시겠습니까?')) return;
    
    try {
      await bookmarkApi.removeBookmark(id);
      // 북마크 목록 및 상태 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: userQueryKeys.bookmarks });
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      alert('북마크 해제에 실패했습니다.');
    }
  };

  // 1) 북마크 ID 목록 조회
  const { data: bookmarkHistories, isLoading: isIdsLoading } = useBookmarksQuery();

  // 2) 각 ID별 상세 정보 조회를 위한 useQueries 구성
  const results = useQueries({
    queries: (bookmarkHistories || []).map((history) => {
      return {
        queryKey: ['bookmark-detail', history.articleId],
        queryFn: async () => {
          // 1. 먼저 뉴스 소스로 시도
          try {
            const newsDetail = await fetchNewsDetail(history.articleId);
            return { ...newsDetail, __type: 'news' };
          } catch (e) {
            // 2. 뉴스 실패 시 논문 소스로 시도
            try {
              const paperDetail = await paperApi.getPaperDetail(history.articleId);
              return { ...paperDetail, __type: 'paper' };
            } catch (e2) {
              return null;
            }
          }
        },
        staleTime: 1000 * 60 * 10,
      };
    }),
  });

  const isLoading = isIdsLoading || (bookmarkHistories && bookmarkHistories.length > 0 && results.some(r => r.isLoading));

  // 3) 결과 데이터 가공 및 필터링
  const { filteredBookmarks, newsCount, paperCount } = useMemo(() => {
    if (!bookmarkHistories || (bookmarkHistories.length > 0 && results.some(r => r.isLoading))) {
      return { filteredBookmarks: [], newsCount: 0, paperCount: 0 };
    }

    const all = bookmarkHistories.map((history, index) => {
      const detail = results[index]?.data as any;
      if (!detail) return null;

      const isPaper = detail.__type === 'paper';
      
      return {
        id: history.articleId,
        type: isPaper ? 'paper' : ('news' as const),
        title: detail.title || '제목 없음',
        source: detail.source || (isPaper ? 'Arxiv' : 'News'),
        category: detail.category || '기타',
        occurredAt: history.occurredAt,
        url: detail.url || ''
      } as BookmarkItem;
    }).filter(Boolean) as BookmarkItem[];

    const news = all.filter(b => b.type === 'news');
    const papers = all.filter(b => b.type === 'paper');

    return {
      filteredBookmarks: activeTab === 'news' ? news : papers,
      newsCount: news.length,
      paperCount: papers.length
    };
  }, [bookmarkHistories, results, activeTab]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '날짜 미상';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 mt-8 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin mb-4" />
        <p className="text-gray-500 text-sm">북마크 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg">
            <Bookmark className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">북마크 보관함</h3>
            <p className="text-gray-400 text-xs mt-1">사용자가 저장한 뉴스 및 논문을 유형별로 확인하세요.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'news'
                ? 'bg-white dark:bg-gray-800 text-[var(--color-accent)] shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            뉴스 <span className="opacity-60 text-[10px]">{newsCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('paper')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'paper'
                ? 'bg-white dark:bg-gray-800 text-[var(--color-accent)] shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            논문 <span className="opacity-60 text-[10px]">{paperCount}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-h-[200px]">
        {filteredBookmarks.map((item) => (
          <div 
            key={item.id}
            className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-[var(--color-accent)]/30 hover:shadow-md transition-all duration-300 min-h-[120px]"
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-2 h-4">
                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.source} · {item.category}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 group-hover:text-[var(--color-accent)] transition-colors h-10 flex items-center">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 h-4">
                <Clock className="w-3 h-3" />
                <span>{formatDate(item.occurredAt)} 저장됨</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 md:mt-0 h-10">
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2.5 bg-white dark:bg-gray-800 text-blue-500 hover:text-gray-400 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm transition-all"
                title="북마크 해제"
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>
              {item.url && (
                <a 
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-[var(--color-accent)] border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm transition-all"
                  title="원문 보기"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}

        {filteredBookmarks.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center text-gray-400">
            <Bookmark className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">저장된 {activeTab === 'news' ? '뉴스' : '논문'}가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
