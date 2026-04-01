export interface BacktestingData {
  month: string;
  predicted: number;
  actual: number;
  accuracy: number;
}

export const backtestingMockData: BacktestingData[] = [
  { month: '2023.01', predicted: 20, actual: 18, accuracy: 90 },
  { month: '2023.04', predicted: 45, actual: 42, accuracy: 93 },
  { month: '2023.07', predicted: 70, actual: 65, accuracy: 92 },
  { month: '2023.10', predicted: 110, actual: 115, accuracy: 95 },
  { month: '2024.01', predicted: 150, actual: 142, accuracy: 94 },
  { month: '2024.04', predicted: 210, actual: 205, accuracy: 97 },
];

export interface CorrelationData {
  month: string;
  github: number;
  news: number;
  arxiv: number;
}

export const correlationMockData: CorrelationData[] = [
  { month: '1월', github: 120, news: 150, arxiv: 80 },
  { month: '2월', github: 180, news: 200, arxiv: 110 },
  { month: '3월', github: 250, news: 320, arxiv: 190 },
  { month: '4월', github: 300, news: 380, arxiv: 250 },
  { month: '5월', github: 380, news: 510, arxiv: 340 },
  { month: '6월', github: 450, news: 600, arxiv: 420 },
];
