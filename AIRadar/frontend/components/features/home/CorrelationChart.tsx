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

import { correlationMockData } from '@/services/homeMockData';

export const CorrelationChart = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-100 dark:bg-gray-800/50 rounded-xl" />;

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col">
      <div className="mb-4">
        <h5 className="font-semibold text-sm md:text-base text-gray-800 dark:text-gray-200">데이터 상관관계 비교</h5>
        <p className="text-xs text-gray-500 dark:text-gray-400">GitHub 커밋, 뉴스 언급량, Arxiv 논문 수 간의 시계열 연관성</p>
      </div>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={correlationMockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGithub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorArxiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }} 
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'var(--color-bg, rgba(255, 255, 255, 0.9))',
                borderColor: 'rgba(156, 163, 175, 0.2)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: 'inherit'
              }}
              labelStyle={{ color: 'inherit', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
            />
            <Area 
              name="GitHub 커밋"
              type="monotone" 
              dataKey="github" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorGithub)" 
            />
            <Area 
              name="News 언급량"
              type="monotone" 
              dataKey="news" 
              stroke="#f59e0b" 
              fillOpacity={1} 
              fill="url(#colorNews)" 
            />
            <Area 
              name="Arxiv 논문"
              type="monotone" 
              dataKey="arxiv" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorArxiv)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
