'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-primary)] overflow-hidden">
      {/* Radar Container */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Pulsing Circles */}
        <div className="absolute w-full h-full border border-[var(--color-accent)]/20 rounded-full"></div>
        <div className="absolute w-3/4 h-3/4 border border-[var(--color-accent)]/20 rounded-full"></div>
        <div className="absolute w-1/2 h-1/2 border border-[var(--color-accent)]/20 rounded-full"></div>
        <div className="absolute w-1/4 h-1/4 border border-[var(--color-accent)]/20 rounded-full"></div>

        {/* Animated Pulses */}
        <div className="absolute w-full h-full bg-[var(--color-accent)] rounded-full animate-radar"></div>
        <div className="absolute w-full h-full bg-[var(--color-accent)] rounded-full animate-radar [animation-delay:0.5s]"></div>
        <div className="absolute w-full h-full bg-[var(--color-accent)] rounded-full animate-radar [animation-delay:1s]"></div>

        {/* Spinning Scan Line */}
        <div className="absolute w-1/2 h-px bg-gradient-to-r from-transparent to-[var(--color-accent)] origin-left left-1/2 animate-scan shadow-[0_0_10px_var(--color-accent)]"></div>

        {/* Center Point */}
        <div className="relative w-4 h-4 bg-[var(--color-accent)] rounded-full shadow-[0_0_15px_var(--color-accent)] animate-pulse"></div>
      </div>

      {/* Loading Text */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold tracking-[0.2em] text-[var(--color-text-primary)] animate-pulse">
          SCANNING...
        </h2>
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-accent)]/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}
