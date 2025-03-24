/**
 * ExecutionPlanner
 * 
 * Plans optimal model invocation strategies based on request
 * requirements, available models, and runtime conditions.
 */

class ExecutionPlanner {
  /**
   * Creates a new ExecutionPlanner instance
   * @param {Object} options - Execution planner options
   */
  constructor(options) {
    this.modelRegistry = options.modelRegistry;
    this.providerRegistry = options.providerRegistry;
    this.providerManager = options.providerManager;
    this.modelSelector = options.modelSelector;
    this.metricsCollector = options.metricsCollector;
    this.config = options.config || {};
    
    // Execution strategies
    this.strategies = {
      standard: this._standardExecutionStrategy.bind(this),
      parallel: this._parallelExecutionStrategy.bind(this),
      redundant: this._redundantExecutionStrategy.bind(this),
      fallback: this._fallbackExecutionStrategy.bind(this)
    };
  }
  
  /**
   * Create an execution plan for a model invocation request
   * @param {Object} request - The model invocation request
   * @param {Object} options - Planning options
   * @returns {Promise<Object>} - The execution plan
   */
  async createPlan(request, options = {}) {
    // Determine the execution strategy
    const strategyName = this._determineStrategy(request, options);
    const strategy = this.strategies[strategyName];
    
    if (!strategy) {
      throw new Error(`Unknown execution strategy: ${strategyName}`);
    }
    
    // Create the execution plan using the selected strategy
    const plan = await strategy(request, options);
    
    // Include metadata in the plan
    plan.metadata = {
      strategy: strategyName,
      timestamp: Date.now(),
      planId: this._generatePlanId(),
      requestId: request.requestId,
      ...plan.metadata
    };
    
    return plan;
  }
  
  /**
   * Determine the appropriate execution strategy based on request
   * @param {Object} request - The model invocation request
   * @param {Object} options - Planning options
   * @returns {string} - The selected strategy name
   * @private
   */
  _determineStrategy(request, options) {
    // Use explicitly requested strategy if provided
    if (options.strategy && this.strategies[options.strategy]) {
      return options.strategy;
    }
    
    // Use strategy from request if provided
    if (request.executionStrategy && this.strategies[request.executionStrategy]) {
      return request.executionStrategy;
    }
    
    // If high reliability is required, use redundant or fallback
    if (request.reliability === 'high' || options.highReliability) {
      // Use redundant if latency is not critical
      if (request.latency !== 'low' && !options.lowLatency) {
        return 'redundant';
      }
      // Otherwise use fallback for balance of reliability and speed
      return 'fallback';
    }
    
    // If low latency is required, consider parallel execution
    if (request.latency === 'low' || options.lowLatency) {
      // Check if request is suitable for parallel execution
      if (this._canExecuteInParallel(request)) {
        return 'parallel';
      }
    }
    
    // Default to standard execution
    return 'standard';
  }
  
  /**
   * Standard execution strategy (single model)
   * @param {Object} request - The model invocation request
   * @param {Object} options - Planning options
   * @returns {Promise<Object>} - The execution plan
   * @private
   */
  async _standardExecutionStrategy(request, options) {
    // Select the model to use
    const model = await this._selectModel(request, options);
    
    // Get the provider for the selected model
    const provider = await this._getProviderForModel(model.id);
    
    // Create the execution plan
    return {
      type: 'standard',
      steps: [
        {
          id: 'primary',
          modelId: model.id,
          providerId: provider.id,
          request
        }
      ],
      primaryStep: 'primary',
      metadata: {
        modelId: model.id,
        providerId: provider.id,
        estimatedTokens: this._estimateTokens(request, model),
        estimatedLatency: model.averageLatencyMs
      }
    };
  }
  
  /**
   * Parallel execution strategy (multiple models in parallel)
   * @param {Object} request - The model invocation request
   * @param {Object} options - Planning options
   * @returns {Promise<Object>} - The execution plan
   * @private
   */
  async _parallelExecutionStrategy(request, options) {
    // Select multiple models for parallel execution
    const models = await this._selectMultipleModels(request, options, 2);
    
    // Create steps for each model
    const steps = [];
    const providers = [];
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const provider = await this._getProviderForModel(model.id);
      
      steps.push({
        id: `parallel_${i}`,
        modelId: model.id,
        providerId: provider.id,
        request
      });
      
      providers.push({
        modelId: model.id,
        providerId: provider.id
      });
    }
    
    // Create the execution plan
    return {
      type: 'parallel',
      steps,
      primaryStep: 'parallel_0', // First model is primary
      selectionStrategy: 'fastest', // Default to using the fastest response
      metadata: {
        models: providers,
        estimatedTokens: this._estimateTokens(request, models[0]) * models.length,
        estimatedLatency: Math.min(...models.map(m => m.averageLatencyMs))
      }
    };
  }
  
  /**
   * Redundant execution strategy (multiple models for verification)
   * @param {Object} request - The model invocation request
   * @param {Object} options - Planning options
   * @returns {Promise<Object>} - The execution plan
   * @private
   */
  async _redundantExecutionStrategy(request, options) {
    // Select multiple models from different providers if possible
    const models = await this._selectDiverseModels(request, options, 3);
    
    // Create steps for each model
    const steps = [];
    const providers = [];
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const provider = await this._getProviderForModel(model.id);
      
      steps.push({
        id: `redundant_${i}`,
        modelId: model.id,
        providerId: provider.id,
        request
      });
      
      providers.push({
        modelId: model.id,
        providerId: provider.id
      });
    }
    
    // Create the execution plan
    return {
      type: 'redundant',
      steps,
      primaryStep: 'redundant_0', // First model is primary
      verificationStrategy: options.verificationStrategy || 'majority', // Default to majority voting
      metadata: {
        models: providers,
        estimatedTokens: this._estimateTokens(request, models[0]) * models.length,
        estimatedLatency: Math.max(...models.map(m => m.averageLatencyMs))
      }
    };
  }
  
  /**
   * Fallback execution strategy (try models in sequence until success)
   * @param {Object} request - The model invocation request
   * @param {Object} options - Planning options
   * @returns {Promise<Object>} - The execution plan
   * @private
   */
  async _fallbackExecutionStrategy(request, options) {
    // Select multiple models from different providers if possible
    const models = await this._selectDiverseModels(request, options, 3);
    
    // Create steps for each model
    const steps = [];
    const providers = [];
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const provider = await this._getProviderForModel(model.id);
      
      steps.push({
        id: `fallback_${i}`,
        modelId: model.id,
        providerId: provider.id,
        request
      });
      
      providers.push({
        modelId: model.id,
        providerId: provider.id
      });
    }
    
    // Create the execution plan
    return {
      type: 'fallback',
      steps,
      primaryStep: 'fallback_0', // First model is primary
      fallbackCondition: options.fallbackCondition || 'error', // Default to fallback on error
      metadata: {
        models: providers,
        estimatedTokens: this._estimateTokens(request, models[0]), // Estimate based on primary model only
        estimatedLatency: this._estimateFallbackLatency(models)
      }
    };
  }
  
  /**
   * Select a model for the request
   * @param {Object} request - The model invocation request
   * @param {Object} options - Selection options
   * @returns {Promise<Object>} - Selected model
   * @private
   */
  async _selectModel(request, options) {
    // If a specific model is requested, use that
    if (request.modelId) {
      const model = await this.modelRegistry.getModel(request.modelId);
      
      if (!model) {
        throw new Error(`Model not found: ${request.modelId}`);
      }
      
      return model;
    }
    
    // Use the model selector to find the best model
    const selector = this._buildSelector(request, options);
    return this.modelSelector.selectModel(selector);
  }
  
  /**
   * Select multiple models for the request
   * @param {Object} request - The model invocation request
   * @param {Object} options - Selection options
   * @param {number} count - Number of models to select
   * @returns {Promise<Array<Object>>} - Selected models
   * @private
   */
  async _selectMultipleModels(request, options, count) {
    // If a specific model is requested, include it
    let models = [];
    
    if (request.modelId) {
      const model = await this.modelRegistry.getModel(request.modelId);
      
      if (!model) {
        throw new Error(`Model not found: ${request.modelId}`);
      }
      
      models.push(model);
      count--;
    }
    
    if (count <= 0) {
      return models;
    }
    
    // Use the model selector to find additional models
    const selector = this._buildSelector(request, {
      ...options,
      count,
      excludeModels: models.map(m => m.id)
    });
    
    const additionalModels = await this.modelSelector.selectMultipleModels(selector);
    return [...models, ...additionalModels];
  }
  
  /**
   * Select diverse models from different providers
   * @param {Object} request - The model invocation request
   * @param {Object} options - Selection options
   * @param {number} count - Number of models to select
   * @returns {Promise<Array<Object>>} - Selected models
   * @private
   */
  async _selectDiverseModels(request, options, count) {
    // If a specific model is requested, include it
    let models = [];
    let providers = new Set();
    
    if (request.modelId) {
      const model = await this.modelRegistry.getModel(request.modelId);
      
      if (!model) {
        throw new Error(`Model not found: ${request.modelId}`);
      }
      
      models.push(model);
      providers.add(model.providerId);
      count--;
    }
    
    if (count <= 0) {
      return models;
    }
    
    // Get all available models matching requirements
    const selector = this._buildSelector(request, options);
    const allAvailableModels = await this.modelSelector.findMatchingModels(selector);
    
    // Group models by provider
    const modelsByProvider = new Map();
    
    for (const model of allAvailableModels) {
      if (!modelsByProvider.has(model.providerId)) {
        modelsByProvider.set(model.providerId, []);
      }
      
      modelsByProvider.get(model.providerId).push(model);
    }
    
    // First try to select models from different providers
    const providerIds = [...modelsByProvider.keys()]
      .filter(id => !providers.has(id));
    
    for (let i = 0; i < Math.min(count, providerIds.length); i++) {
      const providerId = providerIds[i];
      const providerModels = modelsByProvider.get(providerId);
      
      // Select the best model from this provider
      if (providerModels.length > 0) {
        // Sort by quality score and take the best
        providerModels.sort((a, b) => b.qualityScore - a.qualityScore);
        
        models.push(providerModels[0]);
        providers.add(providerId);
        count--;
      }
    }
    
    // If we still need more models, select from already used providers
    if (count > 0) {
      // Flatten and sort remaining models by quality
      const remainingModels = allAvailableModels
        .filter(model => !models.some(m => m.id === model.id))
        .sort((a, b) => b.qualityScore - a.qualityScore);
      
      for (let i = 0; i < Math.min(count, remainingModels.length); i++) {
        models.push(remainingModels[i]);
      }
    }
    
    return models;
  }
  
  /**
   * Get provider for a model
   * @param {string} modelId - Model ID
   * @returns {Promise<Object>} - Provider instance
   * @private
   */
  async _getProviderForModel(modelId) {
    const model = await this.modelRegistry.getModel(modelId);
    
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    const provider = this.providerRegistry.getProvider(model.providerId);
    
    if (!provider) {
      throw new Error(`Provider not found for model: ${modelId}`);
    }
    
    if (!this.providerManager.isProviderHealthy(model.providerId)) {
      throw new Error(`Provider ${model.providerId} is not healthy`);
    }
    
    return provider;
  }
  
  /**
   * Build a model selector object from request
   * @param {Object} request - The model invocation request
   * @param {Object} options - Selection options
   * @returns {Object} - Model selector
   * @private
   */
  _buildSelector(request, options = {}) {
    // Create the selector with required capabilities
    const selector = {
      strategy: options.selectionStrategy || request.selectionStrategy || 'balanced',
      capabilities: []
    };
    
    // Add required capabilities based on request
    if (request.streaming) {
      selector.capabilities.push('streaming');
    }
    
    if (request.functionCalling || (request.functions && request.functions.length > 0)) {
      selector.capabilities.push('function-calling');
    }
    
    if (request.systemMessage) {
      selector.capabilities.push('system-message');
    }
    
    if (request.imageInput || (request.input && request.input.images)) {
      selector.capabilities.push('image-input');
    }
    
    // Add provider preference if specified
    if (request.provider) {
      selector.provider = request.provider;
    }
    
    // Add estimated token requirements if possible
    const estimatedTokens = this._estimateRequestTokens(request);
    
    if (estimatedTokens) {
      selector.minTokens = estimatedTokens;
      
      // Add buffer for response tokens
      if (options.responseBuffer || request.responseBuffer) {
        const buffer = options.responseBuffer || request.responseBuffer;
        selector.minTokens += buffer;
      } else {
        // Default buffer is to double the input token count
        selector.minTokens += estimatedTokens;
      }
    }
    
    return selector;
  }
  
  /**
   * Estimate tokens needed for a request
   * @param {Object} request - The model invocation request
   * @returns {number|null} - Estimated token count or null if not estimable
   * @private
   */
  _estimateRequestTokens(request) {
    // Implement token estimation logic based on request content
    // This is a placeholder for a more sophisticated implementation
    return null;
  }
  
  /**
   * Estimate tokens for a model
   * @param {Object} request - The model invocation request
   * @param {Object} model - The model
   * @returns {number} - Estimated token usage
   * @private
   */
  _estimateTokens(request, model) {
    // Implement more sophisticated token estimation
    // This is a placeholder
    return 1000;
  }
  
  /**
   * Estimate latency for fallback strategy
   * @param {Array<Object>} models - Models in the fallback chain
   * @returns {number} - Estimated latency
   * @private
   */
  _estimateFallbackLatency(models) {
    // Calculate expected latency based on primary model and
    // probability of needing fallbacks
    // This is a simplified calculation
    const primaryLatency = models[0].averageLatencyMs;
    const fallbackProbability = 0.1; // 10% chance of needing fallback
    
    let totalLatency = primaryLatency;
    
    // Add weighted latency of fallbacks
    for (let i = 1; i < models.length; i++) {
      // Each successive fallback is less likely to be needed
      const probability = fallbackProbability * Math.pow(0.5, i - 1);
      totalLatency += models[i].averageLatencyMs * probability;
    }
    
    return totalLatency;
  }
  
  /**
   * Check if request can be executed in parallel
   * @param {Object} request - The model invocation request
   * @returns {boolean} - Whether parallel execution is possible
   * @private
   */
  _canExecuteInParallel(request) {
    // Check if request is deterministic enough for parallel execution
    // This is a placeholder for more sophisticated logic
    return !request.streaming;
  }
  
  /**
   * Generate a unique plan ID
   * @returns {string} - Unique plan ID
   * @private
   */
  _generatePlanId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

module.exports = ExecutionPlanner; 