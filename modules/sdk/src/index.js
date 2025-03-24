/**
 * ACIP - Adaptive Contextual Intelligence Protocol JavaScript SDK
 * Entry point file that exports all SDK components
 * 
 * @version 0.1.0
 * @license MIT
 */

// Core SDK modules
const ModelInvocation = require('./model-invocation');
const Assistant = require('./assistant');

// SDK version
const VERSION = '0.1.0';

/**
 * Initialize the ACIP SDK
 * @param {Object} config - SDK configuration options
 * @returns {Object} - Initialized SDK components
 */
function init(config = {}) {
  // Create core components
  const modelInvocation = new ModelInvocation(config);
  
  // Initialize main component if credentials provided
  if (config.apiKey || config.credentials) {
    modelInvocation.init(config);
  }
  
  // Return SDK instance
  return {
    modelInvocation,
    
    // Helper function to create assistant instances
    createAssistant(options = {}) {
      return new Assistant(modelInvocation, options);
    },
    
    // Utility functions
    getVersion() {
      return VERSION;
    },
    
    // Configuration update for all components
    configure(newConfig = {}) {
      modelInvocation.configure(newConfig);
      return this;
    }
  };
}

// Export main SDK initialization function
module.exports = {
  init,
  
  // Export classes for advanced usage
  ModelInvocation,
  Assistant,
  
  // Export version
  VERSION
}; 