'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const JobSearch = () => {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // 임시 -> frontend-developer로 이동
      router.push(`/jobs/frontend-developer`);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-10 text-center">어떤 직업이 궁금하신가요?</h1>

      <form onSubmit={handleSearch} className="w-full max-w-2xl relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
        <input
          type="text"
          placeholder="직업을 검색해보세요.. (예: 프론트엔드 개발자)"
          className="w-full pl-16 pr-6 py-5 rounded-full text-lg shadow-md border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all dark:bg-[#1a1c2e] dark:border-gray-800"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
    </div>
  );
};
