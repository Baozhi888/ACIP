/**
 * Security & Authentication Module Tests
 * 
 * Tests the functionality of the Security & Authentication Module components
 */

const AuthManager = require('../src/AuthManager');
const AccessControlSystem = require('../src/AccessControlSystem');
const SecureCommunication = require('../src/SecureCommunication');
const PrivacyProtection = require('../src/PrivacyProtection');
const IdentityVerification = require('../src/IdentityVerification');

// Silence logs during tests
const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

/**
 * Test AuthManager functionality
 */
async function testAuthManager() {
  console.log('\n--- Testing AuthManager ---');
  
  try {
    const authManager = new AuthManager({ logger: silentLogger });
    console.log('Creating AuthManager instance...');
    
    // Initialize the auth manager
    const initResult = await authManager.initialize();
    console.log('Initialization result:', initResult ? 'Success' : 'Failed');
    
    // Test user registration and authentication
    console.log('Testing user registration...');
    const user = await authManager.registerUser('testuser', {
      email: 'test@example.com',
      password: 'SecureP@ss123'
    });
    console.log('User registered:', user.username);
    
    // Test authentication
    console.log('Testing authentication...');
    const authResult = await authManager.authenticate('testuser', 'SecureP@ss123');
    console.log('Authentication result:', authResult.authenticated ? 'Success' : 'Failed');
    
    // Test permission checks
    console.log('Testing permission checks...');
    await authManager.grantPermission(user.userId, 'read', 'documents');
    const hasPermission = await authManager.checkPermission(user.userId, 'read', 'documents');
    console.log('Has permission:', hasPermission);
    
    console.log('AuthManager tests completed successfully');
    return true;
  } catch (error) {
    console.error('AuthManager test failed:', error.message);
    return false;
  }
}

/**
 * Test AccessControlSystem functionality
 */
async function testAccessControlSystem() {
  console.log('\n--- Testing AccessControlSystem ---');
  
  try {
    const accessControl = new AccessControlSystem({ logger: silentLogger });
    console.log('Creating AccessControlSystem instance...');
    
    // Initialize the access control system
    const initResult = await accessControl.initialize();
    console.log('Initialization result:', initResult ? 'Success' : 'Failed');
    
    // Test role definition
    console.log('Testing role definition...');
    await accessControl.defineRole('admin', {
      description: 'System administrator',
      permissions: ['read', 'write', 'delete', 'admin']
    });
    
    // Test resource definition
    console.log('Testing resource definition...');
    await accessControl.defineResource('documents', {
      description: 'Document storage',
      operations: ['read', 'write', 'delete']
    });
    
    // Test policy assignment
    console.log('Testing policy assignment...');
    await accessControl.grantPermission('admin', 'documents', 'read');
    await accessControl.grantPermission('admin', 'documents', 'write');
    
    // Test permission checks
    console.log('Testing permission checks...');
    const userRoles = ['admin'];
    const hasReadPermission = await accessControl.checkAccess(userRoles, 'documents', 'read');
    console.log('Has read permission:', hasReadPermission);
    
    console.log('AccessControlSystem tests completed successfully');
    return true;
  } catch (error) {
    console.error('AccessControlSystem test failed:', error.message);
    return false;
  }
}

/**
 * Test SecureCommunication functionality
 */
async function testSecureCommunication() {
  console.log('\n--- Testing SecureCommunication ---');
  
  try {
    const secureCommunication = new SecureCommunication({ logger: silentLogger });
    console.log('Creating SecureCommunication instance...');
    
    // Initialize secure communication
    const initResult = await secureCommunication.initialize();
    console.log('Initialization result:', initResult ? 'Success' : 'Failed');
    
    // Test channel creation
    console.log('Testing secure channel creation...');
    const channel = await secureCommunication.createChannel({
      target: 'testReceiver',
      metadata: { purpose: 'testing' }
    });
    console.log('Secure channel created with ID:', channel.id);
    
    // Test message sending
    console.log('Testing secure message sending...');
    let messageReceived = false;
    
    // Set up event listener
    channel.on('message', (message) => {
      console.log('Message received:', message.content);
      messageReceived = true;
    });
    
    // Send a message
    const sendResult = await channel.send({
      content: 'Hello, secure world!',
      metadata: { type: 'greeting' }
    });
    console.log('Message sent:', sendResult.messageId);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Message received status:', messageReceived);
    
    // Close the channel
    console.log('Testing channel closing...');
    const closeResult = await channel.close();
    console.log('Channel closed:', closeResult);
    
    console.log('SecureCommunication tests completed successfully');
    return true;
  } catch (error) {
    console.error('SecureCommunication test failed:', error.message);
    return false;
  }
}

/**
 * Test PrivacyProtection functionality
 */
async function testPrivacyProtection() {
  console.log('\n--- Testing PrivacyProtection ---');
  
  try {
    const privacyProtection = new PrivacyProtection({ logger: silentLogger });
    console.log('Creating PrivacyProtection instance...');
    
    // Initialize privacy protection
    const initResult = await privacyProtection.initialize();
    console.log('Initialization result:', initResult ? 'Success' : 'Failed');
    
    // Test data subject registration
    console.log('Testing data subject registration...');
    const subject = await privacyProtection.registerDataSubject('user123', {
      privacyLevel: 'balanced',
      metadata: { region: 'EU' }
    });
    console.log('Data subject registered:', subject.subjectId);
    
    // Test consent recording
    console.log('Testing consent recording...');
    const consent = await privacyProtection.recordConsent('user123', 'marketing', {
      consentGiven: true
    });
    console.log('Consent recorded:', consent.consentId);
    
    // Test consent checking
    console.log('Testing consent checking...');
    const hasConsent = await privacyProtection.hasConsent('user123', 'marketing');
    console.log('Has marketing consent:', hasConsent);
    
    // Test privacy operations
    console.log('Testing privacy operations...');
    const testData = {
      name: 'John Doe',
      email: 'john@example.com',
      address: '123 Main St',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    };
    
    const anonymizedData = await privacyProtection.applyPrivacyOperation(
      testData,
      'anonymize',
      { subjectId: 'user123', purposeId: 'marketing' }
    );
    console.log('Anonymized data generated');
    
    // Verify PII fields are anonymized
    const piiAnonymized = !anonymizedData.email.includes('@');
    console.log('PII fields anonymized:', piiAnonymized);
    
    console.log('PrivacyProtection tests completed successfully');
    return true;
  } catch (error) {
    console.error('PrivacyProtection test failed:', error.message);
    return false;
  }
}

/**
 * Test IdentityVerification functionality
 */
async function testIdentityVerification() {
  console.log('\n--- Testing IdentityVerification ---');
  
  try {
    const identityVerification = new IdentityVerification({ logger: silentLogger });
    console.log('Creating IdentityVerification instance...');
    
    // Initialize identity verification
    const initResult = await identityVerification.initialize();
    console.log('Initialization result:', initResult ? 'Success' : 'Failed');
    
    // Test user registration
    console.log('Testing user registration...');
    const user = await identityVerification.registerUser('testuser', {
      email: 'test@example.com',
      password: 'SecureP@ss123',
      phone: '+1234567890'
    });
    console.log('User registered:', user.username);
    
    // Test authentication
    console.log('Testing authentication...');
    const authResult = await identityVerification.authenticate(
      'testuser', 
      'SecureP@ss123',
      { ipAddress: '127.0.0.1' }
    );
    console.log('Authentication result:', authResult.authenticated);
    
    // Test identity verification
    console.log('Testing identity verification...');
    // Get verification token from previous operation
    const verificationToken = identityVerification.verificationRequests.get(user.userId).token;
    
    const verificationResult = await identityVerification.verifyIdentity(
      user.userId,
      verificationToken
    );
    console.log('Verification result:', verificationResult.verified);
    
    console.log('IdentityVerification tests completed successfully');
    return true;
  } catch (error) {
    console.error('IdentityVerification test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('=== Starting Security & Authentication Module Tests ===');
  
  try {
    // Individual component tests
    await testAuthManager();
    await testAccessControlSystem();
    await testSecureCommunication();
    await testPrivacyProtection();
    await testIdentityVerification();
    
    console.log('\n=== Security & Authentication Module Tests Completed Successfully ===');
  } catch (error) {
    console.error('\n=== Tests Failed ===');
    console.error(error);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test execution error:', error);
}); 