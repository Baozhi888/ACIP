/**
 * CostOptimizer
 * 
 * Manages cost optimization strategies for AI model invocations,
 * including model selection, token usage optimization, and request batching.
 */

const EventEmitter = require('events');

class CostOptimizer {
  /**
   * Creates a new CostOptimizer instance
   * @param {Object} options - Cost optimizer options
   */
  constructor(options = {}) {
    this.modelRegistry = options.modelRegistry;
    this.cacheManager = options.cacheManager;
    this.metricsCollector = options.metricsCollector;
    this.config = options.config || {};
    this.events = new EventEmitter();
    
    // Initialize optimization strategies
    this.strategies = {
      modelSelection: this.config.enableModelSelection !== false,
      tokenOptimization: this.config.enableTokenOptimization !== false,
      batchProcessing: this.config.enableBatchProcessing !== false,
      cacheOptimization: this.config.enableCacheOptimization !== false,
      fallbackModels: this.config.enableFallbackModels !== false
    };
    
    // Set up batch queue
    this.batchQueue = new Map();
    this.batchTimers = new Map();
    this.batchMaxSize = this.config.batchMaxSize || 10;
    this.batchMaxWaitMs = this.config.batchMaxWaitMs || 200;
    
    // Track optimization savings
    this.savings = {
      modelSelection: { requests: 0, tokens: 0, cost: 0 },
      tokenOptimization: { requests: 0, tokens: 0, cost: 0 },
      batchProcessing: { requests: 0, tokens: 0, cost: 0 },
      cacheOptimization: { requests: 0, tokens: 0, cost: 0 },
      fallbackModels: { requests: 0, tokens: 0, cost: 0 },
      total: { requests: 0, tokens: 0, cost: 0 }
    };
    
    // Model tiers for cost-based selection
    this.modelTiers = this.config.modelTiers || {
      economy: [],
      standard: [],
      premium: []
    };
    
    // Initialize model costs if not provided
    this._initializeModelCosts();
  }
  
  /**
   * Optimize a model request before execution
   * @param {Object} request - The original model request
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} - The optimized request
   */
  async optimizeRequest(request, options = {}) {
    if (!request) {
      throw new Error('Request is required for optimization');
    }
    
    // Skip optimization if explicitly disabled
    if (request.skipOptimization) {
      return request;
    }
    
    // Create a copy of the request to optimize
    const originalRequest = { ...request };
    let optimizedRequest = { ...request };
    let optimizationResults = {};
    
    // Apply model selection strategy
    if (this.strategies.modelSelection && !options.skipModelSelection) {
      optimizedRequest = await this._applyModelSelectionStrategy(optimizedRequest, options);
      optimizationResults.modelSelection = {
        originalModelId: originalRequest.modelId,
        optimizedModelId: optimizedRequest.modelId,
        changed: originalRequest.modelId !== optimizedRequest.modelId
      };
    }
    
    // Apply token optimization strategy
    if (this.strategies.tokenOptimization && !options.skipTokenOptimization) {
      optimizedRequest = await this._applyTokenOptimizationStrategy(optimizedRequest, options);
      optimizationResults.tokenOptimization = {
        applied: optimizedRequest.optimizedPrompt !== undefined
      };
    }
    
    // Apply batch processing strategy
    if (this.strategies.batchProcessing && !options.skipBatchProcessing && !request.stream) {
      const batchResult = await this._applyBatchProcessingStrategy(optimizedRequest, options);
      optimizedRequest = batchResult.request;
      optimizationResults.batchProcessing = {
        batched: batchResult.batched,
        batchId: batchResult.batchId,
        batchSize: batchResult.batchSize
      };
    }
    
    // Apply cache strategy
    if (this.strategies.cacheOptimization && !options.skipCacheOptimization && this.cacheManager) {
      const cacheResult = await this._applyCacheOptimizationStrategy(optimizedRequest);
      optimizedRequest = cacheResult.request;
      optimizationResults.cacheOptimization = {
        applied: cacheResult.applied,
        ttlAdjusted: cacheResult.ttlAdjusted
      };
    }
    
    // Mark the request as optimized
    optimizedRequest.optimized = true;
    optimizedRequest.optimizationResults = optimizationResults;
    
    // Emit optimization event
    this.events.emit('request:optimized', {
      requestId: request.requestId,
      originalRequest,
      optimizedRequest,
      optimizationResults,
      timestamp: Date.now()
    });
    
    return optimizedRequest;
  }
  
  /**
   * Register a cost saving from optimization
   * @param {Object} saving - The cost saving to register
   */
  registerSaving(saving) {
    if (!saving || !saving.strategy) {
      return;
    }
    
    const strategy = saving.strategy;
    const tokens = saving.tokens || 0;
    const cost = saving.cost || 0;
    
    // Update strategy-specific savings
    if (this.savings[strategy]) {
      this.savings[strategy].requests += 1;
      this.savings[strategy].tokens += tokens;
      this.savings[strategy].cost += cost;
    }
    
    // Update total savings
    this.savings.total.requests += 1;
    this.savings.total.tokens += tokens;
    this.savings.total.cost += cost;
    
    // Emit savings event
    this.events.emit('saving:registered', {
      strategy,
      tokens,
      cost,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get optimization statistics
   * @param {Object} options - Options for getting stats
   * @returns {Object} - Optimization statistics
   */
  getStatistics(options = {}) {
    // Return copy of savings data
    const stats = {
      savings: JSON.parse(JSON.stringify(this.savings)),
      strategies: { ...this.strategies },
      timestamp: Date.now()
    };
    
    // Add model tier information if requested
    if (options.includeModelTiers) {
      stats.modelTiers = JSON.parse(JSON.stringify(this.modelTiers));
    }
    
    return stats;
  }
  
  /**
   * Update optimization configuration
   * @param {Object} config - New configuration options
   */
  updateConfig(config) {
    if (!config) {
      return;
    }
    
    // Update strategies if provided
    if (config.strategies) {
      this.strategies = {
        ...this.strategies,
        ...config.strategies
      };
    }
    
    // Update model tiers if provided
    if (config.modelTiers) {
      this.modelTiers = {
        ...this.modelTiers,
        ...config.modelTiers
      };
    }
    
    // Update batch settings if provided
    if (config.batchMaxSize) {
      this.batchMaxSize = config.batchMaxSize;
    }
    
    if (config.batchMaxWaitMs) {
      this.batchMaxWaitMs = config.batchMaxWaitMs;
    }
    
    // Emit config updated event
    this.events.emit('config:updated', {
      strategies: this.strategies,
      modelTiers: this.modelTiers,
      batchMaxSize: this.batchMaxSize,
      batchMaxWaitMs: this.batchMaxWaitMs,
      timestamp: Date.now()
    });
  }
  
  /**
   * Reset optimization statistics
   */
  resetStatistics() {
    // Reset all savings counters
    for (const key of Object.keys(this.savings)) {
      this.savings[key] = { requests: 0, tokens: 0, cost: 0 };
    }
    
    // Emit stats reset event
    this.events.emit('stats:reset', {
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
   * Initialize model costs
   * @private
   */
  async _initializeModelCosts() {
    if (!this.modelRegistry) {
      return;
    }
    
    try {
      // Get all models
      const models = await this.modelRegistry.getAllModels();
      
      // Ensure model tiers include cost information
      for (const tier of Object.keys(this.modelTiers)) {
        const modelIds = this.modelTiers[tier];
        const modelsWithCost = [];
        
        for (const modelId of modelIds) {
          const model = models.find(m => m.id === modelId);
          if (model) {
            modelsWithCost.push({
              id: modelId,
              costPerToken: model.costPerToken || 0,
              contextWindow: model.contextWindow,
              capabilities: model.capabilities
            });
          }
        }
        
        // Update tier with cost information
        this.modelTiers[tier] = modelsWithCost;
      }
    } catch (error) {
      console.error('Failed to initialize model costs:', error);
    }
  }
  
  /**
   * Apply model selection strategy to optimize costs
   * @param {Object} request - The model request
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} - The optimized request
   * @private
   */
  async _applyModelSelectionStrategy(request, options) {
    // Skip if model is already specified and we're not allowed to change it
    if (request.modelId && options.preserveModel) {
      return request;
    }
    
    try {
      // Determine required capabilities from the request
      const requiredCapabilities = this._extractRequiredCapabilities(request);
      
      // Determine the target tier based on request properties
      let targetTier = 'standard';
      
      // Use economy tier for simple tasks
      if (this._isSimpleTask(request)) {
        targetTier = 'economy';
      }
      
      // Use premium tier for complex tasks
      if (this._isComplexTask(request)) {
        targetTier = 'premium';
      }
      
      // Override with user preference if specified
      if (request.tier) {
        targetTier = request.tier;
      }
      
      // Find the most cost-effective model in the target tier
      const selectedModel = await this._selectModelFromTier(targetTier, requiredCapabilities);
      
      // If no suitable model found in target tier, try fallback tiers
      if (!selectedModel && targetTier === 'economy') {
        // Try standard tier as fallback
        const fallbackModel = await this._selectModelFromTier('standard', requiredCapabilities);
        if (fallbackModel) {
          request.modelId = fallbackModel.id;
        }
      } else if (selectedModel) {
        request.modelId = selectedModel.id;
      }
      
      return request;
    } catch (error) {
      console.error('Error in model selection strategy:', error);
      return request;
    }
  }
  
  /**
   * Apply token optimization strategy
   * @param {Object} request - The model request
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} - The optimized request
   * @private
   */
  async _applyTokenOptimizationStrategy(request, options) {
    // Optimization techniques depend on the request format
    try {
      if (request.messages && Array.isArray(request.messages)) {
        // Chat completion format
        request = this._optimizeChatMessages(request, options);
      } else if (request.prompt) {
        // Text completion format
        request = this._optimizePrompt(request, options);
      }
      
      return request;
    } catch (error) {
      console.error('Error in token optimization strategy:', error);
      return request;
    }
  }
  
  /**
   * Apply batch processing strategy
   * @param {Object} request - The model request
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} - The optimized request and batch info
   * @private
   */
  async _applyBatchProcessingStrategy(request, options) {
    // Skip if request is not batchable or is streaming
    if (request.stream || options.skipBatching || this.config.disableBatching) {
      return { request, batched: false };
    }
    
    // Check if the request can be batched
    if (!this._isRequestBatchable(request)) {
      return { request, batched: false };
    }
    
    // Create batch key based on model, type
    const batchKey = `${request.modelId}:${request.type || 'default'}`;
    
    // Create a promise to be resolved when the batch is processed
    return new Promise((resolve) => {
      // Create the result handler
      const resultHandler = (batchResult) => {
        const index = batchResult.requests.findIndex(r => r.requestId === request.requestId);
        
        if (index !== -1) {
          // Get this request's result
          const result = batchResult.responses[index];
          
          // Record savings
          this.registerSaving({
            strategy: 'batchProcessing',
            tokens: 0, // Calculate tokens saved
            cost: 0,   // Calculate cost saved
          });
          
          // Resolve with the result
          resolve({
            request: {
              ...request,
              batchId: batchResult.batchId,
              batchSize: batchResult.requests.length,
              batchedResponse: result
            },
            batched: true,
            batchId: batchResult.batchId,
            batchSize: batchResult.requests.length
          });
        }
      };
      
      // Get or create batch queue
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, {
          requests: [],
          handlers: []
        });
      }
      
      const batch = this.batchQueue.get(batchKey);
      
      // Add request to batch
      batch.requests.push(request);
      batch.handlers.push(resultHandler);
      
      // Process the batch if it reaches max size
      if (batch.requests.length >= this.batchMaxSize) {
        this._processBatch(batchKey);
      } else if (!this.batchTimers.has(batchKey)) {
        // Set timer to process the batch after max wait time
        const timerId = setTimeout(() => {
          this._processBatch(batchKey);
        }, this.batchMaxWaitMs);
        
        this.batchTimers.set(batchKey, timerId);
      }
    });
  }
  
  /**
   * Apply cache optimization strategy
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - The optimized request
   * @private
   */
  async _applyCacheOptimizationStrategy(request) {
    // Skip if cache manager is not available or caching is disabled
    if (!this.cacheManager || request.skipCache) {
      return { request, applied: false };
    }
    
    let ttlAdjusted = false;
    
    try {
      // Determine optimal TTL based on request properties
      if (request.cache && !request.cache.ttl) {
        // Analyze request to determine optimal TTL
        const estimatedTTL = this._estimateOptimalCacheTTL(request);
        
        // Only set if we have a reasonable estimate
        if (estimatedTTL > 0) {
          request.cache = request.cache || {};
          request.cache.ttl = estimatedTTL;
          ttlAdjusted = true;
        }
      }
      
      return { request, applied: true, ttlAdjusted };
    } catch (error) {
      console.error('Error in cache optimization strategy:', error);
      return { request, applied: false };
    }
  }
  
  /**
   * Process a batch of requests
   * @param {string} batchKey - The batch key
   * @private
   */
  async _processBatch(batchKey) {
    // Clear any pending timer
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey));
      this.batchTimers.delete(batchKey);
    }
    
    // Get the batch
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.requests.length === 0) {
      return;
    }
    
    // Remove the batch from the queue
    this.batchQueue.delete(batchKey);
    
    // Generate a batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    try {
      // This is a placeholder for actual batch processing logic
      // In a real implementation, this would make a batched API call
      
      // Example mock implementation
      const responses = batch.requests.map(req => {
        return {
          content: `Mock response for request ${req.requestId}`,
          tokenUsage: { prompt: 10, completion: 20, total: 30 }
        };
      });
      
      // Call all handlers with their respective results
      const batchResult = {
        batchId,
        requests: batch.requests,
        responses
      };
      
      // Notify all handlers
      batch.handlers.forEach(handler => handler(batchResult));
      
      // Emit batch processed event
      this.events.emit('batch:processed', {
        batchId,
        requestCount: batch.requests.length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error processing batch:', error);
      
      // Call handlers with error
      batch.handlers.forEach(handler => {
        handler({
          batchId,
          error: error.message,
          requests: batch.requests,
          responses: batch.requests.map(() => ({ error: error.message }))
        });
      });
      
      // Emit batch error event
      this.events.emit('batch:error', {
        batchId,
        error: error.message,
        requestCount: batch.requests.length,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Extract required capabilities from a request
   * @param {Object} request - The model request
   * @returns {Array<string>} - Required capabilities
   * @private
   */
  _extractRequiredCapabilities(request) {
    const capabilities = new Set();
    
    // Add common capabilities based on request type
    if (request.stream) {
      capabilities.add('streaming');
    }
    
    if (request.messages && Array.isArray(request.messages)) {
      capabilities.add('chat');
      
      // Check for specific message types
      const hasImages = request.messages.some(msg => 
        msg.content && Array.isArray(msg.content) && 
        msg.content.some(item => item.type === 'image')
      );
      
      if (hasImages) {
        capabilities.add('vision');
      }
    }
    
    if (request.functions || request.tools) {
      capabilities.add('function-calling');
    }
    
    if (request.requiredCapabilities && Array.isArray(request.requiredCapabilities)) {
      // Add any explicitly required capabilities
      for (const cap of request.requiredCapabilities) {
        capabilities.add(cap);
      }
    }
    
    return Array.from(capabilities);
  }
  
  /**
   * Check if a request represents a simple task
   * @param {Object} request - The model request
   * @returns {boolean} - Whether the task is simple
   * @private
   */
  _isSimpleTask(request) {
    // No complex capabilities needed
    const requiredCapabilities = this._extractRequiredCapabilities(request);
    if (requiredCapabilities.some(cap => ['vision', 'function-calling', 'code'].includes(cap))) {
      return false;
    }
    
    // Short inputs are usually simpler
    if (request.messages && request.messages.length <= 2) {
      return true;
    }
    
    if (request.prompt && typeof request.prompt === 'string' && request.prompt.length < 500) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a request represents a complex task
   * @param {Object} request - The model request
   * @returns {boolean} - Whether the task is complex
   * @private
   */
  _isComplexTask(request) {
    // Check for complex capabilities needed
    const requiredCapabilities = this._extractRequiredCapabilities(request);
    if (requiredCapabilities.some(cap => ['vision', 'function-calling', 'code'].includes(cap))) {
      return true;
    }
    
    // Long conversations or prompts are usually more complex
    if (request.messages && request.messages.length > 10) {
      return true;
    }
    
    if (request.prompt && typeof request.prompt === 'string' && request.prompt.length > 2000) {
      return true;
    }
    
    // If quality is explicitly requested
    if (request.quality === 'high' || request.temperature < 0.3) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Select the most cost-effective model from a tier
   * @param {string} tier - The model tier
   * @param {Array<string>} requiredCapabilities - Required capabilities
   * @returns {Object|null} - Selected model or null
   * @private
   */
  async _selectModelFromTier(tier, requiredCapabilities) {
    if (!this.modelTiers[tier] || !Array.isArray(this.modelTiers[tier])) {
      return null;
    }
    
    // Filter models that have all required capabilities
    const compatibleModels = this.modelTiers[tier].filter(model => {
      if (!model.capabilities) return false;
      
      return requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      );
    });
    
    if (compatibleModels.length === 0) {
      return null;
    }
    
    // Sort by cost per token (ascending)
    compatibleModels.sort((a, b) => 
      (a.costPerToken || 0) - (b.costPerToken || 0)
    );
    
    // Return the cheapest compatible model
    return compatibleModels[0];
  }
  
  /**
   * Optimize chat messages to reduce token usage
   * @param {Object} request - The model request
   * @param {Object} options - Optimization options
   * @returns {Object} - The optimized request
   * @private
   */
  _optimizeChatMessages(request, options) {
    const messages = request.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return request;
    }
    
    // Save original messages
    request.originalMessages = [...messages];
    
    // Apply system message optimization
    if (messages.some(m => m.role === 'system')) {
      // Combine multiple system messages if present
      const systemMessages = messages.filter(m => m.role === 'system');
      if (systemMessages.length > 1) {
        const combinedContent = systemMessages
          .map(m => m.content)
          .filter(Boolean)
          .join('\n\n');
        
        // Replace with a single system message
        request.messages = messages
          .filter(m => m.role !== 'system')
          .concat([{ role: 'system', content: combinedContent }]);
      }
    }
    
    // Apply context window management if needed
    if (options.maxContextLength && messages.length > 3) {
      // This is a simplified version of context management
      // In a real implementation, more sophisticated approaches would be used
      
      // Keep first system message, last N user messages, and assistant responses
      const systemMessage = messages.find(m => m.role === 'system');
      const recentMessages = messages.slice(-options.maxContextLength);
      
      if (systemMessage && !recentMessages.some(m => m.role === 'system')) {
        request.messages = [systemMessage, ...recentMessages];
      } else {
        request.messages = recentMessages;
      }
      
      // Mark as truncated
      request.contextTruncated = true;
    }
    
    return request;
  }
  
  /**
   * Optimize prompt to reduce token usage
   * @param {Object} request - The model request
   * @param {Object} options - Optimization options
   * @returns {Object} - The optimized request
   * @private
   */
  _optimizePrompt(request, options) {
    if (!request.prompt) {
      return request;
    }
    
    // Save original prompt
    request.originalPrompt = request.prompt;
    
    // For text prompts, we could apply various optimizations
    // This is a placeholder for actual prompt optimization logic
    
    // Example: For very long prompts, we might truncate and summarize
    if (typeof request.prompt === 'string' && 
        request.prompt.length > 4000 && 
        options.maxPromptLength) {
      
      // Simply truncate for now - in a real implementation, this would be more sophisticated
      request.optimizedPrompt = request.prompt.substring(0, options.maxPromptLength);
      request.prompt = request.optimizedPrompt;
      request.promptTruncated = true;
    }
    
    return request;
  }
  
  /**
   * Check if a request can be batched
   * @param {Object} request - The model request
   * @returns {boolean} - Whether the request is batchable
   * @private
   */
  _isRequestBatchable(request) {
    // Streaming requests cannot be batched
    if (request.stream) {
      return false;
    }
    
    // Requests with specific requirements may not be batchable
    if (request.nonBatchable) {
      return false;
    }
    
    // Only batch certain types of requests
    if (request.messages && Array.isArray(request.messages)) {
      // Simple chat completions are batchable
      return true;
    }
    
    if (request.prompt && !request.functions && !request.tools) {
      // Simple text completions are batchable
      return true;
    }
    
    return false;
  }
  
  /**
   * Estimate optimal cache TTL based on request properties
   * @param {Object} request - The model request
   * @returns {number} - Estimated TTL in seconds
   * @private
   */
  _estimateOptimalCacheTTL(request) {
    // Default TTL
    let ttl = 3600; // 1 hour
    
    // Factual queries can be cached longer
    if (this._isFactualQuery(request)) {
      ttl = 86400; // 24 hours
    }
    
    // Creative content should be cached for less time
    if (this._isCreativeContent(request)) {
      ttl = 900; // 15 minutes
    }
    
    // Time-sensitive queries should be cached for very short periods
    if (this._isTimeSensitive(request)) {
      ttl = 60; // 1 minute
    }
    
    return ttl;
  }
  
  /**
   * Check if a request is likely a factual query
   * @param {Object} request - The model request
   * @returns {boolean} - Whether the request is likely factual
   * @private
   */
  _isFactualQuery(request) {
    // This is a simplified implementation
    // In a real system, more sophisticated NLP would be used
    
    const content = this._getRequestContent(request);
    if (!content) return false;
    
    // Check for keywords that suggest factual queries
    const factualKeywords = [
      'what is', 'who is', 'when did', 'where is', 
      'how does', 'explain', 'define', 'facts about'
    ];
    
    return factualKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if a request is for creative content
   * @param {Object} request - The model request
   * @returns {boolean} - Whether the request is for creative content
   * @private
   */
  _isCreativeContent(request) {
    // Higher temperature suggests creative content
    if (request.temperature && request.temperature > 0.7) {
      return true;
    }
    
    const content = this._getRequestContent(request);
    if (!content) return false;
    
    // Check for keywords that suggest creative requests
    const creativeKeywords = [
      'generate', 'create', 'write', 'story', 'poem', 
      'creative', 'imagine', 'fiction'
    ];
    
    return creativeKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if a request is time-sensitive
   * @param {Object} request - The model request
   * @returns {boolean} - Whether the request is time-sensitive
   * @private
   */
  _isTimeSensitive(request) {
    const content = this._getRequestContent(request);
    if (!content) return false;
    
    // Check for keywords that suggest time sensitivity
    const timeSensitiveKeywords = [
      'current', 'today', 'now', 'latest', 'recent',
      'weather', 'news', 'stock', 'price'
    ];
    
    return timeSensitiveKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Extract content from a request for analysis
   * @param {Object} request - The model request
   * @returns {string} - Extracted content
   * @private
   */
  _getRequestContent(request) {
    if (request.messages && Array.isArray(request.messages)) {
      // Get the last user message
      const userMessages = request.messages.filter(m => m.role === 'user');
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        return typeof lastUserMessage.content === 'string' 
          ? lastUserMessage.content 
          : '';
      }
    }
    
    if (request.prompt) {
      return typeof request.prompt === 'string' 
        ? request.prompt 
        : Array.isArray(request.prompt) 
          ? request.prompt.join(' ') 
          : '';
    }
    
    return '';
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear all batch timers
    for (const [key, timerId] of this.batchTimers.entries()) {
      clearTimeout(timerId);
    }
    
    this.batchTimers.clear();
    this.batchQueue.clear();
  }
}

module.exports = CostOptimizer; 