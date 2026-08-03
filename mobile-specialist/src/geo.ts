import { apiFetch } from './api';

export type GeoAddressResult = {
  city: string | null;
  region: string | null;
  country: string | null;
  address: string | null;
  full_address: string | null;
  lat: number | null;
  lng: number | null;
  fias_id?: string | null;
  kladr_id?: string | null;
  source: string;
  provider?: string | null;
  accuracy?: number | null;
  needs_confirmation: boolean;
};

async function geoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch(path, { ...init, namespace: "root" }) as Promise<T>;
}

export async function detectByIp(): Promise<GeoAddressResult> {
  return geoFetch<GeoAddressResult>('/geo/detect');
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  accuracy?: number | null,
): Promise<GeoAddressResult> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (accuracy != null) params.set('accuracy', String(accuracy));
  return geoFetch<GeoAddressResult>(`/geo/reverse?${params.toString()}`);
}

export async function suggestAddresses(
  query: string,
  options?: { city?: string; count?: number },
): Promise<GeoAddressResult[]> {
  const params = new URLSearchParams({ query });
  if (options?.city) params.set('city', options.city);
  if (options?.count) params.set('count', String(options.count));
  const payload = await geoFetch<{ addresses?: GeoAddressResult[] }>(`/addresses/search?${params.toString()}`);
  return payload.addresses || [];
}

export async function saveConfirmedAddress(payload: Partial<GeoAddressResult>): Promise<GeoAddressResult> {
  const result = await geoFetch<{ address: GeoAddressResult }>('/address/save', {
    method: 'POST',
    body: JSON.stringify({ ...payload, source: payload.source || 'manual' }),
  });
  return result.address;
}
