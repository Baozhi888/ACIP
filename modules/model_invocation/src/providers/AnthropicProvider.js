/**
 * AnthropicProvider
 * 
 * Provider implementation for Anthropic's Claude models.
 * Handles connection, authentication, and model invocation for Anthropic services.
 */

const BaseProvider = require('./BaseProvider');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

class AnthropicProvider extends BaseProvider {
  /**
   * Creates a new AnthropicProvider instance
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey || process.env[config.apiKeyEnvVar || 'ANTHROPIC_API_KEY'];
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.apiVersion = config.apiVersion || '2024-06-01';
    this.requestTimeout = config.requestTimeout || 60000; // Default 60s timeout
    this.defaultModel = config.defaultModel || 'claude-3.7-sonnet';
    this.activeRequests = new Map();
  }
  
  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    
    // Test connection
    try {
      await this.testConnection();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Anthropic provider: ${error.message}`);
    }
    
    return Promise.resolve();
  }
  
  /**
   * Test connection to Anthropic API
   * @returns {Promise<Object>} - Test results
   */
  async testConnection() {
    try {
      // Anthropic doesn't have a dedicated health endpoint, so we'll make a minimal request
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, this.requestTimeout);
      
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hello' }]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      return {
        success: true,
        message: 'Successfully connected to Anthropic API'
      };
    } catch (error) {
      throw new Error(`Anthropic connection test failed: ${error.message}`);
    }
  }
  
  /**
   * List available models from Anthropic
   * @returns {Promise<Array<Object>>} - List of available models
   */
  async listModels() {
    // Anthropic doesn't have a models endpoint, so we'll return hardcoded model info
    return [
      {
        id: 'claude-2',
        name: 'Claude 2',
        version: '2',
        capabilities: ['text-generation', 'function-calling', 'high-intelligence'],
        properties: {
          contextWindow: 100000,
          provider: 'anthropic'
        },
        tags: ['anthropic', 'claude', 'high-quality', 'large-context', 'task:text-generation', 'task:chat']
      },
      {
        id: 'claude-instant-1',
        name: 'Claude Instant',
        version: '1',
        capabilities: ['text-generation', 'function-calling'],
        properties: {
          contextWindow: 100000,
          provider: 'anthropic'
        },
        tags: ['anthropic', 'claude', 'fast', 'large-context', 'task:text-generation', 'task:chat']
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        version: '3',
        capabilities: ['text-generation', 'function-calling', 'high-intelligence', 'image-understanding', 'multimodal'],
        properties: {
          contextWindow: 200000,
          provider: 'anthropic'
        },
        tags: ['anthropic', 'claude', 'high-quality', 'large-context', 'task:text-generation', 'task:chat', 'multimodal', 'vision']
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        version: '3',
        capabilities: ['text-generation', 'function-calling', 'high-intelligence', 'image-understanding', 'multimodal'],
        properties: {
          contextWindow: 200000,
          provider: 'anthropic'
        },
        tags: ['anthropic', 'claude', 'high-quality', 'large-context', 'task:text-generation', 'task:chat', 'multimodal', 'vision']
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        version: '3',
        capabilities: ['text-generation', 'function-calling', 'image-understanding', 'multimodal'],
        properties: {
          contextWindow: 200000,
          provider: 'anthropic'
        },
        tags: ['anthropic', 'claude', 'fast', 'large-context', 'task:text-generation', 'task:chat', 'multimodal', 'vision']
      }
    ];
  }
  
  /**
   * Invoke an Anthropic model
   * @param {Object} request - The model request
   * @returns {Promise<Object>} - Model response
   */
  async invokeModel(request) {
    try {
      const modelId = request.model || this.defaultModel;
      const preparedRequest = this._prepareRequest(request);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, request.timeout || this.requestTimeout);
      
      // Store the controller for potential cancellation
      this.activeRequests.set(request.requestId, controller);
      
      // Determine the correct API endpoint based on model version
      const endpoint = modelId.startsWith('claude-3') ? '/v1/messages' : '/v1/complete';
      
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
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      return this._formatResponse(data, request, modelId);
    } catch (error) {
      // Clean up if still in active requests
      this.activeRequests.delete(request.requestId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Anthropic request timeout after ${request.timeout || this.requestTimeout}ms`);
      }
      
      throw this._handleError(error, request);
    }
  }
  
  /**
   * Invoke an Anthropic model with streaming response
   * @param {Object} request - The model request
   * @returns {EventEmitter} - Stream of model responses
   */
  invokeModelStream(request) {
    const stream = new EventEmitter();
    const modelId = request.model || this.defaultModel;
    const preparedRequest = this._prepareRequest({
      ...request,
      stream: true
    });
    
    // Create abort controller for timeout and cancellation
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      stream.emit('error', new Error(`Anthropic stream request timeout after ${request.timeout || this.requestTimeout}ms`));
    }, request.timeout || this.requestTimeout);
    
    // Store the controller for potential cancellation
    this.activeRequests.set(request.requestId, controller);
    
    // Determine the correct API endpoint based on model version
    const endpoint = modelId.startsWith('claude-3.5') ? '/v1/messages' : '/v1/complete';
    
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
            throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
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
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop(); // Keep the last incomplete chunk
            
            for (const chunk of chunks) {
              if (chunk.trim() === '') continue;
              if (chunk.includes('event: completion')) {
                try {
                  const dataLine = chunk.split('\n').find(line => line.startsWith('data: '));
                  if (dataLine) {
                    const data = JSON.parse(dataLine.slice(6));
                    const formattedChunk = this._formatStreamingResponse(data, request, modelId);
                    stream.emit('data', formattedChunk);
                  }
                } catch (error) {
                  // Skip invalid JSON
                }
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
      'image-understanding',
      'large-context'
    ];
    
    return supportedFeatures.includes(feature);
  }
  
  /**
   * Get HTTP headers for Anthropic API requests
   * @returns {Object} - Headers object
   * @private
   */
  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      'Anthropic-Version': this.apiVersion
    };
  }
  
  /**
   * Prepare a request for Anthropic's API
   * @param {Object} request - Generic request object
   * @returns {Object} - Anthropic-specific request
   * @private
   */
  _prepareRequest(request) {
    const modelId = request.model || this.defaultModel;
    
    // Handle Claude 3 models (messages API)
    if (modelId.startsWith('claude-3')) {
      return {
        model: modelId,
        messages: request.input.messages,
        max_tokens: request.parameters?.maxTokens || 2048,
        temperature: request.parameters?.temperature ?? 0.7,
        top_p: request.parameters?.topP,
        stop_sequences: request.parameters?.stopSequences,
        stream: request.stream || false
      };
    }
    
    // Handle older Claude models (completion API)
    // Convert messages to prompt
    const messages = request.input.messages || [];
    let prompt = '\n\nHuman: ';
    
    for (const message of messages) {
      if (message.role === 'system' && messages.indexOf(message) === 0) {
        prompt = `${message.content}\n\nHuman: `;
      } else if (message.role === 'user') {
        prompt += `${message.content}\n\nAssistant:`;
      } else if (message.role === 'assistant') {
        prompt += ` ${message.content}\n\nHuman:`;
      }
    }
    
    if (prompt.endsWith('Human:')) {
      prompt = prompt.slice(0, -7);
    }
    
    return {
      model: modelId,
      prompt,
      max_tokens_to_sample: request.parameters?.maxTokens || 2048,
      temperature: request.parameters?.temperature ?? 0.7,
      top_p: request.parameters?.topP,
      stop_sequences: request.parameters?.stopSequences || ['\n\nHuman:'],
      stream: request.stream || false
    };
  }
  
  /**
   * Format a response from Anthropic's API
   * @param {Object} response - Anthropic API response
   * @param {Object} request - Original request
   * @param {string} modelId - The model ID used
   * @returns {Object} - Standardized response
   * @private
   */
  _formatResponse(response, request, modelId) {
    // Handle Claude 3 models (messages API)
    if (modelId.startsWith('claude-3')) {
      return {
        requestId: request.requestId,
        model: modelId,
        provider: 'anthropic',
        created: new Date().toISOString(),
        output: {
          message: {
            role: 'assistant',
            content: response.content[0].text
          },
          finish_reason: response.stop_reason
        },
        usage: {
          promptTokens: response.usage?.input_tokens,
          completionTokens: response.usage?.output_tokens,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        },
        metadata: {
          id: response.id,
          model: response.model
        }
      };
    }
    
    // Handle older Claude models (completion API)
    return {
      requestId: request.requestId,
      model: modelId,
      provider: 'anthropic',
      created: new Date().toISOString(),
      output: {
        message: {
          role: 'assistant',
          content: response.completion
        },
        finish_reason: response.stop_reason
      },
      metadata: {
        model: modelId,
        stop_reason: response.stop_reason
      }
    };
  }
  
  /**
   * Format a streaming response chunk
   * @param {Object} chunk - Streaming response chunk
   * @param {Object} request - Original request
   * @param {string} modelId - The model ID used
   * @returns {Object} - Formatted chunk
   * @private
   */
  _formatStreamingResponse(chunk, request, modelId) {
    // Handle Claude 3 models (messages API)
    if (modelId.startsWith('claude-3.5')) {
      return {
        requestId: request.requestId,
        model: modelId,
        provider: 'anthropic',
        chunkId: `${request.requestId}_${Date.now()}`,
        output: {
          content: chunk.delta?.text,
          finish_reason: chunk.stop_reason
        }
      };
    }
    
    // Handle older Claude models (completion API)
    return {
      requestId: request.requestId,
      model: modelId,
      provider: 'anthropic',
      chunkId: `${request.requestId}_${Date.now()}`,
      output: {
        content: chunk.completion,
        finish_reason: chunk.stop_reason
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
          return new Error(`Anthropic API error: ${data.error.message || 'Unknown error'}`);
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    // Convert AbortError to timeout error
    if (error.name === 'AbortError') {
      return new Error(`Anthropic request timeout after ${request.timeout || this.requestTimeout}ms`);
    }
    
    // Return original error with provider prefix
    return new Error(`Anthropic provider error: ${error.message}`);
  }
}

module.exports = AnthropicProvider;