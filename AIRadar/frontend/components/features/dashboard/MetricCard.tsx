import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard = ({ title, value, subtitle, icon, trend }: MetricCardProps) => {
  return (
    <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col gap-2 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        {icon && <div className="text-[var(--color-accent)]">{icon}</div>}
      </div>
      <div>
        <h4 className="text-3xl font-bold mb-1">{value}</h4>
        <h5 className="text-base font-semibold text-[color:var(--color-text-primary)]">{title}</h5>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};
