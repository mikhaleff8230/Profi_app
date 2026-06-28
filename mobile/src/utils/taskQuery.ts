export type TaskFilters = {
  category?: string;
  category_id?: string;
  q?: string;
  city?: string;
  budget_min?: number | string;
  budget_max?: number | string;
  lat?: number;
  lng?: number;
  sort?: string;
  sw_lat?: number;
  sw_lng?: number;
  ne_lat?: number;
  ne_lng?: number;
};

export function buildTaskQueryParams(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.category_id) params.set("category_id", String(filters.category_id));
  else if (filters.category) params.set("category", String(filters.category));
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  if (filters.budget_min != null && filters.budget_min !== "") {
    params.set("budget_min", String(filters.budget_min));
  }
  if (filters.budget_max != null && filters.budget_max !== "") {
    params.set("budget_max", String(filters.budget_max));
  }
  if (filters.lat != null && filters.lng != null) {
    params.set("lat", String(filters.lat));
    params.set("lng", String(filters.lng));
    if (filters.sort) params.set("sort", filters.sort);
  }
  if (filters.sw_lat != null && filters.sw_lng != null && filters.ne_lat != null && filters.ne_lng != null) {
    params.set("sw_lat", String(filters.sw_lat));
    params.set("sw_lng", String(filters.sw_lng));
    params.set("ne_lat", String(filters.ne_lat));
    params.set("ne_lng", String(filters.ne_lng));
  }
  return params.toString();
}
