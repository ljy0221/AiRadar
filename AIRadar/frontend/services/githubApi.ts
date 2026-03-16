// services/githubApi.ts
// GitHub Archive 데이터 API 서비스
// 현재: Mock 데이터 반환 / 실제 백엔드 연동 시 TODO 주석 확인 후 교체

import type { GithubListParams, GithubRepo } from '@/types/github';

// ─────────────────────────────────────────────────────────────
// Mock Data — 백엔드 연동 전까지 사용
// ─────────────────────────────────────────────────────────────
const MOCK_GITHUB_REPOS: GithubRepo[] = [
  {
    repoId: 'microsoft/BitNet',
    repoName: 'microsoft/BitNet',
    description: 'Official inference framework for 1-bit LLMs',
    language: 'C++',
    topics: ['llm', 'quantization', 'inference', '1-bit', 'ai'],
    stars: 12840,
    forks: 987,
    openIssues: 43,
    weeklyCommits: 28,
    starDelta7d: 1230,
    aiRelevance: true,
    keywords: ['LLM', 'quantization', 'edge AI', 'inference'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'openai/triton',
    repoName: 'openai/triton',
    description: 'Development repository for the Triton language and compiler',
    language: 'Python',
    topics: ['gpu', 'compiler', 'deep-learning', 'cuda', 'triton'],
    stars: 14500,
    forks: 1820,
    openIssues: 201,
    weeklyCommits: 55,
    starDelta7d: 420,
    aiRelevance: true,
    keywords: ['GPU', 'compiler', 'deep learning', 'CUDA'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'deepseek-ai/DeepSeek-R2',
    repoName: 'deepseek-ai/DeepSeek-R2',
    description: 'DeepSeek-R2: Advanced Reasoning Model with Chain-of-Thought',
    language: 'Python',
    topics: ['llm', 'reasoning', 'chain-of-thought', 'rlhf'],
    stars: 34200,
    forks: 2950,
    openIssues: 189,
    weeklyCommits: 72,
    starDelta7d: 4800,
    aiRelevance: true,
    keywords: ['LLM', 'reasoning', 'RLHF', 'chain-of-thought'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'huggingface/transformers',
    repoName: 'huggingface/transformers',
    description: 'State-of-the-art Machine Learning for JAX, PyTorch and TensorFlow',
    language: 'Python',
    topics: ['nlp', 'transformers', 'pytorch', 'tensorflow', 'bert'],
    stars: 138600,
    forks: 27300,
    openIssues: 1056,
    weeklyCommits: 120,
    starDelta7d: 890,
    aiRelevance: true,
    keywords: ['NLP', 'transformers', 'BERT', 'GPT', 'PyTorch'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'google-deepmind/gemma',
    repoName: 'google-deepmind/gemma',
    description: 'Gemma open models from Google DeepMind',
    language: 'Python',
    topics: ['llm', 'gemma', 'deepmind', 'google', 'open-source'],
    stars: 8920,
    forks: 680,
    openIssues: 34,
    weeklyCommits: 18,
    starDelta7d: 350,
    aiRelevance: true,
    keywords: ['LLM', 'Gemma', 'Google', 'open-source'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'meta-llama/llama3',
    repoName: 'meta-llama/llama3',
    description: 'The official Meta LLaMA 3 repository',
    language: 'Python',
    topics: ['llm', 'llama', 'meta', 'open-source', 'language-model'],
    stars: 54100,
    forks: 8400,
    openIssues: 412,
    weeklyCommits: 40,
    starDelta7d: 710,
    aiRelevance: true,
    keywords: ['LLM', 'LLaMA', 'Meta', 'open-source'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'langchain-ai/langchain',
    repoName: 'langchain-ai/langchain',
    description: 'Build context-aware reasoning applications',
    language: 'Python',
    topics: ['llm', 'langchain', 'agent', 'rag', 'ai'],
    stars: 98400,
    forks: 15800,
    openIssues: 2341,
    weeklyCommits: 95,
    starDelta7d: 520,
    aiRelevance: true,
    keywords: ['RAG', 'agent', 'LLM', 'LangChain'],
    batchDate: '2026-03-15',
  },
  {
    repoId: 'comfyanonymous/ComfyUI',
    repoName: 'comfyanonymous/ComfyUI',
    description: 'The most powerful and modular diffusion model GUI and backend',
    language: 'Python',
    topics: ['diffusion', 'stable-diffusion', 'image-generation', 'gui'],
    stars: 61200,
    forks: 6700,
    openIssues: 987,
    weeklyCommits: 65,
    starDelta7d: -120,
    aiRelevance: true,
    keywords: ['Stable Diffusion', 'image generation', 'diffusion model'],
    batchDate: '2026-03-15',
  },
];

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

// TODO: replace with real API → api.get('/github/repos', { params })
export const fetchGithubRepos = async (params?: GithubListParams): Promise<GithubRepo[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let result = [...MOCK_GITHUB_REPOS];

      if (params?.language) result = result.filter((r) => r.language === params.language);
      if (params?.aiOnly) result = result.filter((r) => r.aiRelevance);

      // 정렬
      if (params?.sortBy === 'starDelta7d') {
        result.sort((a, b) => b.starDelta7d - a.starDelta7d);
      } else if (params?.sortBy === 'weeklyCommits') {
        result.sort((a, b) => b.weeklyCommits - a.weeklyCommits);
      } else {
        result.sort((a, b) => b.stars - a.stars);
      }

      resolve(result);
    }, 600);
  });
};

// 급상승 레포 Top N 반환 (starDelta7d 기준)
// TODO: replace with real API → api.get('/github/trending', { params: { limit } })
export const fetchTrendingRepos = async (limit = 5): Promise<GithubRepo[]> => {
  const all = await fetchGithubRepos({ aiOnly: true, sortBy: 'starDelta7d' });
  return all.slice(0, limit);
};
