/**
 * serialization.js
 * 
 * Utilities for serializing and deserializing ACIP models and data.
 * Provides functions for converting between different formats and ensuring
 * data consistency across protocol components.
 */

const ContextModel = require('./ContextModel');
const AgentModel = require('./AgentModel');

/**
 * Supported serialization formats
 */
const FORMAT = {
  JSON: 'json',
  BINARY: 'binary',
  CBOR: 'cbor',    // Concise Binary Object Representation
  MSGPACK: 'msgpack'
};

/**
 * Serializes a model instance or object to the specified format
 * 
 * @param {Object|BaseModel} data - The data to serialize
 * @param {string} format - Format to serialize to (default: 'json')
 * @param {Object} options - Additional options for serialization
 * @returns {string|Buffer} Serialized data
 */
function serialize(data, format = FORMAT.JSON, options = {}) {
  // First convert model instances to plain objects if needed
  let objectData = data;
  
  if (data && typeof data === 'object' && typeof data.toObject === 'function') {
    objectData = data.toObject();
  }
  
  switch (format) {
    case FORMAT.JSON:
      return JSON.stringify(objectData, null, options.pretty ? 2 : undefined);
    
    case FORMAT.BINARY:
      // Basic binary format (JSON string to Buffer)
      return Buffer.from(JSON.stringify(objectData));
    
    case FORMAT.CBOR:
    case FORMAT.MSGPACK:
      // In a real implementation, we'd use libraries for these formats
      throw new Error(`Serialization format '${format}' not implemented yet`);
    
    default:
      throw new Error(`Unknown serialization format: ${format}`);
  }
}

/**
 * Deserializes data from the specified format into an object or model instance
 * 
 * @param {string|Buffer} data - The serialized data
 * @param {string} format - Format to deserialize from (default: 'json')
 * @param {string} modelType - Type of model to create (context, agent, etc.) 
 * @param {Object} options - Additional options for deserialization
 * @returns {Object|BaseModel} Deserialized data
 */
function deserialize(data, format = FORMAT.JSON, modelType = null, options = {}) {
  let objectData;
  
  switch (format) {
    case FORMAT.JSON:
      objectData = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
      break;
    
    case FORMAT.BINARY:
      // Basic binary format (Buffer to JSON string to object)
      objectData = JSON.parse(data.toString());
      break;
    
    case FORMAT.CBOR:
    case FORMAT.MSGPACK:
      // In a real implementation, we'd use libraries for these formats
      throw new Error(`Deserialization format '${format}' not implemented yet`);
    
    default:
      throw new Error(`Unknown deserialization format: ${format}`);
  }
  
  // If no model type specified, return plain object
  if (!modelType) {
    return objectData;
  }
  
  // Convert to appropriate model instance
  switch (modelType.toLowerCase()) {
    case 'context':
      return new ContextModel(objectData);
      
    case 'agent':
      return new AgentModel(objectData);
      
    default:
      throw new Error(`Unknown model type: ${modelType}`);
  }
}

/**
 * Converts between different models or formats
 * 
 * @param {Object} data - The data to convert
 * @param {string} sourceType - Source type or format
 * @param {string} targetType - Target type or format
 * @param {Object} options - Additional options for conversion
 * @returns {Object} Converted data
 */
function convert(data, sourceType, targetType, options = {}) {
  // This is a placeholder for more complex conversion logic
  if (sourceType === targetType) {
    return data;
  }
  
  // Example conversion from context to agent (useful for creating an agent from context)
  if (sourceType === 'context' && targetType === 'agent' && data instanceof ContextModel) {
    const contextData = data.toObject();
    return new AgentModel({
      name: `Agent from ${contextData.contextId}`,
      metadata: {
        sourceContext: contextData.contextId,
        sourceType: contextData.type
      },
      // Other mappings as appropriate
    });
  }
  
  // Add other conversions as needed
  
  throw new Error(`Conversion from ${sourceType} to ${targetType} not supported`);
}

/**
 * Validates serialized data against a schema
 * 
 * @param {Object} data - The data to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} Validation result with isValid and errors properties
 */
function validate(data, schema) {
  // Basic validation - in a real implementation, this would use a full JSON Schema validator
  const errors = [];
  
  // Check required properties
  if (schema.required) {
    for (const requiredProp of schema.required) {
      if (data[requiredProp] === undefined) {
        errors.push(`Missing required property: ${requiredProp}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Utility for creating a unique ID
 * 
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

module.exports = {
  FORMAT,
  serialize,
  deserialize,
  convert,
  validate,
  generateId
}; 