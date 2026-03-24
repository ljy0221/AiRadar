'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Modal } from './Modal';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDates: string[]; // 'YYYY-MM-DD' 형식의 문자열 배열
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

type ViewMode = 'calendar' | 'select-year' | 'select-month';

export const CalendarModal = ({
  isOpen,
  onClose,
  availableDates,
  selectedDate,
  onDateSelect,
}: CalendarModalProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handleYearSelect = useCallback((selectedYear: number) => {
    setCurrentDate(new Date(selectedYear, month, 1));
    setViewMode('select-month');
  }, [month]);

  const handleMonthSelect = useCallback((selectedMonth: number) => {
    setCurrentDate(new Date(year, selectedMonth, 1));
    setViewMode('calendar');
  }, [year]);

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    // 일요일(0) -> 6, 월요일(1) -> 0, ... 토요일(6) -> 5 (월요일 시작)
    return day === 0 ? 6 : day - 1;
  }, []);

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const availableDatesSet = useMemo(() => new Set(availableDates), [availableDates]);

  const isDateAvailable = useCallback((dateString: string) => {
    return availableDatesSet.has(dateString);
  }, [availableDatesSet]);

  const handleDateClick = useCallback((dateString: string) => {
    // 미래 날짜 선택 방지 
    const isFuture = new Date(dateString) > new Date();
    if (isFuture) return;

    onDateSelect(dateString);
    onClose();
  }, [onDateSelect, onClose]);

  const handleReset = useCallback(() => {
    onDateSelect(null);
    onClose();
  }, [onDateSelect, onClose]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month, getDaysInMonth]);
  const firstDay = useMemo(() => getFirstDayOfMonth(year, month), [year, month, getFirstDayOfMonth]);

  const days = useMemo(() => {
    const blanks = Array.from({ length: firstDay }).map((_, i) => (
      <div key={`blank-start-${i}`} className="w-full h-12 border border-gray-100/50 dark:border-gray-800/30 rounded-md" />
    ));

    const monthDays = Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isAvailable = isDateAvailable(dateString);
      const isSelected = selectedDate === dateString;
      const isFuture = new Date(dateString) > new Date();

      return (
        <button
          key={`day-${day}`}
          onClick={() => handleDateClick(dateString)}
          disabled={isFuture}
          className={`relative w-full h-12 flex flex-col items-center justify-center rounded-md text-sm font-bold border transition-all duration-200
            ${isSelected 
              ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-sm z-10' 
              : isAvailable && !isFuture
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25' 
                : !isFuture 
                  ? 'border-gray-100 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50' 
                  : 'border-gray-50 dark:border-gray-900/50 text-gray-200 dark:text-gray-800 cursor-not-allowed'
            }
          `}
        >
          {day}
        </button>
      );
    });

    const totalCells = blanks.length + monthDays.length;
    // 달력은 무조건 6줄(42칸)로 고정하여 모달 크기가 달에 따라 변하지 않게 처리합니다.
    const paddingCells = Array.from({ length: 42 - totalCells }).map((_, i) => (
      <div key={`blank-end-${i}`} className="w-full h-12 border border-gray-100/50 dark:border-gray-800/30 rounded-md" />
    ));

    return [...blanks, ...monthDays, ...paddingCells];
  }, [year, month, daysInMonth, firstDay, availableDatesSet, selectedDate, handleDateClick]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="pt-2 px-6 pb-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold dark:text-gray-100">날짜 선택</h3>
          {selectedDate && (
            <button
              onClick={handleReset}
              className="text-sm font-semibold text-gray-400 hover:text-[var(--color-accent)] transition-colors"
            >
              초기화
            </button>
          )}
        </div>

        {viewMode === 'calendar' && (
          <>
            <div className="flex items-center justify-between mb-8 px-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors dark:text-gray-300">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('select-year')}
                  className="text-lg font-bold dark:text-gray-200 hover:text-[var(--color-accent)] dark:hover:text-[var(--color-accent)] transition-colors"
                >
                  {year}년
                </button>
                <button 
                  onClick={() => setViewMode('select-month')}
                  className="text-lg font-bold dark:text-gray-200 hover:text-[var(--color-accent)] dark:hover:text-[var(--color-accent)] transition-colors"
                >
                  {month + 1}월
                </button>
              </div>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors dark:text-gray-300">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-px mb-4 text-center text-sm font-bold text-gray-400 dark:text-gray-500">
              <div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div><div>일</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 border-gray-100 dark:border-gray-800">
              {days}
            </div>
          </>
        )}

        {viewMode === 'select-year' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => year - 5 + i).map((y) => (
              <button
                key={`year-${y}`}
                onClick={() => handleYearSelect(y)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  y === year 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
        )}

        {viewMode === 'select-month' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => i).map((m) => (
              <button
                key={`month-${m}`}
                onClick={() => handleMonthSelect(m)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  m === month 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {m + 1}월
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
