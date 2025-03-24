/**
 * BaseProvider
 * 
 * Base class for all AI model providers.
 * Defines the interface that all provider implementations must follow.
 */

const EventEmitter = require('events');

class BaseProvider extends EventEmitter {
  /**
   * Creates a new provider instance
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super();
    this.config = config;
    this.enabled = config.enabled !== false;
    this.name = this.constructor.name;
    this.initialized = false;
  }
  
  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    // Override in subclasses
    this.initialized = true;
    return Promise.resolve();
  }
  
  /**
   * Clean up provider resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Override in subclasses
    return Promise.resolve();
  }
  
  /**
   * Test connection to the provider
   * @returns {Promise<Object>} - Test results
   */
  async testConnection() {
    // Override in subclasses
    return Promise.resolve({ success: true });
  }
  
  /**
   * List available models for this provider
   * @returns {Promise<Array<Object>>} - List of available models
   */
  async listModels() {
    // Override in subclasses
    return Promise.resolve([]);
  }
  
  /**
   * Get information about a specific model
   * @param {string} modelId - ID of the model
   * @returns {Promise<Object|null>} - Model information or null if not found
   */
  async getModel(modelId) {
    // Override in subclasses
    return Promise.resolve(null);
  }
  
  /**
   * Invoke a model
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - Model response
   */
  async invokeModel(request) {
    // This must be implemented by subclasses
    throw new Error('invokeModel method must be implemented by subclasses');
  }
  
  /**
   * Invoke a model with streaming response
   * @param {Object} request - The model request
   * @returns {EventEmitter} - Stream of model responses
   */
  invokeModelStream(request) {
    // This must be implemented by subclasses
    throw new Error('invokeModelStream method must be implemented by subclasses');
  }
  
  /**
   * Cancel an ongoing model invocation
   * @param {string} requestId - ID of the request to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelRequest(requestId) {
    // Override in subclasses that support cancellation
    return false;
  }
  
  /**
   * Check if the provider supports a specific feature
   * @param {string} feature - Feature to check
   * @returns {boolean} - Whether the feature is supported
   */
  supportsFeature(feature) {
    return false;
  }
  
  /**
   * Prepare a request for the provider's API
   * @param {Object} request - Generic request object
   * @returns {Object} - Provider-specific request
   * @protected
   */
  _prepareRequest(request) {
    // Override in subclasses
    return request;
  }
  
  /**
   * Convert a provider-specific response to the standard format
   * @param {Object} response - Provider-specific response
   * @param {Object} request - Original request
   * @returns {Object} - Standardized response
   * @protected
   */
  _formatResponse(response, request) {
    // Override in subclasses
    return response;
  }
  
  /**
   * Handle API errors
   * @param {Error} error - The error to handle
   * @param {Object} request - The original request
   * @returns {Error} - Standardized error
   * @protected
   */
  _handleError(error, request) {
    // Override in subclasses for provider-specific error handling
    return error;
  }
  
  /**
   * Get provider metrics
   * @returns {Object} - Provider metrics
   */
  getMetrics() {
    // Override in subclasses to provide provider-specific metrics
    return {
      name: this.name,
      enabled: this.enabled,
      initialized: this.initialized
    };
  }
}

module.exports = BaseProvider; 