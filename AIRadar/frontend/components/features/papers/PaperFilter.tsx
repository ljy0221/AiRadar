// components/features/papers/PaperFilter.tsx
'use client';

import { useState, useCallback } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { CalendarModal } from '@/components/common';

interface PaperFilterProps {
  availableDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

export const PaperFilter = ({ 
  availableDates,
  selectedDate,
  onDateSelect
}: PaperFilterProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleCloseCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 mb-8">
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
          {selectedDate ? selectedDate.replace(/-/g, '.') : '날짜 선택'}
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
