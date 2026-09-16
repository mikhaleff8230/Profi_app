import { apiFetch } from "../api";
import type { Place, PlaceDraft, PlaceFilters } from "../types/place";

function unwrapList(payload: any): Place[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function queryString(filters: PlaceFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
  return params.toString();
}

export async function listPlaces(filters: PlaceFilters = {}): Promise<Place[]> {
  const query = queryString({ per_page: 30, ...filters });
  return unwrapList(await apiFetch(`/places${query ? `?${query}` : ""}`, { method: "GET" }));
}

export async function getPlace(placeId: string): Promise<Place> {
  const payload = await apiFetch(`/places/${placeId}`, { method: "GET" });
  return (payload?.data ?? payload) as Place;
}

export async function createPlace(draft: PlaceDraft): Promise<Place> {
  const payload = await apiFetch("/places", { method: "POST", body: JSON.stringify(draft) });
  return (payload?.data ?? payload) as Place;
}

export async function setPlaceFavorite(placeId: string, favorite: boolean): Promise<void> {
  await apiFetch(`/places/${placeId}/favorite`, { method: favorite ? "POST" : "DELETE" });
}

export async function createRequestFromPlace(placeId: string): Promise<any> {
  return apiFetch(`/places/${placeId}/create-request`, { method: "POST", body: JSON.stringify({}) });
}
