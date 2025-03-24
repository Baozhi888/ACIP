/**
 * RateLimiter
 * 
 * Manages rate limiting, quota tracking, and usage limits for model invocations,
 * providing governance over API usage at user, application, and system levels.
 */

const EventEmitter = require('events');

class RateLimiter {
  /**
   * Creates a new RateLimiter instance
   * @param {Object} options - Rate limiter options
   */
  constructor(options = {}) {
    this.config = options.config || {};
    this.metricsCollector = options.metricsCollector;
    this.events = new EventEmitter();
    
    // Rate limiting windows and storage
    this.windowSizes = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    
    // Set default limits if not specified
    this.defaultLimits = this.config.defaultLimits || {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      tokensPerDay: 1000000
    };
    
    // Initialize storage for tracking requests and token usage
    this.requestStorage = new Map();
    this.tokenStorage = new Map();
    this.userQuotas = new Map();
    
    // Regularly cleanup old entries
    this._startCleanupTimer();
  }
  
  /**
   * Check if a request is allowed based on rate limits
   * @param {Object} request - The request to check
   * @returns {Promise<Object>} - Result with allowed status and limits info
   */
  async checkRateLimit(request) {
    if (!request) {
      throw new Error('Request is required');
    }
    
    // Extract identifiers for rate limiting
    const userId = this._extractUserId(request);
    const appId = this._extractAppId(request);
    const modelId = request.modelId;
    
    // Skip rate limiting if configured to do so
    if (this.config.disableRateLimiting || request.skipRateLimiting) {
      return {
        allowed: true,
        userId,
        appId,
        modelId,
        limits: {},
        timestamp: Date.now()
      };
    }
    
    // Get applicable limits
    const limits = this._getLimits(userId, appId, modelId);
    
    // Check against all configured limits
    const limitResults = {};
    let allowed = true;
    let blockingLimit = null;
    
    for (const [limitKey, limitValue] of Object.entries(limits)) {
      if (!limitValue) continue;
      
      const [type, window] = limitKey.split('Per');
      if (!type || !window || !this.windowSizes[window.toLowerCase()]) {
        continue;
      }
      
      // Convert window name to lowercase (minutesPerDay -> day)
      const windowSize = this.windowSizes[window.toLowerCase()];
      
      // Check this specific limit
      const limitResult = await this._checkSpecificLimit(
        userId, 
        appId,
        modelId,
        type,
        windowSize,
        limitValue,
        limitKey
      );
      
      limitResults[limitKey] = limitResult;
      
      // If any limit is exceeded, the request is not allowed
      if (!limitResult.allowed) {
        allowed = false;
        if (!blockingLimit || limitResult.remaining < blockingLimit.remaining) {
          blockingLimit = limitResult;
        }
      }
    }
    
    // Create result object
    const result = {
      allowed,
      userId,
      appId,
      modelId,
      limits: limitResults,
      timestamp: Date.now()
    };
    
    // Add reset times if not allowed
    if (!allowed && blockingLimit) {
      result.resetAt = blockingLimit.resetAt;
      result.resetIn = blockingLimit.resetIn;
      result.limitExceeded = blockingLimit.limitKey;
    }
    
    // Emit rate limit event
    this.events.emit('ratelimit:checked', {
      userId,
      appId,
      modelId,
      allowed,
      limits: limitResults,
      timestamp: result.timestamp
    });
    
    // If not allowed, emit limit exceeded event
    if (!allowed) {
      this.events.emit('ratelimit:exceeded', {
        userId,
        appId,
        modelId,
        limitExceeded: result.limitExceeded,
        resetAt: result.resetAt,
        timestamp: result.timestamp
      });
    }
    
    return result;
  }
  
  /**
   * Record token usage for a request
   * @param {Object} request - The original request
   * @param {Object} response - The response containing token usage
   * @returns {Promise<Object>} - Updated quota information
   */
  async recordTokenUsage(request, response) {
    if (!request || !response) {
      return;
    }
    
    // Extract identifiers
    const userId = this._extractUserId(request);
    const appId = this._extractAppId(request);
    const modelId = request.modelId;
    
    // Extract token usage from response
    const tokenUsage = this._extractTokenUsage(response);
    if (!tokenUsage || tokenUsage.total === 0) {
      return;
    }
    
    // Get current time
    const now = Date.now();
    
    // Record token usage for each time window
    for (const [windowName, windowSize] of Object.entries(this.windowSizes)) {
      // Create unique keys for each entity and window
      const userKey = `${userId}:tokens:${windowName}`;
      const appKey = `${appId}:tokens:${windowName}`;
      const modelKey = `${modelId}:tokens:${windowName}`;
      
      // Get window start time
      const windowStart = now - windowSize;
      
      // Update token usage for user
      this._updateTokenUsage(userKey, windowStart, tokenUsage, now);
      
      // Update token usage for app
      if (appId) {
        this._updateTokenUsage(appKey, windowStart, tokenUsage, now);
      }
      
      // Update token usage for model
      if (modelId) {
        this._updateTokenUsage(modelKey, windowStart, tokenUsage, now);
      }
    }
    
    // Update quota usage
    if (userId) {
      await this._updateQuotaUsage(userId, tokenUsage);
    }
    
    // Emit token usage event
    this.events.emit('tokens:recorded', {
      userId,
      appId,
      modelId,
      tokens: tokenUsage,
      timestamp: now
    });
    
    // Return updated usage info
    return {
      userId,
      usage: this.getUserUsage(userId)
    };
  }
  
  /**
   * Record a request for rate limiting
   * @param {Object} request - The request to record
   * @returns {Promise<void>}
   */
  async recordRequest(request) {
    if (!request) {
      return;
    }
    
    // Extract identifiers
    const userId = this._extractUserId(request);
    const appId = this._extractAppId(request);
    const modelId = request.modelId;
    
    // Get current time
    const now = Date.now();
    
    // Record request for each time window
    for (const [windowName, windowSize] of Object.entries(this.windowSizes)) {
      // Create unique keys for each entity and window
      const userKey = `${userId}:requests:${windowName}`;
      const appKey = `${appId}:requests:${windowName}`;
      const modelKey = `${modelId}:requests:${windowName}`;
      
      // Get window start time
      const windowStart = now - windowSize;
      
      // Update request counts
      this._updateRequestCount(userKey, windowStart, now);
      
      if (appId) {
        this._updateRequestCount(appKey, windowStart, now);
      }
      
      if (modelId) {
        this._updateRequestCount(modelKey, windowStart, now);
      }
    }
    
    // Emit request recorded event
    this.events.emit('request:recorded', {
      userId,
      appId,
      modelId,
      timestamp: now
    });
  }
  
  /**
   * Get usage statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} - User usage statistics
   */
  getUserUsage(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const usage = {
      requests: {},
      tokens: {}
    };
    
    // Get request counts for all windows
    for (const [windowName, windowSize] of Object.entries(this.windowSizes)) {
      const requestKey = `${userId}:requests:${windowName}`;
      const tokenKey = `${userId}:tokens:${windowName}`;
      
      // Get window start time
      const windowStart = Date.now() - windowSize;
      
      // Get request count
      const requestCount = this._getCountInWindow(requestKey, windowStart);
      usage.requests[windowName] = requestCount;
      
      // Get token usage
      const tokenUsage = this._getTokensInWindow(tokenKey, windowStart);
      usage.tokens[windowName] = tokenUsage;
    }
    
    // Add quota information if available
    const quota = this.userQuotas.get(userId);
    if (quota) {
      usage.quota = quota;
    }
    
    return usage;
  }
  
  /**
   * Set a quota for a user
   * @param {string} userId - User ID
   * @param {Object} quota - Quota configuration
   * @returns {Object} - Updated quota
   */
  setUserQuota(userId, quota) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!quota) {
      throw new Error('Quota configuration is required');
    }
    
    // Get existing quota or create new one
    const existingQuota = this.userQuotas.get(userId) || {
      tokensTotal: 0,
      tokensUsed: 0,
      tokensRemaining: 0,
      refreshDate: null
    };
    
    // Update quota
    const newQuota = {
      ...existingQuota,
      ...quota
    };
    
    // Calculate remaining tokens
    newQuota.tokensRemaining = newQuota.tokensTotal - newQuota.tokensUsed;
    
    // Store quota
    this.userQuotas.set(userId, newQuota);
    
    // Emit quota updated event
    this.events.emit('quota:updated', {
      userId,
      quota: newQuota,
      timestamp: Date.now()
    });
    
    return newQuota;
  }
  
  /**
   * Reset usage for a user
   * @param {string} userId - User ID
   * @returns {boolean} - Whether the reset was successful
   */
  resetUserUsage(userId) {
    if (!userId) {
      return false;
    }
    
    // Delete all user-related entries
    for (const [key, value] of this.requestStorage.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.requestStorage.delete(key);
      }
    }
    
    for (const [key, value] of this.tokenStorage.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.tokenStorage.delete(key);
      }
    }
    
    // Reset quota usage if exists
    const quota = this.userQuotas.get(userId);
    if (quota) {
      quota.tokensUsed = 0;
      quota.tokensRemaining = quota.tokensTotal;
      this.userQuotas.set(userId, quota);
    }
    
    // Emit usage reset event
    this.events.emit('usage:reset', {
      userId,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * Get all current rate limits for a given user/app/model combination
   * @param {string} userId - User ID
   * @param {string} appId - Application ID
   * @param {string} modelId - Model ID
   * @returns {Object} - Current limits configuration
   */
  getLimits(userId, appId, modelId) {
    return this._getLimits(userId, appId, modelId);
  }
  
  /**
   * Update rate limits configuration
   * @param {Object} limits - New limits configuration
   */
  updateLimits(limits) {
    if (limits.defaultLimits) {
      this.defaultLimits = {
        ...this.defaultLimits,
        ...limits.defaultLimits
      };
    }
    
    // Emit limits updated event
    this.events.emit('limits:updated', {
      limits: this.defaultLimits,
      timestamp: Date.now()
    });
  }
  
  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.events.on(event, handler);
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.events.off(event, handler);
  }
  
  /**
   * Extract user ID from request
   * @param {Object} request - Request object
   * @returns {string} - User ID or default value
   * @private
   */
  _extractUserId(request) {
    // Check various locations for user ID
    const userId = request.userId || 
      request.user?.id || 
      request.auth?.userId ||
      request.context?.userId ||
      'anonymous';
    
    return userId;
  }
  
  /**
   * Extract application ID from request
   * @param {Object} request - Request object
   * @returns {string} - Application ID or default value
   * @private
   */
  _extractAppId(request) {
    // Check various locations for app ID
    const appId = request.appId || 
      request.application?.id || 
      request.auth?.appId ||
      request.context?.appId ||
      'default';
    
    return appId;
  }
  
  /**
   * Extract token usage from response
   * @param {Object} response - Response object
   * @returns {Object} - Token usage information
   * @private
   */
  _extractTokenUsage(response) {
    if (!response) {
      return { prompt: 0, completion: 0, total: 0 };
    }
    
    // Check various locations for token usage
    let tokenUsage = response.tokenUsage || 
      response.usage || 
      response.tokens ||
      {};
    
    // Ensure all properties exist
    return {
      prompt: tokenUsage.prompt || tokenUsage.input || 0,
      completion: tokenUsage.completion || tokenUsage.output || 0,
      total: tokenUsage.total || (tokenUsage.prompt || 0) + (tokenUsage.completion || 0)
    };
  }
  
  /**
   * Get applicable limits for a user/app/model combination
   * @param {string} userId - User ID
   * @param {string} appId - Application ID
   * @param {string} modelId - Model ID
   * @returns {Object} - Applicable limits
   * @private
   */
  _getLimits(userId, appId, modelId) {
    // Start with default limits
    const limits = { ...this.defaultLimits };
    
    // Override with user-specific limits if available
    if (userId && this.config.userLimits && this.config.userLimits[userId]) {
      Object.assign(limits, this.config.userLimits[userId]);
    }
    
    // Override with app-specific limits if available
    if (appId && this.config.appLimits && this.config.appLimits[appId]) {
      Object.assign(limits, this.config.appLimits[appId]);
    }
    
    // Override with model-specific limits if available
    if (modelId && this.config.modelLimits && this.config.modelLimits[modelId]) {
      Object.assign(limits, this.config.modelLimits[modelId]);
    }
    
    return limits;
  }
  
  /**
   * Check a specific rate limit
   * @param {string} userId - User ID
   * @param {string} appId - Application ID
   * @param {string} modelId - Model ID
   * @param {string} type - Limit type (requests, tokens)
   * @param {number} windowSize - Window size in milliseconds
   * @param {number} limitValue - Maximum allowed value
   * @param {string} limitKey - Key identifying this limit
   * @returns {Object} - Limit check result
   * @private
   */
  async _checkSpecificLimit(userId, appId, modelId, type, windowSize, limitValue, limitKey) {
    // Get window start time
    const now = Date.now();
    const windowStart = now - windowSize;
    
    // Check what values to use based on limit type
    let currentValue = 0;
    
    if (type.toLowerCase() === 'requests') {
      // Check request count for user
      const userKey = `${userId}:requests:${windowSize}`;
      currentValue = this._getCountInWindow(userKey, windowStart);
      
    } else if (type.toLowerCase() === 'tokens') {
      // Check token usage for user
      const userKey = `${userId}:tokens:${windowSize}`;
      const tokenUsage = this._getTokensInWindow(userKey, windowStart);
      currentValue = tokenUsage.total;
      
      // Also check quota if applicable
      const quota = this.userQuotas.get(userId);
      if (quota && quota.tokensRemaining !== undefined) {
        // Create a second limit check for quota
        const quotaCheck = {
          allowed: quota.tokensRemaining > 0,
          current: quota.tokensUsed,
          limit: quota.tokensTotal,
          remaining: quota.tokensRemaining,
          resetAt: quota.refreshDate || null,
          resetIn: quota.refreshDate ? quota.refreshDate - now : null,
          limitKey: 'quotaTokens'
        };
        
        // If quota is more restrictive, return that instead
        if (!quotaCheck.allowed) {
          return quotaCheck;
        }
      }
    }
    
    // Calculate next reset time
    const resetAt = windowStart + windowSize;
    const resetIn = resetAt - now;
    
    // Check if limit is exceeded
    const allowed = currentValue < limitValue;
    
    return {
      allowed,
      current: currentValue,
      limit: limitValue,
      remaining: limitValue - currentValue,
      resetAt,
      resetIn,
      limitKey
    };
  }
  
  /**
   * Update request count in storage
   * @param {string} key - Storage key
   * @param {number} windowStart - Window start timestamp
   * @param {number} timestamp - Request timestamp
   * @private
   */
  _updateRequestCount(key, windowStart, timestamp) {
    // Get existing requests or create new array
    const requests = this.requestStorage.get(key) || [];
    
    // Filter out requests outside the window
    const filteredRequests = requests.filter(t => t >= windowStart);
    
    // Add new request timestamp
    filteredRequests.push(timestamp);
    
    // Store updated requests
    this.requestStorage.set(key, filteredRequests);
  }
  
  /**
   * Update token usage in storage
   * @param {string} key - Storage key
   * @param {number} windowStart - Window start timestamp
   * @param {Object} tokenUsage - Token usage to record
   * @param {number} timestamp - Request timestamp
   * @private
   */
  _updateTokenUsage(key, windowStart, tokenUsage, timestamp) {
    // Get existing token usage or create new array
    const usages = this.tokenStorage.get(key) || [];
    
    // Filter out usages outside the window
    const filteredUsages = usages.filter(u => u.timestamp >= windowStart);
    
    // Add new token usage
    filteredUsages.push({
      prompt: tokenUsage.prompt,
      completion: tokenUsage.completion,
      total: tokenUsage.total,
      timestamp
    });
    
    // Store updated usages
    this.tokenStorage.set(key, filteredUsages);
  }
  
  /**
   * Update quota usage for a user
   * @param {string} userId - User ID
   * @param {Object} tokenUsage - Token usage to record
   * @returns {Object|null} - Updated quota or null if no quota exists
   * @private
   */
  _updateQuotaUsage(userId, tokenUsage) {
    // Get user quota if exists
    const quota = this.userQuotas.get(userId);
    if (!quota) {
      return null;
    }
    
    // Update token usage
    quota.tokensUsed += tokenUsage.total;
    quota.tokensRemaining = Math.max(0, quota.tokensTotal - quota.tokensUsed);
    
    // Store updated quota
    this.userQuotas.set(userId, quota);
    
    // Check if quota has been exceeded
    if (quota.tokensRemaining <= 0) {
      // Emit quota exceeded event
      this.events.emit('quota:exceeded', {
        userId,
        quota,
        timestamp: Date.now()
      });
    }
    
    return quota;
  }
  
  /**
   * Get count of requests in a time window
   * @param {string} key - Storage key
   * @param {number} windowStart - Window start timestamp
   * @returns {number} - Count of requests in window
   * @private
   */
  _getCountInWindow(key, windowStart) {
    const requests = this.requestStorage.get(key) || [];
    return requests.filter(t => t >= windowStart).length;
  }
  
  /**
   * Get token usage in a time window
   * @param {string} key - Storage key
   * @param {number} windowStart - Window start timestamp
   * @returns {Object} - Token usage in window
   * @private
   */
  _getTokensInWindow(key, windowStart) {
    const usages = this.tokenStorage.get(key) || [];
    const filteredUsages = usages.filter(u => u.timestamp >= windowStart);
    
    // Sum up usage
    return filteredUsages.reduce((sum, item) => {
      return {
        prompt: sum.prompt + (item.prompt || 0),
        completion: sum.completion + (item.completion || 0),
        total: sum.total + (item.total || 0)
      };
    }, { prompt: 0, completion: 0, total: 0 });
  }
  
  /**
   * Start cleanup timer to remove old entries
   * @private
   */
  _startCleanupTimer() {
    // Run cleanup every hour
    const cleanupInterval = 60 * 60 * 1000;
    
    this._cleanupTimer = setInterval(() => {
      this._cleanupStorage();
    }, cleanupInterval);
    
    // Prevent timer from keeping process alive
    this._cleanupTimer.unref();
  }
  
  /**
   * Clean up old entries from storage
   * @private
   */
  _cleanupStorage() {
    const now = Date.now();
    const oldestWindow = Math.max(...Object.values(this.windowSizes));
    const cutoff = now - oldestWindow;
    
    // Clean up request storage
    for (const [key, timestamps] of this.requestStorage.entries()) {
      const filteredTimestamps = timestamps.filter(t => t >= cutoff);
      
      if (filteredTimestamps.length === 0) {
        // Remove empty entries
        this.requestStorage.delete(key);
      } else if (filteredTimestamps.length < timestamps.length) {
        // Update with filtered timestamps
        this.requestStorage.set(key, filteredTimestamps);
      }
    }
    
    // Clean up token storage
    for (const [key, usages] of this.tokenStorage.entries()) {
      const filteredUsages = usages.filter(u => u.timestamp >= cutoff);
      
      if (filteredUsages.length === 0) {
        // Remove empty entries
        this.tokenStorage.delete(key);
      } else if (filteredUsages.length < usages.length) {
        // Update with filtered usages
        this.tokenStorage.set(key, filteredUsages);
      }
    }
  }
  
  /**
   * Clean up and stop timers
   */
  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
}

module.exports = RateLimiter; 