/**
 * ContextManager.js
 * 
 * Main manager for the Context Management module.
 * Provides a unified interface for context operations including
 * the Adaptive Context Window and Context Memory System.
 */

const EventEmitter = require('events');
const { ModuleLifecycle } = require('../../../core/src/lifecycle/lifecycle');
const AdaptiveWindowManager = require('./AdaptiveWindowManager');
const ContextMemorySystem = require('./ContextMemorySystem');

/**
 * Context Manager class
 * Manages context data, window sizing, and memory
 */
class ContextManager extends ModuleLifecycle {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super(options);
    
    this.options = {
      storageType: 'memory', // 'memory', 'file', 'database'
      storagePath: './context-storage',
      maxContextSize: 100000, // Max size in bytes
      initialWindowSize: 4000, // Initial window size in tokens
      memoryRetention: {
        shortTerm: 86400,  // 24 hours in seconds
        longTerm: 2592000, // 30 days in seconds
      },
      privacySettings: {
        enablePruning: true,
        sensitiveDataTypes: ['pii', 'credentials'],
        encryptStorage: false,
      },
      ...options
    };
    
    this.logger = options.logger || console;
    this.eventEmitter = new EventEmitter();
    
    // Initialize contexts map
    this.contexts = new Map();
    
    // Initialize adaptive window manager
    this.windowManager = new AdaptiveWindowManager({
      initialSize: this.options.initialWindowSize,
      logger: this.logger,
      ...options.windowOptions
    });
    
    // Initialize memory system
    this.memorySystem = new ContextMemorySystem({
      logger: this.logger,
      ...options.memoryOptions
    });
    
    // Statistics and metrics
    this.stats = {
      totalContexts: 0,
      activeContexts: 0,
      totalOperations: 0,
      retrievalOperations: 0,
      updateOperations: 0,
      creationOperations: 0,
      deletionOperations: 0,
      averageContextSize: 0,
      contextSizeSamples: 0
    };
  }
  
  /**
   * Initialize the context manager
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} Success status
   */
  async initialize(config = {}) {
    try {
      this._changeState('INITIALIZING');
      
      // Merge config with existing options
      if (config) {
        this.options = {
          ...this.options,
          ...config
        };
      }
      
      // Setup storage adapter based on storageType
      await this._setupStorage();
      
      this.logger.info('Context Manager initialized');
      this._changeState('INITIALIZED');
      this.eventEmitter.emit('initialized', { moduleId: this.id });
      return true;
    } catch (error) {
      this._handleError('Initialization failed', error);
      return false;
    }
  }
  
  /**
   * Start the context manager
   * @returns {Promise<boolean>} Success status
   */
  async start() {
    try {
      this._changeState('STARTING');
      
      // Set up event handlers
      this._setupEventHandlers();
      
      // Load any existing contexts if using persistent storage
      if (this.options.storageType !== 'memory') {
        await this._loadStoredContexts();
      }
      
      this._changeState('RUNNING');
      this.logger.info('Context Manager started');
      this.eventEmitter.emit('started', { moduleId: this.id });
      return true;
    } catch (error) {
      this._handleError('Failed to start', error);
      return false;
    }
  }
  
  /**
   * Stop the context manager
   * @returns {Promise<boolean>} Success status
   */
  async stop() {
    try {
      this._changeState('STOPPING');
      
      // Persist any unsaved contexts if using persistent storage
      if (this.options.storageType !== 'memory') {
        await this._persistContexts();
      }
      
      // Clean up resources
      this.eventEmitter.removeAllListeners();
      
      this._changeState('STOPPED');
      this.logger.info('Context Manager stopped');
      this.eventEmitter.emit('stopped', { moduleId: this.id });
      return true;
    } catch (error) {
      this._handleError('Failed to stop', error);
      return false;
    }
  }
  
  /**
   * Destroy the context manager and clean up resources
   * @returns {Promise<boolean>} Success status
   */
  async destroy() {
    try {
      this._changeState('DESTROYING');
      
      // Clear all contexts
      this.contexts.clear();
      
      this._changeState('DESTROYED');
      this.logger.info('Context Manager destroyed');
      this.eventEmitter.emit('destroyed', { moduleId: this.id });
      return true;
    } catch (error) {
      this._handleError('Failed to destroy', error);
      return false;
    }
  }
  
  /**
   * Create a new context
   * @param {string} contextId - Context identifier
   * @param {Object} contextData - Initial context data
   * @param {Object} options - Creation options
   * @returns {Object} Created context
   */
  createContext(contextId, contextData = {}, options = {}) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      if (this.contexts.has(contextId)) {
        throw new Error(`Context with ID '${contextId}' already exists`);
      }
      
      // Create the context object
      const timestamp = Date.now();
      const context = {
        id: contextId,
        createdAt: timestamp,
        updatedAt: timestamp,
        data: { ...contextData },
        metadata: {
          size: 0,
          operations: 0,
          version: 1,
          ...options.metadata
        },
        content: {
          window: []
        }
      };
      
      // Calculate initial size
      const contextSize = this._calculateContextSize(context);
      context.metadata.size = contextSize;
      
      // Store the context
      this.contexts.set(contextId, context);
      
      // Update stats
      this.stats.totalContexts++;
      this.stats.activeContexts++;
      this.stats.creationOperations++;
      this.stats.totalOperations++;
      this.stats.averageContextSize = (
        (this.stats.averageContextSize * this.stats.contextSizeSamples) + contextSize
      ) / (this.stats.contextSizeSamples + 1);
      this.stats.contextSizeSamples++;
      
      this.logger.info(`Created context: ${contextId}`);
      this.eventEmitter.emit('context:created', { contextId, size: contextSize });
      
      return context;
    } catch (error) {
      this._handleError(`Failed to create context: ${contextId}`, error);
      throw error;
    }
  }
  
  /**
   * Get a context by ID
   * @param {string} contextId - Context identifier
   * @returns {Object|null} Context object or null if not found
   */
  getContext(contextId) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      const context = this.contexts.get(contextId);
      
      if (!context) {
        this.logger.warn(`Context not found: ${contextId}`);
        return null;
      }
      
      // Update stats
      this.stats.retrievalOperations++;
      this.stats.totalOperations++;
      
      this.logger.debug(`Retrieved context: ${contextId}`);
      this.eventEmitter.emit('context:retrieved', { contextId });
      
      return context;
    } catch (error) {
      this._handleError(`Failed to get context: ${contextId}`, error);
      return null;
    }
  }
  
  /**
   * Update a context with new data
   * @param {string} contextId - Context identifier
   * @param {Object} updateData - Data to update
   * @param {Object} options - Update options
   * @returns {Object|null} Updated context or null if not found
   */
  updateContext(contextId, updateData = {}, options = {}) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      const context = this.contexts.get(contextId);
      
      if (!context) {
        this.logger.warn(`Cannot update: Context not found: ${contextId}`);
        return null;
      }
      
      // Update the context data
      const previousVersion = context.metadata.version;
      context.updatedAt = Date.now();
      context.metadata.version++;
      context.metadata.operations++;
      
      // Deep merge update data
      this._deepMerge(context.data, updateData);
      
      // Calculate updated size
      const newSize = this._calculateContextSize(context);
      context.metadata.size = newSize;
      
      // Update stats
      this.stats.updateOperations++;
      this.stats.totalOperations++;
      this.stats.averageContextSize = (
        (this.stats.averageContextSize * this.stats.contextSizeSamples) + newSize
      ) / (this.stats.contextSizeSamples + 1);
      this.stats.contextSizeSamples++;
      
      this.logger.debug(`Updated context: ${contextId} (v${previousVersion} → v${context.metadata.version})`);
      this.eventEmitter.emit('context:updated', { 
        contextId, 
        previousVersion, 
        newVersion: context.metadata.version
      });
      
      return context;
    } catch (error) {
      this._handleError(`Failed to update context: ${contextId}`, error);
      return null;
    }
  }
  
  /**
   * Delete a context
   * @param {string} contextId - Context identifier
   * @returns {boolean} Success status
   */
  deleteContext(contextId) {
    try {
      if (!contextId) {
        throw new Error('Context ID is required');
      }
      
      if (!this.contexts.has(contextId)) {
        this.logger.warn(`Cannot delete: Context not found: ${contextId}`);
        return false;
      }
      
      // Delete the context
      this.contexts.delete(contextId);
      
      // Update stats
      this.stats.activeContexts--;
      this.stats.deletionOperations++;
      this.stats.totalOperations++;
      
      this.logger.info(`Deleted context: ${contextId}`);
      this.eventEmitter.emit('context:deleted', { contextId });
      
      return true;
    } catch (error) {
      this._handleError(`Failed to delete context: ${contextId}`, error);
      return false;
    }
  }
  
  /**
   * Add content to a context using the adaptive window
   * @param {string} contextId - Context identifier
   * @param {Object} content - Content to add
   * @param {Object} options - Options for adding content
   * @returns {Object} Window adjustment results
   */
  addToContext(contextId, content, options = {}) {
    try {
      const context = this.getContext(contextId);
      
      if (!context) {
        throw new Error(`Context not found: ${contextId}`);
      }
      
      // Add content using the adaptive window manager
      const result = this.windowManager.addContent(context, content, options);
      
      // Update context's content window
      context.content.window = result.window;
      context.updatedAt = Date.now();
      context.metadata.operations++;
      context.metadata.version++;
      
      // Calculate updated size
      const newSize = this._calculateContextSize(context);
      context.metadata.size = newSize;
      
      // Update stats
      this.stats.updateOperations++;
      this.stats.totalOperations++;
      
      this.logger.debug(`Added content to context: ${contextId} (${result.adjustmentType})`);
      this.eventEmitter.emit('context:content:added', { 
        contextId, 
        adjustmentType: result.adjustmentType,
        complexity: result.complexity,
        metrics: result.metrics
      });
      
      return {
        contextId,
        ...result
      };
    } catch (error) {
      this._handleError(`Failed to add content to context: ${contextId}`, error);
      throw error;
    }
  }
  
  /**
   * Add a memory item to the context memory system
   * @param {string} contextId - Context identifier (or null for global memory)
   * @param {Object} memoryItem - Memory item to store
   * @returns {string} ID of the stored memory item
   */
  storeMemory(contextId, memoryItem) {
    try {
      // Validate context if ID is provided
      if (contextId && !this.contexts.has(contextId)) {
        throw new Error(`Context not found: ${contextId}`);
      }
      
      // Prepare memory item
      const itemToStore = { ...memoryItem };
      
      // Add context reference if a context is specified
      if (contextId) {
        itemToStore.metadata = {
          ...itemToStore.metadata,
          contextId
        };
        
        // Add context reference to tags for easier retrieval
        if (!itemToStore.tags) {
          itemToStore.tags = [];
        }
        itemToStore.tags.push(`context:${contextId}`);
      }
      
      // Store the memory
      const memoryId = this.memorySystem.store(itemToStore);
      
      // Update context metadata if a context is specified
      if (contextId) {
        const context = this.contexts.get(contextId);
        if (!context.metadata.memoryIds) {
          context.metadata.memoryIds = [];
        }
        context.metadata.memoryIds.push(memoryId);
        context.updatedAt = Date.now();
      }
      
      this.logger.debug(`Stored memory: ${memoryId} ${contextId ? `for context: ${contextId}` : '(global)'}`);
      this.eventEmitter.emit('memory:stored', { memoryId, contextId });
      
      return memoryId;
    } catch (error) {
      this._handleError(`Failed to store memory${contextId ? ` for context: ${contextId}` : ''}`, error);
      throw error;
    }
  }
  
  /**
   * Retrieve a memory item from the memory system
   * @param {string} memoryId - Memory ID to retrieve
   * @param {Object} options - Retrieval options
   * @returns {Object|null} Memory item or null if not found
   */
  retrieveMemory(memoryId, options = {}) {
    try {
      const memory = this.memorySystem.retrieve(memoryId, options);
      
      if (memory) {
        this.logger.debug(`Retrieved memory: ${memoryId}`);
        this.eventEmitter.emit('memory:retrieved', { memoryId });
      } else {
        this.logger.debug(`Memory not found: ${memoryId}`);
      }
      
      return memory;
    } catch (error) {
      this._handleError(`Failed to retrieve memory: ${memoryId}`, error);
      return null;
    }
  }
  
  /**
   * Query memories based on criteria
   * @param {Object} query - Query criteria
   * @param {string} [contextId] - Optional context to scope the query
   * @param {Object} options - Query options
   * @returns {Array} Matching memory items
   */
  queryMemories(query = {}, contextId = null, options = {}) {
    try {
      // If context specified, add it to the query
      if (contextId) {
        if (!query.tags) {
          query.tags = [];
        }
        query.tags.push(`context:${contextId}`);
      }
      
      // Execute the query
      const results = this.memorySystem.query(query, options);
      
      this.logger.debug(`Memory query returned ${results.length} results`);
      this.eventEmitter.emit('memory:queried', { 
        contextId, 
        resultCount: results.length
      });
      
      return results;
    } catch (error) {
      this._handleError(`Failed to query memories${contextId ? ` for context: ${contextId}` : ''}`, error);
      return [];
    }
  }
  
  /**
   * Consolidate memories from short-term to long-term
   * @returns {Object} Consolidation statistics
   */
  consolidateMemories() {
    try {
      const result = this.memorySystem.consolidate();
      
      this.logger.info(`Consolidated memories: ${result.moved} moved, ${result.pruned} pruned`);
      this.eventEmitter.emit('memory:consolidated', result);
      
      return result;
    } catch (error) {
      this._handleError('Failed to consolidate memories', error);
      return { moved: 0, pruned: 0 };
    }
  }
  
  /**
   * Get statistics about the context manager
   * @returns {Object} Statistics and metrics
   */
  getStats() {
    const memoryStats = this.memorySystem.getStats();
    const windowConfig = this.windowManager.getConfig();
    
    return {
      ...this.stats,
      memory: memoryStats,
      window: windowConfig,
      contextCount: this.contexts.size
    };
  }
  
  /**
   * Event handler registration
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.eventEmitter.on(event, handler);
  }
  
  /**
   * Event handler removal
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.eventEmitter.off(event, handler);
  }
  
  /**
   * Calculate the size of a context in bytes (approximate)
   * @param {Object} context - Context object
   * @returns {number} Size in bytes
   * @private
   */
  _calculateContextSize(context) {
    return Buffer.byteLength(JSON.stringify(context));
  }
  
  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   * @private
   */
  _deepMerge(target, source) {
    if (!source) return target;
    
    const output = { ...target };
    
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }
  
  /**
   * Check if value is an object
   * @param {*} item - Item to check
   * @returns {boolean} True if object
   * @private
   */
  _isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  
  /**
   * Set up storage adapter based on configuration
   * @returns {Promise<void>}
   * @private
   */
  async _setupStorage() {
    // In a real implementation, this would initialize different storage backends
    // For now, we're using in-memory storage
    this.logger.info(`Using ${this.options.storageType} storage for contexts`);
  }
  
  /**
   * Set up event handlers
   * @private
   */
  _setupEventHandlers() {
    // Example internal event handlers
    this.eventEmitter.on('context:created', this._onContextCreated.bind(this));
    this.eventEmitter.on('context:deleted', this._onContextDeleted.bind(this));
  }
  
  /**
   * Load contexts from persistent storage
   * @returns {Promise<void>}
   * @private
   */
  async _loadStoredContexts() {
    // In a real implementation, this would load contexts from disk or database
    this.logger.info('Would load contexts from persistent storage');
  }
  
  /**
   * Persist contexts to storage
   * @returns {Promise<void>}
   * @private
   */
  async _persistContexts() {
    // In a real implementation, this would save contexts to disk or database
    this.logger.info(`Would persist ${this.contexts.size} contexts to storage`);
  }
  
  /**
   * Handle context created event
   * @param {Object} data - Event data
   * @private
   */
  _onContextCreated(data) {
    // Additional logic for context creation
    this.logger.debug(`Internal handler: Context created: ${data.contextId}`);
  }
  
  /**
   * Handle context deleted event
   * @param {Object} data - Event data
   * @private
   */
  _onContextDeleted(data) {
    // Additional cleanup for context deletion
    this.logger.debug(`Internal handler: Context deleted: ${data.contextId}`);
  }
  
  /**
   * Handle errors
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @private
   */
  _handleError(message, error) {
    this.logger.error(`${message}: ${error.message}`);
    this.eventEmitter.emit('error', {
      message,
      error: error.message,
      stack: error.stack
    });
    
    if (this.state !== 'ERROR') {
      this._changeState('ERROR');
    }
  }
}

module.exports = ContextManager; 