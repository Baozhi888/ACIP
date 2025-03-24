/**
 * AccessControlSystem.js
 * 
 * Implements the access control functionality for the Security & Authentication module.
 * Handles role-based access control (RBAC), attribute-based access control (ABAC),
 * and policy enforcement.
 */

/**
 * Permission types
 */
const PermissionType = {
  ALLOW: 'allow',
  DENY: 'deny'
};

/**
 * Access Control System class
 * Manages permissions and authorization
 */
class AccessControlSystem {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultPolicy: 'deny',  // 'allow' or 'deny'
      rbacEnabled: true,
      abacEnabled: true,
      contextualFactors: ['time', 'location', 'device'],
      cacheEnabled: true,
      cacheTimeout: 300, // 5 minutes in seconds
      ...options
    };
    
    this.logger = options.logger || console;
    
    // Initialize role and resource registries
    this.roles = new Map();
    this.resources = new Map();
    this.policies = new Map();
    
    // Permission cache
    this.permissionCache = new Map();
    
    // Statistics
    this.stats = {
      accessChecks: 0,
      accessGranted: 0,
      accessDenied: 0,
      cacheHits: 0,
      cacheMisses: 0,
      policyEvaluations: 0
    };
  }
  
  /**
   * Initialize the access control system
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
      
      // Set up default roles
      this._setupDefaultRoles();
      
      // Set up default resources
      this._setupDefaultResources();
      
      // Set up default policies
      this._setupDefaultPolicies();
      
      this.logger.info('Access Control System initialized');
      return true;
    } catch (error) {
      this.logger.error(`Access Control initialization failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Define a role with permissions
   * @param {string} roleId - Role identifier
   * @param {Object} roleData - Role data
   * @returns {Promise<boolean>} Success status
   */
  async defineRole(roleId, roleData) {
    try {
      if (!roleId) {
        throw new Error('Role ID is required');
      }
      
      const role = {
        id: roleId,
        name: roleData.name || roleId,
        description: roleData.description || '',
        permissions: roleData.permissions || [],
        parents: roleData.parents || [],
        created: Date.now(),
        updated: Date.now()
      };
      
      this.roles.set(roleId, role);
      this.logger.info(`Defined role: ${roleId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to define role ${roleId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Define a resource with actions
   * @param {string} resourceId - Resource identifier
   * @param {Object} resourceData - Resource data
   * @returns {Promise<boolean>} Success status
   */
  async defineResource(resourceId, resourceData) {
    try {
      if (!resourceId) {
        throw new Error('Resource ID is required');
      }
      
      const resource = {
        id: resourceId,
        name: resourceData.name || resourceId,
        description: resourceData.description || '',
        actions: resourceData.actions || [],
        attributes: resourceData.attributes || {},
        created: Date.now(),
        updated: Date.now()
      };
      
      this.resources.set(resourceId, resource);
      this.logger.info(`Defined resource: ${resourceId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to define resource ${resourceId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Define a policy
   * @param {string} policyId - Policy identifier
   * @param {Object} policyData - Policy data
   * @returns {Promise<boolean>} Success status
   */
  async definePolicy(policyId, policyData) {
    try {
      if (!policyId) {
        throw new Error('Policy ID is required');
      }
      
      const policy = {
        id: policyId,
        name: policyData.name || policyId,
        description: policyData.description || '',
        effect: policyData.effect || PermissionType.ALLOW,
        subjects: policyData.subjects || [], // Roles or user IDs
        resources: policyData.resources || [], // Resource IDs
        actions: policyData.actions || [], // Action names
        conditions: policyData.conditions || null, // Function or object with conditions
        priority: policyData.priority || 0,
        created: Date.now(),
        updated: Date.now()
      };
      
      this.policies.set(policyId, policy);
      
      // Invalidate cache since policies changed
      this.permissionCache.clear();
      
      this.logger.info(`Defined policy: ${policyId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to define policy ${policyId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Grant permission to a role
   * @param {string} roleId - Role identifier
   * @param {string} permission - Permission string (resource:action)
   * @returns {Promise<boolean>} Success status
   */
  async grantPermission(roleId, permission) {
    try {
      if (!roleId || !permission) {
        throw new Error('Role ID and permission are required');
      }
      
      // Check if role exists
      if (!this.roles.has(roleId)) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      const role = this.roles.get(roleId);
      
      // Add permission if not already granted
      if (!role.permissions.includes(permission)) {
        role.permissions.push(permission);
        role.updated = Date.now();
      }
      
      // Invalidate permission cache
      this.permissionCache.clear();
      
      this.logger.info(`Granted permission ${permission} to role ${roleId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to grant permission: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Revoke permission from a role
   * @param {string} roleId - Role identifier
   * @param {string} permission - Permission string (resource:action)
   * @returns {Promise<boolean>} Success status
   */
  async revokePermission(roleId, permission) {
    try {
      if (!roleId || !permission) {
        throw new Error('Role ID and permission are required');
      }
      
      // Check if role exists
      if (!this.roles.has(roleId)) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      const role = this.roles.get(roleId);
      
      // Remove permission if granted
      const index = role.permissions.indexOf(permission);
      if (index !== -1) {
        role.permissions.splice(index, 1);
        role.updated = Date.now();
      }
      
      // Invalidate permission cache
      this.permissionCache.clear();
      
      this.logger.info(`Revoked permission ${permission} from role ${roleId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to revoke permission: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Assign role to user
   * @param {string} userId - User identifier
   * @param {string} roleId - Role identifier
   * @returns {Promise<boolean>} Success status
   */
  async assignRole(userId, roleId) {
    try {
      if (!userId || !roleId) {
        throw new Error('User ID and Role ID are required');
      }
      
      // Check if role exists
      if (!this.roles.has(roleId)) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      // In a real implementation, this would update the user's roles in a database
      // For this implementation, we'll just log it
      
      this.logger.info(`Assigned role ${roleId} to user ${userId}`);
      
      // Invalidate permission cache for this user
      this._invalidateUserCache(userId);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to assign role: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Check if a subject has permission for an action on a resource
   * @param {Object} request - Access request
   * @returns {Promise<Object>} Access decision
   */
  async checkAccess(request) {
    try {
      const { subject, resource, action, context = {} } = request;
      
      if (!subject || !resource || !action) {
        throw new Error('Subject, resource, and action are required');
      }
      
      // Update stats
      this.stats.accessChecks++;
      
      // Check cache if enabled
      if (this.options.cacheEnabled) {
        const cacheKey = this._generateCacheKey(subject, resource, action, context);
        const cachedResult = this._getCachedDecision(cacheKey);
        
        if (cachedResult) {
          this.stats.cacheHits++;
          return cachedResult;
        }
        
        this.stats.cacheMisses++;
      }
      
      // Check permissions
      let decision = null;
      
      // Try RBAC first if enabled
      if (this.options.rbacEnabled) {
        decision = await this._checkRBACPermission(subject, resource, action);
      }
      
      // If no decision from RBAC or ABAC is enabled, try ABAC
      if (decision === null && this.options.abacEnabled) {
        decision = await this._checkABACPermission(subject, resource, action, context);
      }
      
      // If still no decision, apply the default policy
      if (decision === null) {
        decision = {
          granted: this.options.defaultPolicy === 'allow',
          type: this.options.defaultPolicy === 'allow' ? PermissionType.ALLOW : PermissionType.DENY,
          source: 'default_policy',
          reason: `Default policy is to ${this.options.defaultPolicy}`
        };
      }
      
      // Update stats
      if (decision.granted) {
        this.stats.accessGranted++;
      } else {
        this.stats.accessDenied++;
      }
      
      // Cache the decision if caching is enabled
      if (this.options.cacheEnabled) {
        const cacheKey = this._generateCacheKey(subject, resource, action, context);
        this._cacheDecision(cacheKey, decision);
      }
      
      return decision;
    } catch (error) {
      this.logger.error(`Access check error: ${error.message}`);
      
      // On error, default to deny
      return {
        granted: false,
        type: PermissionType.DENY,
        source: 'error',
        reason: error.message
      };
    }
  }
  
  /**
   * Get all roles assigned to a user
   * @param {string} userId - User identifier
   * @returns {Promise<Array>} Array of roles
   */
  async getUserRoles(userId) {
    try {
      // In a real implementation, this would retrieve the user's roles from a database
      // For this implementation, we'll return an empty array
      
      return [];
    } catch (error) {
      this.logger.error(`Failed to get user roles: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get all permissions for a role
   * @param {string} roleId - Role identifier
   * @returns {Promise<Array>} Array of permissions
   */
  async getRolePermissions(roleId) {
    try {
      if (!this.roles.has(roleId)) {
        throw new Error(`Role not found: ${roleId}`);
      }
      
      const role = this.roles.get(roleId);
      return role.permissions;
    } catch (error) {
      this.logger.error(`Failed to get role permissions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get statistics about the access control system
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      roleCount: this.roles.size,
      resourceCount: this.resources.size,
      policyCount: this.policies.size,
      cacheSize: this.permissionCache.size
    };
  }
  
  /**
   * Set up default roles
   * @private
   */
  _setupDefaultRoles() {
    // Admin role
    this.defineRole('admin', {
      name: 'Administrator',
      description: 'Full system access',
      permissions: ['*:*'] // Wildcard for all permissions
    });
    
    // User role
    this.defineRole('user', {
      name: 'Standard User',
      description: 'Basic system access',
      permissions: [
        'profile:read',
        'profile:update',
        'models:basic:invoke'
      ]
    });
    
    // Guest role
    this.defineRole('guest', {
      name: 'Guest',
      description: 'Limited system access',
      permissions: [
        'public:read'
      ]
    });
    
    this.logger.info('Default roles set up');
  }
  
  /**
   * Set up default resources
   * @private
   */
  _setupDefaultResources() {
    // Profile resource
    this.defineResource('profile', {
      name: 'User Profile',
      description: 'User profile information',
      actions: ['read', 'update', 'delete'],
      attributes: {
        sensitivity: 'medium'
      }
    });
    
    // Models resource
    this.defineResource('models', {
      name: 'AI Models',
      description: 'AI model access',
      actions: ['list', 'read', 'invoke', 'train'],
      attributes: {
        sensitivity: 'high'
      }
    });
    
    // Public resource
    this.defineResource('public', {
      name: 'Public Resources',
      description: 'Publicly accessible resources',
      actions: ['read'],
      attributes: {
        sensitivity: 'low'
      }
    });
    
    this.logger.info('Default resources set up');
  }
  
  /**
   * Set up default policies
   * @private
   */
  _setupDefaultPolicies() {
    // Admin access policy
    this.definePolicy('admin_access', {
      name: 'Admin Access',
      description: 'Administrators have full access',
      effect: PermissionType.ALLOW,
      subjects: ['admin'],
      resources: ['*'],
      actions: ['*'],
      priority: 100
    });
    
    // User basic access policy
    this.definePolicy('user_basic_access', {
      name: 'User Basic Access',
      description: 'Users have access to basic features',
      effect: PermissionType.ALLOW,
      subjects: ['user'],
      resources: ['profile', 'models:basic', 'public'],
      actions: ['read', 'update', 'invoke'],
      priority: 50
    });
    
    // Guest access policy
    this.definePolicy('guest_access', {
      name: 'Guest Access',
      description: 'Guests have limited access',
      effect: PermissionType.ALLOW,
      subjects: ['guest'],
      resources: ['public'],
      actions: ['read'],
      priority: 10
    });
    
    // Sensitive data policy
    this.definePolicy('sensitive_data_policy', {
      name: 'Sensitive Data Policy',
      description: 'Restricts access to sensitive data',
      effect: PermissionType.DENY,
      subjects: ['user', 'guest'],
      resources: ['profile:sensitive', 'models:advanced'],
      actions: ['read', 'update', 'delete', 'invoke'],
      priority: 75
    });
    
    this.logger.info('Default policies set up');
  }
  
  /**
   * Check permissions using RBAC
   * @param {string|Object} subject - User ID or subject object
   * @param {string} resource - Resource identifier
   * @param {string} action - Action to perform
   * @returns {Promise<Object|null>} Decision object or null if no decision
   * @private
   */
  async _checkRBACPermission(subject, resource, action) {
    this.stats.policyEvaluations++;
    
    // Get the subject ID
    const subjectId = typeof subject === 'string' ? subject : subject.id;
    
    // Get roles for the subject
    let subjectRoles = [];
    
    if (typeof subject === 'object' && Array.isArray(subject.roles)) {
      // If roles are directly provided in the subject object
      subjectRoles = subject.roles;
    } else {
      // Otherwise try to look them up
      subjectRoles = await this.getUserRoles(subjectId);
    }
    
    // If no roles assigned, can't allow based on RBAC
    if (subjectRoles.length === 0) {
      return null;
    }
    
    // Check each role's permissions
    for (const roleId of subjectRoles) {
      if (!this.roles.has(roleId)) {
        continue;
      }
      
      const role = this.roles.get(roleId);
      
      // Check for wildcard permission
      if (role.permissions.includes('*:*')) {
        return {
          granted: true,
          type: PermissionType.ALLOW,
          source: 'rbac',
          role: roleId,
          reason: 'Wildcard permission'
        };
      }
      
      // Check for exact permission
      const exactPermission = `${resource}:${action}`;
      if (role.permissions.includes(exactPermission)) {
        return {
          granted: true,
          type: PermissionType.ALLOW,
          source: 'rbac',
          role: roleId,
          reason: 'Exact permission match'
        };
      }
      
      // Check for resource wildcard
      const resourceWildcard = `${resource}:*`;
      if (role.permissions.includes(resourceWildcard)) {
        return {
          granted: true,
          type: PermissionType.ALLOW,
          source: 'rbac',
          role: roleId,
          reason: 'Resource wildcard match'
        };
      }
      
      // Check for action wildcard
      const actionWildcard = `*:${action}`;
      if (role.permissions.includes(actionWildcard)) {
        return {
          granted: true,
          type: PermissionType.ALLOW,
          source: 'rbac',
          role: roleId,
          reason: 'Action wildcard match'
        };
      }
    }
    
    // No matching permissions found
    return null;
  }
  
  /**
   * Check permissions using ABAC
   * @param {string|Object} subject - User ID or subject object
   * @param {string} resource - Resource identifier
   * @param {string} action - Action to perform
   * @param {Object} context - Context information
   * @returns {Promise<Object|null>} Decision object or null if no decision
   * @private
   */
  async _checkABACPermission(subject, resource, action, context) {
    this.stats.policyEvaluations++;
    
    // Get the subject ID
    const subjectId = typeof subject === 'string' ? subject : subject.id;
    
    // Get applicable policies (sorted by priority)
    const applicablePolicies = Array.from(this.policies.values())
      .filter(policy => this._isPolicyApplicable(policy, subjectId, resource, action))
      .sort((a, b) => b.priority - a.priority);
    
    // If no applicable policies, no decision
    if (applicablePolicies.length === 0) {
      return null;
    }
    
    // Evaluate each policy in priority order
    for (const policy of applicablePolicies) {
      // Check conditions if they exist
      if (policy.conditions) {
        const conditionsMet = this._evaluatePolicyConditions(policy.conditions, subject, resource, action, context);
        
        if (!conditionsMet) {
          continue; // Skip this policy if conditions not met
        }
      }
      
      // Policy applies, return the decision
      return {
        granted: policy.effect === PermissionType.ALLOW,
        type: policy.effect,
        source: 'abac',
        policy: policy.id,
        reason: policy.description || `Policy ${policy.id} applied`
      };
    }
    
    // No policy applied
    return null;
  }
  
  /**
   * Check if a policy applies to a subject, resource, and action
   * @param {Object} policy - Policy object
   * @param {string} subjectId - Subject identifier
   * @param {string} resource - Resource identifier
   * @param {string} action - Action to perform
   * @returns {boolean} True if policy applies
   * @private
   */
  _isPolicyApplicable(policy, subjectId, resource, action) {
    // Check subjects
    const subjectMatches = policy.subjects.includes('*') || 
      policy.subjects.includes(subjectId) ||
      (Array.isArray(policy.subjects) && policy.subjects.some(s => 
        typeof s === 'string' && (s === '*' || s === subjectId)
      ));
    
    if (!subjectMatches) {
      return false;
    }
    
    // Check resources
    const resourceMatches = policy.resources.includes('*') || 
      policy.resources.includes(resource) ||
      (Array.isArray(policy.resources) && policy.resources.some(r => 
        typeof r === 'string' && (r === '*' || r === resource || 
        (r.endsWith('*') && resource.startsWith(r.slice(0, -1))))
      ));
    
    if (!resourceMatches) {
      return false;
    }
    
    // Check actions
    const actionMatches = policy.actions.includes('*') || 
      policy.actions.includes(action) ||
      (Array.isArray(policy.actions) && policy.actions.some(a => 
        typeof a === 'string' && (a === '*' || a === action)
      ));
    
    return actionMatches;
  }
  
  /**
   * Evaluate policy conditions
   * @param {Function|Object} conditions - Policy conditions
   * @param {Object} subject - Subject
   * @param {string} resource - Resource
   * @param {string} action - Action
   * @param {Object} context - Context
   * @returns {boolean} True if conditions are met
   * @private
   */
  _evaluatePolicyConditions(conditions, subject, resource, action, context) {
    if (typeof conditions === 'function') {
      // If conditions is a function, call it with the parameters
      return conditions(subject, resource, action, context);
    } else if (typeof conditions === 'object' && conditions !== null) {
      // If conditions is an object, perform attribute-based evaluation
      return this._evaluateAttributeConditions(conditions, subject, resource, action, context);
    }
    
    // If no valid conditions, consider them met
    return true;
  }
  
  /**
   * Evaluate attribute-based conditions
   * @param {Object} conditions - Attribute conditions
   * @param {Object} subject - Subject
   * @param {string} resource - Resource
   * @param {string} action - Action
   * @param {Object} context - Context
   * @returns {boolean} True if conditions are met
   * @private
   */
  _evaluateAttributeConditions(conditions, subject, resource, action, context) {
    for (const key in conditions) {
      if (key === 'subject') {
        if (!this._matchAttributes(conditions.subject, subject)) {
          return false;
        }
      } else if (key === 'resource') {
        const resourceObj = this.resources.get(resource);
        if (!resourceObj || !this._matchAttributes(conditions.resource, resourceObj)) {
          return false;
        }
      } else if (key === 'context') {
        if (!this._matchAttributes(conditions.context, context)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Match attributes in a condition
   * @param {Object} condition - Condition attributes
   * @param {Object} attributes - Actual attributes
   * @returns {boolean} True if attributes match
   * @private
   */
  _matchAttributes(condition, attributes) {
    for (const key in condition) {
      const conditionValue = condition[key];
      const attributeValue = attributes[key];
      
      if (attributeValue === undefined) {
        return false; // Attribute doesn't exist
      }
      
      // Handle various comparison types
      if (typeof conditionValue === 'object' && conditionValue !== null) {
        // Complex condition (operators)
        if ('eq' in conditionValue && attributeValue !== conditionValue.eq) return false;
        if ('ne' in conditionValue && attributeValue === conditionValue.ne) return false;
        if ('gt' in conditionValue && attributeValue <= conditionValue.gt) return false;
        if ('gte' in conditionValue && attributeValue < conditionValue.gte) return false;
        if ('lt' in conditionValue && attributeValue >= conditionValue.lt) return false;
        if ('lte' in conditionValue && attributeValue > conditionValue.lte) return false;
        if ('in' in conditionValue && !conditionValue.in.includes(attributeValue)) return false;
        if ('nin' in conditionValue && conditionValue.nin.includes(attributeValue)) return false;
      } else {
        // Simple equality
        if (attributeValue !== conditionValue) return false;
      }
    }
    
    return true;
  }
  
  /**
   * Generate cache key for a permission check
   * @param {string|Object} subject - Subject
   * @param {string} resource - Resource
   * @param {string} action - Action
   * @param {Object} context - Context
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(subject, resource, action, context) {
    const subjectId = typeof subject === 'string' ? subject : subject.id;
    
    // For simplicity, only include critical context factors in the key
    const contextKey = this.options.contextualFactors
      .filter(factor => context[factor] !== undefined)
      .map(factor => `${factor}:${context[factor]}`)
      .join(',');
    
    return `${subjectId}|${resource}|${action}|${contextKey}`;
  }
  
  /**
   * Get a cached decision
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached decision or null
   * @private
   */
  _getCachedDecision(cacheKey) {
    if (!this.permissionCache.has(cacheKey)) {
      return null;
    }
    
    const cached = this.permissionCache.get(cacheKey);
    
    // Check if cache entry has expired
    if (cached.expiresAt < Date.now()) {
      this.permissionCache.delete(cacheKey);
      return null;
    }
    
    return cached.decision;
  }
  
  /**
   * Cache a decision
   * @param {string} cacheKey - Cache key
   * @param {Object} decision - Decision object
   * @private
   */
  _cacheDecision(cacheKey, decision) {
    const expiresAt = Date.now() + (this.options.cacheTimeout * 1000);
    
    this.permissionCache.set(cacheKey, {
      decision,
      expiresAt
    });
  }
  
  /**
   * Invalidate cache entries for a user
   * @param {string} userId - User identifier
   * @private
   */
  _invalidateUserCache(userId) {
    // Find and remove all cache entries for this user
    for (const [key, value] of this.permissionCache.entries()) {
      if (key.startsWith(`${userId}|`)) {
        this.permissionCache.delete(key);
      }
    }
  }
}

module.exports = AccessControlSystem;
module.exports.PermissionType = PermissionType; 