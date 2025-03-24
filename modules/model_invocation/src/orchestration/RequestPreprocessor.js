/**
 * RequestPreprocessor
 * 
 * Validates and standardizes incoming model invocation requests
 * before they are routed to providers. Handles:
 * - Input validation
 * - Request normalization
 * - Default values
 * - Request ID generation
 */

const { v4: uuidv4 } = require('uuid');
const { validateModelRequest } = require('../utils/validation');

class RequestPreprocessor {
  /**
   * Creates a new RequestPreprocessor instance
   * @param {Object} options - Preprocessor options
   */
  constructor(options) {
    this.config = options.config;
    this.modelRegistry = options.modelRegistry;
    this.defaultRequestOptions = this.config.defaults?.requestOptions || {};
  }
  
  /**
   * Preprocess a model invocation request
   * @param {Object} rawRequest - The raw request to preprocess
   * @returns {Object} - The preprocessed request
   * @throws {Error} - If the request is invalid
   */
  preprocessRequest(rawRequest) {
    // Clone the request to avoid modifying the original
    const request = { ...rawRequest };
    
    // Validate the request
    const validationResult = validateModelRequest(request);
    
    if (!validationResult.valid) {
      throw new Error(`Invalid request: ${validationResult.errors.join(', ')}`);
    }
    
    // Assign a request ID if not present
    if (!request.requestId) {
      request.requestId = this._generateRequestId();
    }
    
    // Apply defaults for missing values
    this._applyDefaults(request);
    
    // Normalize the request format
    this._normalizeRequest(request);
    
    // Add timestamps
    request.timestamp = Date.now();
    
    return request;
  }
  
  /**
   * Generate a unique request ID
   * @returns {string} - A unique ID
   * @private
   */
  _generateRequestId() {
    return uuidv4();
  }
  
  /**
   * Apply default values to a request
   * @param {Object} request - The request to modify
   * @private
   */
  _applyDefaults(request) {
    // Apply global default options
    for (const [key, value] of Object.entries(this.defaultRequestOptions)) {
      if (request[key] === undefined) {
        request[key] = value;
      }
    }
    
    // Apply timeout if not specified
    if (!request.timeout) {
      request.timeout = this.config.defaults?.timeout || 30000;
    }
    
    // Apply default provider if not specified
    if (!request.provider && !request.model?.includes(':')) {
      request.provider = this.config.defaults?.provider;
    }
    
    // Apply default model if not specified
    if (!request.model && request.provider) {
      const providerConfig = this.config.providers?.[request.provider];
      request.model = providerConfig?.defaultModel;
    }
    
    // If neither model nor provider specified, use global defaults
    if (!request.model && !request.provider) {
      request.provider = this.config.defaults?.provider;
      if (request.provider) {
        const providerConfig = this.config.providers?.[request.provider];
        request.model = providerConfig?.defaultModel;
      }
    }
  }
  
  /**
   * Normalize a request to a standard format
   * @param {Object} request - The request to normalize
   * @private
   */
  _normalizeRequest(request) {
    // Normalize model name format
    if (request.model && !request.model.includes(':') && request.provider) {
      request.model = `${request.provider}:${request.model}`;
    }
    
    // Normalize prompt/messages format
    this._normalizeInputFormat(request);
    
    // Ensure temperature is within range 0-1
    if (request.temperature !== undefined) {
      request.temperature = Math.min(Math.max(request.temperature, 0), 1);
    }
    
    // Normalize function calling format
    if (request.functions) {
      this._normalizeFunctionCallingFormat(request);
    }
  }
  
  /**
   * Normalize input format (prompt or messages)
   * @param {Object} request - The request to normalize
   * @private
   */
  _normalizeInputFormat(request) {
    // If only prompt is provided and not messages, convert to messages
    if (request.prompt && !request.messages) {
      if (typeof request.prompt === 'string') {
        request.messages = [
          { role: 'user', content: request.prompt }
        ];
      } else if (Array.isArray(request.prompt)) {
        request.messages = [
          { role: 'user', content: request.prompt.join('\n') }
        ];
      }
    }
    
    // Ensure messages are in a standard format if present
    if (request.messages) {
      request.messages = request.messages.map(message => {
        // If message is a string, assume user role
        if (typeof message === 'string') {
          return { role: 'user', content: message };
        }
        
        // If role is missing, assume user
        if (!message.role) {
          return { ...message, role: 'user' };
        }
        
        return message;
      });
    }
  }
  
  /**
   * Normalize function calling format
   * @param {Object} request - The request to normalize
   * @private
   */
  _normalizeFunctionCallingFormat(request) {
    // If functions are defined as an array of objects without a "functions" wrapper
    if (Array.isArray(request.functions) && 
        request.functions.length > 0 && 
        typeof request.functions[0] === 'object' && 
        request.functions[0].name) {
      
      // Check if the model belongs to OpenAI (needs tool format)
      const isOpenAI = request.provider === 'openai' || 
                       request.model?.startsWith('openai:');
      
      if (isOpenAI) {
        // Convert to OpenAI's tools format if not already
        if (!request.tools) {
          request.tools = request.functions.map(fn => ({
            type: 'function',
            function: fn
          }));
        }
      }
      
      // Otherwise, keep as functions for Anthropic etc.
    }
    
    // Ensure function_call field is normalized if present
    if (request.function_call) {
      if (typeof request.function_call === 'string') {
        request.function_call = { name: request.function_call };
      }
    }
  }
}

module.exports = RequestPreprocessor; 