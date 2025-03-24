/**
 * Identifiers for the Model Invocation Module
 * 
 * Utilities for generating unique identifiers.
 */

/**
 * Generates a unique request ID
 * @returns {string} - A unique ID
 */
function generateRequestId() {
  // Generate a random hexadecimal string
  const hexPart = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  
  // Add a timestamp component for uniqueness
  const timestampPart = Date.now().toString(36);
  
  return `req_${timestampPart}_${hexPart}`;
}

/**
 * Generates a unique model ID
 * @param {string} provider - Provider name
 * @param {string} modelName - Model name
 * @returns {string} - A unique model ID
 */
function generateModelId(provider, modelName) {
  return `${provider}:${modelName}`;
}

/**
 * Parses a model ID into provider and model name
 * @param {string} modelId - The model ID to parse
 * @returns {Object} - Object with provider and modelName
 */
function parseModelId(modelId) {
  const [provider, ...modelNameParts] = modelId.split(':');
  return {
    provider,
    modelName: modelNameParts.join(':') // In case model name contains colons
  };
}

/**
 * Generates a unique batch ID
 * @returns {string} - A unique batch ID
 */
function generateBatchId() {
  // Generate a random hexadecimal string
  const hexPart = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  
  // Add a timestamp component for uniqueness
  const timestampPart = Date.now().toString(36);
  
  return `batch_${timestampPart}_${hexPart}`;
}

/**
 * Generates a unique chain ID
 * @returns {string} - A unique chain ID
 */
function generateChainId() {
  // Generate a random hexadecimal string
  const hexPart = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  
  // Add a timestamp component for uniqueness
  const timestampPart = Date.now().toString(36);
  
  return `chain_${timestampPart}_${hexPart}`;
}

module.exports = {
  generateRequestId,
  generateModelId,
  parseModelId,
  generateBatchId,
  generateChainId
}; 