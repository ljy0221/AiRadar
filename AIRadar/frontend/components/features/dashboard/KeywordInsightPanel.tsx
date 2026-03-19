'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, Activity, BarChart3, Clock, Target } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface KeywordData {
  name: string;
  status: '떠오르는 중' | '최고조' | '안정기' | '하락세';
  trendScore: number;
  changeRate: number;
  weeklyGrowth: number;
  description?: string;
  details?: {
    developer?: string;
    launchDate?: string;
    parameters?: string;
    contextWindow?: string;
    strengths?: string[];
  };
}

const statusConfig = {
  '떠오르는 중': { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/10', icon: TrendingUp, label: '떠오르는 중' },
  '최고조': { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-500/10', icon: Activity, label: '최고조' },
  '안정기': { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-500/10', icon: Star, label: '안정기' },
  '하락세': { color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/10', icon: TrendingDown, label: '하락세' },
};

const generateSparklineData = (base: number, name: string) => {
  const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 12 }, (_, i) => ({
    time: i,
    value: Math.max(0, Math.min(100, base + Math.sin(i * 0.8 + seed) * 15 + (Math.random() - 0.5) * 10))
  }));
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-2 rounded shadow-xl">
        <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Trend Score</p>
        <p className="text-sm font-bold text-white">{payload[0].value.toFixed(1)}</p>
      </div>
    );
  }
  return null;
};

export const KeywordInsightPanel = ({ data, title, subtitle }: { data: KeywordData[], title?: string, subtitle?: string }) => {
  const [selected, setSelected] = useState<KeywordData>(data[0]);

  const sparklineData = useMemo(
    () => generateSparklineData(selected.trendScore, selected.name),
    [selected.name, selected.trendScore]
  );

  const cfg = statusConfig[selected.status];

  return (
    <div className="flex flex-col w-full h-[600px] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#151726]">
      {title && (
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-1">
          <h3 className="text-2xl font-black text-[var(--color-text-primary)]">{title}</h3>
          {subtitle && <p className="text-[13px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

      {/* ── Sidebar List ─────────────────────────────────────── */}
      <div className="w-full lg:w-[240px] flex flex-col overflow-y-auto scrollbar-hide border-r border-gray-100 dark:border-gray-800 shrink-0">
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">기술 목록</span>
        </div>

        {data.map((item) => {
          const isActive = selected.name === item.name;
          const isUp = item.weeklyGrowth > 0;
          return (
            <motion.button
              key={item.name}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelected(item)}
              className={`relative flex items-center justify-between px-4 py-2.5 text-left transition-all duration-200 border-l-[3px] ${isActive
                  ? 'bg-[#fff8f6] dark:bg-[#ff5a27]/8 border-[#ff5a27]'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
            >
              <span className={`text-[13px] font-bold tracking-tight truncate flex-1 ${isActive ? 'text-[#ff5a27]' : 'text-[var(--color-text-primary)]'}`}>
                {item.name}
              </span>
              <span className={`text-[10px] font-black ml-2 tabular-nums shrink-0 ${isUp ? 'text-green-500' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{item.weeklyGrowth}%
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Detail Panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-8 py-5 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col h-full"
          >
            {/* 1. Detail Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                    {selected.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium leading-snug max-w-lg">
                  {selected.description || '최근 검색 빈도가 급격하게 상승 중인 핵심 AI 기술 트렌드 정보입니다.'}
                </p>
              </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="p-3 bg-gray-50/50 dark:bg-gray-800/10 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Trend Score</span>
                </div>
                <p className="text-lg font-black text-[var(--color-text-primary)]">{selected.trendScore.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-gray-50/50 dark:bg-gray-800/10 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Velocity</span>
                </div>
                <p className={`text-lg font-black ${selected.changeRate > 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {selected.changeRate > 0 ? '+' : ''}{selected.changeRate}
                </p>
              </div>
              <div className="p-3 bg-gray-50/50 dark:bg-gray-800/10 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Launch</span>
                </div>
                <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300">{selected.details?.launchDate || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50/50 dark:bg-gray-800/10 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                  <Target className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Context</span>
                </div>
                <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300">{selected.details?.contextWindow || 'N/A'}</p>
              </div>
            </div>

            {/* 3. Main Trend Chart Section */}
            <div className="flex-1 min-h-[140px] relative bg-gray-50/30 dark:bg-gray-800/5 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff5a27] animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">실시간 트렌드 변동 추이</span>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                  <XAxis
                    dataKey="time"
                    hide
                  />
                  <YAxis
                    domain={[0, 110]}
                    ticks={[0, 50, 100]}
                    tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ff5a27', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#ff5a27"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#ff5a27', stroke: '#fff', strokeWidth: 1.5 }}
                    animationDuration={600}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>
);
};
