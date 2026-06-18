import { getApiOrigin } from "../config/apiOrigin.js";

function toApiUrl(path) {
  return new URL(path, getApiOrigin()).toString();
}

export async function fetchJson(path) {
  const res = await fetch(toApiUrl(path));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function fetchStats() {
  return fetchJson("/api/stats");
}

export function fetchLiveUsers() {
  return fetchJson("/api/users/live");
}
