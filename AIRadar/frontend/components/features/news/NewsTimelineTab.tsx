'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TimelineFilter } from './TimelineFilter';
import { TimelineItem, TimelineItemData } from './TimelineItem';
import { useNewsListQuery } from '@/hooks/queries/useNewsQuery';
import type { NewsListItem } from '@/types/news';

// NewsListItem → TimelineItemData 매핑 함수
function toTimelineItemData(news: NewsListItem): TimelineItemData {
  return {
    id: news.articleId,
    category: categoryLabel(news.category),
    region: news.region === 'DOMESTIC' ? '국내' : '해외',
    title: news.title,
    summary: '', // 목록 API에는 summary 없음 → 상세 훅 연동 시 채울 수 있음
    publisher: news.source,
    date: formatDate(news.publishedAt),
    hashtags: [],
    isHot: news.score >= 0.8,
  };
}

function categoryLabel(cat: NewsListItem['category']): string {
  const map: Record<string, string> = {
    AI_MODEL: '모델/연구',
    AI_HARDWARE: '하드웨어',
    AI_POLICY: '정책/규제',
    AI_RESEARCH: '기술/연구',
    AI_BUSINESS: '비즈니스',
  };
  return map[cat] ?? cat;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 날짜 문자열(YYYY-MM-DD)로 그룹핑
function groupByDate(items: NewsListItem[]): { dateText: string; items: TimelineItemData[] }[] {
  const map = new Map<string, TimelineItemData[]>();
  for (const item of items) {
    const d = new Date(item.publishedAt);
    const key = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(toTimelineItemData(item));
  }
  return Array.from(map.entries()).map(([dateText, items]) => ({ dateText, items }));
}

export const NewsTimelineTab = () => {
  const [regionFilter, setRegionFilter] = useState<'all' | 'domestic' | 'international'>('all');

  const region =
    regionFilter === 'domestic' ? 'DOMESTIC' : regionFilter === 'international' ? 'GLOBAL' : undefined;

  const { data, isLoading, isError } = useNewsListQuery({ region });

  const groupedData = data ? groupByDate(data) : [];

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--color-accent)]" />
          <p className="text-sm">뉴스 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full flex justify-center py-20">
        <p className="text-sm text-red-500">뉴스 데이터를 불러오는 데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-4xl">
        <TimelineFilter currentCategory={regionFilter} setCategory={setRegionFilter} />

        <div className="mt-8 flex flex-col gap-10">
          {groupedData.map((group, gIdx) => (
            <div key={gIdx} className="relative">
              {/* 날짜 헤더 영역 */}
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-4 h-4 rounded-full bg-[var(--color-accent)] opacity-80" />
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {group.dateText}
                </h3>
              </div>

              {/* 해당 날짜의 뉴스 아이템 리스트 래퍼 (왼쪽 세로선 포함) */}
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-2">
                <div className="flex flex-col gap-4">
                  {group.items.map((item, iIdx) => (
                    <TimelineItem key={iIdx} data={item} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
