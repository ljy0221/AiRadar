import { FileText, Newspaper } from 'lucide-react';

interface Source {
  type: 'paper' | 'news';
  text: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CoreTaskCardProps {
  title: string;
  description: string;
  sources: Source[];
}

export const CoreTaskCard = ({ title, description, sources }: CoreTaskCardProps) => {
  return (
    <div className="w-full shrink-0 bg-white dark:bg-[#1a1c2e] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-10 flex flex-col gap-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">이 직업의 핵심업무</h3>
        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
          {title}
          <span className="block text-sm text-gray-400 mt-2 font-normal leading-relaxed">{description}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        {sources.map((src, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {src.type === 'paper' ? <FileText className="w-3.5 h-3.5 opacity-70" /> : <Newspaper className="w-3.5 h-3.5 opacity-70" />}
            <span>
              {src.type === 'paper' ? '논문 근거: ' : '뉴스 근거: '}
              {src.impact && <span className={`font-bold mr-1 ${src.impact === 'HIGH' ? 'text-red-500' : 'text-yellow-500'}`}>{src.impact}</span>}
              {src.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
