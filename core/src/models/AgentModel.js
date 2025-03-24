/**
 * AgentModel.js
 * 
 * Model representing AI agent information within the ACIP protocol.
 * Handles agent configuration, capabilities, and state management.
 */

const BaseModel = require('./BaseModel');

// JSON Schema for agent data
const agentSchema = {
  type: 'object',
  required: ['agentId', 'created'],
  properties: {
    agentId: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    created: { type: 'number' },
    updated: { type: 'number' },
    version: { type: 'string' },
    status: { type: 'string', enum: ['inactive', 'initializing', 'active', 'paused', 'error'] },
    capabilities: { type: 'array' },
    models: { type: 'array' },
    configuration: { type: 'object' },
    metrics: { type: 'object' },
    owner: { type: 'string' },
    metadata: { type: 'object' }
  }
};

class AgentModel extends BaseModel {
  /**
   * Constructor for AgentModel
   * @param {Object} data - Initial agent data
   */
  constructor(data = {}) {
    // Generate default values for required fields if not provided
    const defaults = {
      agentId: data.agentId || `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created: data.created || Date.now(),
      updated: data.updated || Date.now(),
      status: data.status || 'inactive',
      capabilities: data.capabilities || [],
      models: data.models || [],
      configuration: data.configuration || {},
      metrics: data.metrics || {},
      metadata: data.metadata || {}
    };

    super({ ...defaults, ...data }, agentSchema);
  }

  /**
   * Gets the agent ID
   * @returns {string} Agent ID
   */
  get agentId() {
    return this.get('agentId');
  }

  /**
   * Gets the agent name
   * @returns {string|undefined} Agent name
   */
  get name() {
    return this.get('name');
  }

  /**
   * Gets the agent description
   * @returns {string|undefined} Agent description
   */
  get description() {
    return this.get('description');
  }

  /**
   * Gets the agent version
   * @returns {string|undefined} Agent version
   */
  get version() {
    return this.get('version');
  }

  /**
   * Gets the current status of the agent
   * @returns {string} Agent status
   */
  get status() {
    return this.get('status');
  }

  /**
   * Gets the agent capabilities
   * @returns {Array} List of capabilities
   */
  get capabilities() {
    return this.get('capabilities') || [];
  }

  /**
   * Gets the agent's configured models
   * @returns {Array} List of models
   */
  get models() {
    return this.get('models') || [];
  }

  /**
   * Gets the agent configuration
   * @returns {Object} Agent configuration
   */
  get configuration() {
    return this.get('configuration') || {};
  }

  /**
   * Gets the agent performance and operational metrics
   * @returns {Object} Agent metrics
   */
  get metrics() {
    return this.get('metrics') || {};
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
   * Gets the agent owner
   * @returns {string|undefined} Owner identifier
   */
  get owner() {
    return this.get('owner');
  }

  /**
   * Updates the agent status
   * @param {string} status - New status
   * @returns {AgentModel} This instance for chaining
   */
  updateStatus(status) {
    const validStatuses = ['inactive', 'initializing', 'active', 'paused', 'error'];
    if (validStatuses.includes(status)) {
      this.set('status', status);
      this.set('updated', Date.now());
    }
    return this;
  }

  /**
   * Adds a capability to the agent
   * @param {Object} capability - Capability to add
   * @returns {AgentModel} This instance for chaining
   */
  addCapability(capability) {
    if (!capability || typeof capability !== 'object') return this;
    
    const capabilities = [...this.capabilities];
    capabilities.push(capability);
    
    this.set('capabilities', capabilities);
    this.set('updated', Date.now());
    return this;
  }

  /**
   * Adds a model to the agent's available models
   * @param {Object} model - Model configuration
   * @returns {AgentModel} This instance for chaining
   */
  addModel(model) {
    if (!model || typeof model !== 'object') return this;
    
    const models = [...this.models];
    models.push(model);
    
    this.set('models', models);
    this.set('updated', Date.now());
    return this;
  }

  /**
   * Updates the agent configuration
   * @param {Object} config - Configuration updates
   * @returns {AgentModel} This instance for chaining
   */
  updateConfiguration(config) {
    if (!config || typeof config !== 'object') return this;
    
    const currentConfig = this.configuration;
    this.set('configuration', { ...currentConfig, ...config });
    this.set('updated', Date.now());
    return this;
  }

  /**
   * Updates the agent metrics
   * @param {Object} metrics - Metrics to update
   * @returns {AgentModel} This instance for chaining
   */
  updateMetrics(metrics) {
    if (!metrics || typeof metrics !== 'object') return this;
    
    const currentMetrics = this.metrics;
    this.set('metrics', { ...currentMetrics, ...metrics });
    return this;
  }

  /**
   * Creates a serialized representation of the agent for API responses
   * @param {boolean} includeMetrics - Whether to include metrics data
   * @returns {Object} Serialized agent data
   */
  serialize(includeMetrics = false) {
    const data = {
      agentId: this.agentId,
      name: this.name,
      description: this.description,
      version: this.version,
      status: this.status,
      capabilities: this.capabilities,
      models: this.models.map(model => ({
        id: model.id,
        name: model.name,
        version: model.version
      })),
      created: this.created,
      updated: this.updated,
      owner: this.owner
    };
    
    if (includeMetrics) {
      data.metrics = this.metrics;
    }
    
    return data;
  }
}

module.exports = AgentModel; 