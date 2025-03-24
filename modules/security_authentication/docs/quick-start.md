# Security & Authentication Module - Quick Start Guide

This guide will help you quickly set up and integrate the Security & Authentication module into your application.

## Installation

```bash
npm install @acip/security-authentication
```

## Basic Setup

### 1. Create a Configuration File

Create a `security.config.json` file in your project:

```json
{
  "auth": {
    "providers": {
      "local": {
        "enabled": true
      }
    },
    "tokenExpiry": {
      "access": 3600,
      "refresh": 604800
    },
    "mfa": {
      "enabled": true,
      "methods": ["OTP"]
    },
    "passwordPolicy": {
      "minLength": 10,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSpecialChars": true
    }
  },
  "accessControl": {
    "defaultPolicy": "deny",
    "rbacEnabled": true,
    "abacEnabled": true
  },
  "secureCommunication": {
    "defaultEncryptionLevel": "high",
    "autoNegotiate": true
  },
  "privacy": {
    "defaultPrivacyLevel": "high",
    "requireConsent": true
  }
}
```

### 2. Initialize the Security Module

```javascript
const { 
  ConfigManager, 
  AuthManager,
  AccessControlSystem,
  SecureCommunication,
  PrivacyProtection,
  IdentityVerification 
} = require('@acip/security-authentication');

async function initializeSecurity() {
  // Initialize configuration manager
  const configManager = new ConfigManager({
    configPath: './security.config.json'
  });
  await configManager.initialize();
  
  // Initialize components with their configurations
  const authConfig = configManager.getAuthConfig();
  const accessControlConfig = configManager.getAccessControlConfig();
  const secureCommConfig = configManager.getSecureCommConfig();
  const privacyConfig = configManager.getPrivacyConfig();
  
  // Initialize identity verification
  const identityVerification = new IdentityVerification(authConfig);
  await identityVerification.initialize();
  
  // Initialize access control
  const accessControl = new AccessControlSystem(accessControlConfig);
  await accessControl.initialize();
  
  // Initialize secure communication
  const secureCommunication = new SecureCommunication(secureCommConfig);
  await secureCommunication.initialize();
  
  // Initialize privacy protection
  const privacyProtection = new PrivacyProtection(privacyConfig);
  await privacyProtection.initialize();
  
  // Initialize auth manager (integrates all components)
  const authManager = new AuthManager(authConfig);
  
  // Connect components
  authManager.accessControl = accessControl;
  authManager.identityVerification = identityVerification;
  authManager.secureCommunication = secureCommunication;
  authManager.privacyProtection = privacyProtection;
  
  // Initialize and start auth manager
  await authManager.initialize();
  await authManager.start();
  
  return {
    configManager,
    authManager,
    accessControl,
    secureCommunication,
    privacyProtection,
    identityVerification
  };
}

// Initialize the security module
const security = await initializeSecurity();
```

## Common Tasks

### User Registration

```javascript
const { authManager } = security;

// Register a new user
try {
  const user = await authManager.registerUser({
    username: 'john.doe',
    password: 'SecureP@ssw0rd123',
    email: 'john.doe@example.com',
    phone: '+1234567890'
  });
  
  console.log('User registered successfully:', user.userId);
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### User Authentication

```javascript
// Authenticate a user
try {
  const authResult = await authManager.authenticate({
    username: 'john.doe',
    password: 'SecureP@ssw0rd123'
  });
  
  if (authResult.authenticated) {
    console.log('Authentication successful');
    
    // Store tokens
    const { accessToken, refreshToken } = authResult;
    
    // If MFA is required
    if (authResult.requiresMfa) {
      console.log('MFA required, please enter code from authenticator app');
      // Prompt user for MFA code...
    }
  } else {
    console.log('Authentication failed:', authResult.reason);
  }
} catch (error) {
  console.error('Authentication error:', error.message);
}
```

### Verifying MFA

```javascript
// Verify MFA token
try {
  const mfaResult = await authManager.identityVerification.verifyMfaToken(
    userId,
    'OTP_CODE_FROM_USER'
  );
  
  if (mfaResult) {
    console.log('MFA verification successful');
  } else {
    console.log('MFA verification failed');
  }
} catch (error) {
  console.error('MFA verification error:', error.message);
}
```

### Checking Permissions

```javascript
// Check if user has permission
try {
  const hasPermission = await authManager.checkPermission(
    userId,
    'read',
    'documents/report-123'
  );
  
  if (hasPermission) {
    console.log('User has permission to read this document');
    // Proceed with allowing access
  } else {
    console.log('User does not have permission to read this document');
    // Handle access denied
  }
} catch (error) {
  console.error('Permission check error:', error.message);
}
```

### Creating Secure Communication Channels

```javascript
// Create a secure communication channel
try {
  const channel = await authManager.createSecureChannel(
    sourceUserId,
    targetUserId,
    { encryptionLevel: 'high' }
  );
  
  // Use the channel for secure communication
  channel.send('Hello, this message is encrypted!');
  
  // Listen for messages
  channel.on('message', (message) => {
    console.log('Received encrypted message:', message);
  });
} catch (error) {
  console.error('Error creating secure channel:', error.message);
}
```

### Applying Privacy Protection

```javascript
const { privacyProtection } = security;

// Apply privacy protection to data
try {
  const userData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    address: '123 Main St, Anytown, USA',
    ssn: '123-45-6789',
    preferences: { theme: 'dark', notifications: true }
  };
  
  const operations = [
    { type: 'ANONYMIZE', fields: ['name'] },
    { type: 'MASK', fields: ['ssn'] },
    { type: 'MINIMIZE', fields: ['address'] }
  ];
  
  const protectedData = await privacyProtection.processData(userData, operations);
  console.log('Protected data:', protectedData);
  // Result will have anonymized name, masked SSN, and minimized address
} catch (error) {
  console.error('Privacy protection error:', error.message);
}
```

## Integrating with Express.js

### Create Authentication Middleware

```javascript
function authMiddleware(security) {
  return async (req, res, next) => {
    try {
      // Get the token from the Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      
      // Verify the token
      const verification = await security.authManager.verifyToken(token);
      
      if (!verification.valid) {
        return res.status(401).json({ error: verification.reason });
      }
      
      // Add user info to request object
      req.user = verification.user;
      req.userId = verification.userId;
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

// Use the middleware in your Express app
const express = require('express');
const app = express();
const security = await initializeSecurity();

// Protected routes
app.use('/api', authMiddleware(security));
```

### Create Permission Middleware

```javascript
function permissionMiddleware(security, action, resource) {
  return async (req, res, next) => {
    try {
      // Check if user has permission
      const hasPermission = await security.authManager.checkPermission(
        req.userId,
        action,
        resource
      );
      
      if (hasPermission) {
        next();
      } else {
        return res.status(403).json({ error: 'Permission denied' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Permission check error' });
    }
  };
}

// Use the permission middleware
app.get(
  '/api/documents/:id',
  authMiddleware(security),
  permissionMiddleware(security, 'read', 'documents'),
  (req, res) => {
    // Handle document retrieval
    res.json({ document: { /* document data */ } });
  }
);
```

## Error Handling

The Security & Authentication module uses error classes that extend the standard JavaScript Error class. You can catch and handle specific error types:

```javascript
try {
  // Some security operation
} catch (error) {
  if (error.name === 'AuthenticationError') {
    // Handle authentication errors
  } else if (error.name === 'PermissionError') {
    // Handle permission errors
  } else if (error.name === 'ConfigurationError') {
    // Handle configuration errors
  } else {
    // Handle other errors
  }
}
```

## Advanced Configuration

For more advanced configuration options, refer to the [Configuration Reference](./configuration-reference.md) document.

## Next Steps

- See the [API Reference](./api-reference.md) for detailed information on all available methods
- Check the [Example Applications](../examples/) for more complex integration patterns
- Learn about [Custom Authentication Providers](./custom-providers.md) 