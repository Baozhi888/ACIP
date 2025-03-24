/**
 * SecureCommunication.js
 * 
 * Implements secure communication functionality for the Security & Authentication module.
 * Handles encryption, key management, and secure message exchange.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Encryption levels
 */
const EncryptionLevel = {
  NONE: 'none',           // No encryption (not recommended)
  STANDARD: 'standard',   // Standard encryption (AES-256-GCM)
  HIGH: 'high',           // High security encryption
  END_TO_END: 'end-to-end' // End-to-end encryption
};

/**
 * Channel states
 */
const ChannelState = {
  INITIALIZING: 'initializing',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  ERROR: 'error'
};

/**
 * Secure Communication class
 * Manages encrypted communication channels
 */
class SecureCommunication {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultEncryptionLevel: EncryptionLevel.STANDARD,
      keyRotationInterval: 86400, // 24 hours in seconds
      keyPairType: 'rsa',
      keyPairModulusLength: 2048,
      symmetricAlgorithm: 'aes-256-gcm',
      hashAlgorithm: 'sha256',
      forwardSecrecy: true,
      verifiedChannelsOnly: false,
      ...options
    };
    
    this.logger = options.logger || console;
    this.eventEmitter = new EventEmitter();
    
    // Initialize channels registry
    this.channels = new Map();
    
    // Initialize key registry
    this.keys = {
      pairs: new Map(),  // Key pairs (public/private)
      symmetric: new Map(), // Symmetric keys
      shared: new Map()  // Shared keys for specific channels
    };
    
    // Statistics
    this.stats = {
      totalChannels: 0,
      activeChannels: 0,
      messagesSent: 0,
      messagesReceived: 0,
      encryptionOperations: 0,
      decryptionOperations: 0,
      keyRotations: 0
    };
  }
  
  /**
   * Initialize the secure communication module
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
      
      // Generate default keys
      await this._generateDefaultKeys();
      
      // Set up key rotation if enabled
      if (this.options.keyRotationInterval > 0) {
        this._setupKeyRotation();
      }
      
      this.logger.info('Secure Communication System initialized');
      return true;
    } catch (error) {
      this.logger.error(`Secure Communication initialization failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Create a secure communication channel
   * @param {Object} options - Channel options
   * @returns {Promise<Object>} Channel object
   */
  async createChannel(options = {}) {
    try {
      const {
        target,
        encryptionLevel = this.options.defaultEncryptionLevel,
        channelId = `channel_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        metadata = {}
      } = options;
      
      if (!target) {
        throw new Error('Target is required');
      }
      
      // Generate channel keys
      const channelKeys = await this._generateChannelKeys(encryptionLevel);
      
      // Create channel
      const channel = {
        id: channelId,
        target,
        encryptionLevel,
        state: ChannelState.INITIALIZING,
        createdAt: Date.now(),
        keys: channelKeys,
        metadata: {
          ...metadata,
          creator: 'system'
        },
        messageCount: 0,
        lastActivity: Date.now()
      };
      
      // Store the channel
      this.channels.set(channelId, channel);
      
      // Update stats
      this.stats.totalChannels++;
      this.stats.activeChannels++;
      
      // Activate the channel
      channel.state = ChannelState.ACTIVE;
      
      this.logger.info(`Created secure channel: ${channelId} to ${target} (${encryptionLevel})`);
      this.eventEmitter.emit('channel:created', { channelId, target });
      
      // Return a public interface for the channel
      return this._createChannelInterface(channelId);
    } catch (error) {
      this.logger.error(`Failed to create secure channel: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Close a secure channel
   * @param {string} channelId - Channel ID
   * @returns {Promise<boolean>} Success status
   */
  async closeChannel(channelId) {
    try {
      if (!this.channels.has(channelId)) {
        throw new Error(`Channel not found: ${channelId}`);
      }
      
      const channel = this.channels.get(channelId);
      
      // Update channel state
      channel.state = ChannelState.CLOSED;
      channel.closedAt = Date.now();
      
      // Remove channel keys from registry
      if (channel.keys.shared) {
        this.keys.shared.delete(channelId);
      }
      
      // Update stats
      this.stats.activeChannels--;
      
      this.logger.info(`Closed secure channel: ${channelId}`);
      this.eventEmitter.emit('channel:closed', { channelId });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to close channel: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Send a message through a secure channel
   * @param {string} channelId - Channel ID
   * @param {Object} message - Message to send
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(channelId, message) {
    try {
      if (!this.channels.has(channelId)) {
        throw new Error(`Channel not found: ${channelId}`);
      }
      
      const channel = this.channels.get(channelId);
      
      // Check channel state
      if (channel.state !== ChannelState.ACTIVE) {
        throw new Error(`Cannot send on channel in ${channel.state} state`);
      }
      
      // Prepare message
      const messageObj = {
        id: `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        sender: message.sender || 'system',
        timestamp: Date.now(),
        content: message.content,
        metadata: message.metadata || {}
      };
      
      // Encrypt the message
      const encrypted = await this._encryptMessage(channel, messageObj);
      
      // Update channel stats
      channel.messageCount++;
      channel.lastActivity = Date.now();
      
      // Update global stats
      this.stats.messagesSent++;
      
      this.logger.debug(`Sent message on channel: ${channelId}`);
      this.eventEmitter.emit('message:sent', { 
        channelId, 
        messageId: messageObj.id,
        size: encrypted.length
      });
      
      // In a real implementation, this would send the encrypted message to the target
      // For this implementation, we'll emit a local event for testing
      // Simulate message delivery
      setTimeout(() => {
        this._handleIncomingMessage(channelId, encrypted);
      }, 50);
      
      return {
        messageId: messageObj.id,
        sent: true,
        timestamp: messageObj.timestamp
      };
    } catch (error) {
      this.logger.error(`Failed to send message on channel ${channelId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Receive a message (simulate external receipt)
   * @param {string} channelId - Channel ID
   * @param {Object} encryptedMessage - Encrypted message
   * @returns {Promise<void>}
   */
  async receiveMessage(channelId, encryptedMessage) {
    try {
      await this._handleIncomingMessage(channelId, encryptedMessage);
    } catch (error) {
      this.logger.error(`Failed to process received message: ${error.message}`);
    }
  }
  
  /**
   * Generate a new key pair
   * @param {Object} options - Key generation options
   * @returns {Promise<Object>} Generated keys
   */
  async generateKeyPair(options = {}) {
    try {
      const keyType = options.type || this.options.keyPairType;
      const modulusLength = options.modulusLength || this.options.keyPairModulusLength;
      
      // Generate key pair
      const keyPair = crypto.generateKeyPairSync(keyType, {
        modulusLength,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Generate ID for the key pair
      const keyId = `key_${keyType}_${Date.now()}`;
      
      // Store the key pair
      this.keys.pairs.set(keyId, {
        id: keyId,
        type: keyType,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        createdAt: Date.now()
      });
      
      this.logger.info(`Generated key pair: ${keyId}`);
      
      return {
        keyId,
        publicKey: keyPair.publicKey
      };
    } catch (error) {
      this.logger.error(`Failed to generate key pair: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get statistics about the secure communication module
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      channelCount: this.channels.size,
      keyPairCount: this.keys.pairs.size,
      symmetricKeyCount: this.keys.symmetric.size,
      sharedKeyCount: this.keys.shared.size
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
   * Generate default keys for the system
   * @returns {Promise<void>}
   * @private
   */
  async _generateDefaultKeys() {
    // Generate default key pair
    await this.generateKeyPair();
    
    // Generate default symmetric key
    const symmetricKey = crypto.randomBytes(32);
    const keyId = `symmetric_default_${Date.now()}`;
    
    this.keys.symmetric.set(keyId, {
      id: keyId,
      key: symmetricKey,
      algorithm: this.options.symmetricAlgorithm,
      createdAt: Date.now()
    });
    
    this.logger.info('Generated default keys');
  }
  
  /**
   * Set up key rotation
   * @private
   */
  _setupKeyRotation() {
    // In a real implementation, this would set up a timer for key rotation
    // For this implementation, we'll just log that it would happen
    this.logger.info(`Key rotation would occur every ${this.options.keyRotationInterval} seconds`);
  }
  
  /**
   * Generate keys for a channel
   * @param {string} encryptionLevel - Encryption level
   * @returns {Promise<Object>} Channel keys
   * @private
   */
  async _generateChannelKeys(encryptionLevel) {
    const keys = {};
    
    // For end-to-end encryption, generate a unique key pair
    if (encryptionLevel === EncryptionLevel.END_TO_END) {
      const keyPair = await this.generateKeyPair();
      keys.keyPairId = keyPair.keyId;
    }
    
    // Generate a symmetric key for the channel
    const symmetricKey = crypto.randomBytes(32);
    const keyId = `symmetric_channel_${Date.now()}`;
    
    // Store the symmetric key
    this.keys.symmetric.set(keyId, {
      id: keyId,
      key: symmetricKey,
      algorithm: this.options.symmetricAlgorithm,
      createdAt: Date.now()
    });
    
    keys.symmetricKeyId = keyId;
    
    // For forward secrecy, prepare for key exchange
    if (this.options.forwardSecrecy) {
      keys.forwardSecrecy = true;
    }
    
    return keys;
  }
  
  /**
   * Create a public interface for a channel
   * @param {string} channelId - Channel ID
   * @returns {Object} Channel interface
   * @private
   */
  _createChannelInterface(channelId) {
    // Create a public interface for the channel with limited methods
    return {
      id: channelId,
      target: this.channels.get(channelId).target,
      encryptionLevel: this.channels.get(channelId).encryptionLevel,
      
      // Send a message on this channel
      send: async (message) => {
        return this.sendMessage(channelId, message);
      },
      
      // Close this channel
      close: async () => {
        return this.closeChannel(channelId);
      },
      
      // Get channel status
      getStatus: () => {
        const channel = this.channels.get(channelId);
        return {
          state: channel.state,
          messageCount: channel.messageCount,
          lastActivity: channel.lastActivity,
          createdAt: channel.createdAt
        };
      },
      
      // Event subscription
      on: (event, handler) => {
        this.eventEmitter.on(`channel:${channelId}:${event}`, handler);
      },
      
      // Event unsubscription
      off: (event, handler) => {
        this.eventEmitter.off(`channel:${channelId}:${event}`, handler);
      }
    };
  }
  
  /**
   * Encrypt a message
   * @param {Object} channel - Channel object
   * @param {Object} message - Message to encrypt
   * @returns {Promise<Buffer>} Encrypted message
   * @private
   */
  async _encryptMessage(channel, message) {
    // Serialize the message
    const serialized = JSON.stringify(message);
    
    // Get the symmetric key for this channel
    const symmetricKeyInfo = this.keys.symmetric.get(channel.keys.symmetricKeyId);
    
    if (!symmetricKeyInfo) {
      throw new Error('Symmetric key not found');
    }
    
    // Generate an initialization vector
    const iv = crypto.randomBytes(16);
    
    // Encrypt the message
    const cipher = crypto.createCipheriv(
      symmetricKeyInfo.algorithm, 
      symmetricKeyInfo.key,
      iv
    );
    
    // Update stats
    this.stats.encryptionOperations++;
    
    // Perform encryption
    const encrypted = Buffer.concat([
      cipher.update(serialized, 'utf8'),
      cipher.final()
    ]);
    
    // Get the authentication tag (for GCM mode)
    const authTag = cipher.getAuthTag();
    
    // Combine all parts (format: iv + authTag + encrypted)
    const result = Buffer.concat([
      iv,
      authTag,
      encrypted
    ]);
    
    return result;
  }
  
  /**
   * Decrypt a message
   * @param {Object} channel - Channel object
   * @param {Buffer} encryptedMessage - Encrypted message
   * @returns {Promise<Object>} Decrypted message
   * @private
   */
  async _decryptMessage(channel, encryptedMessage) {
    // Get the symmetric key for this channel
    const symmetricKeyInfo = this.keys.symmetric.get(channel.keys.symmetricKeyId);
    
    if (!symmetricKeyInfo) {
      throw new Error('Symmetric key not found');
    }
    
    // Extract parts (iv is 16 bytes, authTag is 16 bytes for GCM)
    const iv = encryptedMessage.slice(0, 16);
    const authTag = encryptedMessage.slice(16, 32);
    const encrypted = encryptedMessage.slice(32);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      symmetricKeyInfo.algorithm,
      symmetricKeyInfo.key,
      iv
    );
    
    // Set authentication tag (for GCM mode)
    decipher.setAuthTag(authTag);
    
    // Update stats
    this.stats.decryptionOperations++;
    
    // Perform decryption
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // Parse the decrypted message
    const message = JSON.parse(decrypted.toString('utf8'));
    
    return message;
  }
  
  /**
   * Handle an incoming encrypted message
   * @param {string} channelId - Channel ID
   * @param {Buffer} encryptedMessage - Encrypted message
   * @returns {Promise<void>}
   * @private
   */
  async _handleIncomingMessage(channelId, encryptedMessage) {
    try {
      if (!this.channels.has(channelId)) {
        throw new Error(`Channel not found: ${channelId}`);
      }
      
      const channel = this.channels.get(channelId);
      
      // Check channel state
      if (channel.state !== ChannelState.ACTIVE) {
        throw new Error(`Cannot receive on channel in ${channel.state} state`);
      }
      
      // Decrypt the message
      const message = await this._decryptMessage(channel, encryptedMessage);
      
      // Update channel stats
      channel.messageCount++;
      channel.lastActivity = Date.now();
      
      // Update global stats
      this.stats.messagesReceived++;
      
      this.logger.debug(`Received message on channel: ${channelId}`);
      
      // Emit events
      this.eventEmitter.emit('message:received', { 
        channelId, 
        messageId: message.id 
      });
      
      // Emit on the specific channel
      this.eventEmitter.emit(`channel:${channelId}:message`, message);
    } catch (error) {
      this.logger.error(`Error handling incoming message: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SecureCommunication;
module.exports.EncryptionLevel = EncryptionLevel;
module.exports.ChannelState = ChannelState; 