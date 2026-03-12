interface NewsTabsProps {
  activeTab: 'timeline' | 'corporate';
  onTabChange: (tab: 'timeline' | 'corporate') => void;
}

export const NewsTabs = ({ activeTab, onTabChange }: NewsTabsProps) => {
  return (
    <div className="w-full border-b border-gray-200 dark:border-gray-800 mb-8 mt-4 sticky top-[64px] bg-white/80 dark:bg-[#0A0B1A]/80 backdrop-blur-md z-10 pt-2">
      <div className="flex gap-4">
        <button
          onClick={() => onTabChange('timeline')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          뉴스 타임라인
        </button>
        <button
          onClick={() => onTabChange('corporate')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'corporate'
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          기업 AI 활동
        </button>
      </div>
    </div>
  );
};
