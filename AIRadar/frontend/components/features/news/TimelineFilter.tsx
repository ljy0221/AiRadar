import { useState, useCallback } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { CalendarModal } from '@/components/common';

interface TimelineFilterProps {
  currentCategory: 'all' | 'domestic' | 'international';
  setCategory: (cat: 'all' | 'domestic' | 'international') => void;
  availableDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

export const TimelineFilter = ({ 
  currentCategory, 
  setCategory,
  availableDates,
  selectedDate,
  onDateSelect
}: TimelineFilterProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleCloseCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* 검색 필터 구역 */}
      <div className="flex w-fit bg-gray-100/80 dark:bg-[#1a1c2e]/80 p-1 rounded-xl shadow-inner border border-gray-200/50 dark:border-gray-800/50">
        {[
          { id: 'all', label: '전체' },
          { id: 'domestic', label: '국내' },
          { id: 'international', label: '해외' }
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setCategory(type.id as typeof currentCategory)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${currentCategory === type.id
                ? 'bg-white dark:bg-[#2a2d42] text-[var(--color-accent)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* 달력 모양 버튼 */}
      <div className="w-fit flex items-center gap-2">
        <button 
          onClick={() => setIsCalendarOpen(true)}
          className={`flex items-center gap-2 px-5 py-2.5 border-2 rounded-lg font-bold transition-colors ${
            selectedDate 
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20' 
              : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800'
          }`}
        >
          {selectedDate ? selectedDate : '달력'}
          <CalendarDays className={`w-5 h-5 ml-1 ${selectedDate ? 'text-[var(--color-accent)]' : 'text-gray-500 dark:text-gray-400'}`} />
        </button>
        
        {selectedDate && (
          <button 
            onClick={() => onDateSelect(null)}
            className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="필터 초기화"
          >
            <X className="w-5 h-5" />
          </button>
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
