/**
 * CacheManager
 * 
 * Manages caching of model responses to optimize repeated invocations.
 * Supports TTL-based expiration and configurable size limits.
 */

const crypto = require('crypto');

class CacheManager {
  /**
   * Creates a new CacheManager instance
   * @param {Object} config - Cache configuration
   */
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.ttlMs = (config.ttlSeconds || 3600) * 1000; // Default to 1 hour TTL
    this.maxEntries = config.maxEntries || 1000;
    this.excludedModels = config.excludeModels || [];
    this.excludedProviders = config.excludeProviders || [];
    
    // Initialize cache storage
    this.cache = new Map();
    this.keyTimestamps = new Map();
    this.keyAccessCount = new Map();
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0
    };
    
    // Start cache cleanup timer
    this._startCleanupTimer();
  }
  
  /**
   * Get a cached response
   * @param {Object} options - Request options used as cache key
   * @returns {Object|null} - Cached response or null if not found/expired
   */
  get(options) {
    if (!this.enabled) {
      return null;
    }
    
    // Skip caching for excluded models and providers
    if (this._shouldSkipCache(options)) {
      return null;
    }
    
    // Generate cache key
    const key = this._generateCacheKey(options);
    
    // Check if key exists in cache
    if (!this.cache.has(key)) {
      this.metrics.misses++;
      return null;
    }
    
    // Get cached entry and check if expired
    const timestamp = this.keyTimestamps.get(key);
    const now = Date.now();
    
    if (now - timestamp > this.ttlMs) {
      // Entry has expired, remove it
      this._removeEntry(key);
      this.metrics.misses++;
      return null;
    }
    
    // Update access count
    this.keyAccessCount.set(key, (this.keyAccessCount.get(key) || 0) + 1);
    
    // Return cached response
    this.metrics.hits++;
    return this.cache.get(key);
  }
  
  /**
   * Store a response in the cache
   * @param {Object} options - Request options used as cache key
   * @param {Object} response - Response to cache
   * @returns {boolean} - Whether the response was cached
   */
  set(options, response) {
    if (!this.enabled || !response) {
      return false;
    }
    
    // Skip caching for excluded models and providers
    if (this._shouldSkipCache(options)) {
      return false;
    }
    
    // Ensure cache doesn't exceed size limit
    if (this.cache.size >= this.maxEntries) {
      this._evictOldestEntry();
    }
    
    // Generate cache key
    const key = this._generateCacheKey(options);
    
    // Store response, timestamp, and initialize access count
    this.cache.set(key, response);
    this.keyTimestamps.set(key, Date.now());
    this.keyAccessCount.set(key, 1);
    
    this.metrics.size = this.cache.size;
    return true;
  }
  
  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    this.keyTimestamps.clear();
    this.keyAccessCount.clear();
    
    this.metrics.size = 0;
    this.metrics.evictions = 0;
  }
  
  /**
   * Invalidate cache entries for a specific model
   * @param {string} modelId - ID of the model to invalidate
   * @returns {number} - Number of entries invalidated
   */
  invalidateModel(modelId) {
    let count = 0;
    
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      // Parse the key to check if it contains the model ID
      try {
        const keyObj = JSON.parse(key);
        if (keyObj.model === modelId) {
          this._removeEntry(key);
          count++;
        }
      } catch (e) {
        // Skip if key can't be parsed
      }
    }
    
    this.metrics.size = this.cache.size;
    return count;
  }
  
  /**
   * Invalidate cache entries for a specific provider
   * @param {string} providerId - ID of the provider to invalidate
   * @returns {number} - Number of entries invalidated
   */
  invalidateProvider(providerId) {
    let count = 0;
    
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      // Parse the key to check if it contains the provider ID
      try {
        const keyObj = JSON.parse(key);
        if (keyObj.provider === providerId || keyObj.model?.startsWith(`${providerId}:`)) {
          this._removeEntry(key);
          count++;
        }
      } catch (e) {
        // Skip if key can't be parsed
      }
    }
    
    this.metrics.size = this.cache.size;
    return count;
  }
  
  /**
   * Get current cache metrics
   * @returns {Object} - Cache metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses || 1)
    };
  }
  
  /**
   * Check if caching should be skipped for this request
   * @param {Object} options - Request options
   * @returns {boolean} - Whether to skip caching
   * @private
   */
  _shouldSkipCache(options) {
    // Skip if explicitly requested
    if (options.skipCache) {
      return true;
    }
    
    // Skip for non-deterministic requests (high temperature)
    if (options.temperature && options.temperature > 0.1) {
      return true;
    }
    
    // Skip for excluded models
    if (options.model) {
      const model = options.model.split(':').pop();
      if (this.excludedModels.includes(model)) {
        return true;
      }
    }
    
    // Skip for excluded providers
    if (options.provider && this.excludedProviders.includes(options.provider)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate a cache key from request options
   * @param {Object} options - Request options
   * @returns {string} - Cache key
   * @private
   */
  _generateCacheKey(options) {
    // Create a copy of options with only cacheable properties
    const cacheableOptions = {
      model: options.model,
      provider: options.provider,
      messages: options.messages,
      prompt: options.prompt,
      input: options.input,
      temperature: options.temperature,
      topP: options.topP,
      maxTokens: options.maxTokens,
      functions: options.functions,
      tools: options.tools
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(cacheableOptions);
    
    // Hash the string for shorter keys
    return crypto.createHash('md5').update(jsonString).digest('hex');
  }
  
  /**
   * Remove an entry from the cache
   * @param {string} key - Cache key to remove
   * @private
   */
  _removeEntry(key) {
    this.cache.delete(key);
    this.keyTimestamps.delete(key);
    this.keyAccessCount.delete(key);
    
    this.metrics.size = this.cache.size;
  }
  
  /**
   * Evict the oldest or least used entry from the cache
   * @private
   */
  _evictOldestEntry() {
    if (this.cache.size === 0) {
      return;
    }
    
    // Find the entry with the oldest timestamp
    let oldestKey = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this._removeEntry(oldestKey);
      this.metrics.evictions++;
    }
  }
  
  /**
   * Start a timer to periodically clean up expired entries
   * @private
   */
  _startCleanupTimer() {
    // Run cleanup every 5 minutes (adjust as needed)
    const cleanupInterval = 5 * 60 * 1000;
    
    this._cleanupTimer = setInterval(() => {
      this._cleanupExpiredEntries();
    }, cleanupInterval);
    
    // Prevent timer from keeping the process alive
    this._cleanupTimer.unref();
  }
  
  /**
   * Clean up expired entries from the cache
   * @private
   */
  _cleanupExpiredEntries() {
    const now = Date.now();
    let count = 0;
    
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (now - timestamp > this.ttlMs) {
        this._removeEntry(key);
        count++;
      }
    }
    
    this.metrics.size = this.cache.size;
  }
  
  /**
   * Stop the cleanup timer
   */
  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    
    this.clear();
  }
}

module.exports = CacheManager; 