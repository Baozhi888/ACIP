/**
 * Validators for the Model Invocation Module
 * 
 * Provides validation functions for various inputs to the module.
 */

/**
 * Validates invocation options
 * @param {Object} options - The options to validate
 * @throws {Error} - If options are invalid
 */
function validateInvocationOptions(options) {
  if (!options) {
    throw new Error('Invocation options are required');
  }
  
  // If model selector is used, no model is required
  if (options.selector) {
    validateModelSelector(options.selector);
    return;
  }
  
  // Otherwise, model or model ID must be provided
  if (!options.model) {
    throw new Error('Model ID is required in invocation options');
  }
  
  // Input validation
  if (!options.input) {
    throw new Error('Input is required in invocation options');
  }
  
  // Messages validation if present (for chat models)
  if (options.input.messages) {
    validateMessages(options.input.messages);
  }
  
  // Function calling validation if present
  if (options.functions) {
    validateFunctions(options.functions);
  }
}

/**
 * Validates a model selector object
 * @param {Object} selector - The model selector to validate
 * @throws {Error} - If selector is invalid
 */
function validateModelSelector(selector) {
  if (!selector.task && !selector.preferredProviders && !selector.minCapabilities) {
    throw new Error('Model selector must include at least one selection criteria');
  }
}

/**
 * Validates messages for chat models
 * @param {Array} messages - The messages to validate
 * @throws {Error} - If messages are invalid
 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }
  
  for (const message of messages) {
    if (!message.role) {
      throw new Error('Each message must have a role');
    }
    
    if (message.content === undefined && !message.function_call) {
      throw new Error('Each message must have content or function_call');
    }
  }
}

/**
 * Validates functions for function calling
 * @param {Array} functions - The functions to validate
 * @throws {Error} - If functions are invalid
 */
function validateFunctions(functions) {
  if (!Array.isArray(functions)) {
    throw new Error('Functions must be an array');
  }
  
  for (const func of functions) {
    if (!func.name) {
      throw new Error('Each function must have a name');
    }
    
    if (!func.parameters) {
      throw new Error('Each function must have parameters defined');
    }
  }
}

/**
 * Validates configuration object
 * @param {Object} config - The configuration to validate
 * @throws {Error} - If configuration is invalid
 */
function validateConfig(config) {
  if (!config) {
    throw new Error('Configuration is required');
  }
  
  // Validate providers section
  if (!config.providers || Object.keys(config.providers).length === 0) {
    throw new Error('At least one provider must be configured');
  }
  
  // Validate each provider configuration
  for (const [provider, providerConfig] of Object.entries(config.providers)) {
    if (providerConfig.enabled && provider !== 'localModels') {
      if (!providerConfig.apiKey && !providerConfig.apiKeyEnvVar) {
        throw new Error(`API key is required for provider ${provider}`);
      }
    }
  }
  
  // Other validations can be added for caching, security, etc.
}

module.exports = {
  validateInvocationOptions,
  validateConfig,
  validateMessages,
  validateFunctions,
  validateModelSelector
}; 