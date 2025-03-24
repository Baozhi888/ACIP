/**
 * ModelRegistry
 * 
 * Manages the registry of available AI models across providers.
 * Handles model discovery, registration, and capabilities tracking.
 */

const EventEmitter = require('events');
const { generateModelId, parseModelId } = require('../utils/identifiers');

class ModelRegistry extends EventEmitter {
  /**
   * Creates a new ModelRegistry instance
   * @param {Object} config - Configuration for the registry
   */
  constructor(config) {
    super();
    this.config = config;
    this.models = new Map();
    this.modelsByProvider = new Map();
    this.modelCapabilities = new Map();
  }
  
  /**
   * Discover available models from providers
   * @param {ProviderRegistry} providerRegistry - Provider registry to discover models from
   * @returns {Promise<Map>} - The updated models map
   */
  async discoverModels(providerRegistry) {
    const providers = providerRegistry.getAllProviders();
    
    for (const [providerId, provider] of providers) {
      try {
        if (provider.enabled) {
          const models = await provider.listModels();
          
          for (const model of models) {
            this.registerModel({
              id: generateModelId(providerId, model.id),
              providerId,
              name: model.name || model.id,
              capabilities: model.capabilities || [],
              properties: model.properties || {},
              version: model.version,
              tags: model.tags || []
            });
          }
          
          this.emit('modelsDiscovered', {
            provider: providerId,
            count: models.length
          });
        }
      } catch (error) {
        this.emit('error', {
          provider: providerId,
          error: error.message,
          details: error.stack
        });
      }
    }
    
    return this.models;
  }
  
  /**
   * Register a new model or update an existing model
   * @param {Object} modelInfo - Information about the model
   * @returns {string} - The model ID
   */
  registerModel(modelInfo) {
    const { id, providerId, name, capabilities = [], properties = {}, version, tags = [] } = modelInfo;
    
    // Validate required properties
    if (!id || !providerId) {
      throw new Error('Model ID and provider ID are required');
    }
    
    // Create or update the model entry
    const model = {
      id,
      providerId,
      name: name || id,
      capabilities,
      properties,
      version,
      tags,
      registeredAt: this.models.has(id) 
        ? this.models.get(id).registeredAt 
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store the model in the registry
    this.models.set(id, model);
    
    // Update the provider models map
    if (!this.modelsByProvider.has(providerId)) {
      this.modelsByProvider.set(providerId, new Map());
    }
    this.modelsByProvider.get(providerId).set(id, model);
    
    // Update capabilities index
    for (const capability of capabilities) {
      if (!this.modelCapabilities.has(capability)) {
        this.modelCapabilities.set(capability, new Set());
      }
      this.modelCapabilities.get(capability).add(id);
    }
    
    this.emit('modelRegistered', {
      modelId: id,
      provider: providerId,
      name
    });
    
    return id;
  }
  
  /**
   * Unregister a model
   * @param {string} modelId - ID of the model to unregister
   * @returns {boolean} - Whether the model was successfully unregistered
   */
  unregisterModel(modelId) {
    if (!this.models.has(modelId)) {
      return false;
    }
    
    const model = this.models.get(modelId);
    const { providerId, capabilities } = model;
    
    // Remove from main registry
    this.models.delete(modelId);
    
    // Remove from provider models map
    if (this.modelsByProvider.has(providerId)) {
      this.modelsByProvider.get(providerId).delete(modelId);
      
      // Clean up provider entry if empty
      if (this.modelsByProvider.get(providerId).size === 0) {
        this.modelsByProvider.delete(providerId);
      }
    }
    
    // Remove from capabilities index
    for (const capability of capabilities) {
      if (this.modelCapabilities.has(capability)) {
        this.modelCapabilities.get(capability).delete(modelId);
        
        // Clean up capability entry if empty
        if (this.modelCapabilities.get(capability).size === 0) {
          this.modelCapabilities.delete(capability);
        }
      }
    }
    
    this.emit('modelUnregistered', {
      modelId,
      provider: providerId
    });
    
    return true;
  }
  
  /**
   * Get information about a model
   * @param {string} modelId - ID of the model to retrieve
   * @returns {Object|null} - Model information or null if not found
   */
  getModel(modelId) {
    return this.models.has(modelId) ? this.models.get(modelId) : null;
  }
  
  /**
   * List all available models
   * @param {Object} filter - Optional filter criteria
   * @returns {Array<Object>} - Array of model information
   */
  listModels(filter = {}) {
    let models = Array.from(this.models.values());
    
    // Apply provider filter
    if (filter.provider) {
      models = models.filter(model => model.providerId === filter.provider);
    }
    
    // Apply capabilities filter
    if (filter.capabilities && filter.capabilities.length > 0) {
      models = models.filter(model => {
        return filter.capabilities.every(cap => model.capabilities.includes(cap));
      });
    }
    
    // Apply tags filter
    if (filter.tags && filter.tags.length > 0) {
      models = models.filter(model => {
        return filter.tags.some(tag => model.tags.includes(tag));
      });
    }
    
    // Apply version filter
    if (filter.version) {
      models = models.filter(model => model.version === filter.version);
    }
    
    return models;
  }
  
  /**
   * Get all models for a provider
   * @param {string} providerId - Provider ID
   * @returns {Array<Object>} - Array of model information
   */
  getProviderModels(providerId) {
    if (!this.modelsByProvider.has(providerId)) {
      return [];
    }
    
    return Array.from(this.modelsByProvider.get(providerId).values());
  }
  
  /**
   * Get all models with a specific capability
   * @param {string} capability - Capability to filter by
   * @returns {Array<Object>} - Array of model information
   */
  getModelsByCapability(capability) {
    if (!this.modelCapabilities.has(capability)) {
      return [];
    }
    
    const modelIds = this.modelCapabilities.get(capability);
    return Array.from(modelIds).map(id => this.models.get(id));
  }
  
  /**
   * Get all models with all of the specified capabilities
   * @param {Array<string>} capabilities - Capabilities to filter by
   * @returns {Array<Object>} - Array of model information
   */
  getModelsByCapabilities(capabilities) {
    return this.listModels({ capabilities });
  }
  
  /**
   * Get capabilities for a specific model
   * @param {string} modelId - ID of the model
   * @returns {Array<string>} - Array of capability names
   */
  getModelCapabilities(modelId) {
    const model = this.getModel(modelId);
    return model ? model.capabilities : [];
  }
  
  /**
   * Update model capabilities
   * @param {string} modelId - ID of the model
   * @param {Array<string>} capabilities - New capabilities
   * @returns {boolean} - Whether the update was successful
   */
  updateModelCapabilities(modelId, capabilities) {
    if (!this.models.has(modelId)) {
      return false;
    }
    
    const model = this.models.get(modelId);
    const oldCapabilities = model.capabilities;
    
    // Remove model from old capabilities
    for (const capability of oldCapabilities) {
      if (this.modelCapabilities.has(capability)) {
        this.modelCapabilities.get(capability).delete(modelId);
        
        // Clean up capability entry if empty
        if (this.modelCapabilities.get(capability).size === 0) {
          this.modelCapabilities.delete(capability);
        }
      }
    }
    
    // Add model to new capabilities
    for (const capability of capabilities) {
      if (!this.modelCapabilities.has(capability)) {
        this.modelCapabilities.set(capability, new Set());
      }
      this.modelCapabilities.get(capability).add(modelId);
    }
    
    // Update model
    model.capabilities = capabilities;
    model.updatedAt = new Date().toISOString();
    this.models.set(modelId, model);
    
    this.emit('modelUpdated', {
      modelId,
      provider: model.providerId,
      updatedFields: ['capabilities']
    });
    
    return true;
  }
  
  /**
   * Get the count of registered models
   * @returns {number} - The number of registered models
   */
  getModelCount() {
    return this.models.size;
  }
  
  /**
   * Check if a model exists
   * @param {string} modelId - ID of the model to check
   * @returns {boolean} - Whether the model exists
   */
  hasModel(modelId) {
    return this.models.has(modelId);
  }
  
  /**
   * Find the best matching model based on criteria
   * @param {Object} criteria - Selection criteria
   * @returns {Object|null} - Best matching model or null if none found
   */
  findBestMatchingModel(criteria) {
    const { capabilities = [], providers = [], task, tags = [] } = criteria;
    
    // Get all models that match the required capabilities
    let candidates = capabilities.length > 0
      ? this.getModelsByCapabilities(capabilities)
      : Array.from(this.models.values());
    
    // Filter by providers if specified
    if (providers.length > 0) {
      candidates = candidates.filter(model => providers.includes(model.providerId));
    }
    
    // Filter by tags if specified
    if (tags.length > 0) {
      candidates = candidates.filter(model => {
        return tags.some(tag => model.tags.includes(tag));
      });
    }
    
    // Filter by task if specified
    if (task) {
      candidates = candidates.filter(model => {
        return model.tags.includes(`task:${task}`) || 
               model.capabilities.includes(`task:${task}`);
      });
    }
    
    // If no candidates found, return null
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort candidates by criteria and return the best match
    // For now, just return the first one, but this could be expanded
    // with more sophisticated selection logic
    return candidates[0];
  }
}

module.exports = ModelRegistry; 