/**
 * ContentModerator
 * 
 * Handles content moderation for both inputs to and outputs from AI models,
 * detecting and filtering potentially harmful or inappropriate content.
 */

const EventEmitter = require('events');
const { generateId } = require('../utils/identifiers');

class ContentModerator {
  /**
   * Creates a new ContentModerator instance
   * @param {Object} options - Content moderator options
   */
  constructor(options = {}) {
    this.config = options.config || {};
    this.modelRegistry = options.modelRegistry;
    this.events = new EventEmitter();
    
    // Configure moderation settings
    this.moderationCategories = this.config.categories || {
      hate: true,
      harassment: true,
      'self-harm': true,
      sexual: true,
      violence: true,
      'child-abuse': true,
      'illegal-activity': true,
      'dangerous-content': true
    };
    
    // Configure threshold for each category
    this.thresholds = this.config.thresholds || {
      hate: 0.8,
      harassment: 0.8,
      'self-harm': 0.8,
      sexual: 0.8,
      violence: 0.8,
      'child-abuse': 0.5, // Lower threshold for more sensitive categories
      'illegal-activity': 0.7,
      'dangerous-content': 0.7
    };
    
    // Configure moderation actions
    this.actions = this.config.actions || {
      block: true,   // Block the content completely
      warn: false,   // Allow but with warning
      flag: false,   // Allow but flag for review
    };
    
    // Configure moderation model/engine
    this.moderationModel = this.config.moderationModel || 'default';
    
    // Track moderation history
    this.history = [];
    this.historyLimit = this.config.historyLimit || 1000;
    
    // Initialize any external moderation services
    this._initializeModerationServices();
  }
  
  /**
   * Moderate input content before sending to AI model
   * @param {Object} request - The model request containing input to moderate
   * @returns {Promise<Object>} - Moderation result
   */
  async moderateInput(request) {
    // Extract content to moderate from request
    const content = this._extractInputContent(request);
    
    if (!content || content.length === 0) {
      return { 
        passed: true, 
        requestId: request.requestId,
        moderationId: generateId()
      };
    }
    
    // Perform moderation
    const result = await this._moderateContent(content, 'input', request);
    
    // Store result in history
    this._addToHistory({
      type: 'input',
      requestId: request.requestId,
      timestamp: Date.now(),
      content: this.config.storeContent ? content : null,
      result
    });
    
    // Emit events based on result
    if (!result.passed) {
      this.events.emit('input:blocked', {
        requestId: request.requestId,
        moderationId: result.moderationId,
        categories: result.flaggedCategories,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  /**
   * Moderate output content from AI model before returning to user
   * @param {Object} response - The model response containing output to moderate
   * @param {Object} request - The original request
   * @returns {Promise<Object>} - Moderation result
   */
  async moderateOutput(response, request) {
    // Extract content to moderate from response
    const content = this._extractOutputContent(response);
    
    if (!content || content.length === 0) {
      return { 
        passed: true, 
        requestId: request.requestId,
        moderationId: generateId()
      };
    }
    
    // Perform moderation
    const result = await this._moderateContent(content, 'output', request);
    
    // Store result in history
    this._addToHistory({
      type: 'output',
      requestId: request.requestId,
      timestamp: Date.now(),
      content: this.config.storeContent ? content : null,
      result
    });
    
    // Emit events based on result
    if (!result.passed) {
      this.events.emit('output:blocked', {
        requestId: request.requestId,
        moderationId: result.moderationId,
        categories: result.flaggedCategories,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  /**
   * Get moderation history
   * @param {Object} filter - Filter criteria
   * @returns {Array<Object>} - Moderation history entries
   */
  getHistory(filter = {}) {
    let results = [...this.history];
    
    // Apply filters
    if (filter.type) {
      results = results.filter(entry => entry.type === filter.type);
    }
    
    if (filter.passed !== undefined) {
      results = results.filter(entry => entry.result.passed === filter.passed);
    }
    
    if (filter.requestId) {
      results = results.filter(entry => entry.requestId === filter.requestId);
    }
    
    if (filter.moderationId) {
      results = results.filter(entry => entry.result.moderationId === filter.moderationId);
    }
    
    if (filter.category) {
      results = results.filter(entry => 
        entry.result.flaggedCategories && 
        entry.result.flaggedCategories.includes(filter.category)
      );
    }
    
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }
    
    return results;
  }
  
  /**
   * Clear moderation history
   */
  clearHistory() {
    this.history = [];
  }
  
  /**
   * Update moderation configuration
   * @param {Object} config - New configuration options
   */
  updateConfig(config) {
    if (config.categories) {
      this.moderationCategories = {
        ...this.moderationCategories,
        ...config.categories
      };
    }
    
    if (config.thresholds) {
      this.thresholds = {
        ...this.thresholds,
        ...config.thresholds
      };
    }
    
    if (config.actions) {
      this.actions = {
        ...this.actions,
        ...config.actions
      };
    }
    
    if (config.moderationModel) {
      this.moderationModel = config.moderationModel;
    }
    
    if (config.historyLimit) {
      this.historyLimit = config.historyLimit;
    }
    
    // Emit configuration updated event
    this.events.emit('config:updated', {
      timestamp: Date.now(),
      config: {
        categories: this.moderationCategories,
        thresholds: this.thresholds,
        actions: this.actions,
        moderationModel: this.moderationModel
      }
    });
  }
  
  /**
   * Register event listener for moderation events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.events.on(event, handler);
  }
  
  /**
   * Remove event listener for moderation events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.events.off(event, handler);
  }
  
  /**
   * Initialize external moderation services
   * @private
   */
  _initializeModerationServices() {
    // Implementation depends on which external services are used
    // This is a placeholder for service initialization
    this.externalServices = {};
    
    if (this.config.useExternalServices) {
      // Initialize external moderation services
      // Example: OpenAI Moderation API, Azure Content Moderator, etc.
      
      if (this.config.services?.openai) {
        // Setup OpenAI moderation
        this.externalServices.openai = {
          apiKey: this.config.services.openai.apiKey,
          endpoint: this.config.services.openai.endpoint || 'https://api.openai.com/v1/moderations'
        };
      }
      
      if (this.config.services?.azure) {
        // Setup Azure Content Moderator
        this.externalServices.azure = {
          apiKey: this.config.services.azure.apiKey,
          endpoint: this.config.services.azure.endpoint
        };
      }
    }
  }
  
  /**
   * Extract content to moderate from a request
   * @param {Object} request - The model request 
   * @returns {string} - Content to moderate
   * @private
   */
  _extractInputContent(request) {
    let content = '';
    
    // Handle messages format (ChatCompletion style)
    if (request.messages && Array.isArray(request.messages)) {
      content = request.messages
        .filter(m => m.role !== 'system') // Often skip system messages
        .map(m => m.content)
        .filter(Boolean)
        .join('\n');
    }
    
    // Handle prompt format (Completion style)
    if (request.prompt) {
      if (typeof request.prompt === 'string') {
        content = request.prompt;
      } else if (Array.isArray(request.prompt)) {
        content = request.prompt.join('\n');
      }
    }
    
    // Handle input format (sometimes used)
    if (request.input) {
      if (typeof request.input === 'string') {
        content = request.input;
      } else if (typeof request.input === 'object' && request.input.text) {
        content = request.input.text;
      }
    }
    
    return content;
  }
  
  /**
   * Extract content to moderate from a response
   * @param {Object} response - The model response
   * @returns {string} - Content to moderate
   * @private
   */
  _extractOutputContent(response) {
    let content = '';
    
    // Handle various response formats
    if (typeof response === 'string') {
      content = response;
    } else if (response.text) {
      content = response.text;
    } else if (response.content) {
      content = response.content;
    } else if (response.choices && Array.isArray(response.choices)) {
      // OpenAI-style response format
      content = response.choices
        .map(choice => {
          if (choice.text) return choice.text;
          if (choice.message?.content) return choice.message.content;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    
    return content;
  }
  
  /**
   * Add an entry to the moderation history
   * @param {Object} entry - History entry to add
   * @private
   */
  _addToHistory(entry) {
    this.history.unshift(entry);
    
    // Limit history size
    if (this.history.length > this.historyLimit) {
      this.history = this.history.slice(0, this.historyLimit);
    }
  }
  
  /**
   * Moderate content using configured methods
   * @param {string} content - Content to moderate
   * @param {string} type - 'input' or 'output'
   * @param {Object} request - Original request context
   * @returns {Promise<Object>} - Moderation result
   * @private
   */
  async _moderateContent(content, type, request) {
    const moderationId = generateId();
    
    // Skip moderation if it's disabled or special case
    if (this.config.disabled || request.skipModeration) {
      return {
        passed: true,
        moderationId,
        requestId: request.requestId,
        scores: {}
      };
    }
    
    try {
      // Check if we should use an external service
      if (this.config.useExternalServices) {
        return await this._moderateWithExternalService(content, type, request, moderationId);
      }
      
      // Otherwise use internal moderation
      return await this._moderateWithInternalModel(content, type, request, moderationId);
    } catch (error) {
      // Log the error
      console.error('Moderation error:', error);
      
      // Emit moderation error event
      this.events.emit('moderation:error', {
        error: error.message,
        moderationId,
        requestId: request.requestId,
        timestamp: Date.now()
      });
      
      // Default behavior on error depends on configuration
      // By default, fail open (allow content if moderation fails)
      const failAction = this.config.failAction || 'allow';
      
      return {
        passed: failAction === 'allow',
        moderationId,
        requestId: request.requestId,
        error: error.message,
        failOpen: failAction === 'allow'
      };
    }
  }
  
  /**
   * Moderate content using external moderation service
   * @param {string} content - Content to moderate
   * @param {string} type - 'input' or 'output'
   * @param {Object} request - Original request context
   * @param {string} moderationId - Unique moderation ID
   * @returns {Promise<Object>} - Moderation result
   * @private
   */
  async _moderateWithExternalService(content, type, request, moderationId) {
    let scores = {};
    let flaggedCategories = [];
    
    // Determine which service to use
    const service = this.config.preferredService || 'openai';
    
    if (service === 'openai' && this.externalServices.openai) {
      // Call OpenAI Moderation API
      const result = await this._callOpenAIModerationAPI(content);
      
      scores = result.scores || {};
      flaggedCategories = result.flagged || [];
      
    } else if (service === 'azure' && this.externalServices.azure) {
      // Call Azure Content Moderator
      const result = await this._callAzureContentModerator(content);
      
      scores = result.scores || {};
      flaggedCategories = result.flagged || [];
      
    } else {
      throw new Error(`Unsupported or unconfigured moderation service: ${service}`);
    }
    
    // Determine if content passes moderation
    const passed = flaggedCategories.length === 0;
    
    return {
      passed,
      moderationId,
      requestId: request.requestId,
      scores,
      flaggedCategories,
      service
    };
  }
  
  /**
   * Moderate content using internal moderation model
   * @param {string} content - Content to moderate
   * @param {string} type - 'input' or 'output'
   * @param {Object} request - Original request context
   * @param {string} moderationId - Unique moderation ID
   * @returns {Promise<Object>} - Moderation result
   * @private
   */
  async _moderateWithInternalModel(content, type, request, moderationId) {
    // This is a placeholder for a more sophisticated implementation that
    // would use a local ML model or rule-based system
    
    // Simple keyword-based moderation as fallback
    const scores = this._simpleKeywordModeration(content);
    
    // Check which categories exceed thresholds
    const flaggedCategories = [];
    
    for (const category of Object.keys(this.moderationCategories)) {
      if (this.moderationCategories[category] && 
          scores[category] && 
          scores[category] >= this.thresholds[category]) {
        flaggedCategories.push(category);
      }
    }
    
    // Determine if content passes moderation
    const passed = flaggedCategories.length === 0;
    
    return {
      passed,
      moderationId,
      requestId: request.requestId,
      scores,
      flaggedCategories
    };
  }
  
  /**
   * Call OpenAI Moderation API
   * @param {string} content - Content to moderate
   * @returns {Promise<Object>} - API response
   * @private
   */
  async _callOpenAIModerationAPI(content) {
    if (!this.externalServices.openai) {
      throw new Error('OpenAI moderation service not configured');
    }
    
    // Simple mock implementation
    // In a real implementation, this would make an API call
    return { 
      scores: {
        hate: 0.01,
        harassment: 0.02,
        'self-harm': 0.01,
        sexual: 0.01,
        violence: 0.01
      },
      flagged: []
    };
  }
  
  /**
   * Call Azure Content Moderator
   * @param {string} content - Content to moderate
   * @returns {Promise<Object>} - API response
   * @private
   */
  async _callAzureContentModerator(content) {
    if (!this.externalServices.azure) {
      throw new Error('Azure moderation service not configured');
    }
    
    // Simple mock implementation
    // In a real implementation, this would make an API call
    return { 
      scores: {
        hate: 0.01,
        harassment: 0.02,
        'self-harm': 0.01,
        sexual: 0.01,
        violence: 0.01
      },
      flagged: []
    };
  }
  
  /**
   * Simple keyword-based moderation
   * @param {string} content - Content to moderate
   * @returns {Object} - Category scores
   * @private
   */
  _simpleKeywordModeration(content) {
    // This is a very simplified implementation
    // A real implementation would use more sophisticated NLP techniques
    
    const lowerContent = content.toLowerCase();
    
    // Simple keyword lists per category (very basic example)
    const keywords = {
      hate: ['hate', 'racial slur'],
      harassment: ['harassment'],
      'self-harm': ['suicide', 'self-harm'],
      sexual: ['pornographic'],
      violence: ['violence', 'gore'],
      'illegal-activity': ['illegal'],
      'dangerous-content': ['dangerous']
    };
    
    // Calculate basic scores based on keyword matches
    const scores = {};
    
    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      const matches = categoryKeywords.filter(keyword => 
        lowerContent.includes(keyword.toLowerCase())
      );
      
      // Very simple scoring based on match ratio
      scores[category] = matches.length > 0 ? 0.5 : 0;
    }
    
    return scores;
  }
}

module.exports = ContentModerator; 