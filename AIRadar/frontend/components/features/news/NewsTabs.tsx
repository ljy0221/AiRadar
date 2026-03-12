interface NewsTabsProps {
  activeTab: 'timeline' | 'corporate';
  onTabChange: (tab: 'timeline' | 'corporate') => void;
}

export const NewsTabs = ({ activeTab, onTabChange }: NewsTabsProps) => {
  return (
    <div className="mx-4 max-w-7xl md:mx-auto rounded-2xl border border-gray-200/50 dark:border-gray-800/50 mb-8 mt-4 sticky top-4 bg-white/70 dark:bg-[#12141D]/70 backdrop-blur-md z-10 p-4 shadow-sm">
      <div className="flex gap-4">
        <button
          onClick={() => onTabChange('timeline')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timeline'
            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'
            }`}
        >
          뉴스 타임라인
        </button>
        <button
          onClick={() => onTabChange('corporate')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'corporate'
            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'
            }`}
        >
          기업 AI 활동
        </button>
      </div>
    </div>
  );
};
