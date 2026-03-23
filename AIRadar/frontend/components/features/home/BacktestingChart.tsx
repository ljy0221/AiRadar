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

import { backtestingMockData } from '@/services/common/homeMockData';

export const BacktestingChart = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-100 dark:bg-gray-800/50 rounded-xl" />;

  return (
    <div className="w-full h-full p-5 md:p-7 flex flex-col">
      <div className="mb-4 pl-2">
        <h5 className="font-semibold text-sm md:text-base text-gray-800 dark:text-[#f0f4fa]">AI 예측 vs 실제 트렌드 (백테스팅)</h5>
        <p className="text-xs text-gray-500 dark:text-[rgba(240,244,250,0.5)]">당사의 AI 예측 모델과 실제 시장 동향 일치도</p>
      </div>
      <div className="flex-1 w-full min-h-[200px] bg-gray-50/50 dark:bg-[#1a2535] rounded-xl overflow-hidden p-3 md:p-4 pt-6 border border-transparent dark:border-white/5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={backtestingMockData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4c8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4c8" stopOpacity={0} />
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
                  <ul className="flex items-center justify-start gap-5 md:gap-7 pt-5 pl-8">
                    {payload?.map((entry, index) => (
                      <li key={`item-${index}`} className="flex items-center gap-2 text-xs md:text-sm text-gray-600 dark:text-[#f0f4fa]">
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
            <Line
              name="AI 예측 트렌드 지수"
              type="monotone"
              dataKey="predicted"
              stroke="#00d4c8"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#0e1520', stroke: '#00d4c8' }}
              activeDot={{ r: 6, stroke: '#00d4c8', strokeWidth: 2, fill: '#00d4c8' }}
            />
            <Line
              name="실제 시장 동향"
              type="monotone"
              dataKey="actual"
              stroke="#f5a623"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 3, strokeWidth: 2, fill: '#0e1520', stroke: '#f5a623' }}
              activeDot={{ r: 6, stroke: '#f5a623', strokeWidth: 2, fill: '#f5a623' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
