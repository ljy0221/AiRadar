"use client";

import { useEffect, useRef } from 'react';
import Image from 'next/image';


// 이미지 파일이 public 폴더에 존재해야 합니다: feature1.png, feature2.png, feature3.png
const githubImg = '/feature1.png';
const jobsImg = '/feature2.png';
const newsImg = '/feature3.png';

interface ServiceCardProps {
  title: string;
  description: string;
  imagePath: string;
  className?: string;
  delay?: string;
  bgColor: string;
}

const ServiceCard = ({ title, description, imagePath, className, delay, bgColor }: ServiceCardProps) => {
  return (
    <div className={`group flex flex-col bg-white dark:bg-[#0d121f] border border-gray-100 dark:border-white/5 rounded-[32px] overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] card-hover-effect reveal-on-scroll ${delay} ${className}`}>
      {/* Upper Area: Orange Gradient + Monitor Mockup */}
      <div className={`h-[280px] md:h-[300px] bg-gradient-to-br from-[#d45d44] to-[#C8432A] flex items-center justify-center p-6 transition-all duration-500 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-30" />
        
        {/* Monitor Mockup Frame */}
        <div className="relative z-10 w-[220px] md:w-[240px] aspect-[16/10] bg-gray-900 rounded-[12px] border-[6px] border-gray-950 shadow-2xl overflow-hidden transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-2">
          {/* Monitor Screen Inset (To make image look small) */}
          <div className="absolute inset-2 bg-gray-950 rounded-[4px] overflow-hidden p-1 flex items-center justify-center">
             <div className="relative w-full h-full rounded-[2px] overflow-hidden bg-[#0a0a0a]">
                <Image
                  src={imagePath}
                  alt={title}
                  fill
                  className="object-contain opacity-90 brightness-110 transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-w-768px) 240px, 300px"
                />
             </div>
          </div>
          
          {/* Monitor Bottom Branding Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-900 flex justify-center items-center">
            <div className="w-1.5 h-0.5 bg-white/20 rounded-full" />
          </div>
        </div>
        
        {/* Monitor Stand */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-12 h-8 bg-gray-950/20 rounded-t-lg blur-sm transition-all duration-700 group-hover:opacity-0" />
      </div>

      {/* Lower Area: Text */}
      <div className="px-8 py-10 md:px-10 md:py-12 flex flex-col items-center text-center">
        <h4 className="text-xl md:text-[22px] font-bold text-gray-900 dark:text-gray-50 mb-3 tracking-tight">
          {title}
        </h4>
        <p className="text-sm md:text-[15px] text-gray-500 dark:text-gray-400 leading-[1.6] font-medium break-keep">
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
    <section ref={sectionRef} className="w-full max-w-6xl px-4 pt-24 pb-48 flex flex-col items-center">
      <div className="text-center mb-20 reveal-on-scroll">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
          AI Radar의 <span className="text-[var(--color-accent)]">핵심 기능</span> 알아보기
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl font-bold max-w-2xl mx-auto">
          데이터로 읽는 AI 기술 생태계의 모든 흐름,<br />
          검증된 인사이트만을 선별하여 가장 빠르게 전달합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        <ServiceCard 
          title="실시간 오픈소스 트렌드"
          description="전 세계 GitHub 저장소 데이터를 분석해, 가장 뜨거운 기술 스택과 오픈소스 트렌드를 실시간으로 포착합니다."
          imagePath={githubImg}
          bgColor="bg-[#e2f3d8] dark:bg-[#2d3a28]"
          delay="delay-100"
        />
        <ServiceCard 
          title="채용 시장 역량 분석"
          description="IT 채용 공고를 정밀 분석하여, 현업에서 지금 가장 요구하는 핵심 스킬과 실무 역량 변화를 파악합니다."
          imagePath={jobsImg}
          bgColor="bg-[#fde2d3] dark:bg-[#3d2f28]"
          delay="delay-200"
        />
        <ServiceCard 
          title="글로벌 기술 지식 피드"
          description="논문과 IT 미디어를 통합 모니터링하여, 파편화된 기술 정보를 의미 있는 인사이트로 묶어냅니다."
          imagePath={newsImg}
          bgColor="bg-[#ead9ff] dark:bg-[#322843]"
          delay="delay-300"
        />
      </div>
    </section>
  );
};
