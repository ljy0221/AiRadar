import { motion } from 'framer-motion';

interface NewsTabsProps {
  activeTab: 'timeline' | 'corporate';
  onTabChange: (tab: 'timeline' | 'corporate') => void;
}

export const NewsTabs = ({ activeTab, onTabChange }: NewsTabsProps) => {
  return (
    <div className="sticky top-[56px] z-40 w-full bg-[var(--color-bg-primary)]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex h-10 items-center space-x-8">
          {[
            { id: 'timeline', label: '뉴스 타임라인' },
            { id: 'corporate', label: '기업 AI 활동' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'timeline' | 'corporate')}
              className={`relative h-full px-1 text-[14px] font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-[var(--color-accent)]'
                  : 'text-gray-500 hover:text-[var(--color-accent)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
