/**
 * RequestRouter
 * 
 * Routes model invocation requests to the appropriate provider based on
 * model selection criteria and provider availability.
 */

const EventEmitter = require('events');
const ModelSelector = require('./ModelSelector');
const { parseModelId } = require('../utils/identifiers');

class RequestRouter extends EventEmitter {
  /**
   * Creates a new RequestRouter instance
   * @param {Object} options - Router options
   */
  constructor(options) {
    super();
    this.modelRegistry = options.modelRegistry;
    this.providerRegistry = options.providerRegistry;
    this.config = options.config;
    this.modelSelector = new ModelSelector({ 
      modelRegistry: this.modelRegistry,
      config: this.config
    });
    this.activeRequests = new Map();
  }
  
  /**
   * Route a request to the appropriate provider
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - The model response
   */
  async routeRequest(request) {
    try {
      // Track request start time
      const startTime = Date.now();
      
      // Emit request started event
      this.emit('requestStarted', {
        requestId: request.requestId,
        model: request.model,
        provider: request.provider,
        timestamp: startTime
      });
      
      // Track active request
      this.activeRequests.set(request.requestId, request);
      
      // Determine which model to use based on request
      const model = await this._selectModel(request);
      
      // Get the provider for the selected model
      const provider = this._getProviderForModel(model.id);
      
      if (!provider) {
        throw new Error(`No provider available for model ${model.id}`);
      }
      
      // Execute the request with the selected provider
      const finalRequest = {
        ...request,
        model: model.id,
        provider: provider.name,
        requestedModel: request.model
      };
      
      const response = await provider.invokeModel(finalRequest);
      
      // Calculate request duration
      const duration = Date.now() - startTime;
      
      // Remove from active requests
      this.activeRequests.delete(request.requestId);
      
      // Emit request completed event
      this.emit('requestCompleted', {
        requestId: request.requestId,
        model: model.id,
        provider: provider.name,
        timestamp: Date.now(),
        duration
      });
      
      return response;
    } catch (error) {
      // Remove from active requests
      this.activeRequests.delete(request.requestId);
      
      // Emit request failed event
      this.emit('requestFailed', {
        requestId: request.requestId,
        model: request.model,
        provider: request.provider,
        timestamp: Date.now(),
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Cancel an ongoing request
   * @param {string} requestId - ID of the request to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelRequest(requestId) {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return false;
    }
    
    const model = request.model;
    
    // If no model specified yet, just remove from active requests
    if (!model) {
      this.activeRequests.delete(requestId);
      return true;
    }
    
    // Get the provider for the model
    const provider = this._getProviderForModel(model);
    
    if (!provider) {
      this.activeRequests.delete(requestId);
      return false;
    }
    
    // Ask the provider to cancel the request
    const cancelled = provider.cancelRequest(requestId);
    
    if (cancelled) {
      this.activeRequests.delete(requestId);
    }
    
    return cancelled;
  }
  
  /**
   * Select the appropriate model based on request criteria
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - The selected model
   * @private
   */
  async _selectModel(request) {
    // If selector provided, use the model selector
    if (request.selector) {
      const selectedModel = await this.modelSelector.selectModel(request.selector);
      
      if (!selectedModel) {
        throw new Error('No suitable model found for the requested criteria');
      }
      
      return selectedModel;
    }
    
    // If explicit model ID provided
    if (request.model) {
      // Check if the model exists in the registry
      const model = this.modelRegistry.getModel(request.model);
      
      if (model) {
        return model;
      }
      
      // If not in registry, check if it's a provider-prefixed model
      if (request.model.includes(':')) {
        return {
          id: request.model,
          providerId: parseModelId(request.model).provider
        };
      }
      
      // If provider specified, use provider + model combination
      if (request.provider) {
        return {
          id: `${request.provider}:${request.model}`,
          providerId: request.provider
        };
      }
      
      // Fall back to default provider
      const defaultProvider = this.config.defaults.provider;
      return {
        id: `${defaultProvider}:${request.model}`,
        providerId: defaultProvider
      };
    }
    
    // If no model specified, use default
    const defaultProvider = this.config.defaults.provider;
    const defaultModel = this.config.providers[defaultProvider]?.defaultModel;
    
    if (!defaultModel) {
      throw new Error('No model specified and no default model configured');
    }
    
    return {
      id: `${defaultProvider}:${defaultModel}`,
      providerId: defaultProvider
    };
  }
  
  /**
   * Get the provider for a model
   * @param {string} modelId - The model ID
   * @returns {Object} - The provider for the model
   * @private
   */
  _getProviderForModel(modelId) {
    let providerId;
    
    // If modelId is an object with providerId, use that
    if (typeof modelId === 'object' && modelId.providerId) {
      providerId = modelId.providerId;
      modelId = modelId.id;
    } else {
      // Parse the model ID to get provider
      const parsed = parseModelId(modelId);
      providerId = parsed.provider;
    }
    
    // Get the provider
    const provider = this.providerRegistry.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found for model ${modelId}`);
    }
    
    if (!provider.enabled) {
      throw new Error(`Provider ${providerId} is disabled`);
    }
    
    return provider;
  }
}

module.exports = RequestRouter; 