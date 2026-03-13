import axios from 'axios';

// 환경 변수에서 Base URL을 가져오거나 기본값 사용
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // 필요한 경우 토큰 등 헤더 주입 로직 추가
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
  (error) => {
    // 전역적인 에러 핸들링 (예: 401 Unauthorized 처리) 추가 가능
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
