/**
 * @typedef {'openai' | 'local' | 'google-perspective' | 'custom-amharic'} ModerationProviderId
 */

/**
 * @typedef {Object} ModerationResult
 * @property {boolean} safe
 * @property {number} toxicityScore 0..1 aggregate severity
 * @property {string[]} flaggedCategories
 * @property {Record<string, number>} [scoresByCategory]
 */

export {};
