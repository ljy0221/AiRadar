'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export const KeywordRadarChart = ({ data }: { data: any[] }) => {
  return (
    <div className="w-full bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[400px]">
      <h3 className="text-xl font-bold mb-2">키워드 종합 분석</h3>
      <p className="text-sm text-gray-500 mb-6">상위 3개 키워드</p>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="rgba(156, 163, 175, 0.3)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip />
            <Radar name="트렌드점수" dataKey="trendScore" stroke="#ff7b89" fill="#ff7b89" fillOpacity={0.4} />
            <Radar name="주간증가율" dataKey="growth" stroke="#4b5563" fill="#4b5563" fillOpacity={0.4} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
