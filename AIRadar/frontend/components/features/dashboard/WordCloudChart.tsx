'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWordCloudData, WordCloudData } from '@/services/dashboard/dashboardApi';
import { Loader2 } from 'lucide-react';

interface WordCloudChartProps {
  title?: string;
  subtitle?: string;
  isFullPage?: boolean;
}

type SourceType = 'NEWS' | 'PAPER' | 'GITHUB';

export const WordCloudChart = ({
  title = "주간 기술 키워드 워드클라우드",
  subtitle = "최근 1주일간 가장 많이 언급된 핵심 기술 트렌드",
  isFullPage = false
}: WordCloudChartProps) => {
  const [activeTab, setActiveTab] = useState<SourceType>('NEWS');
  const [data, setData] = useState<WordCloudData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 15개의 슬롯에 표시될 데이터의 인덱스들 (null일 경우 해당 슬롯은 잠시 비워둠)
  const [activeIndices, setActiveIndices] = useState<(number | null)[]>([]);
  const nextIdxRef = useRef(15);
  const pageSize = 15;

  const resetControls = () => {
    if (data.length > 0) {
      setActiveIndices(Array.from({ length: pageSize }, (_, i) => i % data.length));
      nextIdxRef.current = pageSize % data.length;
    }
  };

  // 레이더 빔의 각도 (0 ~ 360) - 12초에 한 바퀴
  const [beamAngle, setBeamAngle] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const cloudData = await fetchWordCloudData(activeTab, 30);
        if (isMounted) {
          setData(cloudData);
          // 데이터 로드 시 인덱스 초기화
          setActiveIndices(Array.from({ length: pageSize }, (_, i) => i % (cloudData.length || 1)));
          nextIdxRef.current = pageSize % (cloudData.length || 1);
        }
      } catch (error) {
        console.error("Failed to load word cloud data:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [activeTab]);

  // 정적 슬롯 위치 계산 (15개 고정)
  const slotPositions = useMemo(() => {
    const slots: any[] = [];
    const xMult = 1.3;
    const yMult = 0.8;
    const minVerticalGap = 4;

    for (let i = 0; i < pageSize; i++) {
      // 1순위 키워드(i=0)가 레이더 12시(0도)보다 약간 앞선 5도 지점에서 시작하게 함
      // 12시(0도) 정각에 배치를 하면 '이전 바퀴'의 끝자락(355도~359도)과 겹치는 현상을 방지
      let currentAngle = (i * 137.5 - 85) * (Math.PI / 180);
      let currentRadius = 100 + (i * (isFullPage ? 25 : 20));
      
      let x = Math.cos(currentAngle) * currentRadius * xMult;
      let y = Math.sin(currentAngle) * currentRadius * yMult;

      const widthGuess = 120; // 평균적인 너비로 고정 (교체 대비)
      const heightGuess = 40;

      for (let attempt = 0; attempt < 10; attempt++) {
        let hasCollision = false;
        for (const prev of slots) {
          const dx = Math.abs(x - prev.x);
          const dy = Math.abs(y - prev.y);
          if (dx < (widthGuess + prev.widthGuess) / 2 + 10 && dy < minVerticalGap + 2) {
            hasCollision = true;
            break;
          }
        }
        if (!hasCollision) break;
        currentRadius += 10;
        x = Math.cos(currentAngle) * currentRadius * xMult;
        y = Math.sin(currentAngle) * currentRadius * yMult;
      }

      slots.push({
        x, y, 
        widthGuess, heightGuess,
        slotIdx: i,
        angle: (currentAngle * 180 / Math.PI + 360) % 360,
        sizeCategory: (i < 2 ? 'hero' : i < 6 ? 'large' : i < 11 ? 'medium' : 'small') as any
      });
    }
    return slots;
  }, [isFullPage]);

  // 실시간 큐 교체 로직을 위한 감지 및 데이터 레프
  const lastDetectedRef = useRef<boolean[]>(new Array(pageSize).fill(false));
  const hasBeenDetectedRef = useRef<boolean[]>(new Array(pageSize).fill(false)); // 중복 교체 방지용 상태 머신
  const lastSwapTimeRef = useRef<number[]>(new Array(pageSize).fill(0)); // 스왑 쿨다운 (최소 8초)
  const activeIndicesRef = useRef<(number | null)[]>([]); // null 허용 타입으로 수정
  const dataRef = useRef<WordCloudData[]>([]);

  // 상태 변경 시 레프 동기화
  useEffect(() => {
    activeIndicesRef.current = activeIndices;
  }, [activeIndices]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (isLoading || data.length === 0) return;

    let requestRef: number;
    const animate = (time: number) => {
      const angle = (time / 12000 * 360) % 360;
      setBeamAngle(angle);

      // 개별 슬롯의 Exit 감지 및 교체
      let needsUpdate = false;
      const nextActiveIndices = [...activeIndicesRef.current];
      const currentData = dataRef.current;

      if (nextActiveIndices.length > 0 && currentData.length > 0) {
        slotPositions.forEach((slot, i) => {
          const dataIdx = nextActiveIndices[i];
          if (dataIdx === null) return; // 슬롯이 비어있는(교체 대기) 상태면 스킵

          const dx = slot.x;
          const dy = slot.y;
          // 슬롯 등급에 따른 평균적인 너비 추정 (정밀 감지용)
          const charWidth = slot.sizeCategory === 'hero' ? 12 : slot.sizeCategory === 'large' ? 10 : 8;
          const textLength = currentData[dataIdx]?.text.length || 5;
          const halfWidthPx = (textLength * charWidth) / 2;
          
          const entryX = dy > 0 ? dx + halfWidthPx : dx - halfWidthPx;
          const startAngleFull = (Math.atan2(dy, entryX) * 180 / Math.PI + 90 + 360) % 360;
          const radius = Math.sqrt(dx * dx + dy * dy) || 100;
          const wordAngularWidth = (halfWidthPx * 2 * 180) / (Math.PI * radius);
          
          const diff = (angle - startAngleFull + 360) % 360;
          // 30도 범위 검출 사용
          const isDetected = diff < (30 + wordAngularWidth);

          // 1. 상태 머신: 빔이 진입하면 감지 플래그 온
          if (isDetected && !hasBeenDetectedRef.current[i]) {
            hasBeenDetectedRef.current[i] = true;
          }

          // 2. 상태 머신: 빔이 완전히 나갔을 때만 교체 (중복 스왑 차단)
          if (lastDetectedRef.current[i] && !isDetected && hasBeenDetectedRef.current[i]) {
            const now = Date.now();
            if (now - lastSwapTimeRef.current[i] > 8000) {
              const currentMaxNextIdx = nextIdxRef.current;
              // 1. 먼저 해당 슬롯을 비움 (사라지는 효과)
              nextActiveIndices[i] = null;
              needsUpdate = true;
              
              // 2. 일정 시간(2초)의 텀을 두고 다음 키워드를 등장시킴
              setTimeout(() => {
                setActiveIndices(prev => {
                  if (prev.length === 0) return prev; // 탭이 변경되어 초기화되었을 경우 무시
                  const next = [...prev];
                  next[i] = currentMaxNextIdx;
                  return next;
                });
              }, 2000);

              nextIdxRef.current = (nextIdxRef.current + 1) % currentData.length;
              lastSwapTimeRef.current[i] = now;
            }
            hasBeenDetectedRef.current[i] = false; // 플래그 리셋
          }
          lastDetectedRef.current[i] = isDetected;
        });

        if (needsUpdate) {
          setActiveIndices(nextActiveIndices);
        }
      }

      requestRef = requestAnimationFrame(animate);
    };

    requestRef = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef);
  }, [isLoading, data.length === 0, slotPositions]); // activeIndices를 의존성에서 제거하여 루프 안정화

  // 최종 렌더링용 키워드 데이터 조립
  const positionedKeywords = useMemo(() => {
    if (activeIndices.length === 0 || data.length === 0) return [];
    return activeIndices
      .map((dataIdx, slotIdx) => {
        if (dataIdx === null) return null;
        const word = data[dataIdx];
        const slot = slotPositions[slotIdx];
        if (!word || !slot) return null;
        return {
          ...word,
          ...slot,
          rank: slotIdx // 위치 기반 랭크 유지
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [activeIndices, data, slotPositions]);

  return (
    <div className={`bg-white dark:bg-[#05060b] text-gray-900 dark:text-white flex flex-col overflow-hidden relative transition-colors duration-500 ${isFullPage ? 'w-full h-full' : 'h-full rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm'}`}>

      {/* Integrated Tactical Info (Queue Mode) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30 pointer-events-auto">
        <div className="flex flex-col bg-white/10 dark:bg-black/40 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 backdrop-blur-sm shadow-lg">
          <div className="text-[10px] font-mono text-gray-500 dark:text-white/60 flex items-center gap-3 uppercase tracking-[0.15em]">
            <motion.span 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[var(--color-accent)] font-bold"
            >
              SCANNING_QUEUE
            </motion.span>
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
              <span className="opacity-40">ACTIVE_SLOTS</span>
              <span className="text-white font-bold">{pageSize}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tactical Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 z-30 pointer-events-none">
        <div className="flex flex-col gap-0.5 pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1 sm:w-1.5 h-4 sm:h-6 bg-[var(--color-accent)] animate-pulse shadow-[0_0_10px_var(--color-accent)]" />
            <h3 className="text-lg sm:text-2xl font-black tracking-tighter uppercase italic drop-shadow-[0_0_5px_rgba(var(--color-accent-rgb),0.3)] dark:drop-shadow-[0_0_5px_rgba(var(--color-accent-rgb),0.5)] leading-tight"
              style={{ fontFamily: 'var(--font-audiowide-next), sans-serif' }}>
              {title.replace(' 워드클라우드', '')}
              <span className="hidden sm:inline"></span>
            </h3>
          </div>
        </div>

        {/* Tactical Command Buttons */}
        <div className="flex gap-1.5 sm:gap-2 pointer-events-auto w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide">
          {(['NEWS', 'PAPER', 'GITHUB'] as SourceType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`group relative flex flex-col items-start px-3 sm:px-4 py-1.5 sm:py-2 border transition-all duration-300 min-w-fit flex-shrink-0 ${activeTab === tab
                ? 'bg-[var(--color-accent)]/5 dark:bg-[var(--color-accent)]/10 border-[var(--color-accent)]'
                : 'bg-transparent border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                }`}
            >
              <div className={`absolute -top-[1px] -left-[1px] w-1 sm:w-1.5 h-1 sm:h-1.5 border-t border-l ${activeTab === tab ? 'border-[var(--color-accent)]' : 'border-gray-300 dark:border-white/20'}`} />
              <div className={`absolute -bottom-[1px] -right-[1px] w-1 sm:w-1.5 h-1 sm:h-1.5 border-b border-r ${activeTab === tab ? 'border-[var(--color-accent)]' : 'border-gray-300 dark:border-white/20'}`} />
              <span className={`text-[10px] sm:text-xs font-black tracking-widest whitespace-nowrap ${activeTab === tab ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white/60'}`} style={{ fontFamily: 'var(--font-audiowide-next), sans-serif' }}>
                {tab === 'NEWS' ? 'NEWS' : tab === 'PAPER' ? 'PAPER' : 'GITHUB'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tactical Screen Area */}
      <div className="flex-1 bg-white dark:bg-[#05060b] flex items-center justify-center relative select-none overflow-hidden group transition-colors duration-500">
        <div className="absolute bottom-2 sm:bottom-4 left-4 text-[7px] sm:text-[9px] font-mono text-gray-400 dark:text-white/20 flex flex-col items-start gap-0.5 sm:gap-1 uppercase tracking-tighter z-20 pointer-events-none">
          <span>THREAT_LEVEL: MINIMAL</span>
          <span className="hidden sm:inline">SCAN_MODE: LIVE_SCAN</span>
          <span className="truncate max-w-[120px] sm:max-w-none">VER: AI_RADAR_CORE_V1.10.4B</span>
        </div>

        {/* Zoom Viewport Container (Fixed Scale: 1.0) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: 1.0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* Background Grid & Radar Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 sm:opacity-40">
            {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(size => (
              <div
                key={size}
                className="absolute rounded-full border border-gray-200 dark:border-[var(--color-accent)]/20 shadow-[0_0_3px_rgba(0,0,0,0.02)] dark:shadow-[0_0_3px_rgba(var(--color-accent-rgb),0.1)]"
                style={{ width: size, height: size }}
              />
            ))}

            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <div
                key={deg}
                className="absolute w-[1800px] h-[0.5px] bg-gray-200 dark:bg-[var(--color-accent)]/10"
                style={{ transform: `rotate(${deg}deg)` }}
              />
            ))}
          </div>

          {/* Radar Rotating Beam */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-[4000px] h-[4000px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{ rotate: beamAngle }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 315deg, transparent 0%, var(--color-accent) 12.5%, transparent 12.51%)',
                opacity: 0.45,
                maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)'
              }}
            />
          </motion.div>

          {/* Keywords Area */}
          <div className="relative w-full h-full flex items-center justify-center z-0">
            <AnimatePresence mode="popLayout">
              {!isLoading && data.length > 0 && positionedKeywords.map((word) => {
                const dx = word.x;
                const dy = word.y;
                const halfWidthPx = (word.text.length * (word.rank < 5 ? 7 : word.rank < 18 ? 6 : 5));
                const entryX = dy > 0 ? dx + halfWidthPx : dx - halfWidthPx;
                const startAngleFull = (Math.atan2(dy, entryX) * 180 / Math.PI + 90 + 360) % 360;
                const radius = Math.sqrt(dx * dx + dy * dy) || 100;
                const wordAngularWidth = (halfWidthPx * 2 * 180) / (Math.PI * radius);

                let diff = (beamAngle - startAngleFull + 360) % 360;
                const isDetected = diff < (30 + wordAngularWidth);
                const rawLevel = isDetected ? 1 - (diff / (30 + wordAngularWidth)) : 0;
                const detectionLevel = Math.pow(rawLevel, 1.4);

                const sizeCategory = (word as any).sizeCategory || 'small';
                const baseScale = sizeCategory === 'hero' ? 1.15 : sizeCategory === 'large' ? 1.05 : sizeCategory === 'medium' ? 1.0 : 0.95;
                const detectedScale = baseScale + (isDetected ? 0.08 * detectionLevel : 0);
                const opacity = isDetected ? 0.5 + (0.5 * detectionLevel) : 0.5;

                return (
                  <motion.div
                    key={`${activeTab}-${word.keyword}-${word.rank}`} // 키를 고유하게 보장하여 AnimatePresence 활성화
                    initial={{ x: dx, y: dy, opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                    animate={{
                      x: dx,
                      y: dy,
                      scale: detectedScale,
                      opacity: opacity,
                      filter: "blur(0px)",
                      color: isDetected ? "var(--color-accent)" : "rgba(148, 163, 184, 0.7)",
                      textShadow: isDetected
                        ? `0 0 1px var(--color-accent), 0 0 ${2 * detectionLevel}px var(--color-accent), 0 0 ${8 * detectionLevel}px rgba(var(--color-accent-rgb), ${0.4 * detectionLevel})`
                        : "0 0 0px transparent",
                      zIndex: isDetected ? 20 : 1
                    }}
                    exit={{ opacity: 0, scale: 1.2, filter: "blur(8px)", transition: { duration: 0.3 } }}
                    className="absolute cursor-pointer flex items-center justify-center text-black dark:text-white"
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    whileHover={{
                      scale: baseScale + 0.3,
                        color: "var(--color-accent)",
                      opacity: 1,
                      zIndex: 100
                    }}
                  >
                    <span
                      className={`whitespace-nowrap font-black tracking-tighter italic ${sizeCategory === 'hero' ? 'text-xl sm:text-3xl lg:text-4xl' :
                          sizeCategory === 'large' ? 'text-lg sm:text-2xl lg:text-3xl' :
                            sizeCategory === 'medium' ? 'text-base sm:text-xl lg:text-2xl' : 'text-sm sm:text-lg lg:text-xl'
                        }`}
                      style={{
                        fontFamily: 'var(--font-audiowide-next), sans-serif',
                      }}
                    >
                      {word.text}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-[#05060b]/50 backdrop-blur-sm z-40 transition-all duration-500">
            <Loader2 className="w-12 h-12 animate-spin mb-6 text-[var(--color-accent)] opacity-60 dark:opacity-80" />
            <span className="text-xl font-black tracking-[0.4em] italic uppercase animate-pulse text-[var(--color-accent)]"
              style={{ fontFamily: 'var(--font-audiowide-next), sans-serif' }}>
              Synchronizing Feed...
            </span>
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="flex flex-col items-center text-gray-400 dark:text-gray-500/60 font-black italic z-10">
            <span className="text-lg">NO TARGETS ACQUIRED</span>
          </div>
        )}
      </div>

      {/* Tactical Bottom Status Bar */}
      <div className="px-4 sm:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-[#0a0b14] border-t border-gray-100 dark:border-white/5 flex flex-col xs:flex-row justify-between items-center gap-2 xs:gap-0 text-[7px] sm:text-[9px] font-black text-gray-400 dark:text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-colors duration-500">
        <div className="flex items-center gap-4 sm:gap-8 w-full xs:w-auto justify-between xs:justify-start">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-emerald-500"
            />
            <span>STREAMS_STABLE</span>
          </div>
          <span className="hidden md:inline border-x border-gray-200 dark:border-white/10 px-6">AZ: {beamAngle.toFixed(1)}° RA: 0.00</span>
          <span className="hidden lg:inline">COORDS: 37°34'N 126°58'E</span>
          <span className="xs:hidden border-l border-gray-200 dark:border-white/10 pl-4">{data.length} TARGETS</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-10 w-full xs:w-auto justify-between xs:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-accent)] font-black italic truncate max-w-[80px] sm:max-w-none">{activeTab} FEED ACTIVE</span>
            <div className="w-12 sm:w-16 h-0.5 sm:h-1 bg-gray-200 dark:bg-white/5 overflow-hidden">
              <motion.div
                animate={{ x: [-64, 64] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="w-full h-full bg-[var(--color-accent)]/40"
              />
            </div>
          </div>
          <span className="hidden xs:inline text-[var(--color-accent)]">DATA_DENSITY: {data.length}</span>
        </div>
      </div>
    </div>
  );
};
