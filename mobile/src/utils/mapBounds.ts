export type MapBounds = {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
};

export function parseMapBounds(payload: {
  southWest?: [number, number];
  northEast?: [number, number];
  sw_lat?: number;
  sw_lng?: number;
  ne_lat?: number;
  ne_lng?: number;
}): MapBounds | null {
  if (payload.sw_lat != null && payload.sw_lng != null && payload.ne_lat != null && payload.ne_lng != null) {
    return {
      sw_lat: Number(payload.sw_lat),
      sw_lng: Number(payload.sw_lng),
      ne_lat: Number(payload.ne_lat),
      ne_lng: Number(payload.ne_lng),
    };
  }
  if (payload.southWest && payload.northEast) {
    return {
      sw_lat: Number(payload.southWest[0]),
      sw_lng: Number(payload.southWest[1]),
      ne_lat: Number(payload.northEast[0]),
      ne_lng: Number(payload.northEast[1]),
    };
  }
  return null;
}

export function isTaskInBounds(
  task: { lat?: number | string | null; lng?: number | string | null },
  bounds: MapBounds
): boolean {
  if (task.lat == null || task.lng == null || task.lat === "" || task.lng === "") return false;
  const lat = Number(task.lat);
  const lng = Number(task.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const south = Math.min(bounds.sw_lat, bounds.ne_lat);
  const north = Math.max(bounds.sw_lat, bounds.ne_lat);
  const west = Math.min(bounds.sw_lng, bounds.ne_lng);
  const east = Math.max(bounds.sw_lng, bounds.ne_lng);
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function filterTasksByBounds<T extends { lat?: number | string | null; lng?: number | string | null }>(
  tasks: T[],
  bounds: MapBounds | null
): T[] {
  if (!bounds) {
    return tasks.filter((task) => task.lat != null && task.lng != null && task.lat !== "" && task.lng !== "");
  }
  return tasks.filter((task) => isTaskInBounds(task, bounds));
}
