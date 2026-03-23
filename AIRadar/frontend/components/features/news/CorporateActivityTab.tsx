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

    // 키워드 추출
    const keys = new Set<string>();
    items.forEach(n => {
       const kws = n.keywords && n.keywords.length > 0 ? n.keywords : [categoryLabel(n.category)];
       kws.forEach(k => keys.add(k));
    });

    return {
      id,
      name: meta?.name ?? id,
      initial: meta?.initial ?? id[0].toUpperCase(),
      color,
      progress: finalProgress,
      newsCount: items.length,
      keywords: Array.from(keys).slice(0, 4), // 최대 4개 표시
      activities: items.slice(0, 3).map((n) => ({
        date: formatDate(n.publishedAt),
        category: categoryLabel(n.category),
        title: n.title,
        url: n.url,
      })),
    };
  });

  return result.sort((a, b) => b.progress - a.progress);
}

import { useState } from 'react';
import { ExternalLink, ArrowLeft, ArrowDown, TrendingUp } from 'lucide-react';

export const CorporateActivityTab = () => {
  const { data: dailyGroups, isLoading, isError } = useNewsListQuery();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !dailyGroups) {
    return (
      <div className="w-full flex justify-center py-20">
        <p className="text-sm text-red-500">데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  const allNewsItems = dailyGroups.flatMap(group => group.items);
  // 선택 시 모든 기록을 볼 수 있도록 여기서는 slice를 하지 않도록 원본 데이터를 보존
  // groupNewsByCompany 내부 로직을 덮어쓰진 않되, 여기서 직접 원본을 활용 가능
  const corporateData = groupNewsByCompany(allNewsItems).map(comp => {
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
    const keywords = COMPANY_KEYWORDS[comp.id] || [];
    const originalMatches = allNewsItems.filter(n => keywords.some(keyword => n.title.toLowerCase().includes(keyword) || n.source.toLowerCase().includes(keyword)));
    
    return {
      ...comp,
      allActivities: originalMatches.map(n => ({
        date: formatDate(n.publishedAt),
        category: categoryLabel(n.category),
        title: n.title,
        url: n.url,
        publisher: n.source,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // 최신순
    };
  });

  const selectedCompany = selectedCompanyId ? corporateData.find(c => c.id === selectedCompanyId) : null;

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-5xl"> {/* 가로 폭을 넓혀 안정감 확보 */}

        {!selectedCompany ? (
          // --- 1. 기업 목록 그리드 뷰 ---
          <>
            <div className="mb-6 flex justify-between items-end">
              <p className="text-gray-500 dark:text-gray-400 text-sm">기업을 선택하면 상세 타임라인을 볼 수 있어요</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {corporateData.length > 0 ? (
                corporateData.map((company) => (
                  <CompanyActivityCard 
                    key={company.id} 
                    company={company} 
                    onClick={() => setSelectedCompanyId(company.id)} 
                  />
                ))
              ) : (
                <p className="text-sm text-gray-400 col-span-full text-center py-10">표시할 기업 활동 데이터가 없습니다.</p>
              )}
            </div>
          </>
        ) : (
          // --- 2. 기업 상세 타임라인 뷰 (스크린샷 기반) ---
          <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 상단 헤더 영역 */}
            <div className="flex flex-col mb-8">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setSelectedCompanyId(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1a1c2e] hover:bg-gray-200 dark:hover:bg-[#22253a] transition-colors rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400"
                >
                  <ArrowLeft className="w-4 h-4" /> 전체 기업
                </button>
                
                <div 
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white font-extrabold text-xl shadow-sm"
                  style={{ backgroundColor: selectedCompany.color }}
                >
                  {selectedCompany.initial}
                </div>
                
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedCompany.name}</h2>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">최근 뉴스 {selectedCompany.allActivities.length}건</span>
                </div>
              </div>

              {/* 주요 키워드 필터 (시각적) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-4 py-1.5 rounded-full text-[13px] font-bold border border-emerald-500 text-emerald-500 bg-emerald-500/10 cursor-pointer">
                  전체
                </span>
                {selectedCompany.keywords.map(kw => (
                  <span key={kw} className="px-4 py-1.5 rounded-full text-[13px] font-bold border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 bg-transparent cursor-pointer hover:border-gray-400 transition-colors">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* 타임라인 히스토리 리스트 */}
            <div className="flex flex-col gap-6">
              {(() => {
                // 날짜별 그룹화
                const dateMap = new Map<string, typeof selectedCompany.allActivities>();
                selectedCompany.allActivities.forEach(act => {
                  if (!dateMap.has(act.date)) dateMap.set(act.date, []);
                  dateMap.get(act.date)!.push(act);
                });

                return Array.from(dateMap.entries()).map(([date, activities]) => (
                  <div key={date} className="flex flex-col group">
                    {/* 날짜 구분선 */}
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-600 tracking-wider">
                        {date}
                      </span>
                      <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-800/80" />
                    </div>
                    
                    {/* 해당 날짜 아이템들 */}
                    <div className="flex flex-col gap-5 pl-1.5">
                      {activities.map((act, i) => (
                        <div key={i} className="flex justify-between items-start gap-4 group/item">
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                              style={{ backgroundColor: selectedCompany.color }}
                            />
                            <div className="flex flex-col gap-1.5">
                              {act.url ? (
                                <a href={act.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-bold text-gray-800 dark:text-gray-200 hover:text-[var(--color-accent)] transition-colors leading-snug">
                                  {act.title}
                                </a>
                              ) : (
                                <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200 leading-snug">
                                  {act.title}
                                </span>
                              )}
                              
                              <div className="flex items-center gap-2 mt-0.5">
                                <span 
                                  className="text-[11px] font-bold"
                                  style={{ color: selectedCompany.color }}
                                >
                                  {act.category}
                                </span>
                                <span className="text-[11px] font-medium text-gray-400">
                                  {act.publisher || 'AI타임스'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 우측 주목 뱃지 (스펙 참고: 랜덤하게 표시되거나 특정 조건) */}
                          <div className="flex items-center gap-1 text-[#f0564a] bg-[#f0564a]/10 px-2 py-1 rounded text-xs font-bold shrink-0 opacity-80 group-hover/item:opacity-100 transition-opacity">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>주목</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            {/* 리스트 하단 확장 원형 버튼 */}
            <div className="w-full flex justify-center mt-12 py-4">
              <button className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
