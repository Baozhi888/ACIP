/**
 * LocalModelsProvider
 * 
 * Provider implementation for locally deployed models.
 * Handles connection and invocation for models deployed in local environments.
 */

const BaseProvider = require('./BaseProvider');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

class LocalModelsProvider extends BaseProvider {
  /**
   * Creates a new LocalModelsProvider instance
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super(config);
    this.endpoints = config.endpoints || {};
    this.requestTimeout = config.requestTimeout || 30000; // Default 30s timeout
    this.activeRequests = new Map();
    this.models = new Map();
  }
  
  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (Object.keys(this.endpoints).length === 0) {
      this.emit('warning', {
        message: 'No local model endpoints configured',
        details: 'LocalModelsProvider initialized with empty endpoints configuration'
      });
    }
    
    // Register models from endpoints
    for (const [modelId, endpoint] of Object.entries(this.endpoints)) {
      this._registerLocalModel(modelId, endpoint);
    }
    
    this.initialized = true;
    return Promise.resolve();
  }
  
  /**
   * Test connection to a local model endpoint
   * @returns {Promise<Object>} - Test results
   */
  async testConnection() {
    if (Object.keys(this.endpoints).length === 0) {
      throw new Error('No local model endpoints configured');
    }
    
    const results = {
      success: true,
      endpoints: {}
    };
    
    // Test each endpoint
    for (const [modelId, endpoint] of Object.entries(this.endpoints)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, this.requestTimeout);
        
        const response = await fetch(`${endpoint}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          results.endpoints[modelId] = {
            status: 'available',
            url: endpoint
          };
        } else {
          results.endpoints[modelId] = {
            status: 'error',
            url: endpoint,
            error: `HTTP status ${response.status}`
          };
          results.success = false;
        }
      } catch (error) {
        results.endpoints[modelId] = {
          status: 'error',
          url: endpoint,
          error: error.message
        };
        results.success = false;
      }
    }
    
    return results;
  }
  
  /**
   * List available local models
   * @returns {Promise<Array<Object>>} - List of available models
   */
  async listModels() {
    const models = [];
    
    for (const [modelId, modelInfo] of this.models.entries()) {
      models.push({
        id: modelId,
        name: modelInfo.name || modelId,
        capabilities: modelInfo.capabilities || [],
        properties: {
          endpoint: modelInfo.endpoint
        },
        tags: ['local', ...modelInfo.tags || []]
      });
    }
    
    return models;
  }
  
  /**
   * Invoke a local model
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - Model response
   */
  async invokeModel(request) {
    const modelId = request.model;
    const modelInfo = this.models.get(modelId);
    
    if (!modelInfo) {
      throw new Error(`Local model "${modelId}" not found`);
    }
    
    const endpoint = modelInfo.endpoint;
    
    try {
      const preparedRequest = this._prepareRequest(request, modelInfo);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, request.timeout || this.requestTimeout);
      
      // Store the controller for potential cancellation
      this.activeRequests.set(request.requestId, controller);
      
      // Make API request
      const response = await fetch(`${endpoint}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preparedRequest),
        signal: controller.signal
      });
      
      // Clear timeout and remove from active requests
      clearTimeout(timeout);
      this.activeRequests.delete(request.requestId);
      
      if (!response.ok) {
        throw new Error(`Local model API error: HTTP status ${response.status}`);
      }
      
      const data = await response.json();
      return this._formatResponse(data, request, modelInfo);
    } catch (error) {
      // Clean up if still in active requests
      this.activeRequests.delete(request.requestId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Local model request timeout after ${request.timeout || this.requestTimeout}ms`);
      }
      
      throw this._handleError(error, request);
    }
  }
  
  /**
   * Invoke a local model with streaming response
   * @param {Object} request - The model request
   * @returns {EventEmitter} - Stream of model responses
   */
  invokeModelStream(request) {
    const stream = new EventEmitter();
    const modelId = request.model;
    const modelInfo = this.models.get(modelId);
    
    if (!modelInfo) {
      stream.emit('error', new Error(`Local model "${modelId}" not found`));
      return stream;
    }
    
    const endpoint = modelInfo.endpoint;
    const preparedRequest = this._prepareRequest({
      ...request,
      stream: true
    }, modelInfo);
    
    // Create abort controller for timeout and cancellation
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      stream.emit('error', new Error(`Local model stream request timeout after ${request.timeout || this.requestTimeout}ms`));
    }, request.timeout || this.requestTimeout);
    
    // Store the controller for potential cancellation
    this.activeRequests.set(request.requestId, controller);
    
    // Connect to streaming endpoint
    fetch(`${endpoint}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preparedRequest),
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Local model API error: HTTP status ${response.status}`);
        }
        
        const reader = response.body.getReader();
        let buffer = '';
        
        // Process the stream
        const processStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              clearTimeout(timeout);
              this.activeRequests.delete(request.requestId);
              stream.emit('end');
              return;
            }
            
            // Convert bytes to string and append to buffer
            buffer += new TextDecoder('utf-8').decode(value);
            
            // Process complete chunks
            const chunks = buffer.split('data: ');
            buffer = chunks.pop(); // Keep the last incomplete chunk
            
            for (const chunk of chunks) {
              if (chunk.trim() === '') continue;
              if (chunk.trim() === '[DONE]') {
                clearTimeout(timeout);
                this.activeRequests.delete(request.requestId);
                stream.emit('end');
                return;
              }
              
              try {
                const data = JSON.parse(chunk);
                const formattedChunk = this._formatStreamingResponse(data, request, modelInfo);
                stream.emit('data', formattedChunk);
              } catch (error) {
                // Skip invalid JSON
              }
            }
            
            processStream();
          }).catch(error => {
            clearTimeout(timeout);
            this.activeRequests.delete(request.requestId);
            stream.emit('error', this._handleError(error, request));
          });
        };
        
        processStream();
      })
      .catch(error => {
        clearTimeout(timeout);
        this.activeRequests.delete(request.requestId);
        stream.emit('error', this._handleError(error, request));
      });
    
    return stream;
  }
  
  /**
   * Cancel an ongoing model invocation
   * @param {string} requestId - ID of the request to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelRequest(requestId) {
    const controller = this.activeRequests.get(requestId);
    if (!controller) {
      return false;
    }
    
    try {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    } catch (error) {
      this.emit('error', {
        operation: 'cancelRequest',
        requestId,
        error: error.message,
        details: error.stack
      });
      return false;
    }
  }
  
  /**
   * Register a new local model
   * @param {string} modelId - ID of the model
   * @param {string} endpoint - API endpoint for the model
   * @param {Object} options - Additional model options
   * @returns {void}
   * @private
   */
  _registerLocalModel(modelId, endpoint, options = {}) {
    const modelInfo = {
      id: modelId,
      name: options.name || modelId,
      endpoint,
      capabilities: options.capabilities || ['text-generation'],
      tags: options.tags || []
    };
    
    this.models.set(modelId, modelInfo);
    
    this.emit('modelRegistered', {
      id: modelId,
      endpoint
    });
  }
  
  /**
   * Update a local model's endpoint or options
   * @param {string} modelId - ID of the model
   * @param {string} endpoint - API endpoint for the model
   * @param {Object} options - Additional model options
   * @returns {boolean} - Whether the update was successful
   */
  updateModelEndpoint(modelId, endpoint, options = {}) {
    if (!this.models.has(modelId)) {
      return false;
    }
    
    const existingModel = this.models.get(modelId);
    
    const modelInfo = {
      ...existingModel,
      endpoint,
      capabilities: options.capabilities || existingModel.capabilities,
      tags: options.tags || existingModel.tags,
      name: options.name || existingModel.name
    };
    
    this.models.set(modelId, modelInfo);
    
    this.emit('modelUpdated', {
      id: modelId,
      endpoint
    });
    
    return true;
  }
  
  /**
   * Prepare a request for a local model's API
   * @param {Object} request - Generic request object
   * @param {Object} modelInfo - Information about the model
   * @returns {Object} - Local model-specific request
   * @private
   */
  _prepareRequest(request, modelInfo) {
    // Check if model implements OpenAI-compatible API
    if (modelInfo.apiFormat === 'openai') {
      return {
        model: modelInfo.id,
        messages: request.input.messages,
        temperature: request.parameters?.temperature ?? 0.7,
        max_tokens: request.parameters?.maxTokens ?? 2048,
        top_p: request.parameters?.topP ?? 1.0,
        stream: request.stream || false
      };
    }
    
    // Default format (simple completion API)
    return {
      prompt: this._convertMessagesToPrompt(request.input.messages),
      temperature: request.parameters?.temperature ?? 0.7,
      max_tokens: request.parameters?.maxTokens ?? 2048,
      top_p: request.parameters?.topP ?? 1.0,
      stream: request.stream || false
    };
  }
  
  /**
   * Convert messages to a text prompt for models that don't support chat format
   * @param {Array} messages - Array of message objects
   * @returns {string} - Formatted prompt
   * @private
   */
  _convertMessagesToPrompt(messages) {
    if (!messages || messages.length === 0) {
      return '';
    }
    
    let prompt = '';
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `Instructions: ${message.content}\n\n`;
          break;
        case 'user':
          prompt += `User: ${message.content}\n\n`;
          break;
        case 'assistant':
          prompt += `Assistant: ${message.content}\n\n`;
          break;
        default:
          prompt += `${message.role}: ${message.content}\n\n`;
      }
    }
    
    prompt += 'Assistant: ';
    return prompt;
  }
  
  /**
   * Format a response from a local model's API
   * @param {Object} response - Local model API response
   * @param {Object} request - Original request
   * @param {Object} modelInfo - Information about the model
   * @returns {Object} - Standardized response
   * @private
   */
  _formatResponse(response, request, modelInfo) {
    // Handle OpenAI-compatible format
    if (modelInfo.apiFormat === 'openai' && response.choices) {
      return {
        requestId: request.requestId,
        model: request.model,
        provider: 'localModels',
        created: new Date().toISOString(),
        output: {
          message: response.choices[0].message,
          finish_reason: response.choices[0].finish_reason
        },
        usage: response.usage || null,
        metadata: {
          id: response.id,
          model: response.model
        }
      };
    }
    
    // Handle simple completion format
    return {
      requestId: request.requestId,
      model: request.model,
      provider: 'localModels',
      created: new Date().toISOString(),
      output: {
        message: {
          role: 'assistant',
          content: response.text || response.choices?.[0]?.text || ''
        },
        finish_reason: response.finish_reason || 'stop'
      },
      metadata: {
        endpoint: modelInfo.endpoint
      }
    };
  }
  
  /**
   * Format a streaming response chunk
   * @param {Object} chunk - Streaming response chunk
   * @param {Object} request - Original request
   * @param {Object} modelInfo - Information about the model
   * @returns {Object} - Formatted chunk
   * @private
   */
  _formatStreamingResponse(chunk, request, modelInfo) {
    // Handle OpenAI-compatible format
    if (modelInfo.apiFormat === 'openai' && chunk.choices) {
      return {
        requestId: request.requestId,
        model: request.model,
        provider: 'localModels',
        chunkId: chunk.id,
        output: {
          content: chunk.choices[0].delta.content,
          role: chunk.choices[0].delta.role,
          finish_reason: chunk.choices[0].finish_reason
        }
      };
    }
    
    // Handle simple completion format
    return {
      requestId: request.requestId,
      model: request.model,
      provider: 'localModels',
      output: {
        content: chunk.text || chunk.choices?.[0]?.text || '',
        finish_reason: chunk.finish_reason
      }
    };
  }
  
  /**
   * Handle API errors
   * @param {Error} error - The error to handle
   * @param {Object} request - The original request
   * @returns {Error} - Standardized error
   * @private
   */
  _handleError(error, request) {
    // Convert AbortError to timeout error
    if (error.name === 'AbortError') {
      return new Error(`Local model request timeout after ${request.timeout || this.requestTimeout}ms`);
    }
    
    // Return original error with provider prefix
    return new Error(`Local model provider error: ${error.message}`);
  }
}

module.exports = LocalModelsProvider; 