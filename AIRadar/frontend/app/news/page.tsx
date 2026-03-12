'use client';

import { useState } from 'react';
import { NewsTabs, NewsTimelineTab, CorporateActivityTab } from '@/components/features/news';

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'corporate'>('timeline');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-screen">

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
