// app/papers/page.tsx
'use client';

import { PaperTimelineTab } from '@/components/features/papers';

export default function PapersPage() {
  return (
    <div className="w-full flex flex-col min-h-screen">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col gap-8">
          <PaperTimelineTab />
        </div>
      </div>
    </div>
  );
}
