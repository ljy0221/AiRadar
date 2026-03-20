import { ExternalLink } from 'lucide-react';

interface CompanyActivity {
  id: string;
  name: string;
  initial: string;
  color: string;
  progress: number;
  activities: { date: string; title: string; category: string; url?: string }[];
}

export const CompanyActivityCard = ({ company }: { company: CompanyActivity }) => {
  return (
    <div className="w-full flex flex-col mb-8 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#1a1c2e] shadow-sm">
      
      {/* 상단 띠/헤더 영역 */}
      <div className="flex items-center gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-800/30">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner"
          style={{ backgroundColor: company.color }}
        >
          {company.initial}
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1.5">{company.name}</h3>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
             <div 
               className="h-full rounded-full transition-all duration-1000"
               style={{ width: `${company.progress}%`, backgroundColor: company.color }}
             />
          </div>
        </div>
      </div>

      {/* 히스토리 리스트 영역 */}
      <div className="p-6">
        <div className="flex flex-col gap-1 text-sm border-l-2 ml-4">
          {company.activities.map((act, idx) => (
            <div key={idx} className="relative pl-6 pb-6 last:pb-2">
              <div 
                className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full border border-white dark:border-[#1a1c2e]"
                style={{ backgroundColor: company.color }}
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-500 dark:text-gray-400 text-xs">{act.date}</span>
                  <span 
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-opacity-10 dark:bg-opacity-20"
                    style={{ color: company.color, backgroundColor: company.color }}
                  >
                    {act.category}
                  </span>
                </div>
                <div className="text-gray-800 dark:text-gray-200 font-medium mt-0.5">
                  {act.url ? (
                    <a href={act.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] hover:underline flex items-center gap-1.5 group">
                      {act.title}
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--color-accent)]" />
                    </a>
                  ) : (
                    <span>{act.title}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
