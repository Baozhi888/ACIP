# Security & Authentication Configuration Reference

This document provides detailed information about all configuration options available for the Security & Authentication module.

## Configuration File Structure

The configuration file (`security.config.json`) is structured as follows:

```json
{
  "auth": { ... },
  "accessControl": { ... },
  "secureCommunication": { ... },
  "privacy": { ... },
  "global": { ... }
}
```

## Authentication Configuration (`auth`)

Authentication settings control how users are authenticated and how credentials are managed.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `providers` | Object | `{}` | Authentication providers configuration |
| `providers.local` | Object | `{ enabled: true }` | Local username/password authentication |
| `providers.oauth` | Object | `{ enabled: false }` | OAuth provider configuration |
| `tokenExpiry` | Object | `{}` | Token expiration settings |
| `tokenExpiry.access` | Number | `3600` | Access token expiry in seconds (1 hour) |
| `tokenExpiry.refresh` | Number | `604800` | Refresh token expiry in seconds (7 days) |
| `mfa` | Object | `{}` | Multi-factor authentication settings |
| `mfa.enabled` | Boolean | `false` | Whether MFA is enabled |
| `mfa.methods` | Array | `["OTP"]` | Allowed MFA methods |
| `mfa.required` | Boolean | `false` | Whether MFA is required for all users |
| `passwordPolicy` | Object | `{}` | Password strength requirements |
| `passwordPolicy.minLength` | Number | `8` | Minimum password length |
| `passwordPolicy.requireUppercase` | Boolean | `false` | Require at least one uppercase letter |
| `passwordPolicy.requireLowercase` | Boolean | `false` | Require at least one lowercase letter |
| `passwordPolicy.requireNumbers` | Boolean | `false` | Require at least one number |
| `passwordPolicy.requireSpecialChars` | Boolean | `false` | Require at least one special character |
| `passwordPolicy.maxAge` | Number | `null` | Max password age in days (null = no expiration) |
| `passwordPolicy.preventReuse` | Number | `0` | Number of previous passwords to prevent reusing |
| `session` | Object | `{}` | Session management settings |
| `session.maxConcurrent` | Number | `5` | Maximum concurrent sessions per user |
| `session.absoluteTimeout` | Number | `null` | Force logout after this many seconds (null = no timeout) |
| `session.inactivityTimeout` | Number | `1800` | Inactive session timeout in seconds (30 minutes) |
| `verificationLevels` | Object | `{}` | Identity verification level requirements |
| `hashRounds` | Number | `10` | Number of bcrypt rounds for password hashing |

### Local Provider Example

```json
"providers": {
  "local": {
    "enabled": true,
    "usernameField": "email",
    "caseSensitiveUsername": false
  }
}
```

### OAuth Provider Example

```json
"providers": {
  "oauth": {
    "enabled": true,
    "providers": {
      "google": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret",
        "callbackUrl": "https://your-app.com/auth/google/callback"
      },
      "github": {
        "clientId": "your-github-client-id",
        "clientSecret": "your-github-client-secret",
        "callbackUrl": "https://your-app.com/auth/github/callback"
      }
    }
  }
}
```

## Access Control Configuration (`accessControl`)

Access control settings determine how permissions are managed and enforced.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultPolicy` | String | `"deny"` | Default behavior when no matching policy ("allow" or "deny") |
| `rbacEnabled` | Boolean | `true` | Enable role-based access control |
| `abacEnabled` | Boolean | `false` | Enable attribute-based access control |
| `contextualFactors` | Array | `[]` | Contextual factors to consider for access decisions |
| `roles` | Object | `{}` | Role definitions and their permissions |
| `resourceTypes` | Array | `[]` | Resource type definitions |
| `cacheResults` | Boolean | `true` | Cache access control decisions for performance |
| `cacheExpiry` | Number | `300` | Expiry time in seconds for cached decisions (5 minutes) |

### Roles Example

```json
"roles": {
  "admin": {
    "description": "Administrator with full access",
    "permissions": ["*:*"],
    "inherits": []
  },
  "manager": {
    "description": "Manager role",
    "permissions": ["read:*", "write:*", "update:*"],
    "inherits": []
  },
  "user": {
    "description": "Regular user role",
    "permissions": ["read:public", "read:own", "write:own", "update:own"],
    "inherits": []
  },
  "guest": {
    "description": "Guest role with limited access",
    "permissions": ["read:public"],
    "inherits": []
  }
}
```

## Secure Communication Configuration (`secureCommunication`)

Secure communication settings control encryption and secure channels.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultEncryptionLevel` | String | `"medium"` | Default encryption level (low, medium, high) |
| `autoNegotiate` | Boolean | `true` | Auto-negotiate encryption level |
| `encryptionAlgorithms` | Object | `{}` | Encryption algorithms for each level |
| `certificatePath` | String | `null` | Path to SSL/TLS certificate |
| `keyPath` | String | `null` | Path to SSL/TLS private key |
| `caPath` | String | `null` | Path to CA certificate |
| `channelTimeout` | Number | `600` | Channel timeout in seconds (10 minutes) |
| `maxMessageSize` | Number | `1048576` | Maximum message size in bytes (1MB) |
| `enforceSignedMessages` | Boolean | `false` | Require all messages to be signed |

### Encryption Algorithms Example

```json
"encryptionAlgorithms": {
  "low": {
    "symmetric": "AES-128-GCM",
    "asymmetric": "RSA-2048"
  },
  "medium": {
    "symmetric": "AES-256-GCM",
    "asymmetric": "RSA-3072"
  },
  "high": {
    "symmetric": "AES-256-GCM",
    "asymmetric": "RSA-4096",
    "forwardSecrecy": true
  }
}
```

## Privacy Configuration (`privacy`)

Privacy settings control how user data is handled and protected.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultPrivacyLevel` | String | `"medium"` | Default privacy level (low, medium, high) |
| `requireConsent` | Boolean | `false` | Require explicit consent for data processing |
| `consentTypes` | Array | `[]` | Types of consent to track |
| `dataSensitivityLevels` | Object | `{}` | Data field sensitivity levels |
| `retentionPolicy` | Object | `{}` | Data retention policies |
| `anonymizationEnabled` | Boolean | `false` | Enable data anonymization |
| `minimizationEnabled` | Boolean | `false` | Enable data minimization |
| `defaultAnonymizationMethod` | String | `"hash"` | Default method for anonymizing data |

### Data Sensitivity Levels Example

```json
"dataSensitivityLevels": {
  "public": {
    "fields": ["username", "display_name", "avatar"],
    "retention": "indefinite"
  },
  "internal": {
    "fields": ["email", "registration_date", "last_login"],
    "retention": "5years"
  },
  "sensitive": {
    "fields": ["phone", "address"],
    "retention": "1year",
    "requireConsent": true
  },
  "highlyConfidential": {
    "fields": ["ssn", "financial_data", "medical_info"],
    "retention": "90days",
    "requireConsent": true,
    "requireAnonymization": true
  }
}
```

### Retention Policy Example

```json
"retentionPolicy": {
  "user_profiles": "5years",
  "authentication_logs": "1year",
  "access_logs": "90days",
  "message_data": "30days",
  "analytics_data": "1year"
}
```

## Global Configuration (`global`)

Global settings that apply to the entire security module.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | Boolean | `false` | Enable debug mode |
| `logLevel` | String | `"info"` | Log level (debug, info, warn, error) |
| `logFormat` | String | `"json"` | Log format (json, text) |
| `language` | String | `"en"` | Default language for messages |
| `allowedOrigins` | Array | `["*"]` | CORS allowed origins |
| `rateLimit` | Object | `{}` | Rate limiting settings |
| `rateLimit.enabled` | Boolean | `false` | Enable rate limiting |
| `rateLimit.maxRequests` | Number | `100` | Maximum requests per window |
| `rateLimit.window` | Number | `60` | Time window in seconds |

## Environment Variables

The configuration can also be influenced by environment variables. Here are the supported environment variables:

| Environment Variable | Description |
|----------------------|-------------|
| `SECURITY_CONFIG_PATH` | Path to the configuration file |
| `SECURITY_LOG_LEVEL` | Overrides the log level setting |
| `SECURITY_DEBUG` | Enables debug mode when set to "true" |
| `SECURITY_AUTH_TOKEN_SECRET` | Secret key for signing JWT tokens |
| `SECURITY_AUTH_TOKEN_EXPIRY` | Access token expiry in seconds |
| `SECURITY_ENCRYPTION_KEY` | Master encryption key |
| `SECURITY_OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `SECURITY_OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Configuration Best Practices

1. **Never store secrets in the configuration file:** Use environment variables for sensitive values like tokens and keys.
2. **Enable MFA for production:** Multi-factor authentication significantly enhances security.
3. **Enforce strong password policies:** Require long, complex passwords to prevent brute-force attacks.
4. **Set appropriate token expiry:** Short-lived access tokens with longer refresh tokens provide a good balance of security and usability.
5. **Use the principle of least privilege:** Grant only the permissions necessary for each role.
6. **Configure rate limiting:** Protect against brute force and DoS attacks by limiting request rates.
7. **Enable high encryption levels for sensitive data:** Use stronger encryption for highly sensitive data, balanced with performance considerations.
8. **Implement data minimization:** Collect and retain only the data necessary for your application.
9. **Regular key rotation:** Configure automatic rotation of cryptographic keys for enhanced security.
10. **Audit logging:** Enable detailed logging for security events to aid in forensic analysis.

## Complete Configuration Example

See the [security.config.json](../examples/security.config.json) file for a complete configuration example.

## Extending the Configuration

The Security & Authentication module allows for extending the configuration with custom providers and custom configuration sections. See the [Advanced Security Guide](./advanced-security.md) for information on extending the security configuration. 