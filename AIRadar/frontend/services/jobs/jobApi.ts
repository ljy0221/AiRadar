import { api } from '../common/api';

export interface JobForecastTask {
  taskKey: string;
  taskTitle: string;
  taskDescription: string;
  impactSummary: string;
  detailedScenario: {
    steps: string[];
    automationEffect: string;
  };
  humanStrengths: string[];
  recommendedSkills: string[];
  promisingTools: string[];
  evidence: {
    paper: {
      level: 'HIGH' | 'MEDIUM' | 'LOW';
      note: string;
    };
    news: {
      count: number;
      note: string;
    };
  };
}

export interface JobForecastResponse {
  jobCode: string;
  jobName: string;
  forecastMonth: string;
  generatedAt: string;
  expiresAt: string;
  stale: boolean;
  modelName: string;
  promptVersion: string;
  keywordInsight?: {
    newsKeywords: string[];
    paperKeywords: string[];
    summary: string;
  };
  tasks: JobForecastTask[];
}

export const fetchJobForecast = async (jobCode: string): Promise<JobForecastResponse> => {
  try {
    const response: any = await api.get(`/dashboard/jobs/${jobCode}`);
    const data = response?.data?.data || response?.data || response;
    
    // 백엔드에서 정상 형식(tasks 포함)으로 왔을 때만 리턴
    if (data && data.tasks) {
      return data;
    }
    throw new Error('데이터 형식이 올바르지 않습니다.');
  } catch (error) {
    console.error("Job API Error (Fallback to Mock):", error);
    
    // 백엔드 API가 아직 개발 중이거나 에러가 날 경우 임시 모크(가짜) 데이터 반환
    return {
      jobCode: jobCode,
      jobName: jobCode === 'admin-assistant' ? '사무보조원' : '사무보조원(샘플)',
      forecastMonth: "2026-03-01",
      generatedAt: new Date().toISOString(),
      expiresAt: "2026-04-01T00:00:00",
      stale: false,
      modelName: "Qwen/Qwen2.5-3B-Instruct",
      promptVersion: "job-forecast-v1",
      keywordInsight: {
        newsKeywords: ["생성형AI", "실시간통역", "멀티모달"],
        paperKeywords: ["speech translation", "context modeling", "terminology consistency"],
        summary: "최근 한 달 키워드 흐름을 보면 실시간 번역 정확도와 맥락 보정 기술이 빠르게 고도화되고 있습니다. 이에 따라 초벌 번역·기록 정리 같은 반복 업무는 자동화 비중이 커지고, 최종 품질 판단과 문화적 맥락 조율 역량의 가치가 더 커집니다."
      },
      tasks: [
        {
          taskKey: "T001",
          taskTitle: "문서 작성 및 데이터 입력",
          taskDescription: "회의록, 보고서 등의 초안 작성 및 데이터 취합",
          impactSummary: "지루하고 반복적인 초안 작업은 AI 비서가 순식간에 끝내주고, 사람은 풍부한 경험을 바탕으로 창의적인 결정과 가치 창출에 더 많은 시간을 쏟게 됩니다.",
          detailedScenario: {
            steps: [
              "1. AI가 방대한 데이터를 수집해 초안 데이터 세팅",
              "2. 전문가는 빠진 맥락이 없는지 꼼꼼히 문맥 검토",
              "3. 인간의 통찰력이 더해진 최종 결과물 도출"
            ],
            automationEffect: "단순 작업에 뺏기던 시간 80% 단축"
          },
          humanStrengths: [
            "상황 공감 능력",
            "복잡한 예외 상황 판단"
          ],
          recommendedSkills: [
            "AI 프롬프트 최적화",
            "AI 산출물 교차 검증"
          ],
          promisingTools: [
            "ChatGPT",
            "Cursor"
          ],
          evidence: {
            paper: {
              level: "HIGH",
              note: "관련 자동화 연구 논문 급증"
            },
            news: {
              count: 15,
              note: "글로벌 테크 트렌드 기반"
            }
          }
        }
      ]
    };
  }
};
