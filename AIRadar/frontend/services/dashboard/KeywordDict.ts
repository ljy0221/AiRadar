import { KeywordDefinition } from './dashboardApi';

export const mockKeywordDictionary: KeywordDefinition[] = [
  // ── 1. 기초 지능 및 아키텍처 (Foundations & Architecture) ───────────────
  {
    id: 'kw-1',
    term: '머신러닝',
    englishTerm: 'Machine Learning',
    category: '개념/이론',
    summary: '데이터를 통해 컴퓨터가 스스로 학습하여 패턴을 찾아내는 기술',
    description: '명시적인 프로그래밍 없이 데이터를 기반으로 예측이나 결정을 내리는 AI의 핵심 분야입니다.'
  },
  {
    id: 'kw-2',
    term: '딥러닝',
    englishTerm: 'Deep Learning',
    category: '개념/이론',
    summary: '인간의 뇌 구조를 모방한 인공 신경망 기반의 기계 학습 방식',
    description: '다층 구조의 신경망을 활용해 이미지, 음성 등 복잡한 데이터에서 고차원 특징을 추출합니다.'
  },
  {
    id: 'kw-3',
    term: '신경망',
    englishTerm: 'Neural Network',
    category: '개념/이론',
    summary: '생물학적 뉴런의 동작 원리를 수학적으로 모델링한 계산 구조',
    description: '입력층, 은닉층, 출력층으로 구성되며 가중치(w) 조절을 통해 정답을 찾아갑니다.'
  },
  {
    id: 'kw-4',
    term: '자연어 처리',
    englishTerm: 'NLP (Natural Language Processing)',
    category: '개념/이론',
    summary: '컴퓨터가 인간의 언어를 이해, 해석, 생성할 수 있게 하는 기술',
    description: '텍스트 데이터를 처리하여 번역, 요약, 감정 분석 등을 수행하는 AI 기술의 총칭입니다.'
  },
  {
    id: 'kw-5',
    term: '트랜스포머',
    englishTerm: 'Transformer',
    category: '모델/아키텍처',
    summary: "단어 간의 관계를 병렬로 처리하는 'Attention' 기반의 구조",
    description: '현재 모든 거대 언어 모델(LLM)의 근간이 되는 혁신적인 딥러닝 아키텍처입니다.'
  },
  {
    id: 'kw-6',
    term: '추론',
    englishTerm: 'Inference',
    category: '개념/이론',
    summary: '학습된 모델이 새로운 데이터를 입력받아 결과를 도출하는 과정',
    description: "모델이 '공부'하는 단계가 학습이라면, 실전에 투입되어 '답을 내는' 실행 단계입니다."
  },

  // ── 2. 주요 언어 모델 (Language Models) ──────────────────────────
  {
    id: 'kw-7',
    term: 'LLM',
    englishTerm: 'Large Language Model',
    category: '모델/아키텍처',
    summary: '수조 개의 파라미터를 가진 거대 규모의 언어 모델',
    description: '방대한 데이터를 학습해 문맥 이해, 창작, 문제 해결 등 범용적 지능을 보여줍니다.'
  },
  {
    id: 'kw-8',
    term: 'sLLM / SLM',
    englishTerm: 'Small Language Model',
    category: '모델/아키텍처',
    summary: '특정 목적을 위해 파라미터 수를 줄인 소형 언어 모델',
    description: '효율성과 보안에 최적화되어 특정 산업군(버티컬)에서 경제적으로 활용됩니다.'
  },
  {
    id: 'kw-9',
    term: 'GPT / LLaMA',
    englishTerm: 'GPT / LLaMA',
    category: '모델/아키텍처',
    summary: 'OpenAI와 Meta가 개발한 대표적인 생성형 AI 모델',
    description: 'GPT는 폐쇄형의 선두주자이며, LLaMA는 오픈 소스 생태계를 주도하는 표준 모델입니다.',
    details: {
      developer: 'OpenAI / Meta',
      strengths: ['범용 지능', '강력한 추론', '가중치 공개(Llama)']
    }
  },
  {
    id: 'kw-10',
    term: 'Claude / Gemini',
    englishTerm: 'Claude / Gemini',
    category: '모델/아키텍처',
    summary: 'Anthropic과 Google이 개발한 고성능 AI 모델',
    description: 'Claude는 안전성과 긴 문맥 처리에, Gemini는 구글 생태계 및 멀티모달에 강점이 있습니다.',
    details: {
      developer: 'Anthropic / Google'
    }
  },
  {
    id: 'kw-11',
    term: 'Mistral',
    englishTerm: 'Mistral',
    category: '모델/아키텍처',
    summary: '효율적인 연산 성능을 자랑하는 유럽의 대표 오픈 모델',
    description: '적은 자원으로도 높은 성능을 내는 혼합 전문가(MoE) 구조로 유명합니다.',
    details: {
      developer: 'Mistral AI'
    }
  },
  {
    id: 'kw-12',
    term: '멀티모달 AI',
    englishTerm: 'Multimodal AI',
    category: '모델/아키텍처',
    summary: '텍스트, 이미지, 영상, 오디오를 동시에 처리하는 AI',
    description: '여러 감각 체계를 통합하여 현실 세계를 더 입체적으로 이해하고 생성합니다.'
  },

  // ── 3. 학습 및 최적화 기술 (Optimization & Tech) ───────────────────
  {
    id: 'kw-13',
    term: '토큰',
    englishTerm: 'Token',
    category: '학습/기법',
    summary: 'AI 모델이 언어를 처리하는 최소 의미 단위',
    description: '단어나 문장 조각을 숫자로 변환하여 모델이 계산할 수 있는 형태로 만듭니다.'
  },
  {
    id: 'kw-14',
    term: '임베딩',
    englishTerm: 'Embedding',
    category: '학습/기법',
    summary: '단어나 문장을 고차원의 수치 벡터로 변환하는 기술',
    description: '의미적으로 유사한 데이터들이 벡터 공간상에서 가깝게 위치하도록 수치화합니다.'
  },
  {
    id: 'kw-15',
    term: '파인튜닝',
    englishTerm: 'Fine-tuning',
    category: '학습/기법',
    summary: '사전 학습된 모델을 특정 데이터로 추가 학습시키는 과정',
    description: '범용 모델을 특정 기업의 데이터나 전문 지식에 맞게 미세 조정하여 정확도를 높입니다.'
  },
  {
    id: 'kw-16',
    term: '프롬프트 엔지니어링',
    englishTerm: 'Prompt Engineering',
    category: '학습/기법',
    summary: '모델의 답변 품질을 높이기 위한 입력값 설계 기법',
    description: '질문의 구조를 바꾸거나 예시를 제공하여 모델이 의도에 맞는 답을 내게 유도합니다.'
  },
  {
    id: 'kw-17',
    term: 'CoT',
    englishTerm: 'Chain of Thought',
    category: '학습/기법',
    summary: '모델이 단계별 사고 과정을 거쳐 정답에 도달하게 하는 방식',
    description: '"차근차근 생각해보자"는 논리를 통해 복잡한 추론 문제의 정확도를 획기적으로 높입니다.'
  },
  {
    id: 'kw-18',
    term: '할루시네이션',
    englishTerm: 'Hallucination',
    category: '기타',
    summary: '모델이 그럴듯해 보이지만 사실과 다른 정보를 생성하는 현상',
    description: '모델의 확률적 특성으로 발생하며, RAG나 검토 프로세스로 보완이 필요합니다.'
  },

  // ── 4. 에이전트 및 실행 생태계 (Agentic Ecosystem) ───────────────────
  {
    id: 'kw-19',
    term: 'AI 에이전트',
    englishTerm: 'AI Agent',
    category: '개념/이론',
    summary: '목표를 달성하기 위해 스스로 계획하고 행동하는 주체',
    description: '단순 응답을 넘어 도구를 사용하고 문제를 해결하는 자율적인 소프트웨어입니다.'
  },
  {
    id: 'kw-20',
    term: '멀티 에이전트 시스템',
    englishTerm: 'Multi-Agent System',
    category: '개념/이론',
    summary: '여러 특화 에이전트가 협업하여 복잡한 과업을 수행',
    description: '기획자, 개발자, 검토자 에이전트가 서로 소통하며 결과물을 완성해 나갑니다.'
  },
  {
    id: 'kw-21',
    term: 'Tool Calling',
    englishTerm: 'Tool Use / Function Calling',
    category: '학습/기법',
    summary: 'AI가 외부 함수나 API를 직접 호출하여 실행하는 기능',
    description: '검색, 계산기, DB 접근 등 모델 내부 지능만으로 부족한 영역을 도구로 해결합니다.'
  },
  {
    id: 'kw-22',
    term: 'MCP',
    englishTerm: 'Model Context Protocol',
    category: '기타',
    summary: '모델과 외부 도구/데이터 간의 연결 표준 규격',
    description: 'Anthropic이 제안한 규격으로, 다양한 AI와 데이터를 안전하고 일관되게 연결합니다.'
  },
  {
    id: 'kw-23',
    term: 'RAG',
    englishTerm: 'Retrieval-Augmented Generation',
    category: '학습/기법',
    summary: '외부 지식을 실시간 검색해 답변의 근거로 활용',
    description: '모델의 학습 데이터에 없는 최신 정보나 내부 문서를 참조해 신뢰성을 극대화합니다.'
  },
  {
    id: 'kw-24',
    term: '벡터 데이터베이스',
    englishTerm: 'Vector Database',
    category: '기타',
    summary: '임베딩된 벡터 데이터를 효율적으로 저장 및 검색하는 저장소',
    description: 'RAG 시스템에서 질문과 유사한 맥락의 지식을 초고속으로 찾아내는 핵심 기반입니다.'
  },

  // ── 5. 미래 지능 및 구축 전략 (Future & Strategy) ───────────────────
  {
    id: 'kw-25',
    term: '버티컬 AI',
    englishTerm: 'Vertical AI',
    category: '기타',
    summary: '특정 산업(의료, 법률 등)에 특화된 지능형 솔루션',
    description: '범용 지식보다는 해당 도메인의 깊이 있는 전문 데이터와 규정을 준수하는 데 집중합니다.'
  },
  {
    id: 'kw-26',
    term: '온디바이스 AI',
    englishTerm: 'On-device AI',
    category: '기타',
    summary: '클라우드 없이 기기 자체에서 구동되는 AI 시스템',
    description: '스마트폰이나 PC 내부에서 연산하여 보안성이 높고 오프라인에서도 작동합니다.'
  },
  {
    id: 'kw-27',
    term: 'AGI',
    englishTerm: 'Artificial General Intelligence',
    category: '개념/이론',
    summary: '인간의 모든 지적 작업을 수행할 수 있는 범용 인공지능',
    description: '특정 분야를 넘어 스스로 학습하고 모든 영역에서 인간 수준의 능력을 발휘하는 단계입니다.'
  }
];
