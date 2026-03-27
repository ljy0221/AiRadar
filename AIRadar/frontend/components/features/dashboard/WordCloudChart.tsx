'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWordCloudData, WordCloudData, SimilarKeyword } from '@/services/dashboard/dashboardApi';
import { Loader2, X, Link2 } from 'lucide-react';

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
  const [selectedWord, setSelectedWord] = useState<WordCloudData | null>(null);

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
    const yMult = 0.6;
    const minVerticalGap = 4;

    for (let i = 0; i < pageSize; i++) {
      let currentAngle = (i * 137.5 - 85) * (Math.PI / 180);
      let currentRadius = 80 + (i * (isFullPage ? 20 : 16));

      let x = Math.cos(currentAngle) * currentRadius * xMult;
      let y = Math.sin(currentAngle) * currentRadius * yMult;

      const widthGuess = 120;
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

  const lastDetectedRef = useRef<boolean[]>(new Array(pageSize).fill(false));
  const hasBeenDetectedRef = useRef<boolean[]>(new Array(pageSize).fill(false));
  const lastSwapTimeRef = useRef<number[]>(new Array(pageSize).fill(0));
  const swapStartTimeRef = useRef<number[]>(new Array(pageSize).fill(0));
  const activeIndicesRef = useRef<(number | null)[]>([]);
  const dataRef = useRef<WordCloudData[]>([]);

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

      let needsUpdate = false;
      const nextActiveIndices = [...activeIndicesRef.current];
      const currentData = dataRef.current;

      if (nextActiveIndices.length > 0 && currentData.length > 0) {
        slotPositions.forEach((slot, i) => {
          const now = Date.now();
          const dataIdx = nextActiveIndices[i];

          if (dataIdx === null) {
            if (now - swapStartTimeRef.current[i] > 2000) {
              const nextIdx = nextIdxRef.current;
              nextIdxRef.current = (nextIdx + 1) % currentData.length;
              nextActiveIndices[i] = nextIdx;
              needsUpdate = true;
            }
            return;
          }

          const dx = slot.x;
          const dy = slot.y;
          const charWidth = slot.sizeCategory === 'hero' ? 12 : slot.sizeCategory === 'large' ? 10 : 8;
          const textLength = currentData[dataIdx]?.text.length || 5;
          const halfWidthPx = (textLength * charWidth) / 2;

          const entryX = dy > 0 ? dx + halfWidthPx : dx - halfWidthPx;
          const startAngleFull = (Math.atan2(dy, entryX) * 180 / Math.PI + 90 + 360) % 360;
          const radius = Math.sqrt(dx * dx + dy * dy) || 100;
          const wordAngularWidth = (halfWidthPx * 2 * 180) / (Math.PI * radius);

          const diff = (angle - startAngleFull + 360) % 360;
          const isDetected = diff < (30 + wordAngularWidth);

          if (isDetected && !hasBeenDetectedRef.current[i]) {
            hasBeenDetectedRef.current[i] = true;
          }

          if (lastDetectedRef.current[i] && !isDetected && hasBeenDetectedRef.current[i]) {
            const now = Date.now();
            if (now - lastSwapTimeRef.current[i] > 8000) {
              nextActiveIndices[i] = null;
              swapStartTimeRef.current[i] = now;
              needsUpdate = true;

              lastSwapTimeRef.current[i] = now;
            }
            hasBeenDetectedRef.current[i] = false;
          }
          lastDetectedRef.current[i] = isDetected;
        });

        if (needsUpdate) {
          activeIndicesRef.current = nextActiveIndices;
          setActiveIndices(nextActiveIndices);
        }
      }

      requestRef = requestAnimationFrame(animate);
    };

    requestRef = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef);
  }, [isLoading, data.length === 0, slotPositions]);

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
          rank: slotIdx
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
              <span className="opacity-40">활성 슬롯</span>
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
          <span>위협 수준: 낮음</span>
          <span className="hidden sm:inline">스캔 모드: 라이브 스캔</span>
          <span className="truncate max-w-[120px] sm:max-w-none">버전: AI_RADAR_CORE_V1.10.4B</span>
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
                    key={`${activeTab}-${word.keyword}-${word.rank}`}
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
                    onClick={() => setSelectedWord(word)}
                    className="absolute cursor-pointer flex items-center justify-center text-black dark:text-white pointer-events-auto"
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
              피드 동기화 중...
            </span>
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="flex flex-col items-center text-gray-400 dark:text-gray-500/60 font-black italic z-10">
            <span className="text-lg">탐색된 타겟 없음</span>
          </div>
        )}
      </div>

      {/* Similar Keywords Modal */}
      <AnimatePresence>
        {selectedWord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWord(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0a0b14] border border-gray-200 dark:border-[var(--color-accent)]/30 shadow-2xl overflow-hidden rounded-xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-[0.2em] text-[var(--color-accent)] uppercase mb-1">키워드 정밀 분석</span>
                  <h4 className="text-xl font-black italic tracking-tighter uppercase" style={{ fontFamily: 'var(--font-audiowide-next), sans-serif' }}>
                    {selectedWord.text}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedWord(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 dark:text-white/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-3 bg-[var(--color-accent)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">유사 키워드 분석 (코사인 유사도)</span>
                </div>

                <div className="flex flex-col gap-2">
                  {selectedWord.similarKeywords && selectedWord.similarKeywords.length > 0 ? (
                    selectedWord.similarKeywords.sort((a, b) => b.similarity - a.similarity).map((sk, idx) => (
                      <motion.div
                        key={sk.keyword}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-lg hover:border-[var(--color-accent)]/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Link2 className="w-4 h-4 text-[var(--color-accent)] opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">{sk.keyword}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Similarity Bar */}
                          <div className="w-20 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden hidden sm:block">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${sk.similarity * 100}%` }}
                              className="h-full bg-[var(--color-accent)]"
                            />
                          </div>
                          <span className="font-mono text-[10px] text-[var(--color-accent)] font-bold">
                            {(sk.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-400 dark:text-white/20 italic text-sm">
                      현재 유사 키워드가 탐지되지 않았습니다
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="px-6 py-2 bg-[var(--color-accent)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.3)]"
                    style={{ fontFamily: 'var(--font-audiowide-next), sans-serif' }}
                  >
                    분석 완료
                  </button>
                </div>
              </div>

              {/* Decorative Corner Elements */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--color-accent)]" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--color-accent)]" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--color-accent)]" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--color-accent)]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tactical Bottom Status Bar */}
      <div className="px-4 sm:px-8 py-2 sm:py-3 bg-gray-50 dark:bg-[#0a0b14] border-t border-gray-100 dark:border-white/5 flex flex-col xs:flex-row justify-between items-center gap-2 xs:gap-0 text-[7px] sm:text-[9px] font-black text-gray-400 dark:text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-colors duration-500">
        <div className="flex items-center gap-4 sm:gap-8 w-full xs:w-auto justify-between xs:justify-start">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-emerald-500"
            />
            <span>스트림 연결 상태: 안정</span>
          </div>
          <span className="hidden md:inline border-x border-gray-200 dark:border-white/10 px-6">AZ: {beamAngle.toFixed(1)}° RA: 0.00</span>
          <span className="hidden lg:inline">COORDS: 37°34'N 126°58'E</span>
          <span className="xs:hidden border-l border-gray-200 dark:border-white/10 pl-4">{data.length} TARGETS</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-10 w-full xs:w-auto justify-between xs:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-accent)] font-black italic truncate max-w-[80px] sm:max-w-none">{activeTab} 피드 활성화됨</span>
            <div className="w-12 sm:w-16 h-0.5 sm:h-1 bg-gray-200 dark:bg-white/5 overflow-hidden">
              <motion.div
                animate={{ x: [-64, 64] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="w-full h-full bg-[var(--color-accent)]/40"
              />
            </div>
          </div>
          <span className="hidden xs:inline text-[var(--color-accent)]">데이터 밀도: {data.length}</span>
        </div>
      </div>
    </div>
  );
};
