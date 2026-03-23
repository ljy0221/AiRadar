"use client";

import { useEffect, useRef } from 'react';
import Image from 'next/image';

import githubImg from '@/public/github.png';
import jobsImg from '@/public/jobs.png';
import newsImg from '@/public/news.png';
import trendImg from '@/public/trend.png';
import ecosystemImg from '@/public/ecosystem.png';

interface ServiceCardProps {
  title: string;
  description: string;
  imagePath: string;
  className?: string;
  delay?: string;
}

const ServiceCard = ({ title, description, imagePath, className, delay }: ServiceCardProps) => {
  return (
    <div className={`group flex flex-col bg-white dark:bg-[#0d1825] border border-gray-100 dark:border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] card-hover-effect reveal-on-scroll ${delay} ${className}`}>
      <div className="flex flex-col h-full text-center">
        <h4 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 truncate">
          {title}
        </h4>
        
        <div className="relative flex-1 min-h-[160px] md:min-h-[200px] flex items-center justify-center my-6">
          <div className="absolute inset-0 bg-[var(--color-accent)] opacity-[0.03] rounded-full blur-3xl group-hover:opacity-[0.08] transition-opacity duration-500" />
          <Image 
            src={imagePath} 
            alt={title} 
            width={240} 
            height={240} 
            className="object-contain animate-float transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        <p className="text-[15px] md:text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-medium break-keep">
          {description}
        </p>
      </div>
    </div>
  );
};

export const MainServiceSection = () => {
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
    <section ref={sectionRef} className="w-full max-w-6xl px-4 py-32 flex flex-col items-center">
      <div className="text-center mb-20 reveal-on-scroll">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
          AI Radar가 제공하는 <span className="text-[var(--color-accent)]">핵심 서비스</span>
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
          데이터로 읽는 AI 기술 생태계의 모든 흐름,<br />
          검증된 인사이트만을 선별하여 가장 빠르게 전달합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 w-full">
        {/* Row 1: 3 Cards */}
        <ServiceCard 
          title="실시간 오픈소스 트렌드"
          description="전 세계 GitHub 저장소의 방대한 데이터를 분석해, 가장 뜨거운 기술 스택과 오픈소스 트렌드를 실시간으로 포착합니다."
          imagePath={githubImg.src}
          className="md:col-span-2"
          delay="delay-100"
        />
        <ServiceCard 
          title="채용 시장 역량 분석"
          description="수많은 IT 채용 공고를 정밀하게 분석하여, 현업에서 지금 가장 요구하는 핵심 스킬과 실무 역량 변화를 파악합니다."
          imagePath={jobsImg.src}
          className="md:col-span-2"
          delay="delay-200"
        />
        <ServiceCard 
          title="글로벌 기술 지식 피드"
          description="ArXiv 논문과 글로벌 IT 미디어를 통합 모니터링하여, 파편화된 기술 정보들을 의미 있는 하나의 인사이트로 묶어냅니다."
          imagePath={newsImg.src}
          className="md:col-span-2"
          delay="delay-300"
        />

        {/* Row 2: 2 Cards (wider) */}
        <div className="hidden md:block col-span-1" />
        <ServiceCard 
          title="키워드 감성 분석 인사이트"
          description="키워드 빈도를 넘어 긍·부정 감성 분석을 적용, 수치 이면에 숨겨진 진짜 가치와 핵심 맥락을 입체적으로 도출합니다."
          imagePath={trendImg.src}
          className="md:col-span-2"
          delay="delay-400"
        />
        <ServiceCard 
          title="맞춤형 AI 성장 로드맵"
          description="사용자의 관심 기술과 현재 보유 역량을 바탕으로, AI가 최적화된 다음 단계 학습 방향과 개인화 로드맵을 제안합니다."
          imagePath={ecosystemImg.src}
          className="md:col-span-2"
          delay="delay-500"
        />
        <div className="hidden md:block col-span-1" />
      </div>
    </section>
  );
};
