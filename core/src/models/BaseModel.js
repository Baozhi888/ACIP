/**
 * BaseModel.js
 * 
 * Provides a foundation for all data models in the ACIP protocol.
 * Includes validation, serialization, and deserialization capabilities.
 */

class BaseModel {
  /**
   * Constructor for BaseModel
   * @param {Object} data - Initial data for the model
   * @param {Object} schema - JSON Schema for validation
   */
  constructor(data = {}, schema = null) {
    this._data = {};
    this._schema = schema;
    
    // Initialize with data if provided
    if (data && typeof data === 'object') {
      this.update(data);
    }
  }

  /**
   * Validates the current data against the schema
   * @returns {Object} Validation result with isValid and errors properties
   */
  validate() {
    if (!this._schema) {
      return { isValid: true, errors: [] };
    }
    
    // Basic validation - in a real implementation, this would use a full JSON Schema validator
    const errors = [];
    
    // Check required properties
    if (this._schema.required) {
      for (const requiredProp of this._schema.required) {
        if (this._data[requiredProp] === undefined) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    }
    
    // Check property types if properties are defined
    if (this._schema.properties) {
      for (const [propName, propSchema] of Object.entries(this._schema.properties)) {
        const value = this._data[propName];
        
        if (value !== undefined) {
          // Type validation
          if (propSchema.type) {
            let isValidType = false;
            
            switch (propSchema.type) {
              case 'string':
                isValidType = typeof value === 'string';
                break;
              case 'number':
                isValidType = typeof value === 'number';
                break;
              case 'boolean':
                isValidType = typeof value === 'boolean';
                break;
              case 'object':
                isValidType = typeof value === 'object' && value !== null && !Array.isArray(value);
                break;
              case 'array':
                isValidType = Array.isArray(value);
                break;
              case 'null':
                isValidType = value === null;
                break;
            }
            
            if (!isValidType) {
              errors.push(`Invalid type for ${propName}: expected ${propSchema.type}, got ${typeof value}`);
            }
          }
          
          // Additional validations could be added here
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Updates the model with new data
   * @param {Object} data - New data to merge
   * @returns {BaseModel} This instance for chaining
   */
  update(data) {
    if (!data || typeof data !== 'object') {
      return this;
    }
    
    for (const [key, value] of Object.entries(data)) {
      this._data[key] = value;
    }
    
    return this;
  }

  /**
   * Serializes the model to a plain JavaScript object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return { ...this._data };
  }

  /**
   * Serializes the model to a JSON string
   * @param {number} indent - Number of spaces for indentation (pretty print)
   * @returns {string} JSON string representation
   */
  toJson(indent = 0) {
    return JSON.stringify(this._data, null, indent);
  }

  /**
   * Creates a model instance from a JSON string
   * @param {string} json - JSON string to parse
   * @returns {BaseModel} New model instance
   */
  static fromJson(json) {
    try {
      const data = JSON.parse(json);
      return new this(data);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * Gets a property value
   * @param {string} key - Property name
   * @returns {*} Property value
   */
  get(key) {
    return this._data[key];
  }

  /**
   * Sets a property value
   * @param {string} key - Property name
   * @param {*} value - Property value
   * @returns {BaseModel} This instance for chaining
   */
  set(key, value) {
    this._data[key] = value;
    return this;
  }
}

module.exports = BaseModel; 