function trimOr(val, fallback) {
  if (typeof val !== "string") return fallback;
  const t = val.trim();
  return t || fallback;
}

/** Display name from `VITE_APP_NAME` (build-time). */
export const APP_NAME = trimOr(import.meta.env.VITE_APP_NAME, "Safetext");

/** Short tagline from `VITE_APP_TAGLINE` (build-time). */
export const APP_TAGLINE = trimOr(
  import.meta.env.VITE_APP_TAGLINE,
  "Community safety & moderation"
);

/** Single-letter mark for the header logo. */
export const APP_INITIAL = APP_NAME.slice(0, 1).toUpperCase() || "?";
