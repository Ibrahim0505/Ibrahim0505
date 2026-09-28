import { Platform } from "react-native";

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
export const API = `${BASE}/api`;

export type HarvestStatus = "ready" | "cooldown";

export type Location = {
  id: string;
  name: string;
  notes: string;
  latitude: number;
  longitude: number;
  harvest_interval_days: number;
  photos: string[];
  last_visit_at: string | null;
  next_harvest_at: string | null;
  total_harvest_kg: number;
  visit_count: number;
  status: HarvestStatus;
  created_at: string;
};

export type Visit = {
  id: string;
  location_id: string;
  visited_at: string;
  amount_kg: number;
  notes: string;
  photos: string[];
  created_at: string;
};

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const fileUrl = (path: string) => `${API}/files/${path}`;

// -------- Locations --------
export const listLocations = () => req<Location[]>("/locations");
export const getLocation = (id: string) => req<Location>(`/locations/${id}`);
export const createLocation = (payload: Partial<Location>) =>
  req<Location>("/locations", { method: "POST", body: JSON.stringify(payload) });
export const updateLocation = (id: string, payload: Partial<Location>) =>
  req<Location>(`/locations/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteLocation = (id: string) =>
  req<{ ok: boolean }>(`/locations/${id}`, { method: "DELETE" });
export const removePhoto = (id: string, path: string) =>
  req<Location>(`/locations/${id}/photos?path=${encodeURIComponent(path)}`, { method: "DELETE" });

// -------- Visits --------
export const listVisits = (locationId: string) => req<Visit[]>(`/locations/${locationId}/visits`);
export const createVisit = (locationId: string, payload: Partial<Visit>) =>
  req<Visit>(`/locations/${locationId}/visits`, { method: "POST", body: JSON.stringify(payload) });
export const updateVisit = (visitId: string, payload: Partial<Visit>) =>
  req<Visit>(`/visits/${visitId}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteVisit = (visitId: string) =>
  req<{ ok: boolean }>(`/visits/${visitId}`, { method: "DELETE" });

// -------- Photo upload (multipart; branches web vs native) --------
export async function uploadPhoto(uri: string): Promise<string> {
  const name = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";

  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    // @ts-expect-error react-native FormData file shape
    form.append("file", { uri, name, type });
  }

  const res = await fetch(`${API}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Kuota penyimpanan foto habis");
    throw new Error("Gagal mengunggah foto");
  }
  const data = (await res.json()) as { path: string };
  return data.path;
}
