"use client";

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

import { backtestingMockData } from '@/services/homeMockData';

export const BacktestingChart = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-100 dark:bg-gray-800/50 rounded-xl" />;

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col">
      <div className="mb-4">
        <h5 className="font-semibold text-sm md:text-base text-gray-800 dark:text-gray-200">AI 예측 vs 실제 트렌드 (백테스팅)</h5>
        <p className="text-xs text-gray-500 dark:text-gray-400">당사의 AI 예측 모델과 실제 시장 동향 일치도</p>
      </div>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={backtestingMockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
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
            <Line 
              name="AI 예측 트렌드 지수"
              type="monotone" 
              dataKey="predicted" 
              stroke="#8b5cf6" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2 }} 
              activeDot={{ r: 6 }} 
            />
            <Line 
              name="실제 시장 동향"
              type="monotone" 
              dataKey="actual" 
              stroke="#10b981" 
              strokeWidth={3} 
              strokeDasharray="5 5"
              dot={{ r: 4, strokeWidth: 2 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
