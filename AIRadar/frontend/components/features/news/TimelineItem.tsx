'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, ExternalLink, Bookmark, Clock, Globe, X } from 'lucide-react';
import { useTracking } from '@/hooks/useTracking';
import { useAuth } from '../auth/AuthContext';
import { bookmarkApi } from '@/services/bookmarks/bookmarkApi';
import { useQueryClient } from '@tanstack/react-query';
import { userQueryKeys } from '@/hooks/queries/useUserQuery';
import { Modal } from '@/components/common/Modal';

export interface TimelineItemData {
  id: string;
  type: 'news' | 'paper';
  category: string;
  region: string;
  title: string;
  summary: string;
  publisher: string;
  date: string;
  hashtags: string[];
  isHot?: boolean;
  url?: string;
  isBookmarked?: boolean;
  reason?: string;
}

interface TimelineItemProps {
  data: TimelineItemData;
}

export const TimelineItem = ({ data }: TimelineItemProps) => {
  const { isLoggedIn } = useAuth();
  const { trackBookmark, trackArticleClick } = useTracking();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(data.isBookmarked || false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 데이터(props) 변경 시 북마크 상태 동기화
  useEffect(() => {
    setIsBookmarked(data.isBookmarked || false);
  }, [data.isBookmarked]);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newStatus = !isBookmarked;
    setIsBookmarked(newStatus);

    if (newStatus) trackBookmark(data.id);

    try {
      if (data.type === 'news') {
        if (newStatus) await bookmarkApi.addNewsBookmark(data.id);
        else await bookmarkApi.removeNewsBookmark(data.id);
      } else {
        if (newStatus) await bookmarkApi.addPaperBookmark(data.id);
        else await bookmarkApi.removePaperBookmark(data.id);
      }
      queryClient.invalidateQueries({ queryKey: userQueryKeys.bookmarks });
    } catch (error) {
      setIsBookmarked(!newStatus);
      console.error('Bookmark error:', error);
    }
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const lowerCat = category.toLowerCase();
    
    // Green (Emerald): NLP, LLM, Language
    if (lowerCat.includes('언어') || lowerCat.includes('nlp') || lowerCat.includes('llm')) {
      return 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
    }
    // Purple: Semiconductor, RL, Agents
    if (lowerCat.includes('반도체') || lowerCat.includes('rl') || lowerCat.includes('robotics')) {
      return 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50';
    }
    // Blue: Vision
    if (lowerCat.includes('비전') || lowerCat.includes('vision')) {
      return 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
    }
    // Default: Cyan
    return 'bg-cyan-50 text-cyan-600 border border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/50';
  };

  return (
    <>
      <div 
        className="group/item flex flex-col h-full cursor-pointer" 
        onClick={handleCardClick}
      >
        {/* 뉴스 카드 콘텐츠 영역 */}
        <div className="flex-1 bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl p-6 flex flex-col hover:shadow-xl hover:border-[var(--color-accent)]/30 transition-all duration-300 relative overflow-hidden h-full">
          {/* 상단 뱃지 영역 */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-md tracking-wider uppercase">
                {data.type}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1.5 ${getCategoryColor(data.category)}`}>
                {data.category}
              </span>
              <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-md border border-gray-100 dark:border-gray-700">
                {data.region}
              </span>
            </div>

            {isLoggedIn && (
              <button
                onClick={handleBookmark}
                className={`p-1.5 rounded-lg transition-colors z-10 ${isBookmarked ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* 메인 제목 */}
          <div className="flex-1 mb-6">
            <h4 className="font-bold text-[17px] text-gray-900 dark:text-gray-100 tracking-tight leading-[1.5] group-hover/item:text-[var(--color-accent)] transition-colors line-clamp-3">
              {data.title}
            </h4>
          </div>

          {/* 하단 정보 영역 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800/50">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate max-w-[120px]">
                {data.publisher}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {data.date}
              </span>
            </div>

            {data.isHot && (
              <div className="flex items-center gap-1 text-[var(--color-accent)] text-[11px] font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> 주목
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 요약 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="2xl"
        title={data.type === 'paper' ? '논문 상세보기' : '뉴스 상세보기'}
      >
        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-bold rounded-md tracking-wider uppercase">
                {data.type}
              </span>
              <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${getCategoryColor(data.category)}`}>
                {data.category}
              </span>
              <span className="px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 text-[11px] font-bold rounded-md">{data.region}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
              {data.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-2 pb-4 border-b border-gray-50 dark:border-gray-800/50">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> {data.publisher}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {data.date}
              </div>
            </div>
          </div>

          <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800/80">
            <h4 className="text-sm font-bold text-[var(--color-accent)] mb-3 flex items-center gap-2">
              인사이트 요약
            </h4>
            <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-[1.8] whitespace-pre-line break-keep font-medium">
              {data.summary || '상세 요약 내용이 없습니다.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackArticleClick(data.id);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-accent)] text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all outline-none"
              >
                {data.type === 'paper' ? '논문 전문 보러가기' : '원문 기사 보러가기'} <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3.5 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all outline-none"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
