/**
 * ACIP SDK - Assistant
 * 
 * Provides a conversational interface for interacting with AI models
 */

const EventEmitter = require('events');

/**
 * Assistant class for creating conversational AI experiences
 */
class Assistant {
  /**
   * Create a new Assistant instance
   * @param {Object} modelInvocation - ModelInvocation instance
   * @param {Object} options - Assistant options
   */
  constructor(modelInvocation, options = {}) {
    if (!modelInvocation) {
      throw new Error('ModelInvocation instance is required');
    }
    
    this.modelInvocation = modelInvocation;
    this.events = new EventEmitter();
    
    // Initialize options with defaults
    this.options = {
      modelId: options.modelId || 'gpt-4',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2048,
      systemPrompt: options.systemPrompt || 'You are a helpful AI assistant.',
      name: options.name || 'Assistant',
      tools: options.tools || [],
      memory: options.memory !== false,
      memorySize: options.memorySize || 10,
      streaming: options.streaming !== false,
      ...options
    };
    
    // Initialize conversation history
    this.history = [];
    if (this.options.systemPrompt) {
      this.history.push({
        role: 'system',
        content: this.options.systemPrompt
      });
    }
  }
  
  /**
   * Send a message to the assistant
   * @param {string|Object} message - User message
   * @param {Object} options - Message options
   * @returns {Promise<Object>} - Assistant's response
   */
  async sendMessage(message, options = {}) {
    // Add user message to history
    const userMessage = typeof message === 'string'
      ? { role: 'user', content: message }
      : { role: 'user', ...message };
    
    this.history.push(userMessage);
    
    // Prepare combined options
    const combinedOptions = {
      ...this.options,
      ...options
    };
    
    // Prepare request for model invocation
    const request = {
      modelId: combinedOptions.modelId,
      messages: this._prepareMessages(combinedOptions),
      temperature: combinedOptions.temperature,
      max_tokens: combinedOptions.maxTokens,
      stream: combinedOptions.streaming,
      tools: combinedOptions.tools.length > 0 ? combinedOptions.tools : undefined
    };
    
    try {
      if (combinedOptions.streaming) {
        // Create stream for streaming response
        const stream = await this.modelInvocation.createStream(request, options);
        
        // Set up collector for the full response
        let fullContent = '';
        let fullResponse = null;
        
        stream.on('data', chunk => {
          fullContent += chunk.content || '';
          this.events.emit('message:chunk', chunk);
        });
        
        stream.on('end', () => {
          if (fullResponse) {
            // Add assistant message to history
            const assistantMessage = {
              role: 'assistant',
              content: fullContent
            };
            
            if (fullResponse.toolCalls) {
              assistantMessage.toolCalls = fullResponse.toolCalls;
            }
            
            this.history.push(assistantMessage);
            
            // Manage history size
            this._manageHistorySize();
            
            this.events.emit('message:complete', assistantMessage);
          }
        });
        
        return stream;
      } else {
        // Get response from model
        const response = await this.modelInvocation.invoke(request, options);
        
        // Extract assistant message from response
        const assistantMessage = this._extractAssistantMessage(response);
        
        // Add assistant message to history
        this.history.push(assistantMessage);
        
        // Manage history size
        this._manageHistorySize();
        
        // Emit message event
        this.events.emit('message:complete', assistantMessage);
        
        return assistantMessage;
      }
    } catch (error) {
      // Emit error event
      this.events.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Submit tool outputs back to the assistant
   * @param {Array} toolOutputs - Tool outputs
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Assistant's response
   */
  async submitToolOutputs(toolOutputs, options = {}) {
    if (!toolOutputs || !Array.isArray(toolOutputs)) {
      throw new Error('Tool outputs must be an array');
    }
    
    // Add tool outputs to history
    const toolMessage = {
      role: 'tool',
      toolOutputs
    };
    
    this.history.push(toolMessage);
    
    // Send continuation message
    return this.sendMessage({
      role: 'user',
      content: '', // Empty content for tool continuation
      toolContinuation: true
    }, options);
  }
  
  /**
   * Get conversation history
   * @param {Object} options - Options for history retrieval
   * @returns {Array} - Conversation history
   */
  getHistory(options = {}) {
    if (options.excludeSystem) {
      return this.history.filter(msg => msg.role !== 'system');
    }
    
    return [...this.history];
  }
  
  /**
   * Clear conversation history
   * @param {Object} options - Options for clearing history
   * @returns {Assistant} - This instance
   */
  clearHistory(options = {}) {
    // Keep system message if requested
    if (options.keepSystem && this.history.length > 0 && this.history[0].role === 'system') {
      this.history = [this.history[0]];
    } else {
      this.history = [];
      
      // Reinstate system prompt if needed
      if (this.options.systemPrompt) {
        this.history.push({
          role: 'system',
          content: this.options.systemPrompt
        });
      }
    }
    
    return this;
  }
  
  /**
   * Update assistant configuration
   * @param {Object} options - New configuration options
   * @returns {Assistant} - This instance
   */
  configure(options = {}) {
    // Update system prompt if provided
    if (options.systemPrompt !== undefined && 
        options.systemPrompt !== this.options.systemPrompt) {
      
      // Remove old system message
      this.history = this.history.filter(msg => msg.role !== 'system');
      
      // Add new system message if needed
      if (options.systemPrompt) {
        this.history.unshift({
          role: 'system',
          content: options.systemPrompt
        });
      }
    }
    
    // Update options
    this.options = {
      ...this.options,
      ...options
    };
    
    return this;
  }
  
  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Assistant} - This instance
   */
  on(event, handler) {
    this.events.on(event, handler);
    return this;
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Assistant} - This instance
   */
  off(event, handler) {
    this.events.off(event, handler);
    return this;
  }
  
  /**
   * Prepare messages for model request
   * @param {Object} options - Request options
   * @returns {Array} - Prepared messages
   * @private
   */
  _prepareMessages(options) {
    let messages = [...this.history];
    
    // Apply message pruning if needed
    const maxMessages = options.maxMessages || Infinity;
    if (maxMessages < messages.length) {
      // Always keep system message if present
      const systemMessage = messages.find(msg => msg.role === 'system');
      
      // Get most recent messages
      const recentMessages = messages.slice(-maxMessages);
      
      // Add system message if not already included
      if (systemMessage && !recentMessages.some(msg => msg.role === 'system')) {
        messages = [systemMessage, ...recentMessages];
      } else {
        messages = recentMessages;
      }
    }
    
    return messages;
  }
  
  /**
   * Extract assistant message from model response
   * @param {Object} response - Model response
   * @returns {Object} - Extracted assistant message
   * @private
   */
  _extractAssistantMessage(response) {
    if (response.message) {
      return response.message;
    }
    
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message;
    }
    
    if (response.content) {
      return {
        role: 'assistant',
        content: response.content
      };
    }
    
    // Fallback case
    return {
      role: 'assistant',
      content: response.toString()
    };
  }
  
  /**
   * Manage history size to prevent it from growing too large
   * @private
   */
  _manageHistorySize() {
    if (!this.options.memory) {
      // Only keep system message and last exchange if memory is disabled
      const systemMessage = this.history.find(msg => msg.role === 'system');
      const lastUserMessage = [...this.history].reverse().find(msg => msg.role === 'user');
      const lastAssistantMessage = this.history[this.history.length - 1];
      
      this.history = [];
      
      if (systemMessage) {
        this.history.push(systemMessage);
      }
      
      if (lastUserMessage) {
        this.history.push(lastUserMessage);
      }
      
      if (lastAssistantMessage) {
        this.history.push(lastAssistantMessage);
      }
      
      return;
    }
    
    // Apply memory size limits
    const maxHistoryLength = this.options.memorySize * 2 + 1; // +1 for system message
    
    if (this.history.length > maxHistoryLength) {
      // Keep system message if present
      const systemMessage = this.history.find(msg => msg.role === 'system');
      
      // Remove oldest message pairs until within limit
      let newHistory = systemMessage ? [systemMessage] : [];
      
      // Add most recent messages up to memory limit
      const recentMessages = this.history.filter(msg => msg.role !== 'system').slice(-(this.options.memorySize * 2));
      newHistory = [...newHistory, ...recentMessages];
      
      this.history = newHistory;
    }
  }
}

module.exports = Assistant; 