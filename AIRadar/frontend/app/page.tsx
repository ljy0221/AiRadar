import { HeroSection, FeatureSection, NewsletterSection, FaqSection } from '@/components/features/home';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center">
      <HeroSection />
      <FeatureSection />
      <NewsletterSection />
      <FaqSection />
    </div>
  );
}
