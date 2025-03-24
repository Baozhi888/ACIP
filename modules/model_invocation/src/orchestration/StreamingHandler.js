/**
 * StreamingHandler
 * 
 * Handles streaming responses from model providers and provides
 * a unified interface for consuming streaming content.
 */

const EventEmitter = require('events');
const { parseModelId } = require('../utils/identifiers');

class StreamingHandler extends EventEmitter {
  /**
   * Creates a new StreamingHandler instance
   * @param {Object} options - Handler options
   */
  constructor(options) {
    super();
    this.modelRegistry = options.modelRegistry;
    this.providerRegistry = options.providerRegistry;
    this.config = options.config;
    this.activeStreams = new Map();
  }
  
  /**
   * Start a streaming session with a model
   * @param {Object} request - The model request
   * @returns {EventEmitter} - An event emitter for consuming the stream
   */
  async streamRequest(request) {
    // Create a stream-specific event emitter that will be returned to the caller
    const streamEmitter = new EventEmitter();
    
    try {
      // Track request start time
      const startTime = Date.now();
      
      // Determine which model to use
      const modelInfo = await this._resolveModel(request);
      
      // Get the provider for the selected model
      const provider = this._getProviderForModel(modelInfo);
      
      if (!provider) {
        throw new Error(`No provider available for model ${modelInfo.id}`);
      }
      
      // Check if streaming is supported
      if (!provider.supportsFeature('streaming')) {
        throw new Error(`Provider ${provider.name} does not support streaming for model ${modelInfo.id}`);
      }
      
      // Execute the streaming request with the selected provider
      const finalRequest = {
        ...request,
        model: modelInfo.id,
        provider: provider.name,
        requestedModel: request.model
      };
      
      // Emit request started event internally
      this.emit('streamStarted', {
        requestId: request.requestId,
        model: modelInfo.id,
        provider: provider.name,
        timestamp: startTime
      });
      
      // Store the stream in active streams
      this.activeStreams.set(request.requestId, {
        emitter: streamEmitter,
        provider,
        startTime,
        model: modelInfo.id
      });
      
      // Start the streaming process with the provider
      const providerStream = await provider.invokeModelStream(finalRequest);
      
      // Forward events from provider stream to our streamEmitter
      providerStream.on('data', (data) => {
        streamEmitter.emit('data', data);
      });
      
      providerStream.on('error', (error) => {
        streamEmitter.emit('error', error);
        this._cleanupStream(request.requestId, error);
      });
      
      providerStream.on('end', () => {
        const duration = Date.now() - startTime;
        
        streamEmitter.emit('end', {
          requestId: request.requestId,
          model: modelInfo.id,
          provider: provider.name,
          duration
        });
        
        this._cleanupStream(request.requestId);
      });
      
      // Also store the provider stream for cancellation purposes
      this.activeStreams.get(request.requestId).providerStream = providerStream;
      
      return streamEmitter;
    } catch (error) {
      // Clean up if we've created an entry but then had an error
      this._cleanupStream(request.requestId, error);
      
      // Emit error on the stream emitter
      streamEmitter.emit('error', error);
      
      // Also throw the error for the caller
      throw error;
    }
  }
  
  /**
   * Cancel an active streaming request
   * @param {string} requestId - ID of the request to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelStream(requestId) {
    const stream = this.activeStreams.get(requestId);
    if (!stream) {
      return false;
    }
    
    const { provider } = stream;
    
    // Ask the provider to cancel the request
    const cancelled = provider.cancelRequest(requestId);
    
    if (cancelled) {
      this._cleanupStream(requestId, new Error('Stream cancelled by user'));
    }
    
    return cancelled;
  }
  
  /**
   * Clean up a stream after completion or error
   * @param {string} requestId - ID of the stream to clean up
   * @param {Error} [error] - Optional error that caused the cleanup
   * @private
   */
  _cleanupStream(requestId, error) {
    const stream = this.activeStreams.get(requestId);
    if (!stream) {
      return;
    }
    
    const { startTime, model, provider } = stream;
    
    // Remove from active streams
    this.activeStreams.delete(requestId);
    
    // Emit stream ended event internally
    if (error) {
      this.emit('streamFailed', {
        requestId,
        model,
        provider: typeof provider === 'object' ? provider.name : provider,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        error: error.message
      });
    } else {
      this.emit('streamCompleted', {
        requestId,
        model,
        provider: typeof provider === 'object' ? provider.name : provider,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      });
    }
  }
  
  /**
   * Resolve which model to use for a request
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - The resolved model information
   * @private
   */
  async _resolveModel(request) {
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
   * @param {string|Object} modelInfo - The model ID or model info object
   * @returns {Object} - The provider for the model
   * @private
   */
  _getProviderForModel(modelInfo) {
    let providerId;
    let modelId;
    
    // Handle different input formats
    if (typeof modelInfo === 'string') {
      modelId = modelInfo;
      const parsed = parseModelId(modelId);
      providerId = parsed.provider;
    } else {
      providerId = modelInfo.providerId;
      modelId = modelInfo.id;
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
  
  /**
   * Get count of active streams
   * @returns {number} Number of active streams
   */
  getActiveStreamCount() {
    return this.activeStreams.size;
  }
  
  /**
   * Get list of active stream IDs
   * @returns {Array<string>} List of request IDs with active streams
   */
  getActiveStreamIds() {
    return Array.from(this.activeStreams.keys());
  }
}

module.exports = StreamingHandler; 