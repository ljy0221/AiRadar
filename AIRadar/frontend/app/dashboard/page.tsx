import { MetricCard, KeywordTrendList, KeywordBarChart, KeywordRadarChart, InterestAnalysisChart } from '@/components/features/dashboard';
import { TrendingUp, TrendingDown, Activity, ListOrdered } from 'lucide-react';

// --- Dummy Data ---
const metricsData = [
  { title: "Agentic Workflow", value: "2", subtitle: "이번 주 떠오르는 기술", icon: <TrendingUp className="w-6 h-6" />, trend: 'up' as const },
  { title: "Prompt Engineering", value: "1", subtitle: "이번 주 사라지는 기술", icon: <TrendingDown className="w-6 h-6 text-yellow-500" />, trend: 'down' as const },
  { title: "평균 90.2점", value: "2", subtitle: "피크 상태 기술", icon: <Activity className="w-6 h-6 text-red-500" /> },
  { title: "6개 카테고리", value: "6", subtitle: "추적 중인 키워드", icon: <ListOrdered className="w-6 h-6 text-gray-500" /> },
];

const keywordListData = [
  { name: 'Agentic Workflow', status: '떠오르는 중' as const, trendScore: 78.5, changeRate: 15.2, weeklyGrowth: 42.5 },
  { name: 'RAG', status: '최고조' as const, trendScore: 92.1, changeRate: 2.4, weeklyGrowth: 5.1 },
  { name: 'Vision Transformers', status: '최고조' as const, trendScore: 88.3, changeRate: 3.8, weeklyGrowth: 12.3 },
  { name: 'Mixture of Experts', status: '떠오르는 중' as const, trendScore: 71.2, changeRate: 18.5, weeklyGrowth: 55.2 },
  { name: 'Fine-tuning', status: '안정기' as const, trendScore: 65.5, changeRate: 5.1, weeklyGrowth: -8.4 },
  { name: 'Prompt Engineering', status: '하락세' as const, trendScore: 52.3, changeRate: 12.3, weeklyGrowth: -18.7 },
];

const barChartData = [
  { name: 'Agentic Workflow', score: 78.5, color: '#10b981' },
  { name: 'RAG', score: 92.1, color: '#ef4444' },
  { name: 'Vision Transformers', score: 88.3, color: '#ef4444' },
  { name: 'Mixture of Experts', score: 71.2, color: '#10b981' },
  { name: 'Fine-tuning', score: 65.5, color: '#6b7280' },
  { name: 'Prompt Engineering', score: 52.3, color: '#eab308' },
];

const radarData = [
  { subject: 'Agentic Workflow', trendScore: 78, growth: 42, fullMark: 100 },
  { subject: 'RAG', trendScore: 92, growth: 5, fullMark: 100 },
  { subject: 'Vision Transformers', trendScore: 88, growth: 12, fullMark: 100 },
];

const generateInterestData = (baseVol: number, baseMentions: number, baseSentiment: number) => {
  return Array.from({ length: 7 }).map((_, i) => ({
    date: `03. 0${i + 1}.`,
    mentionCount: baseMentions + Math.floor(Math.random() * 20),
    searchVol: baseVol + Math.floor(Math.random() * 10),
    sentimentScore: baseSentiment + Math.floor(Math.random() * 10) - 5,
  }));
};

const interestData = {
  'Agentic Workflow': generateInterestData(20, 40, 75),
  'RAG': generateInterestData(50, 80, 85),
  'Vision Transformers': generateInterestData(45, 60, 80),
  'Mixture of Experts': generateInterestData(15, 30, 65),
};

// --- Page Component ---
export default function DashboardPage() {
  return (
    <div className="w-full max-w-7xl px-4 md:px-8 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-gray-500">실시간 AI 기술 동향 및 키워드 분석</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((m, i) => (
          <MetricCard key={i} title={m.title} value={m.value} subtitle={m.subtitle} icon={m.icon} trend={m.trend} />
        ))}
      </div>

      {/* Technical Analysis List */}
      <div className="bg-white dark:bg-[#1a1c2e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">기술 분석</h2>
        <p className="text-sm text-gray-500 mb-6 -mt-4">각 AI 키워드의 라이프사이클 현황 및 트렌드 점수</p>
        <KeywordTrendList data={keywordListData} />
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KeywordBarChart data={barChartData} />
        <KeywordRadarChart data={radarData} />
      </div>

      {/* Interest Analysis (Bottom Full Width) */}
      <div className="w-full">
        <InterestAnalysisChart data={interestData} />
      </div>

    </div>
  );
}
