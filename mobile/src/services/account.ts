import { apiFetch } from "../api";

export type AccountSummary = {
  balance: number;
  total_deposited?: number;
  total_spent?: number;
  free_daily_limit: number;
  free_used_today: number;
  free_remaining_today: number;
};

export type BalanceDepositResult = {
  success: boolean;
  message?: string;
  payment_method?: "yookassa" | "manual";
  payment_url?: string;
  payment_id?: string;
  deposit_id?: number;
  amount?: number;
  currency?: string;
  expires_at?: string;
};

export type PendingDepositResult = {
  has_pending: boolean;
  processed?: boolean;
  amount?: number;
  old_balance?: number;
  new_balance?: number;
  message?: string;
  status?: string;
};

export async function fetchAccountSummary(): Promise<AccountSummary> {
  const response = await apiFetch("/balance", { method: "GET" });
  const data = response?.data || response || {};
  return {
    balance: Number(data.balance || 0),
    total_deposited: Number(data.total_deposited || 0),
    total_spent: Number(data.total_spent || 0),
    free_daily_limit: Number(data.free_daily_limit || 5),
    free_used_today: Number(data.free_used_today || 0),
    free_remaining_today: Number(data.free_remaining_today ?? 5),
  };
}

export async function createBalanceDeposit(amount: number, paymentMethod: "yookassa" | "manual" = "yookassa"): Promise<BalanceDepositResult> {
  const response = await apiFetch("/balance/deposit", {
    method: "POST",
    body: JSON.stringify({ amount, payment_method: paymentMethod }),
  });
  return response?.data || response;
}

export async function reportManualBalancePayment(depositId?: number): Promise<BalanceDepositResult> {
  const response = await apiFetch("/balance/deposit/report", {
    method: "POST",
    body: JSON.stringify(depositId ? { deposit_id: depositId } : {}),
  });
  return response?.data ? { ...response.data, success: response.success, message: response.message } : response;
}

export async function checkPendingBalanceDeposit(): Promise<PendingDepositResult> {
  const response = await apiFetch("/balance/check-pending", { method: "GET" });
  return response?.data || response;
}
