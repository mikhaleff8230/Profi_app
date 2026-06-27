import axios from 'axios';
import Cookies from 'js-cookie';
import invariant from 'tiny-invariant';
import { toast } from 'react-toastify';
import { AUTH_CRED } from '@/utils/constants';
import { getAuthCredentials } from '@/utils/auth-utils';

invariant(
  process.env.NEXT_PUBLIC_REST_API_ENDPOINT || process.env.NEXT_PUBLIC_API_URL,
  'NEXT_PUBLIC_REST_API_ENDPOINT or NEXT_PUBLIC_API_URL is not defined, please define it in your .env file'
);
const Axios = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_REST_API_ENDPOINT || process.env.NEXT_PUBLIC_API_URL,
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
// Change request data/error
const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY ?? AUTH_CRED;

function readAuthToken(): string {
  const { token } = getAuthCredentials();
  if (token) {
    return token;
  }
  const legacy = Cookies.get(AUTH_TOKEN_KEY);
  if (legacy) {
    try {
      return JSON.parse(legacy).token ?? '';
    } catch {
      return '';
    }
  }
  return '';
}

Axios.interceptors.request.use((config) => {
  const token = readAuthToken();
  // @ts-ignore
  config.headers = {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
  // Если отправляем FormData, удаляем Content-Type чтобы браузер установил правильный boundary
  // ВАЖНО: для FormData НЕ устанавливаем Content-Type - браузер сделает это сам с правильным boundary
  if (config.data instanceof FormData) {
    // Удаляем Content-Type из headers, чтобы браузер установил правильный boundary
    // Это критично для правильной отправки файлов
    console.log('Axios interceptor - FormData detected, removing Content-Type', {
      url: config.url,
      method: config.method,
      hasVideo: config.data.has('video'),
      currentContentType: config.headers['Content-Type'],
    });
    delete config.headers['Content-Type'];
    // Также удаляем из всех возможных мест
    if (config.headers && 'Content-Type' in config.headers) {
      delete config.headers['Content-Type'];
    }
    console.log('Axios interceptor - Content-Type removed', {
      contentTypeAfter: config.headers['Content-Type'],
    });
  }
  
  return config;
});

// Session invalidation is handled by useMeQuery — no global reload/redirect here (prevents loops).
Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    const hasToken = !!readAuthToken();
    const isPermissionError =
      status === 403 &&
      hasToken &&
      message !== 'PICKBAZAR_ERROR.NOT_AUTHORIZED';

    if (isPermissionError) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Недостаточно прав для выполнения этого действия';
      toast.error(errorMessage, { autoClose: 5000 });
    }

    return Promise.reject(error);
  }
);

function formatBooleanSearchParam(key: string, value: boolean) {
  return value ? `${key}:1` : `${key}:`;
}

interface SearchParamOptions {
  categories: string;
  code: string;
  type: string;
  name: string;
  shop_id: string;
  is_approved: boolean;
  tracking_number: string;
  notice: string;
}

export class HttpClient {
  static async get<T>(url: string, params?: unknown) {
    const response = await Axios.get<T>(url, { params });
    return response.data;
  }

  static async post<T>(url: string, data: unknown, options?: any) {
    // Логируем запросы для OTP регистрации
    if (url.includes('otp-login') && data && typeof data === 'object') {
      console.log('HttpClient.post - OTP login request:', {
        url,
        data: JSON.stringify(data),
        permission: (data as any).permission,
      });
    }
    // Логируем запросы для создания/обновления SKU
    if (url.includes('/skus') && data && typeof data === 'object') {
      console.log('HttpClient.post - SKU request:', {
        url,
        hasProperties: !!(data as any).properties,
        properties: (data as any).properties,
        propertiesCount: Array.isArray((data as any).properties) ? (data as any).properties.length : 0,
        dataKeys: Object.keys(data as any),
      });
    }
    // Логируем запросы для создания товара с видео
    if (data instanceof FormData && url.includes('/products')) {
      console.log('HttpClient.post - Product create with FormData', {
        url,
        hasVideo: data.has('video'),
        videoFile: data.get('video'),
        isFile: data.get('video') instanceof File,
        videoFileName: data.get('video') instanceof File ? (data.get('video') as File).name : 'not a file',
        videoFileSize: data.get('video') instanceof File ? (data.get('video') as File).size : 'not a file',
        formDataKeys: Array.from(data.keys()),
      });
    }
    const response = await Axios.post<T>(url, data, options);
    
    // Логируем ответ для создания товара
    if (data instanceof FormData && url.includes('/products')) {
      console.log('HttpClient.post - Product create response', {
        url,
        hasResponse: !!response,
        responseData: response.data,
        hasVideos: !!(response.data as any)?.videos,
        videosCount: Array.isArray((response.data as any)?.videos) ? (response.data as any).videos.length : 0,
      });
    }
    
    return response.data;
  }

  static async put<T>(url: string, data: unknown) {
    // Для FormData не устанавливаем Content-Type - interceptor удалит его и браузер установит правильный boundary
    if (data instanceof FormData) {
      console.log('HttpClient.put - sending FormData', {
        url,
        hasVideo: data.has('video'),
        videoFile: data.get('video'),
        isFile: data.get('video') instanceof File,
        videoFileName: data.get('video') instanceof File ? (data.get('video') as File).name : 'not a file',
        videoFileSize: data.get('video') instanceof File ? (data.get('video') as File).size : 'not a file',
        keys: Array.from(data.keys()),
      });
    }
    // Логируем запросы для обновления SKU
    if (url.includes('/skus') && data && typeof data === 'object') {
      console.log('HttpClient.put - SKU update request:', {
        url,
        hasProperties: !!(data as any).properties,
        properties: (data as any).properties,
        propertiesCount: Array.isArray((data as any).properties) ? (data as any).properties.length : 0,
        dataKeys: Object.keys(data as any),
      });
    }
    const response = await Axios.put<T>(url, data);
    
    // Логируем ответ для обновления товара с видео
    if (data instanceof FormData && url.includes('/products')) {
      console.log('HttpClient.put - Product update response', {
        url,
        hasResponse: !!response,
        responseData: response.data,
        hasVideos: !!(response.data as any)?.videos,
        videosCount: Array.isArray((response.data as any)?.videos) ? (response.data as any).videos.length : 0,
        fullResponse: response.data,
      });
    }
    
    return response.data;
  }

  static async patch<T>(url: string, data: unknown) {
    const response = await Axios.patch<T>(url, data);
    return response.data;
  }

  static async delete<T>(url: string, config?: { data?: unknown; params?: unknown }) {
    const response = await Axios.delete<T>(url, config);
    return response.data;
  }

  static formatSearchParams(params: Partial<SearchParamOptions>) {
    return Object.entries(params)
      .filter(([, value]) => Boolean(value))
      .map(([k, v]) =>
        ['type', 'categories', 'tags', 'author', 'manufacturer'].includes(k)
          ? `${k}.slug:${v}`
          : ['is_approved'].includes(k)
          ? formatBooleanSearchParam(k, v as boolean)
          : `${k}:${v}`
      )
      .join(';');
  }
}

export function getFormErrors(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data.message;
  }
  return null;
}

export function getFieldErrors(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data.errors;
  }
  return null;
}
