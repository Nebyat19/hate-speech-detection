/**
 * Stub for Google Perspective API — swap implementation without touching callers.
 * @param {string} text
 * @returns {Promise<import('../types.js').ModerationResult>}
 */
export async function moderateWithPerspective(_text) {
  return {
    safe: true,
    toxicityScore: 0,
    flaggedCategories: [],
    scoresByCategory: {},
  };
}
