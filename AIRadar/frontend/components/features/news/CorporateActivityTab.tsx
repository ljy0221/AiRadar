'use client';

import { Loader2 } from 'lucide-react';
import { CompanyActivityCard } from './CompanyActivityCard';
import { useNewsListQuery } from '@/hooks/queries/useNewsQuery';
import type { NewsListItem } from '@/types/news';

// ── 회사 브랜드 맵 (repo owner → 표시 정보) ──────────────────────────────
const COMPANY_META: Record<string, { name: string; initial: string; color: string }> = {
  openai:      { name: 'OpenAI',             initial: 'O', color: '#10a37f' },
  google:      { name: 'Google (DeepMind)',  initial: 'G', color: '#4285F4' },
  'google-deepmind': { name: 'Google (DeepMind)', initial: 'G', color: '#4285F4' },
  meta:        { name: 'Meta',               initial: 'M', color: '#0668E1' },
  'meta-llama':{ name: 'Meta',               initial: 'M', color: '#0668E1' },
  anthropic:   { name: 'Anthropic',          initial: 'A', color: '#D19B6D' },
  microsoft:   { name: 'Microsoft',          initial: 'MS', color: '#00BCF2' },
};

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6'];

function categoryLabel(cat: NewsListItem['category']): string {
  const map: Record<string, string> = {
    AI_MODEL: '모델 출시', AI_HARDWARE: '하드웨어', AI_POLICY: '정책/규정',
    AI_RESEARCH: '기술/연구', AI_BUSINESS: '투자/전략',
  };
  return map[cat] ?? cat;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// 뉴스를 회사별로 그룹핑 → CompanyActivityCard 형식으로 변환
function groupNewsByCompany(newsList: NewsListItem[]) {
  const grouped: Record<string, NewsListItem[]> = {};
  const COMPANY_KEYWORDS: Record<string, string> = {
    openai: 'OpenAI', google: 'Google', meta: 'Meta', anthropic: 'Anthropic',
    microsoft: 'Microsoft', samsung: '삼성', naver: '네이버', kakao: '카카오',
  };

  for (const company of Object.keys(COMPANY_KEYWORDS)) {
    const keyword = COMPANY_KEYWORDS[company].toLowerCase();
    const matches = newsList.filter(
      (n) => n.title.toLowerCase().includes(keyword) || n.source.toLowerCase().includes(keyword)
    );
    if (matches.length > 0) grouped[company] = matches;
  }

  return Object.entries(grouped).map(([id, items], idx) => {
    const meta = COMPANY_META[id];
    const color = meta?.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const maxScore = Math.max(...items.map((n) => n.score));
    return {
      id,
      name: meta?.name ?? id,
      initial: meta?.initial ?? id[0].toUpperCase(),
      color,
      progress: Math.round(maxScore * 100),
      activities: items.slice(0, 3).map((n) => ({
        date: formatDate(n.publishedAt),
        category: categoryLabel(n.category),
        title: n.title,
      })),
    };
  });
}

export const CorporateActivityTab = () => {
  const { data, isLoading, isError } = useNewsListQuery();

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--color-accent)]" />
          <p className="text-sm">기업 활동 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full flex justify-center py-20">
        <p className="text-sm text-red-500">데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  const corporateData = groupNewsByCompany(data);

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-4xl">

        <div className="mb-8 flex justify-between items-end">
          <p className="text-gray-500 dark:text-gray-400 text-sm">주요 AI 선도 기업들의 핵심 활동 및 최신 뉴스 타임라인</p>
        </div>

        <div className="flex flex-col gap-2">
          {corporateData.length > 0 ? (
            corporateData.map((company) => (
              <CompanyActivityCard key={company.id} company={company} />
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">표시할 기업 활동 데이터가 없습니다.</p>
          )}
        </div>

      </div>
    </div>
  );
};
