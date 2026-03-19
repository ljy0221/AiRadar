import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard = ({ title, value, subtitle, icon, trend }: MetricCardProps) => {
  // Determine what to emphasize based on the content
  const valStr = String(value);
  const isRankValue = valStr === '1' || valStr === '2';

  // Tech name becomes big for ranks (1st, 2nd)
  const displayBig = isRankValue ? title : value;
  // Metric title (like "평균 점수") becomes middle text for metric cards
  const displaySmallHeader = isRankValue ? null : title;

  return (
    <div className="bg-white dark:bg-[#1a1c2e] px-6 py-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[120px] text-left transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[var(--color-accent)]">
          {icon}
        </div>
      </div>

      <div className="flex flex-col">
        <h4 className="text-xl font-extrabold text-[var(--color-text-primary)] tracking-tight leading-tight">
          {displayBig}
        </h4>
        {displaySmallHeader && (
          <p className="text-[12px] font-bold text-gray-700 dark:text-gray-300 mt-0.5">
            {displaySmallHeader}
          </p>
        )}
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-auto">
        {subtitle}
      </p>
    </div>
  );
};
