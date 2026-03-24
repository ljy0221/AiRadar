"use client";

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

export const HeroSection = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="w-full relative min-h-screen flex flex-col items-center justify-between pb-8 pt-20 overflow-hidden bg-bg-primary">
      {/* 1. Deep Background Grid & Radar Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Dark radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,200,0.05)_0%,var(--color-bg-primary)_65%)]" />

        {/* Diagonal Crosshair Lines */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">



          {/* Concentric Radar Rings */}
          {[400, 700, 1000].map((r) => (
            <div
              key={r}
              className="absolute rounded-full border-[1px] border-accent/30"
              style={{ width: r, height: r }}
            />
          ))}
          {/* Animated Pulsing Rings */}
          <div className="absolute w-[800px] h-[800px] rounded-full border-[1.5px] border-accent/40 animate-radar" />
          <div className="absolute w-[800px] h-[800px] rounded-full border-[1.5px] border-accent/40 animate-radar" style={{ animationDelay: '1s' }} />

          {/* Rotating Scan Line */}
          <div className="absolute w-[1500px] h-[1500px] rounded-full overflow-hidden animate-scan pointer-events-none" style={{ animationDuration: '8s' }}>
            {/* Smooth full conic gradient tail */}
            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_180deg,var(--color-accent)_360deg)] opacity-40 mix-blend-screen" />
            {/* Leading edge scanner beam */}
            <div className="absolute top-0 left-1/2 -ml-[1px] w-[2px] h-1/2 bg-accent shadow-[0_0_15px_var(--color-accent)]" />
          </div>
        </div>
      </div>

      {/* 2. Content Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        className="relative z-10 flex flex-col items-center justify-center px-4 max-w-6xl w-full flex-grow -mt-16"
      >
        {/* Floating Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="px-5 py-2.5 rounded-full border border-accent/20 bg-bg-secondary/50 backdrop-blur-md mb-12 flex items-center gap-2 cursor-default"
        >
          <div className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full shadow-[0_0_6px_var(--color-accent)]" />
          <span className="text-[10px] font-bold text-[var(--color-accent)] tracking-[0.2em] uppercase">
            LIVE AI INTELLIGENCE SYSTEM
          </span>
        </motion.div>

        {/* Stacked Main Title */}
        <div className="relative group text-center flex flex-col items-center mb-10 w-full overflow-visible py-4">
          <motion.h1
            style={{ x: mousePos.x * 0.1, y: mousePos.y * 0.1, fontFamily: 'var(--font-audiowide-next)' }}
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center leading-[0.95] select-none relative z-10 font-audiowide tracking-tight w-full"
          >
            <span style={{ fontFamily: 'var(--font-audiowide-next)' }} className="font-audiowide text-[14vw] md:text-[7.5rem] lg:text-[8.5rem] text-text-primary uppercase tracking-wider mb-1">
              AI
            </span>
            <span style={{ fontFamily: 'var(--font-audiowide-next)' }} className="font-audiowide text-[17vw] md:text-[8.5rem] lg:text-[9.5rem] text-accent tracking-wide mt-1">
              RADAR
            </span>
          </motion.h1>
        </div>

        {/* Sub-headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-col items-center text-center max-w-2xl mb-12"
        >
          <p className="text-sm md:text-lg lg:text-xl font-normal text-text-primary/70 leading-relaxed tracking-wide">
            내일의 기술을 오늘 마주하다.<br />
            AI Radar는 가장 예리한 눈으로 미래의 신호를 읽습니다.
          </p>
        </motion.div>



        {/* Premium Tech Info Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-y-10 md:gap-0"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-accent uppercase tracking-[0.15em]">Sensing</span>
            <span className="text-lg md:text-xl font-bold text-text-primary tracking-widest">Full Stack</span>
          </div>
          <div className="flex flex-col items-center gap-2 md:border-l border-text-primary/10">
            <span className="text-[11px] font-bold text-accent uppercase tracking-[0.15em]">Engine</span>
            <span className="text-lg md:text-xl font-bold text-text-primary tracking-widest">Real-time ML</span>
          </div>
          <div className="flex flex-col items-center gap-2 md:border-l border-text-primary/10">
            <span className="text-[11px] font-bold text-accent uppercase tracking-[0.15em]">Forecast</span>
            <span className="text-lg md:text-xl font-bold text-text-primary tracking-widest">99.8% Conf.</span>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Minimalist Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="relative z-10 flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity mt-auto"
      >
        <div className="w-[1px] h-10 bg-gradient-to-b from-accent to-transparent" />
        <span className="text-[10px] font-normal text-text-primary/40 tracking-[0.2em] uppercase">SCROLL</span>
      </motion.div>
    </section>

  );
};
