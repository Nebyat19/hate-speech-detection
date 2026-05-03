export async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function fetchStats() {
  return fetchJson("/api/stats");
}

export function fetchLiveUsers() {
  return fetchJson("/api/users/live");
}
