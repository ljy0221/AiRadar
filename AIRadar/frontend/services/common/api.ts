import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키(Refresh Token) 연동을 위해 필수
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // AuthContext나 LocalStorage 등에서 토큰을 가져와 주입하는 로직은
    // AuthContext 내부에서 이 인스턴스를 직접 다루거나, 별도의 유틸 함수를 통해 처리할 예정입니다.
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // 백엔드 공통 응답 포맷 처리: { success, code, message, path, data }
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data
    ) {
      if (response.data.success) {
        // 성공 응답 시에는 사용할 핵심 데이터(data 필드)만 반환
        return response.data.data;
      } else {
        // 서버 측 논리적 에러 (success: false)
        return Promise.reject(new Error(response.data.message || 'API 통신 성공했으나 로직 실패'));
      }
    }

    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');

    // 401 Unauthorized 에러 시 토큰 재발급 시도 (무한 루프 방지를 위해 _retry 체크)
    // 원래 토큰이 있었던 경우에만(로그인 세션 만료) 리프레시를 시도함
    if (error.response?.status === 401 && !originalRequest._retry && hasToken) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        const refreshUrl = `${BASE_URL}/auth/refresh`;
        console.log('🔄 Attempting Refresh:', refreshUrl);

        // 리프레시 토큰을 본문에 담아 요청 (백엔드 규격)
        const response: any = await axios.post(refreshUrl, { refreshToken }, { withCredentials: true });

        // 백엔드 공통 응답 포맷 대응 ({ success, data: { accessToken, refreshToken } })
        const tokenData = response.data.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = tokenData;

        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-logout'));
        }
        return Promise.reject(refreshError);
      }
    }

    if (
      (error.response?.status === 401 && !hasToken) ||
      (error.response?.status === 500 && originalRequest.url?.includes('/users/me'))
    ) {
      localStorage.removeItem('accessToken');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-logout'));
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
