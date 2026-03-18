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
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized 에러 시 토큰 재발급 시도 (무한 루프 방지를 위해 _retry 체크)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshUrl = `${BASE_URL}/auth/refresh`;
        console.log('🔄 Attempting Refresh:', refreshUrl);
        const response: any = await axios.post(refreshUrl, {}, { withCredentials: true });
        const { accessToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 로그아웃 처리 등이 필요함
        localStorage.removeItem('accessToken');
        return Promise.reject(refreshError);
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
