export function userCompositeRisk(user, reports, toxicMessages) {
  return user.riskScore + user.strikeCount * 3 + reports * 2 + toxicMessages * 2;
}

export function riskTierFromComposite(composite) {
  if (composite >= 10) return "High risk";
  if (composite >= 4) return "Medium risk";
  return "Low risk";
}
