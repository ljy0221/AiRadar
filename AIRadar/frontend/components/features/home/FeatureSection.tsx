"use client";

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { BacktestingChart } from './BacktestingChart';
import { CorrelationChart } from './CorrelationChart';

export const FeatureSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.reveal-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="w-full max-w-5xl px-4 py-32 flex flex-col items-center overflow-hidden">
      <h3 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-center mb-20 leading-[1.2] tracking-tight text-gray-900 dark:text-white reveal-on-scroll">
        주관적일 수 있는 <span className="text-[var(--color-accent)]">AI 트렌드 예측</span>,<br className="hidden md:block" />
        <span className="mt-4 md:mt-2 text-gray-800 dark:text-gray-100 inline-block pb-2">
          과거 데이터 백테스팅으로 검증했습니다.
        </span>
      </h3>

      <div className="flex flex-col gap-24 w-full">
        {/* 첫번째 특징 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 reveal-on-scroll">
          <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start gap-4 md:mt-4">
            {/* 1단계: Eyebrow */}
            <div className="flex gap-2 text-base md:text-lg font-semibold mb-3">
              <span className="text-[var(--color-accent)]">SIGNAL 01</span>
              <span className="text-gray-500 dark:text-gray-400">데이터 검증</span>
            </div>

            {/* 2단계: 헤더 (더 작고 산뜻하게) */}
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 dark:text-gray-200 leading-[1.3] tracking-tight mb-4">
              실제 데이터로 입증된<br />강력한 AI 예측 모델
            </h3>

            {/* 3단계: 체크리스트 (순차 등장 효과) */}
            <ul className="text-base md:text-lg text-[#4b5563] dark:text-gray-300 flex flex-col gap-[6px] font-normal">
              <li className="flex items-center gap-3 reveal-on-scroll delay-300">
                <Check className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={2} />
                채용 공고 데이터와 교차 검증
              </li>
              <li className="flex items-center gap-3 reveal-on-scroll delay-400">
                <Check className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={2} />
                오픈소스 트렌드 실시간 반영
              </li>
              <li className="flex items-center gap-3 reveal-on-scroll delay-500">
                <Check className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={2} />
                6개월 단위 백테스팅 검증
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full bg-white dark:bg-[#0e1520] rounded-2xl aspect-[4/3] flex items-center justify-center border border-gray-200 dark:border-white/5 shadow-md overflow-hidden card-hover-effect animate-float">
            <BacktestingChart />
          </div>
        </div>

        {/* 두번째 특징 */}
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 md:gap-16 reveal-on-scroll delay-200">
          <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start gap-4 md:mt-4">
            {/* 1단계: Eyebrow */}
            <div className="flex gap-2 text-base md:text-lg font-semibold mb-3">
              <span className="text-[var(--color-accent)]">SIGNAL 02</span>
              <span className="text-gray-500 dark:text-gray-400">다면적 분석</span>
            </div>

            {/* 2단계: 헤더 */}
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 dark:text-gray-200 leading-[1.3] tracking-tight mb-4 text-left">
              3가지 데이터 소스,<br />하나의 인사이트
            </h3>

            {/* 3단계: 체크리스트 */}
            <ul className="text-base md:text-lg text-[#4b5563] dark:text-gray-300 flex flex-col gap-[6px] font-normal">
              <li className="flex items-center gap-3 reveal-on-scroll delay-400">
                <Check className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={2} />
                GitHub 개발 생태계 동향
              </li>
              <li className="flex items-center gap-3 reveal-on-scroll delay-500">
                <Check className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={2} />
                뉴스 미디어 관심도 추적
              </li>
              <li className="flex items-center gap-3 reveal-on-scroll delay-600">
                <Check className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={2} />
                Arxiv 학술 논문 발행량
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full bg-white dark:bg-[#0e1520] rounded-2xl aspect-[4/3] flex items-center justify-center border border-gray-200 dark:border-white/5 shadow-md overflow-hidden card-hover-effect animate-float delay-300">
            <CorrelationChart />
          </div>
        </div>
      </div>
    </section>
  );
};
