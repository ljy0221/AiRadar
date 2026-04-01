'use client';

import { useState } from 'react';
import { PaperTimelineTab, PaperTabs } from '@/components/features/papers';

export default function PapersPage() {
  const [activeTab, setActiveTab] = useState('daily');

  return (
    <div className="w-full flex flex-col min-h-screen">
      <PaperTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col gap-8">
          <PaperTimelineTab activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}
