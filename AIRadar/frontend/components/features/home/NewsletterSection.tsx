'use client';

import { useState, useCallback } from 'react';
import { Mail, User, Briefcase, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Input, Modal } from '@/components/common';

const NEWSLETTER_CARDS = [
  {
    tag: '월요일',
    title: '빅테크 GitHub 분석',
    desc: '이번 주 구글, 메타 엔지니어들이 가장 많이 커밋한 오픈소스를 분석합니다.',
  },
  {
    tag: '월요일',
    title: '내 직업 맞춤 인사이트',
    desc: '당신의 직무(FE/BE/AI)에 딱 맞는 한주의 기술 동향을 요약해 드립니다.',
  },
  {
    tag: '금요일',
    title: '다음 주 트렌드 예측',
    desc: '단순 요약을 넘어, 다음 주 AI 생태계에서 주목해야 할 포인트를 짚어봅니다.',
  },
  {
    tag: '금요일',
    title: '주말 읽기 큐레이션',
    desc: '바쁜 주중을 지나, 주말에 깊이 있게 읽어볼 만한 양질의 AI 아티클 모음입니다.',
  },
  {
    tag: 'All-Day',
    title: '직업별 맞춤 예시',
    desc: '실무에 바로 적용 가능한 AI 프롬프트와 케이스 스터디를 제공합니다.',
  },
];

export const NewsletterSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % NEWSLETTER_CARDS.length);
  }, []);

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + NEWSLETTER_CARDS.length) % NEWSLETTER_CARDS.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('구독이 완료되었습니다! 매주 유익한 인사이트를 전해드릴게요.');
    setIsModalOpen(false);
  };

  return (
    <section className="w-full bg-[#241611] relative text-white py-24 md:py-32 overflow-hidden flex flex-col items-center min-h-[750px] justify-center">
      {/* Upper Color Transition - Smoother blend from the previous section to dark brown */}
      <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-transparent via-[#241611]/40 to-[#241611] pointer-events-none z-0" />
      
      <div className="max-w-6xl w-full px-6 flex flex-col items-center relative z-10">
        {/* Header - More Compact */}
        <div className="text-center mb-12 space-y-2">
          <span className="text-[#C8432A] font-extrabold tracking-widest text-xs uppercase drop-shadow-sm">Newsletter</span>
          <h3 className="text-2xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
            똑똑하게 앞서가는 <br className="md:hidden" /> AI 리더의 구독 리스트
          </h3>
        </div>

        {/* 3D Carousel Container - Adjusted for wider cards */}
        <div className="relative w-full h-[320px] md:h-[380px] flex items-center justify-center">
          <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
            {NEWSLETTER_CARDS.map((card, index) => {
              let position = index - activeIndex;
              if (position < -2) position += NEWSLETTER_CARDS.length;
              if (position > 2) position -= NEWSLETTER_CARDS.length;

              const isActive = position === 0;
              const isFar = Math.abs(position) > 1;

              return (
                <div
                  key={index}
                  className={`absolute w-[280px] md:w-[460px] h-[260px] md:h-[300px] transition-all duration-700 ease-in-out cursor-pointer
                    ${isActive ? 'z-30 opacity-100 scale-100 translate-x-0' : ''}
                    ${position === -1 ? 'z-20 opacity-40 scale-85 -translate-x-[55%] md:-translate-x-[65%] rotate-y-12 blur-[2px]' : ''}
                    ${position === 1 ? 'z-20 opacity-40 scale-85 translate-x-[55%] md:translate-x-[65%] -rotate-y-12 blur-[2px]' : ''}
                    ${isFar ? 'z-10 opacity-0 scale-75 translate-x-0 blur-[10px]' : ''}
                  `}
                  onClick={() => setActiveIndex(index)}
                  style={{
                    perspective: '1000px',
                    transform: `
                      translateX(${position * (typeof window !== 'undefined' && window.innerWidth < 768 ? 55 : 70)}%) 
                      scale(${isActive ? 1 : 0.85}) 
                      rotateY(${position * -15}deg)
                    `,
                  }}
                >
                  <div className={`w-full h-full bg-[#241611] rounded-2xl border-2 border-white/20 overflow-hidden flex flex-row shadow-2xl transition-all duration-500 ${isActive ? 'ring-2 ring-[#C8432A]/50 shadow-[#C8432A]/20 shadow-2xl' : ''}`}>
                    {/* Mockup Preview Area - Now on the left for landscape */}
                    <div className="w-[45%] h-full bg-gradient-to-br from-[#3D251E] to-[#241611] p-5 relative flex flex-col gap-2.5 group overflow-hidden">
                      <div className="w-full h-3 bg-white/20 rounded-full animate-pulse" />
                      <div className="w-3/4 h-2.5 bg-white/10 rounded-full" />
                      <div className="w-full h-24 mt-2 bg-white/5 rounded-lg border-2 border-white/10 flex items-center justify-center">
                         <Mail className="w-8 h-8 text-white/20" />
                      </div>
                      
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#C8432A]/10 to-transparent pointer-events-none" />
                      )}
                    </div>

                    {/* Card Content Area - Now on the right */}
                    <div className="w-[55%] h-full p-5 md:p-8 relative flex flex-col justify-center bg-[#241611]">
                      {/* Floating Badge moved to the right content area */}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-[#C8432A] border-2 border-[#C8432A] rounded-md shadow-lg">
                        <span className="text-[10px] text-white font-black tracking-tighter">{card.tag}</span>
                      </div>

                      <h4 className="text-lg md:text-xl font-black mb-2 group-hover:text-[#C8432A] transition-colors leading-tight">
                        {card.title}
                      </h4>
                      <p className="text-[11px] md:text-xs text-gray-400 font-medium line-clamp-3 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={prevSlide}
            className="absolute left-1 md:left-4 z-40 p-2.5 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 transition-all active:scale-90 backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-1 md:right-4 z-40 p-2.5 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 transition-all active:scale-90 backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Indicators & CTA */}
        <div className="flex flex-col items-center gap-6 mt-8">
          <div className="flex gap-2">
            {NEWSLETTER_CARDS.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-1 rounded-full transition-all duration-500 ${activeIndex === index ? 'w-6 bg-[#C8432A]' : 'w-1.5 bg-white/20'}`}
              />
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative px-10 py-4 bg-[#C8432A] text-white font-bold rounded-full hover:brightness-110 transition-all flex items-center gap-2 overflow-hidden shadow-lg active:scale-95"
          >
            <span className="relative z-10 text-base">지금 구독하기</span>
            <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="flex flex-col gap-6 py-4 px-4 md:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#C8432A] tracking-tighter mb-1">Join the Intel</h2>
            <p className="text-gray-400 text-xs text-balance">최신 AI 동향을 누구보다 빠르게 받아보세요.</p>
          </div>

          <form className="flex flex-col w-full gap-4" onSubmit={handleSubmit}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-gray-500" />
              </div>
              <Input
                type="email"
                placeholder="you@email.com"
                className="w-full pl-10 bg-gray-50/50 dark:bg-gray-800/20 border-gray-700 text-sm"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <Input
                  type="text"
                  placeholder="닉네임"
                  className="w-full pl-10 bg-gray-50/50 dark:bg-gray-800/20 border-gray-700 text-sm"
                  required
                />
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                </div>
                <select
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8432A] transition-all appearance-none cursor-pointer"
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
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 text-base bg-[#C8432A] text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all active:scale-95"
            >
              뉴스레터 시작하기
            </button>
          </form>
        </div>
      </Modal>
    </section>
  );
};
