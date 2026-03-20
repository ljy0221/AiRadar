import { useQuery } from '@tanstack/react-query';
import { recommendationApi } from '../../services/recommendation/recommendationApi';

export const recommendationKeys = {
  all: ['recommendations'] as const,
  news: (size?: number) => [...recommendationKeys.all, 'news', size] as const,
  trending: (limit?: number) => [...recommendationKeys.all, 'trending', limit] as const,
  hourly: (limit?: number) => [...recommendationKeys.all, 'hourly', limit] as const,
};

export const usePersonalizedNewsQuery = (size = 20, enabled = true) => {
  return useQuery({
    queryKey: recommendationKeys.news(size),
    queryFn: () => recommendationApi.getPersonalizedFeed(size),
    enabled,
  });
};

export const useTrendingKeywordsQuery = (limit = 20) => {
  return useQuery({
    queryKey: recommendationKeys.trending(limit),
    queryFn: () => recommendationApi.getTrendingKeywords(limit),
  });
};

export const useHourlyTrendingKeywordsQuery = (limit = 10) => {
  return useQuery({
    queryKey: recommendationKeys.hourly(limit),
    queryFn: () => recommendationApi.getHourlyTrendingKeywords(limit),
  });
};
