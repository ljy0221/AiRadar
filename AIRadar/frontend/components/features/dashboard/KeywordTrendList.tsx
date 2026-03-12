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
  '안정기': { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/10' },
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
          <div key={index} className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 bg-white dark:bg-[#1a1c2e] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm gap-4">
            <div className="flex items-center gap-4 w-full md:w-1/3">
              <h4 className="text-lg md:text-xl font-bold truncate">{item.name}</h4>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style.color} ${style.bg}`}>
                {item.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between w-full md:w-2/3 gap-4 md:gap-8 overflow-hidden">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400">트렌드 점수</span>
                <span className="text-xl md:text-2xl font-bold">{item.trendScore.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400">변화 속도</span>
                <div className={`flex items-center gap-1 font-bold ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-gray-500'}`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : isDown ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  {Math.abs(item.changeRate)}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400">주간 증가율</span>
                <span className={`font-bold ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-gray-500'}`}>
                  {isUp ? '+' : ''}{item.weeklyGrowth}%
                </span>
              </div>
              
              <div className="hidden md:flex flex-1 items-center gap-2">
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isUp ? 'bg-green-500' : isDown ? 'bg-red-500' : 'bg-gray-500'}`} 
                    style={{ width: `${Math.min(Math.max((item.trendScore / 100) * 100, 0), 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
