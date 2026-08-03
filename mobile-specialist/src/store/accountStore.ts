import { create } from "zustand";
import { fetchAccountSummary, type AccountSummary } from "../services/account";

type AccountState = {
  account: AccountSummary | null;
  loading: boolean;
  refresh: () => Promise<AccountSummary | null>;
};

let pendingRefresh: Promise<AccountSummary | null> | null = null;

export const useAccountStore = create<AccountState>((set) => ({
  account: null,
  loading: false,
  refresh: async () => {
    if (pendingRefresh) return pendingRefresh;
    set({ loading: true });
    pendingRefresh = fetchAccountSummary()
      .then((account) => {
        set({ account });
        return account;
      })
      .catch(() => null)
      .finally(() => {
        pendingRefresh = null;
        set({ loading: false });
      });
    return pendingRefresh;
  },
}));
