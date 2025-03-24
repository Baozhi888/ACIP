/**
 * ConfigManager.js
 * 
 * Configuration management for the Security & Authentication module.
 * Handles loading, validating, and providing access to security configurations.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

/**
 * Configuration Manager class
 * Manages security and authentication configurations
 */
class ConfigManager {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      // Default configuration
      configPath: process.env.SECURITY_CONFIG_PATH || 'security.config.json',
      
      // Watch for config changes
      watchConfig: false,
      watchInterval: 5000, // 5 seconds
      
      // Validation options
      validateOnLoad: true,
      
      // Default configurations
      defaultAuthConfig: {
        providers: ['local'],
        tokenExpiry: 3600,
        refreshTokenExpiry: 604800,
        verificationRequired: false,
        mfaEnabled: false
      },
      
      defaultAccessControlConfig: {
        defaultPolicy: 'deny',
        enableRBAC: true,
        enableABAC: false,
        cachePolicies: true,
        cacheTimeout: 300 // 5 minutes
      },
      
      defaultSecureCommConfig: {
        defaultEncryptionLevel: 'standard',
        autoNegotiateEncryption: true,
        encryptMetadata: false,
        compressionEnabled: true
      },
      
      defaultPrivacyConfig: {
        defaultPrivacyLevel: 'balanced',
        dataSensitivityLevels: {
          'pii': 'high',
          'financial': 'high',
          'health': 'high',
          'preferences': 'medium',
          'usage': 'low'
        }
      },
      
      // Override with user options
      ...options
    };
    
    this.logger = options.logger || console;
    this.eventEmitter = new EventEmitter();
    
    // Initialize configuration containers
    this.rawConfig = {};
    this.config = {
      auth: { ...this.options.defaultAuthConfig },
      accessControl: { ...this.options.defaultAccessControlConfig },
      secureCommunication: { ...this.options.defaultSecureCommConfig },
      privacy: { ...this.options.defaultPrivacyConfig },
      global: {}
    };
    
    this.watcher = null;
    this.lastConfigChange = Date.now();
  }
  
  /**
   * Initialize the configuration manager
   * @param {string} [configPath] - Override config file path
   * @returns {Promise<boolean>} Success status
   */
  async initialize(configPath = null) {
    try {
      // Use provided path or default
      const cfgPath = configPath || this.options.configPath;
      
      // Load configuration
      await this.loadConfig(cfgPath);
      
      // Set up config watcher if enabled
      if (this.options.watchConfig) {
        this._setupConfigWatcher(cfgPath);
      }
      
      this.logger.info('Configuration Manager initialized');
      return true;
    } catch (error) {
      this.logger.error(`Configuration Manager initialization failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Load configuration from file
   * @param {string} configPath - Path to configuration file
   * @returns {Promise<Object>} Loaded configuration
   */
  async loadConfig(configPath) {
    try {
      this.logger.info(`Loading configuration from ${configPath}`);
      
      // Check if file exists
      if (!fs.existsSync(configPath)) {
        this.logger.warn(`Configuration file not found: ${configPath}`);
        this.logger.info('Using default configuration');
        
        // Return current (default) config
        return this.config;
      }
      
      // Read and parse configuration file
      const configData = fs.readFileSync(configPath, 'utf8');
      this.rawConfig = JSON.parse(configData);
      
      // Validate configuration if enabled
      if (this.options.validateOnLoad) {
        const validationResult = this.validateConfig(this.rawConfig);
        if (!validationResult.valid) {
          this.logger.warn(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
          this.logger.info('Using default configuration with valid parts from file');
        }
      }
      
      // Merge with default configuration
      this._mergeConfig(this.rawConfig);
      
      this.lastConfigChange = Date.now();
      this.eventEmitter.emit('config:loaded', { config: this.config });
      
      return this.config;
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];
    
    // Check if config is an object
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { valid: false, errors };
    }
    
    // Validate authentication configuration
    if (config.auth) {
      if (config.auth.tokenExpiry && typeof config.auth.tokenExpiry !== 'number') {
        errors.push('auth.tokenExpiry must be a number');
      }
      
      if (config.auth.refreshTokenExpiry && typeof config.auth.refreshTokenExpiry !== 'number') {
        errors.push('auth.refreshTokenExpiry must be a number');
      }
      
      if (config.auth.providers && !Array.isArray(config.auth.providers)) {
        errors.push('auth.providers must be an array');
      }
    }
    
    // Validate access control configuration
    if (config.accessControl) {
      if (config.accessControl.defaultPolicy && 
          !['allow', 'deny'].includes(config.accessControl.defaultPolicy)) {
        errors.push("accessControl.defaultPolicy must be 'allow' or 'deny'");
      }
      
      if (config.accessControl.cacheTimeout && 
          typeof config.accessControl.cacheTimeout !== 'number') {
        errors.push('accessControl.cacheTimeout must be a number');
      }
    }
    
    // Validate secure communication configuration
    if (config.secureCommunication) {
      if (config.secureCommunication.defaultEncryptionLevel && 
          !['none', 'standard', 'high', 'end_to_end'].includes(
            config.secureCommunication.defaultEncryptionLevel
          )) {
        errors.push("secureCommunication.defaultEncryptionLevel must be 'none', 'standard', 'high', or 'end_to_end'");
      }
    }
    
    // Validate privacy configuration
    if (config.privacy) {
      if (config.privacy.defaultPrivacyLevel && 
          !['minimal', 'basic', 'balanced', 'strict'].includes(
            config.privacy.defaultPrivacyLevel
          )) {
        errors.push("privacy.defaultPrivacyLevel must be 'minimal', 'basic', 'balanced', or 'strict'");
      }
      
      if (config.privacy.dataSensitivityLevels && 
          typeof config.privacy.dataSensitivityLevels !== 'object') {
        errors.push('privacy.dataSensitivityLevels must be an object');
      }
    }
    
    return { 
      valid: errors.length === 0,
      errors 
    };
  }
  
  /**
   * Update configuration
   * @param {Object} newConfig - New configuration object
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(newConfig) {
    try {
      // Validate new configuration
      const validationResult = this.validateConfig(newConfig);
      if (!validationResult.valid) {
        throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
      }
      
      // Deep merge new configuration with existing config
      this._mergeConfig(newConfig);
      
      this.lastConfigChange = Date.now();
      this.eventEmitter.emit('config:updated', { config: this.config });
      
      return this.config;
    } catch (error) {
      this.logger.error(`Failed to update configuration: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Save configuration to file
   * @param {string} [configPath] - Path to save configuration (or use loaded path)
   * @returns {Promise<boolean>} Success status
   */
  async saveConfig(configPath = null) {
    try {
      const savePath = configPath || this.options.configPath;
      
      // Create directory if it doesn't exist
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write configuration to file
      fs.writeFileSync(
        savePath, 
        JSON.stringify(this.config, null, 2), 
        'utf8'
      );
      
      this.logger.info(`Configuration saved to ${savePath}`);
      this.eventEmitter.emit('config:saved', { path: savePath });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to save configuration: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get specific configuration section
   * @param {string} section - Configuration section name
   * @returns {Object} Configuration section
   */
  getConfig(section = null) {
    if (!section) {
      return this.config;
    }
    
    return this.config[section] || null;
  }
  
  /**
   * Get authentication configuration
   * @returns {Object} Authentication configuration
   */
  getAuthConfig() {
    return this.config.auth;
  }
  
  /**
   * Get access control configuration
   * @returns {Object} Access control configuration
   */
  getAccessControlConfig() {
    return this.config.accessControl;
  }
  
  /**
   * Get secure communication configuration
   * @returns {Object} Secure communication configuration
   */
  getSecureCommConfig() {
    return this.config.secureCommunication;
  }
  
  /**
   * Get privacy configuration
   * @returns {Object} Privacy configuration
   */
  getPrivacyConfig() {
    return this.config.privacy;
  }
  
  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.eventEmitter.on(event, handler);
  }
  
  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.eventEmitter.off(event, handler);
  }
  
  /**
   * Stop the configuration manager
   * @returns {Promise<boolean>} Success status
   */
  async stop() {
    try {
      // Stop file watcher if active
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }
      
      this.logger.info('Configuration Manager stopped');
      return true;
    } catch (error) {
      this.logger.error(`Failed to stop Configuration Manager: ${error.message}`);
      return false;
    }
  }
  
  // Private methods
  
  /**
   * Set up configuration file watcher
   * @param {string} configPath - Path to watch
   * @private
   */
  _setupConfigWatcher(configPath) {
    try {
      if (this.watcher) {
        this.watcher.close();
      }
      
      // Check if file exists before setting up watcher
      if (!fs.existsSync(configPath)) {
        this.logger.warn(`Cannot watch non-existent file: ${configPath}`);
        return;
      }
      
      // Set up file watcher
      this.watcher = fs.watch(configPath, async (eventType) => {
        if (eventType === 'change') {
          // Debounce rapid changes
          const now = Date.now();
          if (now - this.lastConfigChange < 1000) {
            return;
          }
          
          this.logger.info(`Configuration file changed: ${configPath}`);
          
          try {
            await this.loadConfig(configPath);
            this.eventEmitter.emit('config:reloaded', { config: this.config });
          } catch (error) {
            this.logger.error(`Failed to reload configuration: ${error.message}`);
          }
        }
      });
      
      this.logger.info(`Watching for changes in ${configPath}`);
    } catch (error) {
      this.logger.error(`Failed to set up config watcher: ${error.message}`);
    }
  }
  
  /**
   * Merge configuration with defaults
   * @param {Object} newConfig - New configuration
   * @private
   */
  _mergeConfig(newConfig) {
    // Merge each section separately to avoid overwriting unspecified sections
    if (newConfig.auth) {
      this.config.auth = {
        ...this.config.auth,
        ...newConfig.auth
      };
    }
    
    if (newConfig.accessControl) {
      this.config.accessControl = {
        ...this.config.accessControl,
        ...newConfig.accessControl
      };
    }
    
    if (newConfig.secureCommunication) {
      this.config.secureCommunication = {
        ...this.config.secureCommunication,
        ...newConfig.secureCommunication
      };
    }
    
    if (newConfig.privacy) {
      this.config.privacy = {
        ...this.config.privacy,
        ...newConfig.privacy
      };
      
      // Special handling for nested objects
      if (newConfig.privacy.dataSensitivityLevels) {
        this.config.privacy.dataSensitivityLevels = {
          ...this.config.privacy.dataSensitivityLevels,
          ...newConfig.privacy.dataSensitivityLevels
        };
      }
    }
    
    // Global settings
    if (newConfig.global) {
      this.config.global = {
        ...this.config.global,
        ...newConfig.global
      };
    }
  }
}

module.exports = ConfigManager; 