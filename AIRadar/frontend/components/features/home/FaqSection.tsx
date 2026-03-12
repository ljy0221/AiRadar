import { Accordion } from '@/components/common';

export const FaqSection = () => {
  const faqs = [
    { title: '1. 오늘 저녁은 뭔가요?', content: '맛있는 저녁 식사를 추천합니다. 항상 건강하게 드세요!' },
    { title: '2. 오늘 저녁은 뭔가요?', content: '다양한 메뉴 중 하나를 골라보세요. 즐거운 식사 되시길 바랍니다.' },
    { title: '3. 오늘 저녁은 뭔가요?', content: 'AI가 분석한 가장 최적화된 저녁 메뉴를 곧 업데이트 해드릴 예정입니다.' },
  ];

  return (
    <section className="w-full max-w-3xl px-6 py-32 flex flex-col items-center">
      <h3 className="text-2xl md:text-3xl font-bold mb-12">자주 묻는 질문</h3>
      <div className="w-full flex flex-col gap-2">
        {faqs.map((faq, index) => (
          <Accordion key={index} title={faq.title} content={faq.content} />
        ))}
      </div>
    </section>
  );
};
