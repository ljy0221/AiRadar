// components/features/papers/PaperFilter.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { CalendarModal } from '@/components/common';

interface PaperFilterProps {
  availableDates: string[];
  startDate: string | null;
  endDate: string | null;
  onRangeSelect: (start: string | null, end: string | null) => void;
}

export const PaperFilter = ({ 
  availableDates,
  startDate,
  endDate,
  onRangeSelect
}: PaperFilterProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleCloseCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  const dateDisplayText = useMemo(() => {
    if (!startDate) return '날짜 선택';
    if (!endDate || startDate === endDate) return startDate.replace(/-/g, '.');
    return `${startDate.replace(/-/g, '.')} - ${endDate.replace(/-/g, '.')}`;
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* 달력 모양 버튼 */}
      <div className="w-fit flex items-center gap-2">
        <button 
          onClick={() => setIsCalendarOpen(true)}
          className={`flex items-center gap-2 px-5 py-2.5 border-2 rounded-lg font-semibold transition-colors ${
            startDate 
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20' 
              : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800'
          }`}
        >
          {dateDisplayText}
          <CalendarDays className={`w-5 h-5 ml-1 ${startDate ? 'text-[var(--color-accent)]' : 'text-gray-500 dark:text-gray-400'}`} />
        </button>
        
        {(startDate || endDate) && (
          <button 
            onClick={() => onRangeSelect(null, null)}
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
        startDate={startDate}
        endDate={endDate}
        onRangeSelect={onRangeSelect}
      />
    </div>
  );
};
