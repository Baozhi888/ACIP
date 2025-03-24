/**
 * MetricsCollector
 * 
 * Collects and exposes metrics about model invocations, including:
 * - Request counts and latencies
 * - Token usage and costs
 * - Error rates
 * - Provider-specific metrics
 */

class MetricsCollector {
  /**
   * Creates a new MetricsCollector instance
   * @param {Object} config - Metrics configuration
   */
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enabled !== false;
    this.detailedTokenUsage = config.detailedTokenUsage !== false;
    this.retentionPeriodMs = (config.retentionPeriodHours || 24) * 60 * 60 * 1000;
    
    // Initialize metrics storage
    this.resetMetrics();
    
    // Start cleanup timer if enabled
    if (this.enabled && this.retentionPeriodMs > 0) {
      this._startCleanupTimer();
    }
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    // Global counts
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    
    // Detailed metrics with timestamps for time-series analysis
    this.requestMetrics = [];
    
    // Per-provider metrics
    this.providerMetrics = new Map();
    
    // Per-model metrics
    this.modelMetrics = new Map();
    
    // Token usage metrics
    this.tokenUsage = {
      prompt: 0,
      completion: 0,
      total: 0
    };
    
    // Cost metrics (in USD)
    this.costMetrics = {
      total: 0
    };
    
    // Latency metrics (in ms)
    this.latencyMetrics = {
      count: 0,
      total: 0,
      min: Infinity,
      max: 0
    };
    
    // Cache metrics
    this.cacheMetrics = {
      hits: 0,
      misses: 0
    };
    
    // Error metrics
    this.errorMetrics = [];
  }
  
  /**
   * Record the start of a model request
   * @param {Object} data - Request data
   */
  recordRequestStart(data) {
    if (!this.enabled) {
      return;
    }
    
    this.totalRequests++;
    
    // Store request start in detailed metrics
    this.requestMetrics.push({
      requestId: data.requestId,
      model: data.model,
      provider: data.provider,
      startTime: data.timestamp || Date.now(),
      status: 'pending'
    });
  }
  
  /**
   * Record the completion of a model request
   * @param {Object} data - Request completion data
   */
  recordRequestEnd(data) {
    if (!this.enabled) {
      return;
    }
    
    this.successfulRequests++;
    
    // Find the request in detailed metrics and update it
    const requestIndex = this.requestMetrics.findIndex(r => r.requestId === data.requestId);
    if (requestIndex >= 0) {
      const request = this.requestMetrics[requestIndex];
      const duration = data.duration || (data.timestamp - request.startTime);
      
      this.requestMetrics[requestIndex] = {
        ...request,
        endTime: data.timestamp || Date.now(),
        duration,
        status: 'completed',
        tokenUsage: data.tokenUsage
      };
      
      // Update latency metrics
      this._updateLatencyMetrics(duration);
    }
    
    // Update provider metrics
    this._updateProviderMetrics(data.provider, 'success', data);
    
    // Update model metrics
    this._updateModelMetrics(data.model, 'success', data);
    
    // Update token usage if provided
    if (data.tokenUsage) {
      this._updateTokenUsage(data.tokenUsage);
    }
    
    // Update cost metrics if provided
    if (data.cost) {
      this._updateCostMetrics(data.cost, data.provider, data.model);
    }
  }
  
  /**
   * Record a failed model request
   * @param {Object} data - Request failure data
   */
  recordRequestFailure(data) {
    if (!this.enabled) {
      return;
    }
    
    this.failedRequests++;
    
    // Find the request in detailed metrics and update it
    const requestIndex = this.requestMetrics.findIndex(r => r.requestId === data.requestId);
    if (requestIndex >= 0) {
      const request = this.requestMetrics[requestIndex];
      const duration = data.duration || (data.timestamp - request.startTime);
      
      this.requestMetrics[requestIndex] = {
        ...request,
        endTime: data.timestamp || Date.now(),
        duration,
        status: 'failed',
        error: data.error
      };
    }
    
    // Update provider metrics
    this._updateProviderMetrics(data.provider, 'failure', data);
    
    // Update model metrics
    this._updateModelMetrics(data.model, 'failure', data);
    
    // Record error
    this.errorMetrics.push({
      timestamp: data.timestamp || Date.now(),
      requestId: data.requestId,
      provider: data.provider,
      model: data.model,
      error: data.error
    });
  }
  
  /**
   * Record a cache hit
   * @param {Object} data - Cache hit data
   */
  recordCacheHit(data) {
    if (!this.enabled) {
      return;
    }
    
    this.cacheMetrics.hits++;
  }
  
  /**
   * Record a cache miss
   * @param {Object} data - Cache miss data
   */
  recordCacheMiss(data) {
    if (!this.enabled) {
      return;
    }
    
    this.cacheMetrics.misses++;
  }
  
  /**
   * Record an error that is not associated with a specific request
   * @param {Object} data - Error data
   */
  recordError(data) {
    if (!this.enabled) {
      return;
    }
    
    this.errorMetrics.push({
      timestamp: data.timestamp || Date.now(),
      type: data.type || 'general',
      message: data.message,
      details: data.details
    });
  }
  
  /**
   * Get current metrics
   * @param {Object} options - Options for filtering metrics
   * @returns {Object} - Current metrics
   */
  getMetrics(options = {}) {
    const summary = {
      requests: {
        total: this.totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        successRate: this.totalRequests > 0 
          ? this.successfulRequests / this.totalRequests 
          : 0
      },
      tokens: this.tokenUsage,
      latency: {
        averageMs: this.latencyMetrics.count > 0 
          ? this.latencyMetrics.total / this.latencyMetrics.count 
          : 0,
        minMs: this.latencyMetrics.min !== Infinity 
          ? this.latencyMetrics.min 
          : 0,
        maxMs: this.latencyMetrics.max
      },
      costs: this.costMetrics,
      cache: {
        hits: this.cacheMetrics.hits,
        misses: this.cacheMetrics.misses,
        hitRate: (this.cacheMetrics.hits + this.cacheMetrics.misses) > 0 
          ? this.cacheMetrics.hits / (this.cacheMetrics.hits + this.cacheMetrics.misses) 
          : 0
      },
      errors: {
        count: this.errorMetrics.length,
        recent: this.errorMetrics.slice(-5) // Get 5 most recent errors
      }
    };
    
    // Add provider metrics if requested
    if (options.includeProviders) {
      summary.providers = Array.from(this.providerMetrics.entries()).map(([id, metrics]) => ({
        id,
        ...metrics
      }));
    }
    
    // Add model metrics if requested
    if (options.includeModels) {
      summary.models = Array.from(this.modelMetrics.entries()).map(([id, metrics]) => ({
        id,
        ...metrics
      }));
    }
    
    // Add detailed request metrics if requested
    if (options.includeRequests) {
      const limit = options.limit || 100;
      summary.recentRequests = this.requestMetrics
        .filter(r => r.status !== 'pending') // Only completed or failed requests
        .slice(-limit);
    }
    
    return summary;
  }
  
  /**
   * Get metrics for a specific provider
   * @param {string} providerId - Provider ID
   * @returns {Object} - Provider metrics
   */
  getProviderMetrics(providerId) {
    return this.providerMetrics.get(providerId) || {
      requests: 0,
      successful: 0,
      failed: 0,
      averageLatencyMs: 0
    };
  }
  
  /**
   * Get metrics for a specific model
   * @param {string} modelId - Model ID
   * @returns {Object} - Model metrics
   */
  getModelMetrics(modelId) {
    return this.modelMetrics.get(modelId) || {
      requests: 0,
      successful: 0,
      failed: 0,
      averageLatencyMs: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0 }
    };
  }
  
  /**
   * Clean up old metrics data
   * @private
   */
  _cleanupOldMetrics() {
    if (!this.enabled || this.retentionPeriodMs <= 0) {
      return;
    }
    
    const cutoffTime = Date.now() - this.retentionPeriodMs;
    
    // Clean up detailed request metrics
    this.requestMetrics = this.requestMetrics.filter(
      request => request.startTime >= cutoffTime
    );
    
    // Clean up error metrics
    this.errorMetrics = this.errorMetrics.filter(
      error => error.timestamp >= cutoffTime
    );
  }
  
  /**
   * Start a timer to periodically clean up old metrics
   * @private
   */
  _startCleanupTimer() {
    // Run cleanup every hour (adjust as needed)
    const cleanupInterval = 60 * 60 * 1000;
    
    this._cleanupTimer = setInterval(() => {
      this._cleanupOldMetrics();
    }, cleanupInterval);
    
    // Prevent timer from keeping the process alive
    this._cleanupTimer.unref();
  }
  
  /**
   * Update latency metrics with a new duration
   * @param {number} duration - Request duration in ms
   * @private
   */
  _updateLatencyMetrics(duration) {
    this.latencyMetrics.count++;
    this.latencyMetrics.total += duration;
    
    if (duration < this.latencyMetrics.min) {
      this.latencyMetrics.min = duration;
    }
    
    if (duration > this.latencyMetrics.max) {
      this.latencyMetrics.max = duration;
    }
  }
  
  /**
   * Update provider metrics with request result
   * @param {string} providerId - Provider ID
   * @param {string} status - Request status ('success' or 'failure')
   * @param {Object} data - Request data
   * @private
   */
  _updateProviderMetrics(providerId, status, data) {
    if (!providerId) {
      return;
    }
    
    if (!this.providerMetrics.has(providerId)) {
      this.providerMetrics.set(providerId, {
        requests: 0,
        successful: 0,
        failed: 0,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
        latencyTotal: 0
      });
    }
    
    const metrics = this.providerMetrics.get(providerId);
    metrics.requests++;
    
    if (status === 'success') {
      metrics.successful++;
      
      // Update token usage if available
      if (data.tokenUsage) {
        metrics.tokenUsage.prompt += data.tokenUsage.prompt || 0;
        metrics.tokenUsage.completion += data.tokenUsage.completion || 0;
        metrics.tokenUsage.total += data.tokenUsage.total || 0;
      }
      
      // Update cost if available
      if (data.cost) {
        metrics.cost += data.cost;
      }
      
      // Update latency if available
      if (data.duration) {
        metrics.latencyTotal += data.duration;
        metrics.averageLatencyMs = metrics.latencyTotal / metrics.successful;
      }
    } else {
      metrics.failed++;
    }
  }
  
  /**
   * Update model metrics with request result
   * @param {string} modelId - Model ID
   * @param {string} status - Request status ('success' or 'failure')
   * @param {Object} data - Request data
   * @private
   */
  _updateModelMetrics(modelId, status, data) {
    if (!modelId) {
      return;
    }
    
    if (!this.modelMetrics.has(modelId)) {
      this.modelMetrics.set(modelId, {
        requests: 0,
        successful: 0,
        failed: 0,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
        latencyTotal: 0
      });
    }
    
    const metrics = this.modelMetrics.get(modelId);
    metrics.requests++;
    
    if (status === 'success') {
      metrics.successful++;
      
      // Update token usage if available
      if (data.tokenUsage) {
        metrics.tokenUsage.prompt += data.tokenUsage.prompt || 0;
        metrics.tokenUsage.completion += data.tokenUsage.completion || 0;
        metrics.tokenUsage.total += data.tokenUsage.total || 0;
      }
      
      // Update cost if available
      if (data.cost) {
        metrics.cost += data.cost;
      }
      
      // Update latency if available
      if (data.duration) {
        metrics.latencyTotal += data.duration;
        metrics.averageLatencyMs = metrics.latencyTotal / metrics.successful;
      }
    } else {
      metrics.failed++;
    }
  }
  
  /**
   * Update token usage metrics
   * @param {Object} usage - Token usage data
   * @private
   */
  _updateTokenUsage(usage) {
    this.tokenUsage.prompt += usage.prompt || 0;
    this.tokenUsage.completion += usage.completion || 0;
    this.tokenUsage.total += usage.total || 0;
  }
  
  /**
   * Update cost metrics
   * @param {number} cost - Cost in USD
   * @param {string} provider - Provider ID
   * @param {string} model - Model ID
   * @private
   */
  _updateCostMetrics(cost, provider, model) {
    this.costMetrics.total += cost;
    
    // Track cost by provider
    if (provider) {
      if (!this.costMetrics[provider]) {
        this.costMetrics[provider] = 0;
      }
      this.costMetrics[provider] += cost;
    }
    
    // Track cost by model
    if (model) {
      if (!this.costMetrics[model]) {
        this.costMetrics[model] = 0;
      }
      this.costMetrics[model] += cost;
    }
  }
  
  /**
   * Stop the cleanup timer and reset metrics
   */
  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    
    this.resetMetrics();
  }
}

module.exports = MetricsCollector; 