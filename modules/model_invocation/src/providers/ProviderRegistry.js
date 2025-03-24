/**
 * ProviderRegistry
 * 
 * Manages the registry of AI model providers.
 * Handles provider registration, initialization, and access.
 */

const EventEmitter = require('events');
const OpenAIProvider = require('./OpenAIProvider');
const AnthropicProvider = require('./AnthropicProvider');
const LocalModelsProvider = require('./LocalModelsProvider');

class ProviderRegistry extends EventEmitter {
  /**
   * Creates a new ProviderRegistry instance
   * @param {Object} config - Configuration for the registry
   */
  constructor(config) {
    super();
    this.config = config;
    this.providers = new Map();
    this.initialized = false;
  }
  
  /**
   * Load and initialize all configured providers
   * @returns {Promise<Map>} - Map of initialized providers
   */
  async loadProviders() {
    if (this.initialized) {
      return this.providers;
    }
    
    // Load built-in providers
    const builtInProviders = {
      openai: OpenAIProvider,
      anthropic: AnthropicProvider,
      localModels: LocalModelsProvider
    };
    
    // Initialize each configured provider
    for (const [providerId, providerConfig] of Object.entries(this.config.providers)) {
      try {
        if (providerConfig.enabled) {
          // Check if provider is a built-in provider
          if (builtInProviders[providerId]) {
            const Provider = builtInProviders[providerId];
            const provider = new Provider(providerConfig);
            
            // Initialize provider
            await provider.initialize();
            
            // Register the provider
            this.providers.set(providerId, provider);
            
            this.emit('providerInitialized', {
              provider: providerId,
              status: 'success'
            });
          } else if (providerConfig.customProviderPath) {
            // Load custom provider
            try {
              const CustomProvider = require(providerConfig.customProviderPath);
              const provider = new CustomProvider(providerConfig);
              
              // Initialize provider
              await provider.initialize();
              
              // Register the provider
              this.providers.set(providerId, provider);
              
              this.emit('providerInitialized', {
                provider: providerId,
                status: 'success',
                custom: true
              });
            } catch (error) {
              this.emit('error', {
                provider: providerId,
                error: `Failed to load custom provider: ${error.message}`,
                details: error.stack
              });
            }
          } else {
            this.emit('error', {
              provider: providerId,
              error: 'Provider is enabled but no implementation found',
              details: 'Either use a built-in provider or specify customProviderPath'
            });
          }
        }
      } catch (error) {
        this.emit('error', {
          provider: providerId,
          error: `Failed to initialize provider: ${error.message}`,
          details: error.stack
        });
      }
    }
    
    this.initialized = true;
    return this.providers;
  }
  
  /**
   * Get a provider by ID
   * @param {string} providerId - ID of the provider to retrieve
   * @returns {Object|null} - Provider instance or null if not found
   */
  getProvider(providerId) {
    return this.providers.get(providerId) || null;
  }
  
  /**
   * Get all registered providers
   * @returns {Map} - Map of provider ID to provider instance
   */
  getAllProviders() {
    return this.providers;
  }
  
  /**
   * Register a new provider
   * @param {string} providerId - ID for the provider
   * @param {Object} provider - Provider instance
   * @returns {boolean} - Whether the registration was successful
   */
  registerProvider(providerId, provider) {
    if (this.providers.has(providerId)) {
      this.emit('error', {
        provider: providerId,
        error: 'Provider already registered',
        details: 'Use updateProvider to update an existing provider'
      });
      return false;
    }
    
    // Register the provider
    this.providers.set(providerId, provider);
    
    this.emit('providerRegistered', {
      provider: providerId
    });
    
    return true;
  }
  
  /**
   * Update an existing provider
   * @param {string} providerId - ID of the provider to update
   * @param {Object} provider - New provider instance
   * @returns {boolean} - Whether the update was successful
   */
  updateProvider(providerId, provider) {
    if (!this.providers.has(providerId)) {
      this.emit('error', {
        provider: providerId,
        error: 'Provider not found',
        details: 'Use registerProvider to register a new provider'
      });
      return false;
    }
    
    // Update the provider
    this.providers.set(providerId, provider);
    
    this.emit('providerUpdated', {
      provider: providerId
    });
    
    return true;
  }
  
  /**
   * Unregister a provider
   * @param {string} providerId - ID of the provider to unregister
   * @returns {boolean} - Whether the unregistration was successful
   */
  unregisterProvider(providerId) {
    if (!this.providers.has(providerId)) {
      return false;
    }
    
    // Clean up provider if it has a cleanup method
    const provider = this.providers.get(providerId);
    if (typeof provider.cleanup === 'function') {
      try {
        provider.cleanup();
      } catch (error) {
        this.emit('error', {
          provider: providerId,
          error: `Error during provider cleanup: ${error.message}`,
          details: error.stack
        });
      }
    }
    
    // Remove the provider
    this.providers.delete(providerId);
    
    this.emit('providerUnregistered', {
      provider: providerId
    });
    
    return true;
  }
  
  /**
   * Test connection to a provider
   * @param {string} providerId - ID of the provider to test
   * @returns {Promise<Object>} - Test results
   */
  async testProvider(providerId) {
    const provider = this.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    if (typeof provider.testConnection !== 'function') {
      throw new Error(`Provider ${providerId} does not support connection testing`);
    }
    
    try {
      const result = await provider.testConnection();
      
      this.emit('providerTested', {
        provider: providerId,
        success: true,
        details: result
      });
      
      return result;
    } catch (error) {
      this.emit('providerTested', {
        provider: providerId,
        success: false,
        error: error.message,
        details: error.stack
      });
      
      throw error;
    }
  }
  
  /**
   * Get the count of registered providers
   * @returns {number} - The number of registered providers
   */
  getProviderCount() {
    return this.providers.size;
  }
  
  /**
   * Check if a provider is registered
   * @param {string} providerId - ID of the provider to check
   * @returns {boolean} - Whether the provider is registered
   */
  hasProvider(providerId) {
    return this.providers.has(providerId);
  }
  
  /**
   * Get a list of provider IDs
   * @returns {Array<string>} - Array of provider IDs
   */
  getProviderIds() {
    return Array.from(this.providers.keys());
  }
}

module.exports = ProviderRegistry; 