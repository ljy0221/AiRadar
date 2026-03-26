"use client";

import { useState, useEffect } from 'react';

export const IntroSplash = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [pct, setPct] = useState(0);
  const [statusMsg, setStatusMsg] = useState('시스템 초기화 중...');

  const statusMessages = [
    '시스템 초기화 중...',
    '신호 수신 중...',
    'ML 엔진 로딩...',
    '데이터 스트림 연결 중...',
    '준비 완료'
  ];

  useEffect(() => {
    let currentPct = 0;
    let msgIdx = 0;

    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, statusMessages.length - 1);
      setStatusMsg(statusMessages[msgIdx]);
    }, 600);

    const loadInterval = setInterval(() => {
      const increment = currentPct < 60 ? Math.random() * 4 + 2 : Math.random() * 2 + 0.5;
      currentPct += increment;
      if (currentPct >= 100) {
        currentPct = 100;
        clearInterval(loadInterval);
        clearInterval(msgInterval);
        setStatusMsg('준비 완료');

        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => { setIsVisible(false); }, 800);
        }, 400);
      }
      setPct(currentPct);
    }, 40);

    return () => {
      clearInterval(msgInterval);
      clearInterval(loadInterval);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        /* ─── INTRO SCREEN BASE ─── */
        #intro {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: opacity 0.9s ease, transform 0.9s ease;
        }

        #intro.intro-exit {
          opacity: 0;
          transform: scale(1.03) translateY(-10px);
          pointer-events: none;
        }

        .intro-bg {
          position: absolute;
          inset: 0;
        }

        .intro-grain {
          position: absolute;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 256px;
        }

        .intro-glow {
          position: absolute;
          width: 500px; height: 500px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          animation: intro-glow-breathe 4s ease-in-out infinite;
        }

        @keyframes intro-glow-breathe {
          0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.7; }
          50%      { transform: translate(-50%,-50%) scale(1.15); opacity: 1;   }
        }

        /* ─── LIGHT MODE (Default) - Red Theme ─── */
        #intro { background: #f8fafc; }
        .intro-bg {
          background:
            radial-gradient(ellipse 100% 70% at 50% 0%, rgba(255,255,255,1) 0%, transparent 60%),
            radial-gradient(ellipse 80% 80% at 50% 100%, rgba(255,255,255,0.8) 0%, transparent 50%),
            linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
        }
        .intro-glow { background: radial-gradient(circle, rgba(229,62,62,0.1) 0%, rgba(229,62,62,0.05) 40%, transparent 70%); }
        .intro-eyebrow { color: #c53030; font-weight: 600; }
        .intro-logo { color: #0c202a; }
        .intro-logo span { color: #e53e3e; }
        .intro-accent-line { background: linear-gradient(90deg, #e53e3e, rgba(229,62,62,0.2)); }
        .intro-tagline { color: #2d4a58; font-weight: 600; }
        .intro-status { color: #2d4a58; font-weight: 600; }
        .intro-pct { color: #b91c1c; font-weight: 600; }
        .intro-bar-fill { background: linear-gradient(90deg, rgba(229,62,62,0.5), #ef4444); }
        .intro-bar-fill::after { background: #ff4d4d; }
        .intro-line { background: linear-gradient(90deg, transparent, rgba(229,62,62,0.18) 50%, transparent); }
        .intro-vline { background: linear-gradient(to bottom, transparent, rgba(229,62,62,0.08), transparent); }
        .intro-dot { background: rgba(229,62,62,0.5); }

        /* ─── DARK MODE - Mint/Cyan Theme ─── */
        :root.dark #intro { background: var(--color-bg-primary, #03080f); }
        :root.dark .intro-bg {
          background:
            radial-gradient(ellipse 100% 70% at 50% 0%, rgba(10,60,80,0.9) 0%, transparent 60%),
            radial-gradient(ellipse 80% 80% at 20% 100%, rgba(5,80,70,0.5) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 80% 80%, rgba(10,40,90,0.4) 0%, transparent 50%),
            linear-gradient(180deg, #0a1e2e 0%, var(--color-bg-primary, #03080f) 40%, #041810 100%);
        }
        :root.dark .intro-glow { background: radial-gradient(circle, rgba(0,212,200,0.1) 0%, rgba(0,180,160,0.05) 40%, transparent 70%); }
        :root.dark .intro-eyebrow { color: var(--color-accent, #00d4c8); opacity: 0.8; font-weight: 500; }
        :root.dark .intro-logo { color: var(--color-text-primary, #e8f4f0); }
        :root.dark .intro-logo span { color: var(--color-accent, #00d4c8); }
        :root.dark .intro-accent-line { background: linear-gradient(90deg, var(--color-accent, #00d4c8), rgba(0,212,200,0.2)); }
        :root.dark .intro-tagline { color: rgba(200,230,225,0.4); font-weight: 400; }
        :root.dark .intro-status { color: rgba(200,230,225,0.4); font-weight: 400; }
        :root.dark .intro-pct { color: var(--color-accent, #00d4c8); opacity: 0.8; font-weight: 400; }
        :root.dark .intro-bar-fill { background: linear-gradient(90deg, rgba(0,212,200,0.5), var(--color-accent, #00d4c8)); }
        :root.dark .intro-bar-fill::after { background: #00e8d8; }
        :root.dark .intro-line { background: linear-gradient(90deg, transparent, rgba(0,212,200,0.18) 50%, transparent); }
        :root.dark .intro-vline { background: linear-gradient(to bottom, transparent, rgba(0,212,200,0.08), transparent); }
        :root.dark .intro-dot { background: rgba(0,212,200,0.5); }

        /* ─── COMMON UI ─── */
        .intro-lines { position: absolute; inset: 0; overflow: hidden; }
        .intro-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          animation: intro-line-sweep 5s ease-in-out infinite;
          transform-origin: center;
        }
        .intro-line:nth-child(1) { top: 28%; animation-delay: 0s;   animation-duration: 5s; }
        .intro-line:nth-child(2) { top: 44%; animation-delay: 0.9s; animation-duration: 6s; }
        .intro-line:nth-child(3) { top: 57%; animation-delay: 1.8s; animation-duration: 4.5s; }
        .intro-line:nth-child(4) { top: 70%; animation-delay: 2.7s; animation-duration: 5.5s; }
        @keyframes intro-line-sweep {
          0%,100% { opacity: 0; transform: scaleX(0.1) translateX(-30%); }
          40%,60% { opacity: 1; transform: scaleX(1)   translateX(0%); }
        }
        .intro-vlines { position: absolute; inset: 0; }
        .intro-vline {
          position: absolute;
          top: 0; bottom: 0;
          width: 1px;
          animation: intro-vline-fade 6s ease-in-out infinite;
        }
        .intro-vline:nth-child(1) { left: 20%; animation-delay: 0s; }
        .intro-vline:nth-child(2) { left: 40%; animation-delay: 1.5s; }
        .intro-vline:nth-child(3) { left: 60%; animation-delay: 3s; }
        .intro-vline:nth-child(4) { left: 80%; animation-delay: 4.5s; }
        @keyframes intro-vline-fade { 0%,100%{opacity:0;} 30%,70%{opacity:1;} }
        .intro-dots { position: absolute; inset: 0; }
        .intro-dot {
          position: absolute;
          border-radius: 50%;
          animation: intro-dot-float 8s ease-in-out infinite;
        }
        .intro-dot:nth-child(1){width:3px;height:3px;top:22%;left:18%;animation-delay:0s;}
        .intro-dot:nth-child(2){width:2px;height:2px;top:35%;left:72%;animation-delay:1.2s;}
        .intro-dot:nth-child(3){width:4px;height:4px;top:60%;left:30%;animation-delay:2.4s;}
        .intro-dot:nth-child(4){width:2px;height:2px;top:75%;left:65%;animation-delay:3.6s;}
        .intro-dot:nth-child(5){width:3px;height:3px;top:45%;left:85%;animation-delay:0.6s;}
        .intro-dot:nth-child(6){width:2px;height:2px;top:15%;left:55%;animation-delay:1.8s;}
        @keyframes intro-dot-float {
          0%,100%{opacity:0;transform:translateY(0);}
          20%,80%{opacity:0.7;}
          50%{opacity:1;transform:translateY(-12px);}
        }
        .intro-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .intro-eyebrow {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 20px;
          animation: intro-fade-up 1s 0.1s ease both;
        }
        .intro-logo {
          font-family: var(--font-audiowide-next), sans-serif;
          font-weight: 400;
          font-size: clamp(32px, 5.5vw, 52px);
          letter-spacing: -0.01em;
          line-height: 1.1;
          margin-bottom: 24px;
          text-align: center;
          animation: intro-fade-up 1s 0s ease both;
        }
        .intro-accent-line {
          width: 0;
          height: 2px;
          border-radius: 2px;
          margin-bottom: 28px;
          animation: intro-line-grow 1.2s 0.4s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes intro-line-grow {
          from { width: 0; opacity: 0; }
          to   { width: 120px; opacity: 1; }
        }
        .intro-tagline {
          font-size: 12px;
          letter-spacing: 0.14em;
          margin-bottom: 40px;
          animation: intro-fade-up 1s 0.5s ease both;
        }
        .intro-bar {
          width: 240px;
          height: 1px;
          background: rgba(0,0,0,0.06);
          :root.dark & { background: rgba(255,255,255,0.06); }
          border-radius: 1px;
          overflow: hidden;
          margin-bottom: 12px;
          animation: intro-fade-up 1s 0.6s ease both;
          position: relative;
        }
        .intro-bar::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(229,62,62,0.08) 50%, transparent 100%);
          :root.dark & { background: linear-gradient(90deg, transparent 0%, rgba(0,212,200,0.08) 50%, transparent 100%); }
          animation: intro-bar-shimmer 2s linear infinite;
        }
        @keyframes intro-bar-shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        .intro-bar-fill {
          height: 100%;
          border-radius: 1px;
          transition: width 0.06s linear;
          position: relative;
          z-index: 1;
        }
        .intro-bar-fill::after {
          content: '';
          position: absolute;
          right: 0; top: -3px;
          width: 3px; height: 7px;
          border-radius: 1px;
        }
        .intro-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          animation: intro-fade-up 1s 0.6s ease both;
        }
        .intro-pct {
          font-family: var(--font-audiowide-next), sans-serif;
          font-size: 12px;
          letter-spacing: 0.08em;
          min-width: 36px;
        }
        .intro-status {
          font-size: 11px;
          letter-spacing: 0.06em;
        }
        @keyframes intro-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      <div id="intro" className={isExiting ? 'intro-exit' : ''}>
        <div className="intro-bg"></div>
        <div className="intro-grain"></div>
        <div className="intro-glow"></div>
        <div className="intro-lines">
          <div className="intro-line"></div>
          <div className="intro-line"></div>
          <div className="intro-line"></div>
          <div className="intro-line"></div>
        </div>
        <div className="intro-vlines">
          <div className="intro-vline"></div>
          <div className="intro-vline"></div>
          <div className="intro-vline"></div>
          <div className="intro-vline"></div>
        </div>
        <div className="intro-dots">
          <div className="intro-dot"></div>
          <div className="intro-dot"></div>
          <div className="intro-dot"></div>
          <div className="intro-dot"></div>
          <div className="intro-dot"></div>
          <div className="intro-dot"></div>
        </div>
        <div className="intro-content">
          <div className="intro-eyebrow">Live AI Intelligence System</div>
          <div className="intro-logo" style={{ textAlign: "center", lineHeight: "1.1" }}>SEE BEFORE <span>IT HAPPENS</span></div>
          <div className="intro-accent-line"></div>
          <div className="intro-tagline">SENSING · ENGINE · FORECAST</div>
          <div className="intro-bar">
            <div className="intro-bar-fill" style={{ width: `${pct}%` }}></div>
          </div>
          <div className="intro-meta">
            <div className="intro-pct">{Math.floor(pct)}%</div>
            <div className="intro-status">{statusMsg}</div>
          </div>
        </div>
      </div>
    </>
  );
};
