/**
 * ConfigManager for the Model Invocation Module
 * 
 * Manages configuration for the Model Invocation Module, including loading, validating,
 * and providing access to configuration values.
 */

const fs = require('fs');
const path = require('path');
const { validateConfig } = require('../utils/validators');

class ConfigManager {
  /**
   * Creates a new ConfigManager instance
   * @param {Object} options - Options including config overrides
   */
  constructor(options = {}) {
    this.configPath = options.configPath || process.env.MODEL_INVOCATION_CONFIG_PATH;
    this.config = this._loadConfig(options);
  }
  
  /**
   * Load and merge configuration from multiple sources
   * @param {Object} options - Options including config overrides
   * @returns {Object} - The merged configuration
   * @private
   */
  _loadConfig(options) {
    // Start with default configuration
    let config = this._getDefaultConfig();
    
    // Load configuration from file if specified
    if (this.configPath && fs.existsSync(this.configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        config = this._mergeConfigs(config, fileConfig);
      } catch (error) {
        console.error(`Error loading config file: ${error.message}`);
      }
    }
    
    // Override with any options provided directly
    if (options) {
      config = this._mergeConfigs(config, options);
    }
    
    // Process environment variables in config values
    config = this._processEnvironmentVariables(config);
    
    // Validate the final configuration
    try {
      validateConfig(config);
    } catch (error) {
      console.error(`Configuration validation error: ${error.message}`);
      throw error;
    }
    
    return config;
  }
  
  /**
   * Gets the default configuration
   * @returns {Object} - The default configuration
   * @private
   */
  _getDefaultConfig() {
    return {
      providers: {
        openai: {
          enabled: true,
          apiKeyEnvVar: 'OPENAI_API_KEY',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-3.5-turbo',
          requestTimeout: 30000
        },
        anthropic: {
          enabled: false,
          apiKeyEnvVar: 'ANTHROPIC_API_KEY',
          baseUrl: 'https://api.anthropic.com',
          defaultModel: 'claude-instant-1',
          requestTimeout: 60000
        },
        localModels: {
          enabled: false,
          endpoints: {}
        }
      },
      defaults: {
        provider: 'openai',
        parameters: {
          temperature: 0.7,
          topP: 1.0,
          maxTokens: 1000
        },
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000
        }
      },
      selectionStrategy: {
        prioritizeBy: ['capability', 'cost', 'latency'],
        costWeighting: 0.4,
        latencyWeighting: 0.3,
        capabilityWeighting: 0.3
      },
      caching: {
        enabled: true,
        ttlSeconds: 3600,
        maxEntries: 1000,
        excludeModels: []
      },
      optimization: {
        requestBatching: {
          enabled: true,
          maxBatchSize: 20,
          maxDelayMs: 50
        },
        compression: {
          enabled: true,
          threshold: 1024
        }
      },
      streaming: {
        defaultEnabled: true,
        bufferSize: 1024
      },
      security: {
        inputValidation: {
          enabled: true,
          maxContentLength: 100000
        },
        outputFiltering: {
          enabled: false,
          policies: []
        }
      },
      observability: {
        metrics: {
          enabled: true,
          detailedTokenUsage: true
        },
        logging: {
          level: 'info',
          includePrompts: false,
          includeResponses: false
        },
        tracing: {
          enabled: false,
          sampleRate: 0.1
        }
      },
      quotas: {
        enabled: false,
        defaultLimits: {
          requestsPerMinute: 100,
          tokensPerDay: 1000000
        }
      }
    };
  }
  
  /**
   * Deep merge two configuration objects
   * @param {Object} target - Target object to merge into
   * @param {Object} source - Source object to merge from
   * @returns {Object} - Merged configuration
   * @private
   */
  _mergeConfigs(target, source) {
    const output = { ...target };
    
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          target[key] &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key])
        ) {
          // Recursively merge objects
          output[key] = this._mergeConfigs(target[key], source[key]);
        } else {
          // For arrays and primitives, overwrite
          output[key] = source[key];
        }
      }
    }
    
    return output;
  }
  
  /**
   * Process environment variables in configuration strings
   * @param {Object} config - The configuration object
   * @returns {Object} - Processed configuration
   * @private
   */
  _processEnvironmentVariables(config) {
    const processValue = (value) => {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const envVar = value.slice(2, -1);
        return process.env[envVar] || '';
      }
      return value;
    };
    
    const processObject = (obj) => {
      const processed = {};
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            processed[key] = processObject(value);
          } else if (Array.isArray(value)) {
            processed[key] = value.map(item => {
              if (item && typeof item === 'object') {
                return processObject(item);
              }
              return processValue(item);
            });
          } else {
            processed[key] = processValue(value);
          }
        }
      }
      
      return processed;
    };
    
    return processObject(config);
  }
  
  /**
   * Get the current configuration
   * @returns {Object} - The current configuration
   */
  getConfig() {
    return this.config;
  }
  
  /**
   * Get a specific configuration value by path
   * @param {string} path - Dot-separated path to the config value
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} - The configuration value
   */
  getValue(path, defaultValue) {
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Update the configuration with new values
   * @param {Object} updates - Configuration updates
   */
  updateConfig(updates) {
    this.config = this._mergeConfigs(this.config, updates);
  }
  
  /**
   * Save the current configuration to a file
   * @param {string} filePath - Path to save the configuration to
   * @returns {boolean} - Whether the save was successful
   */
  saveConfig(filePath) {
    filePath = filePath || this.configPath;
    
    if (!filePath) {
      throw new Error('No file path provided for saving configuration');
    }
    
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write the configuration to file
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error saving configuration: ${error.message}`);
      return false;
    }
  }
}

module.exports = ConfigManager; 