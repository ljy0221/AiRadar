'use client';

import Loading from '@/app/loading';
import { CompanyActivityCard } from './CompanyActivityCard';
import { useNewsListQuery } from '@/hooks/queries/useNewsQuery';
import type { NewsListItem } from '@/types/news';

// ── 회사 브랜드 맵 (repo owner → 표시 정보) ──────────────────────────────
const COMPANY_META: Record<string, { name: string; initial: string; color: string }> = {
  openai: { name: 'OpenAI', initial: 'O', color: '#10a37f' },
  google: { name: 'Google (DeepMind)', initial: 'G', color: '#4285F4' },
  anthropic: { name: 'Anthropic', initial: 'A', color: '#D19B6D' },
  microsoft: { name: 'Microsoft', initial: 'MS', color: '#00BCF2' },
  naver: { name: '네이버', initial: 'N', color: '#03C75A' },
  kakao: { name: '카카오', initial: 'K', color: '#FAE100' },
  coupang: { name: '쿠팡', initial: 'C', color: '#CB1400' },
  baemin: { name: '배달의민족', initial: 'B', color: '#2AC1BC' },
  toss: { name: '토스', initial: 'T', color: '#0050FF' },
  karrot: { name: '당근마켓', initial: '당', color: '#FF7E36' },
  ncsoft: { name: 'NC소프트', initial: 'NC', color: '#00266A' },
  samsung: { name: '삼성전자', initial: 'S', color: '#1428A0' },
  lg: { name: 'LG전자', initial: 'LG', color: '#A50034' },
};

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6'];

function categoryLabel(cat: NewsListItem['category']): string {
  const map: Record<string, string> = {
    LLM: '대형 언어 모델', Vision: '비전 AI', Semiconductor: '반도체',
    ETC: '기타 뉴스'
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
  const COMPANY_KEYWORDS: Record<string, string[]> = {
    openai: ['openai', '오픈ai', 'chatgpt'],
    google: ['google', '구글', 'deepmind', '딥마인드'],
    anthropic: ['anthropic', '앤스로픽', 'claude'],
    microsoft: ['microsoft', '마이크로소프트', 'ms'],
    naver: ['naver', '네이버', '하이퍼클로바'],
    kakao: ['kakao', '카카오', '코지피티'],
    coupang: ['coupang', '쿠팡'],
    baemin: ['배달의민족', '우아한형제들', '배민'],
    toss: ['toss', '토스', '비바리퍼블리카'],
    karrot: ['당근마켓', '당근'],
    ncsoft: ['nc소프트', '엔씨소프트', 'ncsoft'],
    samsung: ['삼성', 'samsung'],
    lg: ['lg', '엘지'],
  };

  for (const company of Object.keys(COMPANY_KEYWORDS)) {
    const keywords = COMPANY_KEYWORDS[company];
    const matches = newsList.filter(
      (n) => keywords.some(keyword => 
        n.title.toLowerCase().includes(keyword) || n.source.toLowerCase().includes(keyword)
      )
    );
    if (matches.length > 0) grouped[company] = matches;
  }

  const result = Object.entries(grouped).map(([id, items], idx) => {
    const meta = COMPANY_META[id];
    const color = meta?.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    
    // 1. 퀄리티 점수 (최근 4일 중 Top 3의 평균 Score)
    const sortedScores = items.map((n) => n.score).sort((a, b) => b - a);
    const top3Scores = sortedScores.slice(0, 3);
    const avgTop3Score = top3Scores.length > 0 
      ? top3Scores.reduce((acc, val) => acc + val, 0) / top3Scores.length 
      : 0;
    const qualityScore = avgTop3Score * 100;

    // 2. 볼륨 점수 (Max 10건 기준)
    const volumeScore = Math.min(items.length / 10, 1.0) * 100;

    // 3. 최종 활동성 지수 (퀄리티 60% + 볼륨 40%)
    const finalProgress = Math.round((qualityScore * 0.6) + (volumeScore * 0.4));

    return {
      id,
      name: meta?.name ?? id,
      initial: meta?.initial ?? id[0].toUpperCase(),
      color,
      progress: finalProgress, // 분석가의 공식 적용!
      activities: items.slice(0, 3).map((n) => ({
        date: formatDate(n.publishedAt),
        category: categoryLabel(n.category),
        title: n.title,
      })),
    };
  });

  // 점수가 높은 순(진행률이 높은 순)으로 상위부터 정렬해서 보여주기
  return result.sort((a, b) => b.progress - a.progress);
}

export const CorporateActivityTab = () => {
  const { data, isLoading, isError } = useNewsListQuery();

  if (isLoading) {
    return <Loading />;
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
