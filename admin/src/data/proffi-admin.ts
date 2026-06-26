import axios from 'axios';
import { getAuthCredentials } from '@/utils/auth-utils';

const baseURL =
  process.env.NEXT_PUBLIC_REST_API_ENDPOINT ||
  process.env.NEXT_PUBLIC_API_URL ||
  '';

const proffiAdminApi = axios.create({
  baseURL,
  timeout: 30000,
});

proffiAdminApi.interceptors.request.use((config) => {
  const { token: bearerToken } = getAuthCredentials();
  const localToken =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('admin_token')?.trim()
      : '';
  const token =
    localToken || process.env.NEXT_PUBLIC_PROFFI_ADMIN_TOKEN || 'admin';

  config.headers = {
    ...config.headers,
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    'X-Admin-Token': token,
  } as any;

  return config;
});

export type ProffiStats = {
  users: number;
  customers: number;
  specialists: number;
  tasks: number;
  applications: number;
  chats: number;
  messages: number;
  categories: number;
  filters: number;
};

export type ProffiUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  city?: string | null;
  email?: string | null;
  services?: string[];
  avatar?: string | null;
  portfolio?: string[];
  created_at?: string | null;
};

export type TreaboCategory = {
  id: string;
  parent_id?: string | null;
  icon?: string | null;
  name_ru: string;
  name_ro: string;
  slug?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type TreaboFilter = {
  id: string;
  name: string;
  key: string;
  value: string;
};

export type TreaboResponseSettings = {
  id?: number;
  free_daily_limit: number;
  default_response_price_mdl: number;
  manual_deposit_amount_mdl: number;
  manual_deposit_url?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TreaboBalanceDeposit = {
  id: string;
  seller_id: string;
  seller_name?: string | null;
  seller_phone?: string | null;
  amount: number;
  status: string;
  payment_id?: string | null;
  reported_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type ProffiTask = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  category_id?: string | null;
  customer_id?: string | null;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  accepted_specialist_name?: string | null;
  city?: string | null;
  address?: string | null;
  budget?: number | null;
  response_price_mdl?: number | null;
  deadline?: string | null;
  photos?: string[];
  applications_count: number;
  photos_count: number;
  created_at?: string | null;
};

export type ProffiUpload = {
  disk: string;
  path: string;
  url: string;
  mime?: string | null;
  size?: number | null;
};

export type ProffiApplication = {
  id: string;
  task_id: string;
  task_title?: string | null;
  specialist_name?: string | null;
  specialist_phone?: string | null;
  status: string;
  price?: number | null;
  chat_id?: string | null;
  message?: string | null;
  created_at?: string | null;
};

export type ProffiChat = {
  id: string;
  task_id: string;
  task_title?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  specialist_name?: string | null;
  specialist_phone?: string | null;
  messages_count: number;
  last_message?: string | null;
  updated_at?: string | null;
};

export type ProffiMessage = {
  id: string;
  sender_id: string;
  sender_name?: string | null;
  sender_phone?: string | null;
  text: string;
  created_at?: string | null;
};

export type AiKnowledgeType = 'category' | 'work' | 'parameter' | 'question' | 'instruction';

export type AiChatKnowledge = {
  id: number;
  type: AiKnowledgeType;
  category_slug?: string | null;
  work_slug?: string | null;
  title: string;
  slug?: string | null;
  content?: string | null;
  payload?: Record<string, any> | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AiChatKnowledgeInput = {
  type: AiKnowledgeType;
  category_slug?: string | null;
  work_slug?: string | null;
  title: string;
  slug?: string | null;
  content?: string | null;
  payload?: Record<string, any> | null;
  sort_order?: number;
  is_active?: boolean;
};

export async function getProffiAdmin<T>(path: string): Promise<T> {
  const response = await proffiAdminApi.get<T>(path);
  return response.data;
}

export async function postProffiAdmin<T>(path: string, data: unknown): Promise<T> {
  const response = await proffiAdminApi.post<T>(path, data);
  return response.data;
}

export async function putProffiAdmin<T>(path: string, data: unknown): Promise<T> {
  const response = await proffiAdminApi.put<T>(path, data);
  return response.data;
}

export async function deleteProffiAdmin<T>(path: string): Promise<T> {
  const response = await proffiAdminApi.delete<T>(path);
  return response.data;
}

export async function uploadProffiAdminFile(file: File, folder = 'admin'): Promise<ProffiUpload> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await proffiAdminApi.post<ProffiUpload>('/api/uploads', formData, {
    headers: {
      Accept: 'application/json',
    },
  });

  return response.data;
}
