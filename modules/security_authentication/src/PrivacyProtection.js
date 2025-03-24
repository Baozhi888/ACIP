/**
 * PrivacyProtection.js
 * 
 * Implements privacy protection functionality for the Security & Authentication module.
 * Handles data anonymization, consent management, and privacy policies.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Privacy operation types
 */
const PrivacyOperationType = {
  ANONYMIZE: 'anonymize',
  PSEUDONYMIZE: 'pseudonymize',
  MINIMIZE: 'minimize',
  ENCRYPT: 'encrypt',
  HASH: 'hash',
  MASK: 'mask',
  REDACT: 'redact'
};

/**
 * Privacy policy levels
 */
const PrivacyLevel = {
  STRICT: 'strict',     // Maximum privacy protection
  BALANCED: 'balanced', // Balance between privacy and functionality
  BASIC: 'basic',       // Basic privacy protections
  MINIMAL: 'minimal'    // Minimal privacy measures
};

/**
 * Privacy Protection class
 * Manages privacy protection features and policies
 */
class PrivacyProtection {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultPrivacyLevel: PrivacyLevel.BALANCED,
      hashAlgorithm: 'sha256',
      saltLength: 16,
      encryptionKey: null, // Should be set during initialization
      maskChar: '*',
      identifierFields: ['name', 'email', 'phone', 'address', 'socialSecurity', 'id', 'user', 'username'],
      sensitiveFields: ['password', 'creditCard', 'secret', 'token'],
      piiRetentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      consentRequired: true,
      ...options
    };
    
    this.logger = options.logger || console;
    this.eventEmitter = new EventEmitter();
    
    // Initialize consent registry
    this.consents = new Map();
    
    // Initialize privacy policies
    this.policies = new Map();
    
    // Initialize data subject registry
    this.dataSubjects = new Map();
    
    // Statistics
    this.stats = {
      anonymizationOperations: 0,
      pseudonymizationOperations: 0,
      minimizationOperations: 0,
      encryptionOperations: 0,
      maskingOperations: 0,
      consentRecorded: 0,
      policyViolations: 0
    };
  }
  
  /**
   * Initialize the privacy protection module
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} Success status
   */
  async initialize(config = {}) {
    try {
      // Merge config with existing options
      if (config) {
        this.options = {
          ...this.options,
          ...config
        };
      }
      
      // Generate encryption key if not provided
      if (!this.options.encryptionKey) {
        this.options.encryptionKey = crypto.randomBytes(32);
        this.logger.warn('Using randomly generated encryption key. Consider providing a persistent key.');
      }
      
      // Set up default privacy policies
      this._setupDefaultPolicies();
      
      this.logger.info('Privacy Protection System initialized');
      return true;
    } catch (error) {
      this.logger.error(`Privacy Protection initialization failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Register a data subject
   * @param {string} subjectId - Data subject identifier
   * @param {Object} options - Data subject options
   * @returns {Promise<Object>} Data subject info
   */
  async registerDataSubject(subjectId, options = {}) {
    try {
      const {
        privacyLevel = this.options.defaultPrivacyLevel,
        metadata = {}
      } = options;
      
      // Create data subject entry
      const dataSubject = {
        id: subjectId,
        privacyLevel,
        registeredAt: Date.now(),
        consentRecords: [],
        dataDeletionRequests: [],
        dataExportRequests: [],
        metadata: {
          ...metadata
        }
      };
      
      // Store data subject
      this.dataSubjects.set(subjectId, dataSubject);
      
      this.logger.info(`Registered data subject: ${subjectId} with privacy level: ${privacyLevel}`);
      this.eventEmitter.emit('subject:registered', { subjectId, privacyLevel });
      
      return {
        subjectId,
        privacyLevel,
        registeredAt: dataSubject.registeredAt
      };
    } catch (error) {
      this.logger.error(`Failed to register data subject: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Record consent from a data subject
   * @param {string} subjectId - Data subject identifier
   * @param {string} purposeId - Purpose of data processing
   * @param {Object} options - Consent options
   * @returns {Promise<Object>} Consent record
   */
  async recordConsent(subjectId, purposeId, options = {}) {
    try {
      const {
        consentGiven = true,
        expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
        metadata = {}
      } = options;
      
      // Validate data subject
      if (!this.dataSubjects.has(subjectId)) {
        throw new Error(`Data subject not found: ${subjectId}`);
      }
      
      // Generate consent ID
      const consentId = `consent_${subjectId}_${purposeId}_${Date.now()}`;
      
      // Create consent record
      const consentRecord = {
        id: consentId,
        subjectId,
        purposeId,
        consentGiven,
        recordedAt: Date.now(),
        expiresAt,
        metadata: {
          ...metadata
        }
      };
      
      // Store consent record
      this.consents.set(consentId, consentRecord);
      
      // Add to data subject's consent records
      const dataSubject = this.dataSubjects.get(subjectId);
      dataSubject.consentRecords.push(consentId);
      
      // Update stats
      this.stats.consentRecorded++;
      
      this.logger.info(`Recorded consent for subject ${subjectId} for purpose ${purposeId}: ${consentGiven ? 'Granted' : 'Denied'}`);
      this.eventEmitter.emit('consent:recorded', { 
        subjectId, 
        purposeId, 
        consentGiven 
      });
      
      return {
        consentId,
        subjectId,
        purposeId,
        consentGiven,
        expiresAt
      };
    } catch (error) {
      this.logger.error(`Failed to record consent: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check if consent exists for a purpose
   * @param {string} subjectId - Data subject identifier
   * @param {string} purposeId - Purpose of data processing
   * @returns {Promise<boolean>} Whether consent exists
   */
  async hasConsent(subjectId, purposeId) {
    try {
      // Validate data subject
      if (!this.dataSubjects.has(subjectId)) {
        return false;
      }
      
      const dataSubject = this.dataSubjects.get(subjectId);
      
      // Check each consent record
      for (const consentId of dataSubject.consentRecords) {
        const consent = this.consents.get(consentId);
        
        if (consent && 
            consent.purposeId === purposeId && 
            consent.consentGiven && 
            consent.expiresAt > Date.now()) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to check consent: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Define a privacy policy
   * @param {string} policyId - Policy identifier
   * @param {Object} policyDefinition - Policy definition
   * @returns {Promise<Object>} Policy info
   */
  async definePolicy(policyId, policyDefinition) {
    try {
      const policy = {
        id: policyId,
        definition: policyDefinition,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Store policy
      this.policies.set(policyId, policy);
      
      this.logger.info(`Defined privacy policy: ${policyId}`);
      
      return {
        policyId,
        createdAt: policy.createdAt
      };
    } catch (error) {
      this.logger.error(`Failed to define policy: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Apply privacy operation to data
   * @param {Object} data - Data to process
   * @param {string} operationType - Type of privacy operation
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Processed data
   */
  async applyPrivacyOperation(data, operationType, options = {}) {
    try {
      const {
        subjectId,
        purposeId,
        fields = [],
        preserveStructure = true,
        checkConsent = this.options.consentRequired
      } = options;
      
      // Check consent if required
      if (checkConsent && subjectId && purposeId) {
        const hasConsent = await this.hasConsent(subjectId, purposeId);
        if (!hasConsent) {
          throw new Error(`No consent found for subject ${subjectId} and purpose ${purposeId}`);
        }
      }
      
      // Apply appropriate privacy operation
      let processedData;
      
      switch (operationType) {
        case PrivacyOperationType.ANONYMIZE:
          processedData = await this._anonymize(data, fields, preserveStructure);
          this.stats.anonymizationOperations++;
          break;
          
        case PrivacyOperationType.PSEUDONYMIZE:
          processedData = await this._pseudonymize(data, fields, preserveStructure);
          this.stats.pseudonymizationOperations++;
          break;
          
        case PrivacyOperationType.MINIMIZE:
          processedData = await this._minimize(data, fields);
          this.stats.minimizationOperations++;
          break;
          
        case PrivacyOperationType.ENCRYPT:
          processedData = await this._encrypt(data, fields, preserveStructure);
          this.stats.encryptionOperations++;
          break;
          
        case PrivacyOperationType.HASH:
          processedData = await this._hash(data, fields, preserveStructure);
          this.stats.encryptionOperations++;
          break;
          
        case PrivacyOperationType.MASK:
          processedData = await this._mask(data, fields, preserveStructure);
          this.stats.maskingOperations++;
          break;
          
        case PrivacyOperationType.REDACT:
          processedData = await this._redact(data, fields);
          this.stats.maskingOperations++;
          break;
          
        default:
          throw new Error(`Unsupported privacy operation: ${operationType}`);
      }
      
      this.logger.debug(`Applied ${operationType} operation to data`);
      
      return processedData;
    } catch (error) {
      this.logger.error(`Privacy operation failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Request data deletion for a subject
   * @param {string} subjectId - Data subject identifier
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion request info
   */
  async requestDataDeletion(subjectId, options = {}) {
    try {
      const {
        requestReason = 'User request',
        metadata = {}
      } = options;
      
      // Validate data subject
      if (!this.dataSubjects.has(subjectId)) {
        throw new Error(`Data subject not found: ${subjectId}`);
      }
      
      // Generate deletion request ID
      const requestId = `deletion_${subjectId}_${Date.now()}`;
      
      // Create deletion request
      const deletionRequest = {
        id: requestId,
        subjectId,
        requestedAt: Date.now(),
        reason: requestReason,
        status: 'pending',
        metadata: {
          ...metadata
        }
      };
      
      // Add to data subject's deletion requests
      const dataSubject = this.dataSubjects.get(subjectId);
      dataSubject.dataDeletionRequests.push(requestId);
      
      this.logger.info(`Data deletion requested for subject ${subjectId}: ${requestReason}`);
      this.eventEmitter.emit('deletion:requested', { 
        subjectId, 
        requestId
      });
      
      return {
        requestId,
        subjectId,
        status: 'pending',
        requestedAt: deletionRequest.requestedAt
      };
    } catch (error) {
      this.logger.error(`Failed to request data deletion: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get statistics about the privacy protection module
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      dataSubjectCount: this.dataSubjects.size,
      consentCount: this.consents.size,
      policyCount: this.policies.size
    };
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
   * Set up default privacy policies
   * @private
   */
  _setupDefaultPolicies() {
    // Define policies for each privacy level
    this.definePolicy('strict', {
      description: 'Maximum privacy protection',
      dataMinimization: true,
      defaultOperation: PrivacyOperationType.ANONYMIZE,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      requiresExplicitConsent: true,
      fields: {
        [PrivacyOperationType.ANONYMIZE]: [...this.options.identifierFields, ...this.options.sensitiveFields],
        [PrivacyOperationType.ENCRYPT]: [...this.options.sensitiveFields]
      }
    });
    
    this.definePolicy('balanced', {
      description: 'Balance between privacy and functionality',
      dataMinimization: true,
      defaultOperation: PrivacyOperationType.PSEUDONYMIZE,
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      requiresExplicitConsent: true,
      fields: {
        [PrivacyOperationType.PSEUDONYMIZE]: [...this.options.identifierFields],
        [PrivacyOperationType.ENCRYPT]: [...this.options.sensitiveFields]
      }
    });
    
    this.definePolicy('basic', {
      description: 'Basic privacy protections',
      dataMinimization: false,
      defaultOperation: PrivacyOperationType.MASK,
      retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
      requiresExplicitConsent: true,
      fields: {
        [PrivacyOperationType.MASK]: [...this.options.sensitiveFields],
        [PrivacyOperationType.PSEUDONYMIZE]: ['socialSecurity', 'creditCard']
      }
    });
    
    this.definePolicy('minimal', {
      description: 'Minimal privacy measures',
      dataMinimization: false,
      defaultOperation: PrivacyOperationType.MASK,
      retentionPeriod: 365 * 24 * 60 * 60 * 1000, // 365 days
      requiresExplicitConsent: false,
      fields: {
        [PrivacyOperationType.MASK]: ['password', 'creditCard', 'socialSecurity']
      }
    });
  }
  
  /**
   * Anonymize data
   * @param {Object} data - Data to anonymize
   * @param {Array} fields - Fields to anonymize
   * @param {boolean} preserveStructure - Whether to preserve structure
   * @returns {Promise<Object>} Anonymized data
   * @private
   */
  async _anonymize(data, fields, preserveStructure) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._anonymize(item, fields, preserveStructure)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = preserveStructure ? { ...data } : {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        
        if (fields.length === 0 || fields.includes(key) || this._isIdentifierField(key)) {
          // Anonymize this field
          result[key] = this._anonymizeValue(value, key);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively anonymize nested objects
          result[key] = await this._anonymize(value, fields, preserveStructure);
        } else if (preserveStructure) {
          // Keep the value as is
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Pseudonymize data
   * @param {Object} data - Data to pseudonymize
   * @param {Array} fields - Fields to pseudonymize
   * @param {boolean} preserveStructure - Whether to preserve structure
   * @returns {Promise<Object>} Pseudonymized data
   * @private
   */
  async _pseudonymize(data, fields, preserveStructure) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._pseudonymize(item, fields, preserveStructure)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = preserveStructure ? { ...data } : {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        
        if (fields.length === 0 || fields.includes(key) || this._isIdentifierField(key)) {
          // Pseudonymize this field
          result[key] = this._hashValue(value, key);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively pseudonymize nested objects
          result[key] = await this._pseudonymize(value, fields, preserveStructure);
        } else if (preserveStructure) {
          // Keep the value as is
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Minimize data
   * @param {Object} data - Data to minimize
   * @param {Array} fields - Fields to keep
   * @returns {Promise<Object>} Minimized data
   * @private
   */
  async _minimize(data, fields) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._minimize(item, fields)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = {};
    
    // If no fields specified, keep everything
    if (fields.length === 0) {
      return data;
    }
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (fields.includes(key)) {
          const value = data[key];
          
          if (typeof value === 'object' && value !== null) {
            // Recursively handle nested objects
            result[key] = await this._minimize(value, fields);
          } else {
            result[key] = value;
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Encrypt data
   * @param {Object} data - Data to encrypt
   * @param {Array} fields - Fields to encrypt
   * @param {boolean} preserveStructure - Whether to preserve structure
   * @returns {Promise<Object>} Encrypted data
   * @private
   */
  async _encrypt(data, fields, preserveStructure) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._encrypt(item, fields, preserveStructure)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = preserveStructure ? { ...data } : {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        
        if (fields.length === 0 || fields.includes(key) || this._isSensitiveField(key)) {
          // Encrypt this field
          result[key] = this._encryptValue(value);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively encrypt nested objects
          result[key] = await this._encrypt(value, fields, preserveStructure);
        } else if (preserveStructure) {
          // Keep the value as is
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Hash data
   * @param {Object} data - Data to hash
   * @param {Array} fields - Fields to hash
   * @param {boolean} preserveStructure - Whether to preserve structure
   * @returns {Promise<Object>} Hashed data
   * @private
   */
  async _hash(data, fields, preserveStructure) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._hash(item, fields, preserveStructure)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = preserveStructure ? { ...data } : {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        
        if (fields.length === 0 || fields.includes(key)) {
          // Hash this field
          result[key] = this._hashValue(value, key);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively hash nested objects
          result[key] = await this._hash(value, fields, preserveStructure);
        } else if (preserveStructure) {
          // Keep the value as is
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Mask data
   * @param {Object} data - Data to mask
   * @param {Array} fields - Fields to mask
   * @param {boolean} preserveStructure - Whether to preserve structure
   * @returns {Promise<Object>} Masked data
   * @private
   */
  async _mask(data, fields, preserveStructure) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._mask(item, fields, preserveStructure)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = preserveStructure ? { ...data } : {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        
        if (fields.length === 0 || fields.includes(key) || this._isSensitiveField(key)) {
          // Mask this field
          result[key] = this._maskValue(value);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively mask nested objects
          result[key] = await this._mask(value, fields, preserveStructure);
        } else if (preserveStructure) {
          // Keep the value as is
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Redact data
   * @param {Object} data - Data to redact
   * @param {Array} fields - Fields to redact
   * @returns {Promise<Object>} Redacted data
   * @private
   */
  async _redact(data, fields) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this._redact(item, fields)));
    }
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const result = { ...data };
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (fields.length === 0 || fields.includes(key) || this._isSensitiveField(key)) {
          // Redact this field
          delete result[key];
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          // Recursively redact nested objects
          result[key] = await this._redact(data[key], fields);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Check if a field is an identifier field
   * @param {string} field - Field name
   * @returns {boolean} Whether the field is an identifier field
   * @private
   */
  _isIdentifierField(field) {
    return this.options.identifierFields.includes(field) || 
           this.options.identifierFields.some(pattern => 
             field.toLowerCase().includes(pattern.toLowerCase())
           );
  }
  
  /**
   * Check if a field is a sensitive field
   * @param {string} field - Field name
   * @returns {boolean} Whether the field is a sensitive field
   * @private
   */
  _isSensitiveField(field) {
    return this.options.sensitiveFields.includes(field) || 
           this.options.sensitiveFields.some(pattern => 
             field.toLowerCase().includes(pattern.toLowerCase())
           );
  }
  
  /**
   * Anonymize a value
   * @param {*} value - Value to anonymize
   * @param {string} key - Field name
   * @returns {*} Anonymized value
   * @private
   */
  _anonymizeValue(value, key) {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Different anonymization based on data type
    if (typeof value === 'string') {
      // For strings, completely replace with a random string of same length
      return Array(value.length + 1).join(this.options.maskChar);
    } else if (typeof value === 'number') {
      // For numbers, return 0
      return 0;
    } else if (typeof value === 'boolean') {
      // For booleans, return false
      return false;
    } else if (typeof value === 'object') {
      // For objects, recursively anonymize
      if (Array.isArray(value)) {
        return value.map(item => this._anonymizeValue(item, key));
      } else {
        return this._anonymize(value, [], true);
      }
    }
    
    return value;
  }
  
  /**
   * Mask a value
   * @param {*} value - Value to mask
   * @returns {*} Masked value
   * @private
   */
  _maskValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Different masking based on data type
    if (typeof value === 'string') {
      if (value.length <= 4) {
        // For short strings, mask everything
        return Array(value.length + 1).join(this.options.maskChar);
      } else {
        // For longer strings, keep first and last characters
        return value.charAt(0) + 
               Array(value.length - 1).join(this.options.maskChar) + 
               value.charAt(value.length - 1);
      }
    } else if (typeof value === 'number') {
      // For numbers, show approximate range
      return Math.floor(value / 100) * 100;
    } else if (typeof value === 'boolean') {
      // For booleans, return as is
      return value;
    } else if (typeof value === 'object') {
      // For objects, recursively mask
      if (Array.isArray(value)) {
        return value.map(item => this._maskValue(item));
      } else {
        return this._mask(value, [], true);
      }
    }
    
    return value;
  }
  
  /**
   * Hash a value
   * @param {*} value - Value to hash
   * @param {string} key - Field name
   * @returns {string} Hashed value
   * @private
   */
  _hashValue(value, key) {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Convert value to string
    const stringValue = String(value);
    
    // Create a salt based on the key
    const salt = crypto.createHash('md5').update(key || 'default').digest('hex').substring(0, this.options.saltLength);
    
    // Hash the value with the salt
    const hash = crypto.createHash(this.options.hashAlgorithm)
      .update(salt + stringValue)
      .digest('hex');
    
    return hash;
  }
  
  /**
   * Encrypt a value
   * @param {*} value - Value to encrypt
   * @returns {string} Encrypted value
   * @private
   */
  _encryptValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Convert value to string
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    // Generate an initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      this.options.encryptionKey,
      iv
    );
    
    // Encrypt the value
    let encrypted = cipher.update(stringValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted value
    return iv.toString('hex') + ':' + encrypted;
  }
}

module.exports = PrivacyProtection;
module.exports.PrivacyOperationType = PrivacyOperationType;
module.exports.PrivacyLevel = PrivacyLevel; 