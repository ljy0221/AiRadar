import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KeywordData {
  name: string;
  status: '떠오르는 중' | '최고조' | '안정기' | '하락세';
  trendScore: number;
  changeRate: number;
  weeklyGrowth: number;
}

const statusConfig = {
  '떠오르는 중': { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/10' },
  '최고조': { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-500/10' },
  '안정기': { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-500/10' },
  '하락세': { color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/10' },
};

export const KeywordTrendList = ({ data }: { data: KeywordData[] }) => {
  return (
    <div className="w-full flex flex-col gap-3">
      {data.map((item, index) => {
        const style = statusConfig[item.status];
        const isUp = item.weeklyGrowth > 0;
        const isDown = item.weeklyGrowth < 0;

        return (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 items-center p-4 md:px-6 md:py-4 bg-white dark:bg-[#1a1c2e] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm gap-4 transition-all hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
            {/* 키워드 영역 (4칸) */}
            <div className="col-span-1 md:col-span-3 flex items-center gap-3 overflow-hidden">
              <h4 className="text-base md:text-lg font-bold truncate flex-1" title={item.name}>{item.name}</h4>
              <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${style.color} ${style.bg}`}>
                {item.status}
              </span>
            </div>

            {/* 지표 영역 (4칸: 점수, 속도, 증가율) */}
            <div className="col-span-1 md:col-span-4 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Score</span>
                <span className="text-base md:text-lg font-black text-[var(--color-text-primary)]">{item.trendScore.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Velocity</span>
                <div className={`flex items-center gap-0.5 font-black text-sm md:text-base ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-gray-500'}`}>
                  {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {Math.abs(item.changeRate)}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Weekly</span>
                <span className={`font-black text-sm md:text-base ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-gray-500'}`}>
                  {isUp ? '+' : ''}{item.weeklyGrowth}%
                </span>
              </div>
            </div>

            {/* 그래프 영역 (5칸) */}
            <div className="col-span-1 md:col-span-5 flex items-center gap-3">
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${isUp ? 'bg-green-500' : isDown ? 'bg-red-500' : 'bg-gray-400'}`}
                  style={{ width: `${Math.min(Math.max((item.trendScore / 100) * 100, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
