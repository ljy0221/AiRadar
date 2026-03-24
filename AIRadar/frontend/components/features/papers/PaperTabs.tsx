'use client';

import React from 'react';

interface PaperTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const PaperTabs: React.FC<PaperTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="sticky top-[56px] z-40 w-full bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/80">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex h-10 items-center space-x-8">
          {[
            { id: 'daily', label: '일별 논문 탐색' },
            { id: 'recommend', label: '맞춤 추천 논문' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`h-full px-1 text-[14px] font-bold transition-all relative shrink-0 flex items-center ${
                activeTab === tab.id
                  ? 'text-[var(--color-accent)]'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[var(--color-accent)]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
