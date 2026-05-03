export function getApiOrigin() {
  const v = import.meta.env.VITE_API_ORIGIN?.trim();
  if (v) return v;
  if (import.meta.env.DEV) return "http://localhost:3001";
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3001";
}
