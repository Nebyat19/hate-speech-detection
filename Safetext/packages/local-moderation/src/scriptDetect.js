/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsAmharic(text) {
  return /[\u1200-\u137F]/.test(text);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsLatin(text) {
  return /[A-Za-z]/.test(text);
}
