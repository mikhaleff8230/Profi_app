import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../api";

export type DraftQuestion = {
  id: number | null;
  key: string;
  text: string;
  field_type: "text" | "textarea" | "number" | "select" | "single_select" | "multiselect" | "multi_select" | "yesno" | "boolean" | "photo";
  options?: Array<{ value: unknown; label: string }>;
  required?: boolean;
};

export type DraftSnapshot = {
  id: string;
  version: number;
  status: string;
  initial_text?: string | null;
  title?: string | null;
  description?: string | null;
  category?: { id: string; name: string } | null;
  work?: { id: string | number; name: string } | null;
  location: { city?: string | null; address?: string | null; lat?: number | null; lng?: number | null; confirmed?: boolean };
  budget: { type: string; amount?: number | null; min?: number | null; max?: number | null };
  answers: Array<{ question_id: number; question: string; display_value: string }>;
};

export type DraftAction =
  | { type: "wait" | "review"; message?: string }
  | { type: "ask_question"; question: DraftQuestion; message?: string }
  | { type: "choose_category" | "choose_service" | "manual_fallback"; message: string; category_id?: string }
  | { type: "split_intents"; message: string; intents: Array<{ service_id?: string | number | null; label: string }> };

export type DraftResponse = {
  data: {
    draft: DraftSnapshot;
    ui_action: DraftAction;
    progress: { percent: number };
    task_id?: string;
  };
};

const CLIENT_DRAFT_KEY = "treabo_customer_draft_id";

function uuid(): string {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export async function clientDraftId(): Promise<string> {
  const current = await AsyncStorage.getItem(CLIENT_DRAFT_KEY);
  if (current) return current;
  const next = uuid();
  await AsyncStorage.setItem(CLIENT_DRAFT_KEY, next);
  return next;
}

export async function clearClientDraft(): Promise<void> {
  await AsyncStorage.removeItem(CLIENT_DRAFT_KEY);
}

export async function restoreDraft(): Promise<DraftResponse | null> {
  const id = await AsyncStorage.getItem(CLIENT_DRAFT_KEY);
  if (!id) return null;
  try {
    return await apiFetch(`/request-drafts/latest?client_draft_id=${encodeURIComponent(id)}`, { method: "GET" });
  } catch {
    return null;
  }
}

export async function createDraft(initialText: string, city?: string): Promise<DraftResponse> {
  const id = await clientDraftId();
  return apiFetch("/request-drafts", {
    method: "POST",
    body: JSON.stringify({
      initial_text: initialText,
      city_hint: city || null,
      client_draft_id: id,
      idempotency_key: `create-${id}`,
    }),
  });
}

export function answerDraft(draft: DraftSnapshot, input: { value?: unknown; message?: string; skip?: number }): Promise<DraftResponse> {
  const action = input.skip
    ? { skip_question_id: input.skip }
    : input.message
      ? { message: input.message }
      : { answer: { question_id: Number(input.value && typeof input.value === "object" ? (input.value as any).questionId : 0), value: input.value && typeof input.value === "object" ? (input.value as any).value : input.value } };
  return apiFetch(`/request-drafts/${encodeURIComponent(draft.id)}/turns`, {
    method: "POST",
    body: JSON.stringify({ ...action, expected_version: draft.version, client_turn_id: uuid(), idempotency_key: `turn-${uuid()}` }),
  });
}

export function answerQuestion(draft: DraftSnapshot, questionId: number, value: unknown): Promise<DraftResponse> {
  return apiFetch(`/request-drafts/${encodeURIComponent(draft.id)}/turns`, {
    method: "POST",
    body: JSON.stringify({
      answer: { question_id: questionId, value },
      expected_version: draft.version,
      client_turn_id: uuid(),
      idempotency_key: `turn-${uuid()}`,
    }),
  });
}

export function skipQuestion(draft: DraftSnapshot, questionId: number): Promise<DraftResponse> {
  return apiFetch(`/request-drafts/${encodeURIComponent(draft.id)}/turns`, {
    method: "POST",
    body: JSON.stringify({
      skip_question_id: questionId,
      expected_version: draft.version,
      client_turn_id: uuid(),
      idempotency_key: `turn-${uuid()}`,
    }),
  });
}

export function patchDraft(draft: DraftSnapshot, changes: Array<{ op: "replace"; path: string; value: unknown }>): Promise<DraftResponse> {
  return apiFetch(`/request-drafts/${encodeURIComponent(draft.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ expected_version: draft.version, changes }),
  });
}

export function publishDraft(draft: DraftSnapshot): Promise<DraftResponse> {
  return apiFetch(`/request-drafts/${encodeURIComponent(draft.id)}/confirm`, {
    method: "POST",
    body: JSON.stringify({ expected_version: draft.version, consent: true, idempotency_key: `publish-${draft.id}` }),
  });
}
