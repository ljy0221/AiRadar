import { HeroSection, FeatureSection, NewsletterSection, FaqSection } from '@/components/features/home';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center">
      <HeroSection />
      <FeatureSection />
      <div className="w-screen relative left-1/2 -translate-x-1/2">
        <NewsletterSection />
      </div>
      <FaqSection />
    </div>
  );
}
