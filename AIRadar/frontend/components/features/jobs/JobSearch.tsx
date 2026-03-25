'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTracking } from '@/hooks/useTracking';

export const JobSearch = () => {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const fullTitle = '당신의 직업, AI는 어떻게 볼까요?';
  const router = useRouter();

  useEffect(() => {
    let i = 0;
    setDisplayedTitle('');
    const timer = setInterval(() => {
      setDisplayedTitle(fullTitle.slice(0, i + 1));
      i++;
      if (i >= fullTitle.length) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const { trackSearch } = useTracking();

  const jobMap: Record<string, string> = {
    '개발자': 'developer',
    '마케터': 'marketer',
    '행정 보조': 'admin-assistant',
    '통역사': 'interpreter',
    '고객 상담원': 'customer-support',
    '변호사': 'lawyer',
    '회계사': 'accountant',
    '심리상담사': 'counselor',
    '패션 디자이너': 'fashion-designer',
    '경찰관': 'police-officer'
  };

  const handleJobClick = (jobName: string) => {
    trackSearch(jobName);
    const jobCode = jobMap[jobName] || encodeURIComponent(jobName);
    router.push(`/jobs/${jobCode}`);
  };

  const jobList = Object.keys(jobMap);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[90vh] pb-32 px-4">
      <div className="text-center mb-10 min-h-[140px] flex flex-col justify-end">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[var(--color-text-primary)]">
          {displayedTitle.split('AI').map((part, index, array) => (
            <span key={index}>
              {part}
              {index < array.length - 1 && (
                <span className="text-[var(--color-accent)] mx-1">AI</span>
              )}
            </span>
          ))}
          <span className="animate-pulse font-light ml-1">|</span>
        </h1>
        <p className="text-base md:text-lg text-gray-400 dark:text-gray-500 leading-relaxed max-w-lg mx-auto">
          <span className="font-bold text-gray-900 dark:text-gray-100">324개 직업</span>의 AI 대체 가능성과 미래 전망을<br />
          데이터 기반으로 분석해드려요.
        </p>
      </div>

      <div className="w-full max-w-3xl mt-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {jobList.map((job) => (
            <button
              key={job}
              onClick={() => handleJobClick(job)}
              className="px-5 py-2.5 rounded-full bg-white dark:bg-[#1a1c2e] text-gray-700 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-800 hover:bg-[var(--color-accent)] hover:text-white dark:hover:bg-[var(--color-accent)] hover:border-transparent transition-all duration-200 cursor-pointer hover:-translate-y-1 active:scale-95 font-medium text-base"
            >
              # {job}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
