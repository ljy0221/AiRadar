import { ArrowRight } from 'lucide-react';

interface CompanyActivity {
  id: string;
  name: string;
  initial: string;
  color: string;
  progress: number;
  newsCount: number;
  keywords: string[];
}

interface Props {
  company: CompanyActivity;
  onClick: () => void;
}

export const CompanyActivityCard = ({ company, onClick }: Props) => {
  // 스크린샷 뷰처럼 특정 모델명/주요 핵심어만 초록색 테두리로 하이라이팅
  const highlightSet = new Set([
    'GPT-5', '슈퍼앱', '카나나', 'MAI', '비전AI', '비전 AI', 
    '하이퍼클로바', 'Gemini', '바이브코딩', '대형 언어 모델', 'LLM', '자율주행'
  ]);

  return (
    <div 
      onClick={onClick}
      className="relative flex flex-col w-full border border-gray-100 dark:border-gray-800 rounded-2xl p-5 bg-white dark:bg-[#151722] shadow-sm transition-all duration-300 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 group"
    >
      {/* 1. 상단: 기업 아이콘 및 정보 */}
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-sm"
          style={{ backgroundColor: company.color }}
        >
          {company.initial}
        </div>
        <div className="flex flex-col">
          <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">{company.name}</h3>
          <span className="text-xs font-medium text-gray-400">뉴스 {company.newsCount}건</span>
        </div>
      </div>

      {/* 2. 중단: 주요 키워드(태그) 목록 */}
      <div className="flex flex-wrap items-center gap-2 mt-4 mb-3">
        {company.keywords.map((kw, idx) => {
          const isHighlighted = highlightSet.has(kw) || idx === 1;
          return (
            <span 
              key={`${kw}-${idx}`} 
              className={`px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                isHighlighted 
                  ? 'border-emerald-500/80 text-emerald-500 bg-emerald-500/5' 
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 bg-transparent'
              }`}
            >
              {kw}
            </span>
          );
        })}
      </div>

      {/* 3. 하단: 진행률 표시 바 */}
      <div className="w-full h-[3px] bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden mt-auto">
        <div 
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${company.progress}%`, backgroundColor: company.color }}
        />
      </div>

      {/* 우측 하단 화살표 아이콘 (상세 진입 암시) */}
      <div className="absolute right-4 top-[102px]">
        <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: company.color }} />
      </div>
      
    </div>
  );
};
