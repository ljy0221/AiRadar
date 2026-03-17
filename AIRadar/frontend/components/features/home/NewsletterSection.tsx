'use client';

import { useState } from 'react';
import { Input, Modal } from '@/components/common';
import { Mail, User, Briefcase, ChevronDown, CalendarArrowUp, CalendarArrowDown } from 'lucide-react';
export const NewsletterSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('구독이 완료되었습니다! 매주 유익한 인사이트를 전해드릴게요.');
    setIsModalOpen(false);
  };

  return (
    <section className="w-full bg-[var(--color-accent)] dark:bg-[#1a1c2e] text-white dark:text-[var(--color-text-primary)] py-24 px-4 mt-12 flex flex-col items-center transition-colors border-y border-transparent dark:border-gray-800">
      <div className="max-w-4xl w-full text-center">
        <h3 className="text-xl md:text-3xl font-bold mb-16 px-4">주 2회, 이메일로 받아보는 완벽한 AI 트렌드 리포트</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 px-4 md:px-12">
          {/* Item 1 */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-full max-w-xs md:max-w-sm aspect-square bg-white/20 dark:bg-white/5 rounded-xl flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] p-8 gap-5 border border-white/10 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/10 transition-[transform,background-color] duration-300 transform-gpu hover:-translate-y-1">
              <div className="drop-shadow-md flex items-center justify-center bg-white/10 rounded-full w-24 h-24 mb-2">
                <CalendarArrowUp className="w-12 h-12 text-[#3b82f6]" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight">AI 생태계 위클리 요약</h4>
              <p className="text-[16px] opacity-90 mt-2 font-medium break-keep">
                전 주 핵심 일정 및 동향 브리핑
              </p>
            </div>
          </div>
          {/* Item 2 */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-full max-w-xs md:max-w-sm aspect-square bg-white/20 dark:bg-white/5 rounded-xl flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] p-8 gap-5 border border-white/10 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/10 transition-[transform,background-color] duration-300 transform-gpu hover:-translate-y-1">
              <div className="drop-shadow-md flex items-center justify-center bg-white/10 rounded-full w-24 h-24 mb-2">
                <CalendarArrowDown className="w-12 h-12 text-[#3b82f6]" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight">한발 앞선 트렌드 예측</h4>
              <p className="text-[16px] opacity-90 mt-2 font-medium break-keep">
                차주 AI 트렌드 및 주요 일정 안내
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto flex flex-col items-center gap-6 px-6">
          <h4 className="text-2xl font-bold mb-2">지금 이메일로 받아보세요</h4>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-10 py-4 bg-[var(--color-text-primary)] dark:bg-[var(--color-accent)] text-white dark:text-[#0A0B1A] font-bold rounded-md hover:opacity-90 transition-opacity text-lg"
          >
            지금 구독하기
          </button>
        </div>
      </div>

      {/* 구독 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="flex flex-col gap-8 py-6 px-4 md:px-8">
          <div className="mb-2 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--color-accent)] tracking-tighter mb-4">
              Newsletter
            </h2>
          </div>

          <form className="flex flex-col w-full gap-5" onSubmit={handleSubmit}>
            {/* 이메일 */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type="email"
                placeholder="이메일"
                className="w-full pl-11 bg-gray-50/50 dark:bg-gray-800/30"
                required
              />
            </div>

            {/* 닉네임, 직군, 경력 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="닉네임"
                  className="w-full pl-11 bg-gray-50/50 dark:bg-gray-800/30"
                  required
                />
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                </div>
                <select
                  className="w-full pl-11 pr-4 py-3 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all appearance-none cursor-pointer"
                  required
                  defaultValue=""
                >
                  <option value="" disabled hidden>직군 선택</option>
                  <option value="프론트엔드">프론트엔드</option>
                  <option value="백엔드">백엔드</option>
                  <option value="데이터/AI">데이터/AI</option>
                  <option value="기획/PM">기획/PM</option>
                  <option value="디자인">디자인</option>
                  <option value="기타">기타</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                </div>
                <select
                  className="w-full pl-11 pr-4 py-3 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all appearance-none cursor-pointer"
                  required
                  defaultValue=""
                >
                  <option value="" disabled hidden>경력 선택</option>
                  <option value="신입">신입 (1년 미만)</option>
                  <option value="주니어">주니어 (1~3년)</option>
                  <option value="미들">미들 (4~6년)</option>
                  <option value="시니어">시니어 (7년 이상)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>

            {/* 구독 버튼 영역 */}
            <div className="flex justify-center mt-6">
              <button
                type="submit"
                className="w-full sm:w-1/2 px-10 py-4 text-lg bg-[var(--color-accent)] text-white dark:text-[#0A0B1A] font-bold rounded-lg shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                구독하기
              </button>
            </div>
          </form>
        </div>
      </Modal>

    </section>
  );
};
