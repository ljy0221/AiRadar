'use client';

import { ModelPerformance } from '@/services/dashboard/dashboardApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ModelComparisonProps {
  data: ModelPerformance[];
}

export const ModelComparison = ({ data }: ModelComparisonProps) => {
  // Recharts 형식으로 데이터 변환
  const benchmarkNames = data[0]?.benchmarks.map(b => b.name) || [];

  const chartData = benchmarkNames.map(name => {
    const entry: any = { name };
    data.forEach(model => {
      const benchmark = model.benchmarks.find(b => b.name === name);
      entry[model.modelName] = benchmark?.score || 0;
    });
    return entry;
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="w-full bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">모델 성능 비교</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">주요 LLM 모델들의 벤치마크 지표별 점수를 비교합니다.</p>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            barSize={24}
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: '#88888810' }}
              contentStyle={{
                backgroundColor: '#1a1c2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            {data.map((model, index) => (
              <Bar
                key={model.modelName}
                dataKey={model.modelName}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed text-center">
          * 벤치마크 점수는 제조사 공식 발표 및 허깅페이스 리더보드 기준 시뮬레이션 데이터입니다.<br />
          (MMLU: 대학 수준 지식, GSM8K: 초등 수학 추론, HumanEval: 코딩 테스트, GPQA: 대학원 수준 과학 논리)
        </p>
      </div>
    </div>
  );
};
