'use client';

import { Input } from '@/components/common';

export const NewsletterSection = () => {
  return (
    <section className="w-full bg-[var(--color-accent)] dark:bg-[rgba(255,255,255,0.05)] text-white py-24 px-4 mt-12 flex flex-col items-center transition-colors">
      <div className="max-w-4xl w-full text-center">
        <h3 className="text-xl md:text-3xl font-bold mb-16 px-4">이 모든 인사이트를 매주 메일로 보내드릴게요</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 px-4 md:px-12">
          {/* Item 1 */}
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-xs md:max-w-sm aspect-square bg-white/20 dark:bg-white/5 rounded-lg flex items-center justify-center shadow-inner" />
            <div className="w-16 h-1.5 bg-white/60 rounded-full" />
            <p className="text-sm md:text-base font-semibold">매주 AI 테크의 핵심 키워드 정리</p>
          </div>
          {/* Item 2 */}
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-xs md:max-w-sm aspect-square bg-white/20 dark:bg-white/5 rounded-lg flex items-center justify-center shadow-inner" />
            <div className="w-16 h-1.5 bg-white/60 rounded-full" />
            <p className="text-sm md:text-base font-semibold">현업에서 와닿는 AI 생태계 이야기</p>
          </div>
        </div>

        <div className="max-w-xl mx-auto flex flex-col items-center gap-6 px-6">
          <h4 className="text-2xl font-bold mb-2">지금 이메일로 받아보세요</h4>
          <form className="flex w-full shadow-lg rounded-md overflow-hidden" onSubmit={(e) => e.preventDefault()}>
            <Input
              type="email"
              placeholder="이메일 주소"
              className="flex-1 rounded-none border-0 text-gray-900 bg-white placeholder:text-gray-400 focus:ring-0 dark:bg-white dark:text-gray-900 px-6 py-4"
              required
            />
            <button
              type="submit"
              className="px-8 md:px-10 py-4 bg-[#2C3E50] dark:bg-[var(--color-accent)] text-white dark:text-[#0A0B1A] font-bold hover:opacity-90 transition-opacity"
            >
              구독
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
