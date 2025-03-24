/**
 * ContextModel.js
 * 
 * Model representing context information within the ACIP protocol.
 * Handles storage, validation, and operations for contextual data.
 */

const BaseModel = require('./BaseModel');

// JSON Schema for context data
const contextSchema = {
  type: 'object',
  required: ['contextId', 'created'],
  properties: {
    contextId: { type: 'string' },
    sessionId: { type: 'string' },
    userId: { type: 'string' },
    created: { type: 'number' },
    updated: { type: 'number' },
    type: { type: 'string' },
    metadata: { type: 'object' },
    content: { type: 'object' },
    references: { type: 'array' },
    ttl: { type: 'number' },
    priority: { type: 'number' }
  }
};

class ContextModel extends BaseModel {
  /**
   * Constructor for ContextModel
   * @param {Object} data - Initial context data
   */
  constructor(data = {}) {
    // Generate default values for required fields if not provided
    const defaults = {
      contextId: data.contextId || `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created: data.created || Date.now(),
      updated: data.updated || Date.now(),
      metadata: data.metadata || {},
      content: data.content || {},
      references: data.references || [],
      priority: data.priority !== undefined ? data.priority : 1
    };

    super({ ...defaults, ...data }, contextSchema);
  }

  /**
   * Gets the context ID
   * @returns {string} Context ID
   */
  get contextId() {
    return this.get('contextId');
  }

  /**
   * Gets the user ID associated with this context
   * @returns {string|undefined} User ID
   */
  get userId() {
    return this.get('userId');
  }

  /**
   * Gets the session ID associated with this context
   * @returns {string|undefined} Session ID
   */
  get sessionId() {
    return this.get('sessionId');
  }

  /**
   * Gets the creation timestamp
   * @returns {number} Creation timestamp (milliseconds since epoch)
   */
  get created() {
    return this.get('created');
  }

  /**
   * Gets the last update timestamp
   * @returns {number} Update timestamp (milliseconds since epoch)
   */
  get updated() {
    return this.get('updated');
  }

  /**
   * Gets the context type
   * @returns {string|undefined} Context type
   */
  get type() {
    return this.get('type');
  }

  /**
   * Gets the context content
   * @returns {Object} Context content
   */
  get content() {
    return this.get('content') || {};
  }

  /**
   * Gets the context metadata
   * @returns {Object} Context metadata
   */
  get metadata() {
    return this.get('metadata') || {};
  }

  /**
   * Gets the time-to-live value in seconds
   * @returns {number|undefined} TTL in seconds
   */
  get ttl() {
    return this.get('ttl');
  }

  /**
   * Gets the priority level (higher = more important)
   * @returns {number} Priority level
   */
  get priority() {
    return this.get('priority');
  }

  /**
   * Updates the context with new content
   * @param {Object} content - New content to merge with existing content
   * @returns {ContextModel} This instance for chaining
   */
  updateContent(content) {
    if (content && typeof content === 'object') {
      const currentContent = this.content;
      this.set('content', { ...currentContent, ...content });
      this.set('updated', Date.now());
    }
    return this;
  }

  /**
   * Updates the context metadata
   * @param {Object} metadata - New metadata to merge with existing metadata
   * @returns {ContextModel} This instance for chaining
   */
  updateMetadata(metadata) {
    if (metadata && typeof metadata === 'object') {
      const currentMetadata = this.metadata;
      this.set('metadata', { ...currentMetadata, ...metadata });
      this.set('updated', Date.now());
    }
    return this;
  }

  /**
   * Adds a reference to another context or resource
   * @param {string} referenceId - ID of the referenced context or resource
   * @param {string} type - Type of reference
   * @returns {ContextModel} This instance for chaining
   */
  addReference(referenceId, type = 'context') {
    if (!referenceId) return this;
    
    const references = this.get('references') || [];
    references.push({
      id: referenceId,
      type,
      timestamp: Date.now()
    });
    
    this.set('references', references);
    this.set('updated', Date.now());
    return this;
  }

  /**
   * Checks if the context has expired based on its TTL
   * @returns {boolean} True if expired, false otherwise
   */
  isExpired() {
    const ttl = this.ttl;
    if (!ttl) return false;
    
    const expirationTime = this.created + (ttl * 1000);
    return Date.now() > expirationTime;
  }

  /**
   * Creates a new version of this context
   * @returns {ContextModel} New context model instance with a new ID
   */
  createNewVersion() {
    const data = this.toObject();
    delete data.contextId; // Will generate a new ID
    data.created = Date.now();
    data.updated = Date.now();
    
    // Add reference to previous version
    const newContext = new ContextModel(data);
    newContext.addReference(this.contextId, 'previous_version');
    
    return newContext;
  }
}

module.exports = ContextModel; 