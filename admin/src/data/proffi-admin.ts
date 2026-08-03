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

function proffiApiPath(path: string): string {
  if (path.startsWith('/api/proffi/')) {
    return path;
  }

  if (path.startsWith('/api/admin/')) {
    return path.replace(/^\/api\/admin\//, '/api/proffi/admin/');
  }

  if (path === '/api/uploads') {
    return '/api/proffi/uploads';
  }

  return path;
}

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
};

export type ProffiUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  city?: string | null;
  location_id?: number | null;
  email?: string | null;
  services?: string[];
  avatar?: string | null;
  portfolio?: string[];
  balance?: number;
  total_deposited?: number;
  total_spent?: number;
  created_at?: string | null;
};

export type TreaboCategory = {
  id: string;
  parent_id?: string | null;
  icon?: string | null;
  image?: string | null;
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

export type TreaboMatchingSettings = {
  id?: number;
  category_weight: number;
  work_weight: number;
  rating_weight: number;
  reviews_weight: number;
  online_weight: number;
  profile_relevance_weight: number;
  min_rating: number;
  min_reviews: number;
  max_recommended: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TreaboResponseSettings = {
  id?: number;
  free_daily_limit: number;
  free_per_task_limit?: number;
  default_response_price_mdl: number;
  manual_deposit_amount_mdl: number;
  manual_deposit_url?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TreaboMobileUpdateSettings = {
  id?: number;
  app_type?: 'specialist' | 'client';
  latest_version: string;
  latest_build: number;
  min_supported_build: number;
  force_update: boolean;
  android_url?: string | null;
  ios_url?: string | null;
  release_notes?: string | null;
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
  location_id?: number | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  budget?: number | null;
  budget_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
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

export type ProffiReview = {
  id: string;
  task_id?: string | null;
  task_title?: string | null;
  specialist_id: string;
  specialist_name?: string | null;
  customer_id: string;
  customer_name?: string | null;
  rating: number;
  comment?: string | null;
  photos?: string[];
  created_at?: string | null;
};

export type ProffiVerification = {
  id: string;
  user_id: string;
  user_name?: string | null;
  user_phone?: string | null;
  status: string;
  passport_main_photo?: string | null;
  passport_registration_photo?: string | null;
  passport_selfie_photo?: string | null;
  moderator_comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

export type AiKnowledgeImportStatus =
  | 'uploaded'
  | 'parsing'
  | 'normalizing'
  | 'queued'
  | 'analyzing'
  | 'review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AiKnowledgeSource = {
  id: number;
  name: string;
  type: string;
  default_region?: string | null;
};

export type AiKnowledgeImport = {
  id: number;
  source_id: number;
  knowledge_version_id?: number | null;
  status: AiKnowledgeImportStatus;
  mode: 'terms' | 'catalog' | 'questions' | 'full_analysis';
  category_hint?: string | null;
  region?: string | null;
  rows_total: number;
  rows_unique: number;
  clusters_total: number;
  proposals_total: number;
  proposals_count?: number;
  cost_limit_usd: number;
  actual_cost_usd: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  progress: number;
  error?: { message?: string } | null;
  source?: AiKnowledgeSource;
  rows_preview?: Array<{
    id: number;
    raw_text: string;
    frequency?: number | null;
    status: string;
  }>;
  created_at?: string | null;
};

export type AiKnowledgeProposal = {
  id: number;
  import_id: number;
  proposal_type: string;
  status: 'generated' | 'needs_clarification' | 'in_review' | 'accepted' | 'rejected' | 'superseded' | 'published';
  target_type?: string | null;
  target_id?: string | null;
  title: string;
  payload: Record<string, any>;
  evidence: Array<{ row_id?: number; text?: string }>;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  review_note?: string | null;
  import?: AiKnowledgeImport;
  created_at?: string | null;
};

export type AiKnowledgeTerm = {
  id: number;
  knowledge_version_id: number;
  stable_key: string;
  display_text: string;
  normalized_text: string;
  term_type: string;
  status: 'draft' | 'published' | 'archived';
  frequency: number;
  use_count: number;
  variants?: Array<{
    id: number;
    variant_text: string;
    variant_type: string;
    frequency: number;
    confidence: number;
  }>;
  links?: Array<{
    id: number;
    target_type: string;
    target_id: string;
    relation: string;
    weight: number;
    status: string;
  }>;
};

export type AiKnowledgeVersion = {
  id: number;
  version: string;
  based_on_version_id?: number | null;
  rollback_of_version_id?: number | null;
  status: 'draft' | 'testing' | 'published' | 'archived';
  terms_count?: number;
  documents_count?: number;
  proposals_count?: number;
  metrics?: Record<string, number> | null;
  publication_report?: Record<string, any> | null;
  published_at?: string | null;
};

export type AiKnowledgeRetrieval = {
  knowledge_version_id?: number | null;
  knowledge_version?: string | null;
  query_normalized: string;
  categories: Array<{ id: string; name_ru: string }>;
  works: Array<{
    work_id: number;
    category_id: string;
    title: string;
    score: number;
    evidence: Array<{ source: string; text: string; relation?: string; score: number }>;
  }>;
  questions: Array<{ id: number; work_id: number; question: string; type: string }>;
};

export type LaravelPaginator<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ProffiWork = {
  id: number;
  category_id?: string | null;
  title: string;
  slug?: string | null;
  aliases?: string[] | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  category?: TreaboCategory | null;
};

export type ProffiWorkInput = {
  category_id?: string | null;
  title: string;
  slug?: string | null;
  aliases?: string[] | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type ProffiWorkQuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'yesno'
  | 'select'
  | 'multiselect'
  | 'photo';

export type ProffiWorkQuestion = {
  id: number;
  work_id: number;
  question: string;
  field_key?: string | null;
  type: ProffiWorkQuestionType;
  options?: string[] | null;
  placeholder?: string | null;
  help_text?: string | null;
  ai_instruction?: string | null;
  group_id?: number | null;
  is_required?: boolean;
  default_visibility?: 'always' | 'conditional';
  is_safety_critical?: boolean;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  work?: ProffiWork | null;
  category_id?: string | null;
};

export type ProffiWorkQuestionInput = {
  work_id: number;
  question: string;
  field_key?: string | null;
  type: ProffiWorkQuestionType;
  options?: string[] | null;
  placeholder?: string | null;
  help_text?: string | null;
  ai_instruction?: string | null;
  group_id?: number | null;
  is_required?: boolean;
  default_visibility?: 'always' | 'conditional';
  is_safety_critical?: boolean;
  sort_order?: number;
  is_active?: boolean;
};

export type ProffiQuestionGroup = {
  id: number;
  work_id: number;
  title: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProffiQuestionRule = {
  id: number;
  work_id: number;
  name: string;
  match_type: 'all' | 'any';
  conditions: Array<{
    question_id: number;
    operator: string;
    value: unknown;
  }>;
  actions: Array<{
    question_id: number;
    effect: 'show' | 'hide' | 'require' | 'optional';
  }>;
  priority: number;
  is_active: boolean;
};

export type ProffiQuestionFlow = {
  groups: ProffiQuestionGroup[];
  rules: ProffiQuestionRule[];
  questions: ProffiWorkQuestion[];
};

export async function getProffiAdmin<T>(path: string): Promise<T> {
  const response = await proffiAdminApi.get<T>(proffiApiPath(path));
  return response.data;
}

export async function postProffiAdmin<T>(path: string, data: unknown): Promise<T> {
  const response = await proffiAdminApi.post<T>(proffiApiPath(path), data);
  return response.data;
}

export async function virtualDepositSpecialistBalance(specialistId: string, amount: number) {
  return postProffiAdmin<{
    success: boolean;
    message: string;
    data?: {
      seller_id: string;
      amount: number;
      old_balance: number;
      new_balance: number;
      deposit_id: number;
    };
  }>(`/api/admin/specialists/${encodeURIComponent(specialistId)}/balance/virtual-deposit`, { amount });
}

export async function putProffiAdmin<T>(path: string, data: unknown): Promise<T> {
  const response = await proffiAdminApi.put<T>(proffiApiPath(path), data);
  return response.data;
}

export async function deleteProffiAdmin<T>(path: string): Promise<T> {
  const response = await proffiAdminApi.delete<T>(proffiApiPath(path));
  return response.data;
}

export async function uploadProffiAdminFile(file: File, folder = 'admin'): Promise<ProffiUpload> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await proffiAdminApi.post<ProffiUpload>(proffiApiPath('/api/uploads'), formData, {
    headers: {
      Accept: 'application/json',
    },
  });

  return response.data;
}
