"use client";

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { correlationMockData } from '@/services/common/homeMockData';

export const CorrelationChart = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-100 dark:bg-gray-800/50 rounded-xl" />;

  return (
    <div className="w-full h-full p-5 md:p-7 flex flex-col">
      <div className="mb-4 pl-2">
        <h5 className="font-semibold text-sm md:text-base text-gray-800 dark:text-[#f0f4fa]">데이터 상관관계 비교</h5>
        <p className="text-xs text-gray-500 dark:text-[rgba(240,244,250,0.5)]">GitHub 커밋, 뉴스 언급량, Arxiv 논문 수 간의 시계열 연관성</p>
      </div>
      <div className="flex-1 w-full min-h-[200px] bg-gray-50/50 dark:bg-[#1a2535] rounded-xl overflow-hidden p-3 md:p-4 pt-6 border border-transparent dark:border-white/5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={correlationMockData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGithub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f5a623" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f5a623" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorArxiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4c8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00d4c8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" className="stroke-gray-200 dark:stroke-[rgba(255,255,255,0.06)]" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: 'currentColor', opacity: 1 }} 
              tickMargin={10}
              className="text-gray-500 dark:text-[rgba(240,244,250,0.35)]"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: 'currentColor', opacity: 1 }} 
              className="text-gray-500 dark:text-[rgba(240,244,250,0.35)]"
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#0e1520',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                color: '#f0f4fa',
                fontSize: '13px'
              }}
              itemStyle={{ fontWeight: 600 }}
              labelStyle={{ color: 'rgba(240,244,250,0.6)', fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}
            />
            <Legend 
              content={(props) => {
                const { payload } = props;
                return (
                  <ul className="flex items-center justify-start gap-4 md:gap-6 pt-5 pl-8">
                    {payload?.map((entry, index) => (
                      <li key={`item-${index}`} className="flex items-center gap-2 text-[11px] md:text-xs text-gray-600 dark:text-[#f0f4fa]">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10">
                          <circle cx="5" cy="5" r="5" fill={entry.color} />
                        </svg>
                        <span className="font-medium opacity-90">{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                );
              }}
            />
            <Area 
              name="Arxiv 논문"
              type="monotone" 
              dataKey="arxiv" 
              stroke="#00d4c8" 
              fillOpacity={1} 
              fill="url(#colorArxiv)" 
            />
            <Area 
              name="GitHub 커밋"
              type="monotone" 
              dataKey="github" 
              stroke="#f5a623" 
              fillOpacity={1} 
              fill="url(#colorGithub)" 
            />
            <Area 
              name="News 언급량"
              type="monotone" 
              dataKey="news" 
              stroke="#f87171" 
              fillOpacity={1} 
              fill="url(#colorNews)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
