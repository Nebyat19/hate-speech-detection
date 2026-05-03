const CATEGORY_LABELS = {
  toxic: "Toxic language",
  hate: "Hate",
  harassment: "Harassment",
  threat: "Threats",
  threatviolence: "Violence",
  violence: "Violence",
  sexual: "Sexual content",
  selfharm: "Self-harm",
  "self-harm": "Self-harm",
  obscenity: "Obscene content",
  insult: "Insult / harassment",
  identityattack: "Identity attack",
};

export const POLICY_REFERENCE = "Respectful Communication Policy (Rule #3)";

export function formatViolationCategories(categories) {
  if (!categories?.length) return "";
  return categories
    .map((c) => {
      const k = String(c).toLowerCase().replace(/\s+/g, "");
      return CATEGORY_LABELS[k] || CATEGORY_LABELS[c] || formatRaw(c);
    })
    .join(", ");
}

function formatRaw(c) {
  const s = String(c);
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function approvedBadgeKind(toxicityScore, threshold) {
  const t = Number(toxicityScore) || 0;
  const warnBelow = Math.min(threshold * 0.55, 0.35);
  if (t < warnBelow) return "safe";
  return "warning";
}
