export type TaskPhoto = string | { url?: string | null; path?: string | null };

export type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  category_id?: string | null;
  work_id?: number | string | null;
  work_title?: string | null;
  work?: { id?: number | string | null; title?: string | null; name?: string | null } | null;
  details?: Record<string, unknown> | null;
  ai_answers?: Record<string, unknown> | null;
  answers?: Record<string, unknown> | null;
  city: string;
  address?: string | null;
  budget?: number | null;
  budget_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  budget_label?: string | null;
  response_price_mdl?: number | null;
  deadline?: string | null;
  status: string;
  customer_id: string;
  customer_name?: string | null;
  accepted_specialist_id?: string | null;
  photos?: TaskPhoto[];
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type Specialist = {
  id: string;
  phone?: string | null;
  name: string;
  role?: string | null;
  city?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  bio?: string | null;
  services?: string[];
  avatar?: string | null;
  portfolio?: TaskPhoto[];
  lat?: number | null;
  lng?: number | null;
  last_seen?: string | null;
  last_seen_label?: string | null;
  is_online?: boolean | null;
  passport_verified?: boolean | null;
  identity_status?: string | null;
  created_at?: string | null;
  email?: string | null;
  is_verified?: boolean | null;
};

export type SpecialistReview = {
  id: string;
  rating: number;
  comment?: string | null;
  customer_name?: string | null;
  task_title?: string | null;
  photos?: string[];
  text?: string | null;
  author_name?: string | null;
  created_at?: string | null;
};

export type Chat = {
  id: string;
  task_id: string;
  task_title?: string | null;
  customer_id: string;
  customer_name?: string | null;
  specialist_id: string;
  specialist_name?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id?: string | number | null;
  user_id?: string | number | null;
  text: string;
  type?: string | null;
  created_at: string;
};

export type ApplicationPreview = {
  has_applied: boolean;
  free_daily_limit?: number;
  free_used_today?: number;
  free_remaining_before?: number;
  free_remaining_after?: number;
  charge_required?: boolean;
  is_free?: boolean;
  response_fee_mdl?: number;
  default_response_price_mdl?: number;
  currency?: string;
};

export type Application = {
  id: string;
  task_id: string;
  specialist_id: string;
  specialist_name: string;
  specialist_city?: string | null;
  message: string;
  price?: number | null;
  response_fee_mdl?: number | null;
  status: string;
  chat_id?: string | null;
  created_at?: string | null;
};
