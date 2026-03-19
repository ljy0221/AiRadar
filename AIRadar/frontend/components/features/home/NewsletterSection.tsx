'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Mail, User, Briefcase, ChevronDown, ArrowRight, ChevronLeft } from 'lucide-react';
import { NewsletterSubscribeModal } from './NewsletterSubscribeModal';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  MotionValue,
} from 'framer-motion';

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

const ALL_ITEMS = [
  ...NEWSLETTER_CARDS,
  { tag: '구독', title: '지금 바로 구독하기', desc: '' },
];

const TOTAL = ALL_ITEMS.length; // 6
const SPREAD_ANGLE = 160;
const ANGLE_STEP = SPREAD_ANGLE / (TOTAL - 1);
const START_OFFSET = SPREAD_ANGLE / 2;
const END_OFFSET = -SPREAD_ANGLE / 2;

// ── 뷰포트 크기에 따라 카드/반지름 수치 계산 ──────────────────────────────────
function calcDimensions(vw: number) {
  // 카드 너비: 뷰포트의 38% (최소 320px, 최대 560px)
  const cardW = Math.min(560, Math.max(320, vw * 0.38));
  const cardH = cardW * 0.58;
  // 반지름: 뷰포트의 68% (최소 460px, 최대 900px)
  const radius = Math.min(900, Math.max(460, vw * 0.68));
  return { cardW, cardH, radius };
}

// ─── 공통 카드 ───────────────────────────────────────────────────────────────
const NewsletterCard = ({
  card,
  isFront,
}: {
  card: (typeof ALL_ITEMS)[number];
  isFront: boolean;
}) => (
  <div
    className={`w-full h-full bg-[#1e100d] rounded-3xl border-2 overflow-hidden flex flex-row transition-all duration-500 group ${
      isFront
        ? 'border-[#C8432A]/70 shadow-[0_0_60px_rgba(200,67,42,0.35)]'
        : 'border-white/10 shadow-xl'
    }`}
  >
    <div className="w-[38%] h-full bg-gradient-to-br from-[#3D251E] to-[#1e100d] p-6 relative flex flex-col gap-3 overflow-hidden">
      <div
        className={`w-full h-3 rounded-full transition-colors duration-500 ${isFront ? 'bg-[#C8432A]/40' : 'bg-white/20'}`}
      />
      <div className="w-3/4 h-2 bg-white/10 rounded-full" />
      <div className="w-full flex-1 mt-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
        <Mail
          className={`w-10 h-10 transition-all duration-500 ${isFront ? 'text-[#C8432A]/60' : 'text-white/20'}`}
        />
      </div>
    </div>
    <div className="w-[62%] h-full p-6 relative flex flex-col justify-center bg-[#1e100d]">
      <div className="absolute top-4 right-4 px-3 py-1 bg-[#C8432A] rounded-lg">
        <span className="text-[10px] text-white font-bold tracking-wider">{card.tag}</span>
      </div>
      <h4
        className={`text-xl font-black mb-2 leading-snug transition-colors duration-500 ${isFront ? 'text-[#C8432A]' : 'text-white'}`}
      >
        {card.title}
      </h4>
      {card.desc && (
        <p
          className={`text-xs text-gray-400 font-medium line-clamp-3 leading-relaxed transition-opacity duration-500 ${isFront ? 'opacity-100' : 'opacity-55'}`}
        >
          {card.desc}
        </p>
      )}
    </div>
  </div>
);

// ─── 모바일 캐러셀 ────────────────────────────────────────────────────────────
const MobileCarousel = ({ onSubscribe }: { onSubscribe: () => void }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = NEWSLETTER_CARDS.length + 1;
  const prev = useCallback(() => setActiveIndex((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setActiveIndex((i) => (i + 1) % total), [total]);

  return (
    <section className="w-full bg-[#1a0e0b] py-16 px-5 w-screen max-w-[100vw] overflow-hidden">
      <div className="text-center mb-10 space-y-3">
        <span className="text-[#C8432A] font-extrabold tracking-widest text-xs uppercase">Newsletter</span>
        <h3 className="text-3xl font-black tracking-tight text-white leading-tight">
          똑똑하게 앞서가는<br />AI 리더의 구독 리스트
        </h3>
      </div>
      <div className="relative w-full overflow-hidden">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full h-[220px]"
        >
          {activeIndex < NEWSLETTER_CARDS.length ? (
            <NewsletterCard card={NEWSLETTER_CARDS[activeIndex]} isFront />
          ) : (
            <button
              onClick={onSubscribe}
              className="w-full h-full bg-gradient-to-br from-[#3D251E] to-[#1e100d] rounded-3xl border-2 border-[#C8432A]/50 flex flex-col items-center justify-center gap-4 hover:border-[#C8432A] transition-all duration-300 text-white group shadow-[0_0_40px_rgba(200,67,42,0.15)]"
            >
              <div className="w-14 h-14 bg-[#C8432A] rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <ArrowRight className="w-7 h-7" />
              </div>
              <span className="text-lg font-bold group-hover:text-[#C8432A] transition-colors">지금 바로 구독하기</span>
            </button>
          )}
        </motion.div>
      </div>
      <div className="flex items-center justify-center gap-6 mt-6">
        <button onClick={prev} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C8432A]/30 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-6 bg-[#C8432A]' : 'w-1.5 bg-white/30'}`}
            />
          ))}
        </div>
        <button onClick={next} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C8432A]/30 transition-colors">
          <ArrowRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </section>
  );
};

// ─── 개별 스프레드 카드 ───────────────────────────────────────────────────────
const SpreadCard = ({
  item,
  index,
  rotationDeg,
  cardW,
  cardH,
  radius,
  onSubscribe,
  onActivate,
}: {
  item: (typeof ALL_ITEMS)[number];
  index: number;
  rotationDeg: MotionValue<number>;
  cardW: number;
  cardH: number;
  radius: number;
  onSubscribe: () => void;
  onActivate: (idx: number) => void;
}) => {
  const cardBaseAngle = -SPREAD_ANGLE / 2 + index * ANGLE_STEP;

  const actualAngle = useTransform(rotationDeg, (rot) => cardBaseAngle + rot);

  const cardX = useTransform(actualAngle, (angle) => {
    const rad = (angle * Math.PI) / 180;
    return Math.sin(rad) * radius - cardW / 2;
  });
  const cardY = useTransform(actualAngle, (angle) => {
    const rad = (angle * Math.PI) / 180;
    return -Math.cos(rad) * radius - cardH / 2;
  });
  const cardRotate = useTransform(actualAngle, (angle) => -angle);

  const cardScale = useTransform(actualAngle, (angle) => {
    const dist = Math.abs(angle);
    if (dist < 15) return 1.06;
    if (dist < 35) return 0.93;
    if (dist < 60) return 0.82;
    return 0.72;
  });
  const cardOpacity = useTransform(actualAngle, (angle) => {
    const dist = Math.abs(angle);
    if (dist < 15) return 1;
    if (dist < 40) return 0.6;
    if (dist < 70) return 0.38;
    return 0.18;
  });
  const cardZIndex = useTransform(actualAngle, (angle) =>
    Math.round(10 - Math.abs(angle) / 10)
  );

  const [isFront, setIsFront] = useState(index === 0);
  useMotionValueEvent(actualAngle, 'change', (angle) => {
    const front = Math.abs(angle) < 15;
    setIsFront(front);
    if (front) onActivate(index);
  });

  const isCTA = index === TOTAL - 1;

  return (
    <motion.div
      className="absolute"
      style={{
        width: cardW,
        height: cardH,
        x: cardX,
        y: cardY,
        rotate: cardRotate,
        scale: cardScale,
        opacity: cardOpacity,
        zIndex: cardZIndex,
      }}
    >
      {isCTA ? (
        <button
          onClick={onSubscribe}
          className={`w-full h-full rounded-3xl border-4 border-dashed flex flex-col items-center justify-center gap-4 transition-all text-white group ${
            isFront ? 'border-[#C8432A] bg-[#C8432A]/10' : 'border-white/15'
          }`}
        >
          <div className="w-16 h-16 bg-[#C8432A] rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <ArrowRight className="w-8 h-8" />
          </div>
          <span className="text-xl font-bold">지금 바로 구독하기</span>
        </button>
      ) : (
        <NewsletterCard card={item} isFront={isFront} />
      )}
    </motion.div>
  );
};

// ─── 데스크탑 스프레드 섹션 ───────────────────────────────────────────────────
const DesktopScrollSection = ({ onSubscribe }: { onSubscribe: () => void }) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // 초기엔 서버사이드(미리 렌더링된) 기본값으로 설정하여 Hydration 에러 방지
  const [dims, setDims] = useState({ cardW: 480, cardH: 280, radius: 760 });

  useEffect(() => {
    // 컴포넌트 마운트 후(클라이언트 환경) 실제 윈도우 크기로 업데이트
    const update = () => setDims(calcDimensions(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { cardW, cardH, radius } = dims;

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  });

  const rawRotation = useTransform(scrollYProgress, [0, 1], [START_OFFSET, END_OFFSET]);
  const rotationDeg = useSpring(rawRotation, { stiffness: 55, damping: 22, mass: 0.8 });

  // 중심점을 화면 하단에서 얼마나 올릴지 (카드 상단이 보이도록)
  const centerOffsetFromBottom = radius - Math.round(radius * 0.36);

  return (
    // w-screen + -translate-x-1/2 + left-1/2: 부모 items-center를 벗어나 뷰포트 전체 폭 확보
    <section
      ref={targetRef}
      className="relative h-[350vh] bg-[#1a0e0b] w-screen left-1/2 -translate-x-1/2"
    >
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden bg-[#1a0e0b]">

        {/* 헤더 */}
        <div className="relative z-30 pt-16 text-center space-y-2 flex-shrink-0 px-4">
          <span className="text-[#C8432A] font-extrabold tracking-widest text-xs uppercase">
            Newsletter
          </span>
          <h3 className="text-4xl xl:text-6xl font-black tracking-tight text-white leading-tight">
            똑똑하게 앞서가는 AI 리더의 구독 리스트
          </h3>
          <motion.p
            key={activeIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-gray-400 text-sm h-5"
          >
            {ALL_ITEMS[activeIndex]?.desc ?? ''}
          </motion.p>
        </div>

        {/* 인디케이터 */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center gap-2 z-30">
          {ALL_ITEMS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeIndex ? 'w-8 bg-[#C8432A]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* 부채꼴 스프레드 컨테이너 — 중심점을 화면 하단에 위치 */}
        <div
          className="absolute left-1/2"
          style={{
            bottom: -centerOffsetFromBottom,
            transform: 'translateX(-50%)',
            width: (radius + cardW) * 2,
            height: radius + cardH,
            pointerEvents: 'none',
          }}
        >
          {/* 중심 글로우 */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-1 bg-gradient-to-t from-[#C8432A]/30 to-transparent pointer-events-none"
            style={{ bottom: 0, height: radius * 0.42 }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#C8432A]/5 blur-3xl pointer-events-none"
            style={{ bottom: -20 }}
          />

          {/* 카드들 */}
          <div
            className="absolute left-1/2 bottom-0"
            style={{ transform: 'translateX(-50%)', pointerEvents: 'auto' }}
          >
            {ALL_ITEMS.map((item, index) => (
              <SpreadCard
                key={index}
                item={item}
                index={index}
                rotationDeg={rotationDeg}
                cardW={cardW}
                cardH={cardH}
                radius={radius}
                onSubscribe={onSubscribe}
                onActivate={setActiveIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export const NewsletterSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('구독이 완료되었습니다! 매주 유익한 인사이트를 전해드릴게요.');
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="md:hidden">
        <MobileCarousel onSubscribe={() => setIsModalOpen(true)} />
      </div>

      <div className="hidden md:block">
        <DesktopScrollSection onSubscribe={() => setIsModalOpen(true)} />
      </div>

      <NewsletterSubscribeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
