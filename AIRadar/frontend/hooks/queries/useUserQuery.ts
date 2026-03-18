import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, UserInfo } from '@/services/user/userApi';

export const useUserQuery = () => {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => userApi.getMe(),
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserInfo>) => userApi.updateMe(data),
    onSuccess: (updatedUser) => {
      // 내 정보 쿼리 캐시 업데이트
      queryClient.setQueryData(['user', 'me'], updatedUser);
    },
  });
};
