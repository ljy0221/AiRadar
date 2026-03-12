'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, CartesianAxis } from 'recharts';
import { Input } from '@/components/common/Input';
import { Search } from 'lucide-react';

interface ChartData {
  date: string;
  mentionCount: number;
  searchVol: number;
  sentimentScore: number;
}

export const InterestAnalysisChart = ({ data }: { data: Record<string, ChartData[]> }) => {
  // 사용자가 요청한 검색/탭 기능
  const [activeTab, setActiveTab] = useState('Agentic Workflow');
  const [searchTerm, setSearchTerm] = useState('');

  // 검색어나 탭 클릭에 의한 필터링 로직 구현
  const keywords = Object.keys(data);
  const filteredKeywords = keywords.filter(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // 현재 선택된 키워드의 데이터 세트
  const currentData = data[activeTab] || [];

  return (
    <div className="w-full bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[550px]">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold mb-1">관심도 분석</h3>
          <p className="text-sm text-gray-500">
            '{activeTab}' 주간 트렌드 - 날짜별 언급 수, 검색량, 감성 점수
          </p>
        </div>

        {/* 사용자 요구사항: 검색 / 탭 */}
        <div className="flex flex-col items-end gap-3 mt-2 md:mt-0">
          <div className="relative w-full md:w-auto">
             <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <Input 
               type="text"
               placeholder="키워드 검색"
               className="pl-9 py-2 text-sm w-full md:w-64"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:max-w-md justify-start md:justify-end pb-1 no-scrollbar">
            {filteredKeywords.map(kw => (
              <button
                key={kw}
                onClick={() => setActiveTab(kw)}
                className={`px-3 py-1.5 whitespace-nowrap text-sm rounded-full transition-colors ${
                  activeTab === kw 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-6 mb-4 text-xs">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffb6b9]"></div>언급 수</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b4155]"></div>검색량 (÷100)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div>감성 점수</div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={currentData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMention" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffb6b9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ffb6b9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            
            <Area yAxisId="left" type="monotone" dataKey="mentionCount" stroke="#ffb6b9" strokeWidth={2} fillOpacity={1} fill="url(#colorMention)" />
            <Area yAxisId="left" type="monotone" dataKey="searchVol" stroke="#3b4155" strokeWidth={2} fillOpacity={0} />
            <Area yAxisId="right" type="monotone" dataKey="sentimentScore" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
         <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">총 언급 수</span>
            <span className="text-xl font-bold">290</span>
         </div>
         <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">총 검색량</span>
            <span className="text-xl font-bold">19.8k</span>
         </div>
         <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">평균 감성 점수</span>
            <span className="text-xl font-bold text-green-500">81.3%</span>
         </div>
         <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">주간 증가율</span>
            <span className="text-xl font-bold text-red-500">📈 40.6%</span>
         </div>
      </div>
    </div>
  );
};
