import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, UpdateUserInput } from '@/services/user/userApi';

// ── Query Keys ───────────────────────────────────────────────────────────────
export const userQueryKeys = {
  me: ['user', 'me'] as const,
  interests: ['user', 'interests'] as const,
};

// ── GET /users/me ─────────────────────────────────────────────────────────────
export const useUserQuery = () => {
  return useQuery({
    queryKey: userQueryKeys.me,
    queryFn: userApi.getMe,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 유지
    retry: 1,
  });
};

// ── GET /users/me/interests ──────────────────────────────────────────────────
export const useInterestsQuery = () => {
  return useQuery({
    queryKey: userQueryKeys.interests,
    queryFn: userApi.getInterests,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

// ── PUT /users/me ─────────────────────────────────────────────────────────────
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserInput) => userApi.updateMe(data),
    onSuccess: (updatedUser) => {
      // 캐시를 서버 응답값으로 즉시 갱신 (refetch 없이)
      queryClient.setQueryData(userQueryKeys.me, updatedUser);
    },
    onError: (error) => {
      console.error('회원정보 수정 실패:', error);
    },
  });
};

// ── POST /users/me/interests ───────────────────────────────────────────────────
export const useAddInterestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyword: string) => userApi.addInterest(keyword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.interests });
    },
    onError: (error) => {
      console.error('관심 키워드 등록 실패:', error);
    },
  });
};

// ── DELETE /users/me/interests/{keyword} ───────────────────────────────────────
export const useRemoveInterestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyword: string) => userApi.removeInterest(keyword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.interests });
    },
    onError: (error) => {
      console.error('관심 키워드 삭제 실패:', error);
    },
  });
};
