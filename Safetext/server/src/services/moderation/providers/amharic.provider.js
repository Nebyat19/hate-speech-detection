/**
 * Placeholder for a future custom Amharic moderation model (local API, fine-tuned, etc.).
 * @param {string} _text
 * @returns {Promise<import('../types.js').ModerationResult>}
 */
export async function moderateWithAmharicModel(_text) {
  return {
    safe: true,
    toxicityScore: 0,
    flaggedCategories: [],
    scoresByCategory: {},
  };
}
