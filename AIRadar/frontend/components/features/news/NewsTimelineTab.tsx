'use client';

import { useState, useMemo } from 'react';
import Loading from '@/app/loading';
import { TimelineFilter } from './TimelineFilter';
import { TimelineItem, TimelineItemData } from './TimelineItem';
import { TrendingKeywords } from './TrendingKeywords';
import { useNewsListQuery } from '@/hooks/queries/useNewsQuery';
import type { NewsListItem } from '@/types/news';

// NewsListItem → TimelineItemData 매핑 함수
function toTimelineItemData(news: NewsListItem): TimelineItemData {
  return {
    id: news.articleId,
    category: categoryLabel(news.category),
    region: news.region === 'DOMESTIC' ? '국내' : '해외',
    title: news.title,
    summary: news.summary ?? '',
    publisher: news.source,
    date: formatDate(news.publishedAt),
    hashtags: [],
    isHot: news.score >= 0.8,
    url: news.url,
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const region =
    regionFilter === 'domestic' ? 'DOMESTIC' : regionFilter === 'international' ? 'GLOBAL' : undefined;

  const { data, isLoading, isError } = useNewsListQuery({ region });

  const allGroupedData = data ? groupByDate(data) : [];

  // 가용한 날짜 문자열(YYYY-MM-DD 형식) 추출
  const availableDates = useMemo(() => 
    data ? Array.from(new Set(data.map(item => item.publishedAt.split('T')[0]))) : [],
    [data]
  );

  // 선택된 날짜가 있으면, 'YYYY-MM-DD' 형식의 날짜와 매칭되는 그룹만 필터링
  // data 내부의 publishedAt이 ISO 문자열이므로 T 이전 부분으로 판별
  const groupedData = selectedDate
    ? allGroupedData.map(group => {
      const filteredItems = group.items.filter(item => {
        // 원래 data[]와 group.items가 분리되어 있으므로 item 자체에 원본 날짜가 필요할 수 있으나,
        // 여기서는 group.dateText 포맷("YYYY년 M월 D일")을 파싱하거나, 단순하게 날짜 문자열 변환으로 우회합니다.
        // 또는 data를 순회하며 필터링 후 다시 groupByDate를 호출하는 것이 안전합니다.
        return true;
      });
      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0)
    : allGroupedData;

  // 개선된 필터링: 원본 데이터 자체를 날짜로 필터링한 후 그룹화
  const filteredData = selectedDate && data
    ? data.filter(item => item.publishedAt.startsWith(selectedDate))
    : data;

  const finalGroupedData = filteredData ? groupByDate(filteredData) : [];

  if (isLoading) {
    return <Loading />;
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
        <TimelineFilter
          currentCategory={regionFilter}
          setCategory={setRegionFilter}
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <div className="mt-8 flex flex-col gap-10">
          {finalGroupedData.map((group, gIdx) => (
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
