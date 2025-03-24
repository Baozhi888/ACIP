/**
 * Security & Authentication Module
 * 
 * Main entry point for the Security & Authentication module,
 * exports all module components and utilities.
 */

const AuthManager = require('./AuthManager');
const AccessControlSystem = require('./AccessControlSystem');
const SecureCommunication = require('./SecureCommunication');
const PrivacyProtection = require('./PrivacyProtection');
const IdentityVerification = require('./IdentityVerification');
const ConfigManager = require('./ConfigManager');

// Export all components with their constants
module.exports = {
  // Main authentication manager
  AuthManager,
  
  // Access control system
  AccessControlSystem,
  
  // Secure communication
  SecureCommunication,
  EncryptionLevel: SecureCommunication.EncryptionLevel,
  ChannelState: SecureCommunication.ChannelState,
  
  // Privacy protection
  PrivacyProtection,
  PrivacyOperationType: PrivacyProtection.PrivacyOperationType,
  PrivacyLevel: PrivacyProtection.PrivacyLevel,
  
  // Identity verification
  IdentityVerification,
  AuthMethod: IdentityVerification.AuthMethod,
  VerificationLevel: IdentityVerification.VerificationLevel,
  
  // Configuration management
  ConfigManager
}; 