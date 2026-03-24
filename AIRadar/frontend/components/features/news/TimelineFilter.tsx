import { useState, useCallback } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { CalendarModal } from '@/components/common';

interface TimelineFilterProps {
  currentCategory: 'all' | 'domestic' | 'international';
  setCategory: (cat: 'all' | 'domestic' | 'international') => void;
  availableDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  availableKeywords?: string[];
  activeCategory?: string;
  setActiveCategory?: (cat: string) => void;
}

export const TimelineFilter = ({
  currentCategory,
  setCategory,
  availableDates,
  selectedDate,
  onDateSelect,
  availableKeywords = [],
  activeCategory = 'ALL',
  setActiveCategory
}: TimelineFilterProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleCloseCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  return (
    <div className="flex flex-col mb-8">
      {/* 
        통합 필터 컨테이너 (스크린샷 참고 레이아웃) 
        - 외부 다크/화이트 카드형 블록
      */}
      <div className="bg-gray-50/50 dark:bg-[#11121A] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">

        {/* 상단 행: 지역 필터(좌) + 날짜 필터(우) */}
        <div className="flex justify-between items-center mb-5">
          {/* 1) 지역 검색 필터 구역 */}
          <div className="flex items-center w-fit bg-gray-200/50 dark:bg-[#191b26] p-1 rounded-xl shadow-inner border border-gray-200/50 dark:border-gray-800/50">
            {[
              { id: 'all', label: '전체' },
              { id: 'domestic', label: '국내' },
              { id: 'international', label: '해외' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setCategory(type.id as typeof currentCategory)}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${currentCategory === type.id
                    ? 'bg-white dark:bg-[#2a2d42] text-[var(--color-accent)] dark:text-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* 2) 날짜/달력 필터 구역 */}
          <div className="w-fit flex items-center gap-2">
            <button
              onClick={() => setIsCalendarOpen(true)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl text-xs sm:text-sm font-semibold transition-colors ${selectedDate
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-800/80 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#171924] hover:bg-gray-50 dark:hover:bg-[#1c1f2e]'
                }`}
            >
              <CalendarDays className={`w-4 h-4 ${selectedDate ? 'text-[var(--color-accent)]' : 'text-gray-500 dark:text-gray-400'}`} />
              {selectedDate ? selectedDate.replace(/-/g, '.') : '날짜 선택'}
            </button>

            {selectedDate && (
              <button
                onClick={() => onDateSelect(null)}
                className="p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-800/80 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1c1f2e] transition-colors"
                title="필터 초기화"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 하단 행: 동적 키워드 / 카테고리 알약 필터 */}
        {setActiveCategory && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['ALL', ...availableKeywords].map(keyword => {
              const isActive = activeCategory === keyword;
              // 스크린샷과 동일한 UI:
              // 활성화: 다크그린 테두리, 초록 텍스트
              // 비활성: 짙은 테두리, 회색 텍스트
              return (
                <button
                  key={keyword}
                  onClick={() => setActiveCategory(keyword)}
                  className={`shrink-0 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${isActive
                      ? 'border-emerald-500/80 text-emerald-500 bg-emerald-500/5'
                      : 'border-gray-300 dark:border-gray-800/80 text-gray-600 dark:text-gray-400 bg-transparent hover:border-gray-400 dark:hover:border-gray-600'
                    }`}
                >
                  {keyword === 'ALL' ? '전체' : keyword}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={handleCloseCalendar}
        availableDates={availableDates}
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
      />
    </div>
  );
};
