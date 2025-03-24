/**
 * OpenAIProvider
 * 
 * Provider implementation for OpenAI models.
 * Handles connection, authentication, and model invocation for OpenAI services.
 */

const BaseProvider = require('./BaseProvider');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

class OpenAIProvider extends BaseProvider {
  /**
   * Creates a new OpenAIProvider instance
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey || process.env[config.apiKeyEnvVar || 'OPENAI_API_KEY'];
    this.organization = config.organization || process.env[config.organizationEnvVar || 'OPENAI_ORGANIZATION_ID'];
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.requestTimeout = config.requestTimeout || 60000; // Default 60s timeout
    this.defaultModel = config.defaultModel || 'gpt-3.5-turbo';
    this.activeRequests = new Map();
  }
  
  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    // Test connection
    try {
      await this.testConnection();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI provider: ${error.message}`);
    }
    
    return Promise.resolve();
  }
  
  /**
   * Test connection to OpenAI API
   * @returns {Promise<Object>} - Test results
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this._getHeaders(),
        timeout: this.requestTimeout
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        models: data.data.length
      };
    } catch (error) {
      throw new Error(`OpenAI connection test failed: ${error.message}`);
    }
  }
  
  /**
   * List available models from OpenAI
   * @returns {Promise<Array<Object>>} - List of available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this._getHeaders(),
        timeout: this.requestTimeout
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // Filter and map to standard format
      return data.data.map(model => {
        // Determine capabilities based on model ID
        const capabilities = this._determineModelCapabilities(model.id);
        
        return {
          id: model.id,
          name: model.id,
          version: model.id.split('-').pop(),
          capabilities,
          properties: {
            created: model.created,
            ownedBy: model.owned_by
          },
          tags: this._determineModelTags(model.id)
        };
      });
    } catch (error) {
      this.emit('error', {
        operation: 'listModels',
        error: error.message,
        details: error.stack
      });
      return [];
    }
  }
  
  /**
   * Invoke an OpenAI model
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - Model response
   */
  async invokeModel(request) {
    try {
      const modelId = request.model || this.defaultModel;
      const endpoint = this._getEndpointForModel(modelId);
      const preparedRequest = this._prepareRequest(request);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, request.timeout || this.requestTimeout);
      
      // Store the controller for potential cancellation
      this.activeRequests.set(request.requestId, controller);
      
      // Make API request
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(preparedRequest),
        signal: controller.signal
      });
      
      // Clear timeout and remove from active requests
      clearTimeout(timeout);
      this.activeRequests.delete(request.requestId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      return this._formatResponse(data, request);
    } catch (error) {
      // Clean up if still in active requests
      this.activeRequests.delete(request.requestId);
      
      if (error.name === 'AbortError') {
        throw new Error(`OpenAI request timeout after ${request.timeout || this.requestTimeout}ms`);
      }
      
      throw this._handleError(error, request);
    }
  }
  
  /**
   * Invoke an OpenAI model with streaming response
   * @param {Object} request - The model request
   * @returns {EventEmitter} - Stream of model responses
   */
  invokeModelStream(request) {
    const stream = new EventEmitter();
    const modelId = request.model || this.defaultModel;
    const endpoint = this._getEndpointForModel(modelId);
    const preparedRequest = this._prepareRequest({
      ...request,
      stream: true
    });
    
    // Create abort controller for timeout and cancellation
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      stream.emit('error', new Error(`OpenAI stream request timeout after ${request.timeout || this.requestTimeout}ms`));
    }, request.timeout || this.requestTimeout);
    
    // Store the controller for potential cancellation
    this.activeRequests.set(request.requestId, controller);
    
    // Connect to streaming endpoint
    fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(preparedRequest),
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
          });
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
                const formattedChunk = this._formatStreamingResponse(data, request);
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
   * Check if the provider supports a specific feature
   * @param {string} feature - Feature to check
   * @returns {boolean} - Whether the feature is supported
   */
  supportsFeature(feature) {
    const supportedFeatures = [
      'streaming',
      'function-calling',
      'json-mode',
      'image-generation',
      'image-understanding'
    ];
    
    return supportedFeatures.includes(feature);
  }
  
  /**
   * Get HTTP headers for OpenAI API requests
   * @returns {Object} - Headers object
   * @private
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
    
    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }
    
    return headers;
  }
  
  /**
   * Get the API endpoint for a specific model
   * @param {string} modelId - Model ID
   * @returns {string} - API endpoint
   * @private
   */
  _getEndpointForModel(modelId) {
    if (modelId.startsWith('dall-e')) {
      return '/images/generations';
    }
    
    return '/chat/completions';
  }
  
  /**
   * Determine model capabilities based on model ID
   * @param {string} modelId - Model ID
   * @returns {Array<string>} - List of capabilities
   * @private
   */
  _determineModelCapabilities(modelId) {
    const capabilities = ['text-generation'];
    
    if (modelId.startsWith('gpt-4')) {
      capabilities.push('function-calling', 'high-intelligence');
      
      if (modelId.includes('vision')) {
        capabilities.push('image-understanding', 'multimodal');
      }
    } else if (modelId.startsWith('gpt-3.5-turbo')) {
      capabilities.push('function-calling');
    } else if (modelId.startsWith('dall-e')) {
      capabilities.push('image-generation');
      capabilities.splice(capabilities.indexOf('text-generation'), 1);
    }
    
    return capabilities;
  }
  
  /**
   * Determine model tags based on model ID
   * @param {string} modelId - Model ID
   * @returns {Array<string>} - List of tags
   * @private
   */
  _determineModelTags(modelId) {
    const tags = ['openai'];
    
    if (modelId.startsWith('gpt-4')) {
      tags.push('gpt-4', 'high-quality');
      
      if (modelId.includes('vision')) {
        tags.push('vision', 'multimodal');
      }
      
      if (modelId.includes('32k')) {
        tags.push('large-context');
      }
    } else if (modelId.startsWith('gpt-3.5-turbo')) {
      tags.push('gpt-3.5', 'fast');
      
      if (modelId.includes('16k')) {
        tags.push('large-context');
      }
    } else if (modelId.startsWith('dall-e')) {
      tags.push('dall-e', 'image-generation');
      tags.push('task:image-generation');
    }
    
    // Add task tags
    if (modelId.startsWith('gpt')) {
      tags.push('task:text-generation', 'task:chat');
    }
    
    return tags;
  }
  
  /**
   * Prepare a request for OpenAI's API
   * @param {Object} request - Generic request object
   * @returns {Object} - OpenAI-specific request
   * @private
   */
  _prepareRequest(request) {
    const modelId = request.model || this.defaultModel;
    
    // Different handling for different model types
    if (modelId.startsWith('dall-e')) {
      return this._prepareImageGenerationRequest(request);
    }
    
    // Default case: chat completion models
    return {
      model: modelId,
      messages: request.input.messages,
      temperature: request.parameters?.temperature ?? 0.7,
      max_tokens: request.parameters?.maxTokens,
      top_p: request.parameters?.topP,
      presence_penalty: request.parameters?.presencePenalty,
      frequency_penalty: request.parameters?.frequencyPenalty,
      stop: request.parameters?.stopSequences,
      n: request.parameters?.n || 1,
      stream: request.stream || false,
      functions: request.functions,
      function_call: request.function_call
    };
  }
  
  /**
   * Prepare an image generation request
   * @param {Object} request - Generic request object
   * @returns {Object} - OpenAI-specific image generation request
   * @private
   */
  _prepareImageGenerationRequest(request) {
    return {
      model: request.model || 'dall-e-3',
      prompt: request.input.prompt,
      n: request.parameters?.n || 1,
      size: request.parameters?.size || '1024x1024',
      response_format: request.parameters?.responseFormat || 'url',
      quality: request.parameters?.quality || 'standard'
    };
  }
  
  /**
   * Format a response from OpenAI's API
   * @param {Object} response - OpenAI API response
   * @param {Object} request - Original request
   * @returns {Object} - Standardized response
   * @private
   */
  _formatResponse(response, request) {
    const modelId = request.model || this.defaultModel;
    
    // Different handling for different model types
    if (modelId.startsWith('dall-e')) {
      return this._formatImageGenerationResponse(response, request);
    }
    
    // Default case: chat completion models
    const result = {
      requestId: request.requestId,
      model: modelId,
      provider: 'openai',
      created: new Date().toISOString(),
      output: {
        message: response.choices[0].message,
        finish_reason: response.choices[0].finish_reason
      },
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : null,
      metadata: {
        id: response.id,
        model: response.model
      }
    };
    
    return result;
  }
  
  /**
   * Format an image generation response
   * @param {Object} response - OpenAI API response
   * @param {Object} request - Original request
   * @returns {Object} - Standardized response
   * @private
   */
  _formatImageGenerationResponse(response, request) {
    return {
      requestId: request.requestId,
      model: request.model || 'dall-e-3',
      provider: 'openai',
      created: new Date().toISOString(),
      output: {
        images: response.data.map(item => ({
          url: item.url,
          b64_json: item.b64_json,
          revised_prompt: response.data[0].revised_prompt
        }))
      },
      metadata: {
        created: response.created
      }
    };
  }
  
  /**
   * Format a streaming response chunk
   * @param {Object} chunk - Streaming response chunk
   * @param {Object} request - Original request
   * @returns {Object} - Formatted chunk
   * @private
   */
  _formatStreamingResponse(chunk, request) {
    if (!chunk.choices || chunk.choices.length === 0) {
      return null;
    }
    
    return {
      requestId: request.requestId,
      model: request.model || this.defaultModel,
      provider: 'openai',
      chunkId: chunk.id,
      output: {
        content: chunk.choices[0].delta.content,
        function_call: chunk.choices[0].delta.function_call,
        role: chunk.choices[0].delta.role,
        finish_reason: chunk.choices[0].finish_reason
      },
      metadata: {
        model: chunk.model
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
    // Extract API error if available
    if (error.response) {
      try {
        const data = error.response.json();
        if (data.error) {
          return new Error(`OpenAI API error: ${data.error.message || 'Unknown error'}`);
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    // Convert AbortError to timeout error
    if (error.name === 'AbortError') {
      return new Error(`OpenAI request timeout after ${request.timeout || this.requestTimeout}ms`);
    }
    
    // Return original error with provider prefix
    return new Error(`OpenAI provider error: ${error.message}`);
  }
}

module.exports = OpenAIProvider; 