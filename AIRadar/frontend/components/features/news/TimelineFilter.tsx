import { CalendarDays } from 'lucide-react';

interface TimelineFilterProps {
  currentCategory: 'all' | 'domestic' | 'international';
  setCategory: (cat: 'all' | 'domestic' | 'international') => void;
}

export const TimelineFilter = ({ currentCategory, setCategory }: TimelineFilterProps) => {
  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* 검색 필터 라운드 박스 구역 */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-[#1a1c2e] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm w-fit min-w-[320px]">
        {/* 상단 라디오 타입: 전체 / 국내 / 해외 */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: '전체' },
            { id: 'domestic', label: '국내' },
            { id: 'international', label: '해외' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setCategory(type.id as typeof currentCategory)}
              className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                currentCategory === type.id
                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        
        {/* 하단 서브 필터 (디자인 목업 요소) */}
        <div className="flex gap-2">
          <button className="px-5 py-1.5 rounded-full bg-[var(--color-accent)] text-white text-sm font-semibold">전체</button>
          <button className="px-5 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-500 text-sm font-semibold">필터</button>
          <button className="px-5 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-500 text-sm font-semibold">필터</button>
          <button className="px-5 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-500 text-sm font-semibold">필터</button>
        </div>
      </div>

      {/* 달력 모양 버튼 */}
      <div className="w-fit">
        <button className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          달력
          <CalendarDays className="w-5 h-5 ml-1 text-gray-500" />
        </button>
      </div>
    </div>
  );
};
