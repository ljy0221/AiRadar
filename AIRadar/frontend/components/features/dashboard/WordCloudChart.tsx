'use client';

import { useState, useEffect } from 'react';
import WordCloud from 'react-d3-cloud';
import { fetchWordCloudData, WordCloudData } from '@/services/dashboard/dashboardApi';
import { Loader2 } from 'lucide-react';

interface WordCloudChartProps {
  title?: string;
  subtitle?: string;
}

type SourceType = 'NEWS' | 'PAPER' | 'GITHUB';

export const WordCloudChart = ({ title = "주간 기술 키워드 워드클라우드", subtitle = "최근 1주일간 가장 많이 언급된 핵심 기술 트렌드" }: WordCloudChartProps) => {
  const [activeTab, setActiveTab] = useState<SourceType>('NEWS');
  const [data, setData] = useState<WordCloudData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const cloudData = await fetchWordCloudData(activeTab, 80);
        if (isMounted) {
          setData(cloudData);
        }
      } catch (error) {
        console.error("Failed to load word cloud data:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [activeTab]);

  return (
    <div className="bg-white dark:bg-[#1a1c2e] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-black text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        
        {/* Source Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg">
          {(['NEWS', 'PAPER', 'GITHUB'] as SourceType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === tab 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[400px] flex items-center justify-center p-4 relative">
        {isLoading ? (
          <div className="flex flex-col items-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm font-medium">이번 주 데이터 집계 중...</span>
          </div>
        ) : data.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
            {/* pointer-events-none to prevent tooltip/interaction issues if any */}
            <div className="w-full h-[400px]">
              <WordCloud
                data={data}
                width={800}
                height={400}
                font="Inter, sans-serif"
                fontStyle="italic"
                fontWeight="bold"
                fontSize={(word) => Math.log2(word.value) * 10 + 10}
                spiral="rectangular"
                rotate={(word) => word.value % 3 === 0 ? 0 : 90}
                padding={5}
                random={() => 0.5}
                fill={(d: any, i: number) => {
                  const colors = activeTab === 'NEWS' ? ['#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd'] : 
                                 activeTab === 'PAPER' ? ['#10b981', '#047857', '#34d399', '#6ee7b7'] : 
                                 ['#8b5cf6', '#6d28d9', '#a78bfa', '#c4b5fd'];
                  return colors[i % colors.length];
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <span className="text-sm font-medium">표시할 키워드가 없습니다.</span>
          </div>
        )}
      </div>
    </div>
  );
};
