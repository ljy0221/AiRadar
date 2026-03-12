import { TrendingUp } from 'lucide-react';

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
}

interface TimelineItemProps {
  data: TimelineItemData;
}

export const TimelineItem = ({ data }: TimelineItemProps) => {
  return (
    <div className="relative pl-8 pb-10">
      {/* 타임라인 왼쪽 점(선 렌더링은 상위 리스트 그룹 컨테이너가 제어) */}
      <div className="absolute left-[-5px] top-6 w-3 h-3 rounded-full bg-gray-600 dark:bg-gray-400 z-10 border-2 border-white dark:border-[#0A0B1A]"></div>
      
      {/* 뉴스 카드 콘텐츠 영역 */}
      <div className="bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl py-5 px-6 ml-2 hover:shadow-md transition-shadow">
        {/* 상단 뱃지 및 주목 아이콘 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
             <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md">NEWS</span>
             <span className="px-2 py-0.5 bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md flex items-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {data.category}
             </span>
             <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md">{data.region}</span>
          </div>
          
          {data.isHot && (
            <div className="flex items-center gap-1 text-[var(--color-accent)] text-xs font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" /> 주목
            </div>
          )}
        </div>

        {/* 메인 텍스트 정보 */}
        <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100 tracking-tight leading-snug">{data.title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {data.summary}
        </p>

        {/* 하단 출처 & 날짜 / 해시태그 */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mt-4">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            <span>{data.publisher}</span>
            <span className="mx-2">·</span>
            <span>{data.date}</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {data.hashtags.map((tag, idx) => (
              <span key={idx} className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
