class Cache {
  /**
   * @param {number} defaultTtl - Time to live in milliseconds (default 1 minute)
   * @param {number} pruneInterval - Check interval for cleanup in milliseconds (default 30 seconds)
   */
  constructor(defaultTtl = 60000, pruneInterval = 30000) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;

    // Automatically prune expired keys at a regular interval to prevent memory leaks
    this.timer = setInterval(() => this.prune(), pruneInterval);
    if (this.timer.unref) {
      this.timer.unref(); // Prevent timer from keeping the node process alive
    }
  }

  /**
   * Set a value in the cache with a specific TTL.
   * @param {string} key 
   * @param {*} value 
   * @param {number} ttl 
   */
  set(key, value, ttl = this.defaultTtl) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache. Returns null if key doesn't exist or is expired.
   * @param {string} key 
   * @returns {*}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete a key from the cache.
   * @param {string} key 
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regular expression
   * @param {string|RegExp} pattern
   */
  deleteMatching(pattern) {
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string' && key.startsWith(pattern)) {
        this.cache.delete(key);
      } else if (pattern instanceof RegExp && pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all items in the cache.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Prunes expired keys from memory.
   */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup resource on close.
   */
  close() {
    clearInterval(this.timer);
  }
}

// Global cache instances for different domains
const userCache = new Cache(300000);         // 5 minutes for user profiles
const courseCache = new Cache(120000);       // 2 minutes for courses/lessons
const quizCache = new Cache(24 * 60 * 60000); // 24 hours for AI-generated quizzes

module.exports = {
  Cache,
  userCache,
  courseCache,
  quizCache
};
