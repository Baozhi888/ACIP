/**
 * ModelInvocationModule
 * 
 * The main class for the Model Invocation Module that provides a unified interface
 * for invoking AI models across different providers, architectures, and deployment environments.
 */

const EventEmitter = require('events');
const ModelRegistry = require('./model-management/ModelRegistry');
const ProviderRegistry = require('./providers/ProviderRegistry');
const RequestRouter = require('./orchestration/RequestRouter');
const ChainManager = require('./orchestration/ChainManager');
const CacheManager = require('./optimization/CacheManager');
const ConfigManager = require('./config/ConfigManager');
const MetricsCollector = require('./observability/MetricsCollector');
const StreamManager = require('./execution/StreamManager');
const { validateInvocationOptions, validateConfig } = require('./utils/validators');
const { generateRequestId } = require('./utils/identifiers');

class ModelInvocationModule extends EventEmitter {
  /**
   * Creates a new instance of the ModelInvocationModule
   * @param {Object} options - Configuration options for the module
   */
  constructor(options = {}) {
    super();
    
    // Initialize configuration
    this.configManager = new ConfigManager(options);
    this.config = this.configManager.getConfig();
    
    // Initialize core components
    this.modelRegistry = new ModelRegistry(this.config);
    this.providerRegistry = new ProviderRegistry(this.config);
    this.cacheManager = new CacheManager(this.config.caching);
    this.metricsCollector = new MetricsCollector(this.config.observability);
    this.streamManager = new StreamManager(this.config.streaming);
    
    // Initialize orchestration components
    this.requestRouter = new RequestRouter({
      modelRegistry: this.modelRegistry,
      providerRegistry: this.providerRegistry,
      config: this.config
    });
    
    this.chainManager = new ChainManager({
      modelInvocationModule: this,
      config: this.config
    });
    
    // Active requests tracking
    this.activeRequests = new Map();
    
    // Register event handlers
    this._registerEventHandlers();
    
    // Initialize the module
    this._initialize();
  }
  
  /**
   * Initialize the module
   * @private
   */
  async _initialize() {
    try {
      // Load provider configurations
      await this.providerRegistry.loadProviders();
      
      // Discover available models
      await this.modelRegistry.discoverModels(this.providerRegistry);
      
      this.emit('ready', {
        modelCount: this.modelRegistry.getModelCount(),
        providerCount: this.providerRegistry.getProviderCount()
      });
    } catch (error) {
      this.emit('error', {
        stage: 'initialization',
        error: error.message,
        details: error.stack
      });
    }
  }
  
  /**
   * Register internal event handlers
   * @private
   */
  _registerEventHandlers() {
    this.requestRouter.on('requestStarted', (data) => {
      this.emit('requestStarted', data);
      this.metricsCollector.recordRequestStart(data);
    });
    
    this.requestRouter.on('requestCompleted', (data) => {
      this.emit('requestCompleted', data);
      this.metricsCollector.recordRequestEnd(data);
      this.activeRequests.delete(data.requestId);
    });
    
    this.requestRouter.on('requestFailed', (data) => {
      this.emit('requestFailed', data);
      this.metricsCollector.recordRequestFailure(data);
      this.activeRequests.delete(data.requestId);
    });
  }
  
  /**
   * Invoke an AI model
   * @param {Object} options - Invocation options
   * @returns {Promise<Object>} - The model response
   */
  async invoke(options) {
    try {
      // Validate options
      validateInvocationOptions(options);
      
      // Generate a unique request ID
      const requestId = options.requestId || generateRequestId();
      
      // Check cache if enabled
      if (this.config.caching.enabled && !options.skipCache) {
        const cachedResponse = this.cacheManager.get(options);
        if (cachedResponse) {
          this.metricsCollector.recordCacheHit({
            requestId,
            model: options.model,
            provider: options.provider
          });
          return cachedResponse;
        }
      }
      
      // Prepare the request
      const request = {
        ...options,
        requestId,
        timestamp: Date.now()
      };
      
      // Track the active request
      this.activeRequests.set(requestId, request);
      
      // Route and execute the request
      const response = await this.requestRouter.routeRequest(request);
      
      // Cache the response if appropriate
      if (this.config.caching.enabled && !options.skipCache) {
        this.cacheManager.set(options, response);
      }
      
      return response;
    } catch (error) {
      this.metricsCollector.recordError({
        type: 'invocation_error',
        message: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
  
  /**
   * Invoke an AI model with streaming response
   * @param {Object} options - Invocation options
   * @returns {EventEmitter} - Stream of model responses
   */
  invokeStream(options) {
    try {
      // Validate options
      validateInvocationOptions(options);
      
      // Generate a unique request ID
      const requestId = options.requestId || generateRequestId();
      
      // Prepare the request
      const request = {
        ...options,
        requestId,
        streaming: true,
        timestamp: Date.now()
      };
      
      // Track the active request
      this.activeRequests.set(requestId, request);
      
      // Create and return the stream
      return this.streamManager.createStream(request, this.requestRouter);
    } catch (error) {
      this.metricsCollector.recordError({
        type: 'stream_invocation_error',
        message: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
  
  /**
   * Invoke multiple requests in batch mode
   * @param {Array<Object>} requests - Array of invocation options
   * @returns {Promise<Array<Object>>} - Array of model responses
   */
  async batchInvoke(requests) {
    try {
      // Validate each request
      requests.forEach(validateInvocationOptions);
      
      // Prepare batch requests with IDs
      const batchRequests = requests.map(request => ({
        ...request,
        requestId: request.requestId || generateRequestId(),
        timestamp: Date.now()
      }));
      
      // Track active requests
      batchRequests.forEach(request => {
        this.activeRequests.set(request.requestId, request);
      });
      
      // Execute batch requests
      const batchResponses = await Promise.all(
        batchRequests.map(request => this.requestRouter.routeRequest(request))
      );
      
      return batchResponses;
    } catch (error) {
      this.metricsCollector.recordError({
        type: 'batch_invocation_error',
        message: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
  
  /**
   * Cancel an ongoing model invocation
   * @param {string} requestId - ID of the request to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancel(requestId) {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return false;
    }
    
    this.emit('requestCancelled', { requestId });
    this.activeRequests.delete(requestId);
    
    return this.requestRouter.cancelRequest(requestId);
  }
  
  /**
   * Create a chain of model invocations
   * @param {Object} chainConfig - Configuration for the chain
   * @returns {Object} - Chain instance
   */
  createChain(chainConfig) {
    return this.chainManager.createChain(chainConfig);
  }
  
  /**
   * Get the model registry
   * @returns {ModelRegistry} - The model registry
   */
  get models() {
    return this.modelRegistry;
  }
  
  /**
   * Get the provider registry
   * @returns {ProviderRegistry} - The provider registry
   */
  get providers() {
    return this.providerRegistry;
  }
  
  /**
   * Get metrics for the module
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    return this.metricsCollector.getMetrics();
  }
}

module.exports = ModelInvocationModule; 