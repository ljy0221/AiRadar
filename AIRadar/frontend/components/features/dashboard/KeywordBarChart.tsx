'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarData {
  name: string;
  score: number;
  color: string;
}

export const KeywordBarChart = ({ data }: { data: BarData[] }) => {
  return (
    <div className="w-full bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[400px]">
      <h3 className="text-xl font-bold mb-2">키워드 분석</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">트렌드 점수 비교</p>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} angle={-15} textAnchor="end" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <Tooltip
              cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
