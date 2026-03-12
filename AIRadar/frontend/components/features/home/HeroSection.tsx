export const HeroSection = () => {
  return (
    <section className="w-full relative flex flex-col items-center justify-center pt-32 pb-40 px-4 text-center overflow-hidden">
      {/* 백그라운드 이미지 플레이스홀더 (나중에 실제 이미지로 교체) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,1)] to-[var(--color-bg-primary)] z-0 pointer-events-none" />
      <div
        className="absolute inset-0 z-[-1] opacity-50 bg-cover bg-center"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")' }}
      />

      <div className="relative z-10 max-w-4xl flex flex-col items-center gap-6 mt-10">
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white drop-shadow-lg">
          AI Radar
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mt-4 drop-shadow-md bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-white dark:from-[var(--color-accent)] dark:to-white">
          뉴스보다 먼저, 데이터로 AI의 실체를 측정
        </h2>
      </div>
    </section>
  );
};
