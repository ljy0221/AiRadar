import { Accordion } from '@/components/common';

export const FaqSection = () => {
  const faqs = [
    { 
      title: '데이터 수집 및 처리 기준은 어떻게 되나요?', 
      content: `AI Radar는 신뢰할 수 있는 데이터를 제공하기 위해 엄격한 필터링 기준을 적용합니다.

• GitHub: AI 관련 Topics(artificial-intelligence, machine-learning 등) 또는 핵심 키워드가 포함된 저장소를 수집하며, 단순 학습자료(homework, study, tutorial 등)는 노이즈로 보고 제외합니다.
• 뉴스: AITimes(AI 산업/기업 카테고리) 및 GDELT를 활용합니다. 특히 GDELT 데이터는 AI 관련 질의어로 수집 후 본문 분석을 거쳐 핵심 키워드 가중치 조건(강키워드 2개 이상 등)을 충족할 때만 통과시킵니다.
• 논문: arXiv의 cs.AI(Computer Science - Artificial Intelligence) 카테고리를 기반으로 최신 연구 동향을 수집합니다.`
    },
    { title: '뉴스레터는 언제 발송되나요?', content: '매주 월요일과 금요일 오전, 이메일로 발송됩니다. 월요일에는 지난 주의 주요 이슈 리뷰를, 금요일에는 다가올 트렌드 예측과 일정을 담아 보내드립니다.' },
    { title: '어떤 내용을 다루나요?', content: 'HTML 리포트 형식으로 제공되며, AI 관련 주요 기업 발표 요약, 새로운 컨퍼런스 소식, 그리고 자체 데이터를 기반으로 분석한 트렌드 예측을 알기 쉽게 정리해 드립니다.' },
    { title: '구독 취소는 어떻게 하나요?', content: '수신하신 뉴스레터 이메일 하단의 [구독 취소] 버튼을 클릭하시면 언제든지 쉽게 취소하실 수 있습니다.' },
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
