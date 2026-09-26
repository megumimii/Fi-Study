/**
 * Input sanitization utility to escape dangerous HTML/script injection characters
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // If already escaped, return as is
  if (input.includes('&lt;') || input.includes('&gt;')) return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

/**
 * Recursively sanitize string fields in an object
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeObject(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

module.exports = {
  sanitizeInput,
  sanitizeObject
};
