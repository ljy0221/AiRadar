interface NewsTabsProps {
  activeTab: 'timeline' | 'corporate';
  onTabChange: (tab: 'timeline' | 'corporate') => void;
}

export const NewsTabs = ({ activeTab, onTabChange }: NewsTabsProps) => {
  return (
    <div className="sticky top-[64px] z-40 w-full bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex space-x-8">
          {[
            { id: 'timeline', label: '뉴스 타임라인' },
            { id: 'corporate', label: '기업 AI 활동' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'timeline' | 'corporate')}
              className={`relative py-4 text-sm font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-accent)] rounded-full shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
