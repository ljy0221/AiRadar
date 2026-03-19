import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, UpdateUserInput } from '@/services/user/userApi';

// ── Query Keys ───────────────────────────────────────────────────────────────
export const userQueryKeys = {
  me: ['user', 'me'] as const,
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
