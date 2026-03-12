import { FileText, Newspaper } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface Source {
  type: 'paper' | 'news';
  text: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CoreTaskCardProps {
  number: number;
  title: string;
  description: string;
  sources: Source[];
  onOpenScenario: () => void;
}

export const CoreTaskCard = ({ number, title, description, sources, onOpenScenario }: CoreTaskCardProps) => {
  return (
    <div className="w-full bg-white dark:bg-[#1a1c2e] border border-gray-200 dark:border-gray-800 rounded-xl p-6 md:p-8 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xl md:text-2xl font-bold">이 직업의 핵심업무 <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-current text-lg ml-1">{number}</span></h3>
      </div>
      
      <div className="flex flex-col gap-1 mb-2">
        <h4 className="font-bold text-gray-800 dark:text-gray-200">AI가 어떻게 같이 업무할 수 있을까요?</h4>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
        {sources.map((src, i) => (
          <div key={i} className="flex items-center gap-1.5">
             {src.type === 'paper' ? <FileText className="w-3.5 h-3.5" /> : <Newspaper className="w-3.5 h-3.5" />}
             <span>
               {src.type === 'paper' ? '논문 근거: 최신 연구에 따른 ' : '뉴스 근거: 관련 기술 기사 '}
               {src.impact && <span className={`font-bold ${src.impact === 'HIGH' ? 'text-red-500' : 'text-yellow-500'}`}>{src.impact}</span>}
               {src.text}
             </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" className="text-sm py-2 px-4 dark:text-[var(--color-text-primary)]" onClick={onOpenScenario}>
          [시나리오]
        </Button>
      </div>
    </div>
  );
};
