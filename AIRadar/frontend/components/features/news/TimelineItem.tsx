import { useState } from 'react';
import { TrendingUp, ExternalLink, Heart, Bookmark } from 'lucide-react';
import { useTracking } from '@/hooks/useTracking';

export interface TimelineItemData {
  id: string;
  category: string;
  region: string;
  title: string;
  summary: string;
  publisher: string;
  date: string;
  hashtags: string[];
  isHot?: boolean;
  url?: string;
}

interface TimelineItemProps {
  data: TimelineItemData;
}

export const TimelineItem = ({ data }: TimelineItemProps) => {
  const { trackLike, trackBookmark, trackArticleClick } = useTracking();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    if (!isLiked) trackLike(data.id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    if (!isBookmarked) trackBookmark(data.id);
  };

  return (
    <div className="relative pl-8 pb-10 group/item">
      {/* 타임라인 왼쪽 점 */}
      <div className="absolute left-[-5px] top-6 w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600 z-10 border-2 border-white dark:border-[#0A0B1A] group-hover/item:bg-[var(--color-accent)] group-hover/item:scale-125 transition-all"></div>
      
      {/* 뉴스 카드 콘텐츠 영역 */}
      <div className="bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl py-5 px-6 ml-2 hover:shadow-xl hover:border-[var(--color-accent)]/20 transition-all duration-300">
        {/* 상단 뱃지 및 주목 아이콘 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
             <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md">NEWS</span>
             <span className="px-2 py-0.5 bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md flex items-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {data.category}
             </span>
             <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md">{data.region}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {data.isHot && (
              <div className="flex items-center gap-1 text-[var(--color-accent)] text-[10px] font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                <TrendingUp className="w-3.5 h-3.5" /> 주목
              </div>
            )}
            <div className="flex items-center gap-1">
              <button 
                onClick={handleLike}
                className={`p-1.5 rounded-lg transition-colors ${isLiked ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={handleBookmark}
                className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 메인 텍스트 정보 */}
        <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100 tracking-tight leading-snug group-hover/item:text-[var(--color-accent)] transition-colors">{data.title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {data.summary}
        </p>

        {/* 하단 출처 & 날짜 / 해시태그 / 원문 링크 */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800/50">
          <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
            <span>{data.publisher}</span>
            <span className="mx-2">·</span>
            <span>{data.date}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.hashtags.map((tag, idx) => (
              <span key={idx} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded-md">
                #{tag}
              </span>
            ))}
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackArticleClick(data.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)]/10 text-[11px] text-[var(--color-accent)] font-bold rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-all ml-2"
              >
                뉴스 원문 보기 <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
