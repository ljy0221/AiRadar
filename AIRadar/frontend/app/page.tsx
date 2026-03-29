import { HeroSection, MainServiceSection, NewsletterSection, FaqSection, IntroSplash } from '@/components/features/home';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center">
      <IntroSplash />
      <HeroSection />
      <MainServiceSection />
      <NewsletterSection />
      <FaqSection />
    </div>
  );
}
