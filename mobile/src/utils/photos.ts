import { fileUrl } from "../api";
import type { TaskPhoto } from "../types/proffi";

export function resolvePhotoUrl(photo: TaskPhoto | null | undefined): string | null {
  if (!photo) return null;
  if (typeof photo === "string") {
    return photo.startsWith("http") || photo.startsWith("blob:") ? photo : fileUrl(photo);
  }
  if (photo.url) return photo.url;
  if (photo.path) return fileUrl(photo.path);
  return null;
}

export function resolveTaskPhotos(photos?: TaskPhoto[] | null): string[] {
  if (!photos?.length) return [];
  return photos.map(resolvePhotoUrl).filter((url): url is string => Boolean(url));
}
