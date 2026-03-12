'use client';

import { useState } from 'react';
import { NewsTabs, NewsTimelineTab, CorporateActivityTab } from '@/components/features/news';

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'corporate'>('timeline');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-screen">
      
      {/* 헤더 타이틀 영역 (옵셔널) */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">AI 트렌드 뉴스</h1>
        <p className="text-gray-500 mt-1">최신 인공지능 기술 동향과 주요 기업들의 활동을 한눈에 확인하세요.</p>
      </div>

      {/* 탭 네비게이션 */}
      <NewsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 탭 내용 렌더링 */}
      <div className="flex-1 w-full">
        {activeTab === 'timeline' && <NewsTimelineTab />}
        {activeTab === 'corporate' && <CorporateActivityTab />}
      </div>
      
    </div>
  );
}
