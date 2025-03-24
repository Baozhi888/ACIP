/**
 * ProviderManager
 * 
 * Manages AI model providers, handles provider health checks,
 * and implements failover strategies for resilient model invocation.
 */

const EventEmitter = require('events');
const { generateId } = require('../utils/identifiers');

class ProviderManager {
  /**
   * Creates a new ProviderManager instance
   * @param {Object} options - Provider manager options
   */
  constructor(options = {}) {
    this.providerRegistry = options.providerRegistry;
    this.config = options.config || {};
    this.healthCheckInterval = this.config.healthCheckIntervalMs || 60000; // Default to 1 minute
    this.providerHealthStatus = new Map();
    this.healthCheckTimers = new Map();
    this.events = new EventEmitter();
    
    // Provider failure history for tracking and circuit breaking
    this.failureHistory = new Map();
    this.circuitBreakers = new Map();
    
    // Initialize event listeners for provider registry
    this._initializeEventListeners();
  }
  
  /**
   * Initialize the provider manager 
   * @returns {Promise<void>}
   */
  async initialize() {
    // Initialize all providers in the registry
    const providers = await this.providerRegistry.getAllProviders();
    
    for (const provider of providers) {
      await this._initializeProvider(provider.id);
    }
    
    // Setup regular health checks if enabled
    if (this.config.enableHealthChecks !== false) {
      this._setupHealthChecks();
    }
  }
  
  /**
   * Get a provider by ID
   * @param {string} providerId - Provider ID
   * @returns {Object} - The provider instance
   */
  getProvider(providerId) {
    return this.providerRegistry.getProvider(providerId);
  }
  
  /**
   * Get all available providers
   * @param {boolean} healthyOnly - Whether to return only healthy providers
   * @returns {Array<Object>} - Array of provider instances
   */
  getProviders(healthyOnly = false) {
    const providers = this.providerRegistry.getAllProviders();
    
    if (!healthyOnly) {
      return providers;
    }
    
    return providers.filter(provider => 
      this.isProviderHealthy(provider.id)
    );
  }
  
  /**
   * Check if a provider is healthy
   * @param {string} providerId - Provider ID
   * @returns {boolean} - Whether the provider is healthy
   */
  isProviderHealthy(providerId) {
    // If health status is not tracked, assume healthy
    if (!this.providerHealthStatus.has(providerId)) {
      return true;
    }
    
    const status = this.providerHealthStatus.get(providerId);
    
    // Check if circuit breaker is active
    if (this.circuitBreakers.has(providerId)) {
      const breaker = this.circuitBreakers.get(providerId);
      if (breaker.isOpen && breaker.timeout > Date.now()) {
        return false;
      }
    }
    
    return status.healthy;
  }
  
  /**
   * Get health status for a specific provider
   * @param {string} providerId - Provider ID
   * @returns {Object} - Provider health status details
   */
  getProviderHealth(providerId) {
    if (!this.providerHealthStatus.has(providerId)) {
      return {
        providerId,
        healthy: true,
        lastCheck: null,
        reason: 'Not yet checked'
      };
    }
    
    const status = this.providerHealthStatus.get(providerId);
    
    // Add circuit breaker information if available
    if (this.circuitBreakers.has(providerId)) {
      const breaker = this.circuitBreakers.get(providerId);
      status.circuitBreaker = {
        isOpen: breaker.isOpen,
        remainingTimeMs: Math.max(0, breaker.timeout - Date.now()),
        failureThreshold: breaker.failureThreshold
      };
    }
    
    return status;
  }
  
  /**
   * Get health status for all providers
   * @returns {Object} - Map of provider IDs to health status
   */
  getAllProviderHealth() {
    const healthStatuses = {};
    
    const providerIds = [...this.providerRegistry.getAllProviderIds()];
    
    for (const providerId of providerIds) {
      healthStatuses[providerId] = this.getProviderHealth(providerId);
    }
    
    return healthStatuses;
  }
  
  /**
   * Manually trigger a health check for a provider
   * @param {string} providerId - Provider ID
   * @returns {Promise<Object>} - Health check result
   */
  async checkProviderHealth(providerId) {
    const provider = this.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    return this._performHealthCheck(provider);
  }
  
  /**
   * Manually trigger health checks for all providers
   * @returns {Promise<Object>} - Map of provider IDs to health check results
   */
  async checkAllProvidersHealth() {
    const providers = this.providerRegistry.getAllProviders();
    const results = {};
    
    for (const provider of providers) {
      results[provider.id] = await this._performHealthCheck(provider);
    }
    
    return results;
  }
  
  /**
   * Reset the circuit breaker for a provider
   * @param {string} providerId - Provider ID
   * @returns {boolean} - Whether the reset was successful
   */
  resetCircuitBreaker(providerId) {
    if (!this.circuitBreakers.has(providerId)) {
      return false;
    }
    
    // Reset circuit breaker state
    const breaker = this.circuitBreakers.get(providerId);
    breaker.isOpen = false;
    breaker.failureCount = 0;
    breaker.timeout = 0;
    
    // Reset failure history
    this.failureHistory.set(providerId, []);
    
    // Update provider health status
    if (this.providerHealthStatus.has(providerId)) {
      const status = this.providerHealthStatus.get(providerId);
      status.circuitBreaker = {
        isOpen: false,
        remainingTimeMs: 0,
        failureThreshold: breaker.failureThreshold
      };
    }
    
    // Emit circuit breaker reset event
    this.events.emit('provider:circuit-reset', {
      providerId,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * Register event listener for provider events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.events.on(event, handler);
  }
  
  /**
   * Remove event listener for provider events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.events.off(event, handler);
  }
  
  /**
   * Record provider failure for circuit breaking
   * @param {string} providerId - Provider ID
   * @param {string} error - Error message
   */
  recordProviderFailure(providerId, error) {
    if (!this.config.enableCircuitBreaker) {
      return;
    }
    
    if (!this.failureHistory.has(providerId)) {
      this.failureHistory.set(providerId, []);
    }
    
    // Record the failure
    const failures = this.failureHistory.get(providerId);
    failures.push({
      timestamp: Date.now(),
      error
    });
    
    // Only keep recent failures based on window size
    const windowMs = this.config.circuitBreakerWindowMs || 60000; // Default: 1 minute
    const cutoff = Date.now() - windowMs;
    
    // Filter out old failures
    const recentFailures = failures.filter(f => f.timestamp >= cutoff);
    this.failureHistory.set(providerId, recentFailures);
    
    // Check if circuit breaker should be opened
    this._evaluateCircuitBreaker(providerId);
  }
  
  /**
   * Initialize event listeners from the provider registry
   * @private
   */
  _initializeEventListeners() {
    // Listen for provider registration events
    this.providerRegistry.on('provider:registered', async (event) => {
      await this._initializeProvider(event.providerId);
      
      this.events.emit('provider:registered', {
        providerId: event.providerId,
        timestamp: Date.now()
      });
    });
    
    // Listen for provider removal events
    this.providerRegistry.on('provider:removed', (event) => {
      this._cleanupProvider(event.providerId);
      
      this.events.emit('provider:removed', {
        providerId: event.providerId,
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Initialize a provider
   * @param {string} providerId - Provider ID
   * @private
   */
  async _initializeProvider(providerId) {
    const provider = this.getProvider(providerId);
    
    if (!provider) {
      return;
    }
    
    // Set initial health status
    this.providerHealthStatus.set(providerId, {
      providerId,
      healthy: true,
      lastCheck: null,
      reason: 'Initializing'
    });
    
    // Initialize circuit breaker
    if (this.config.enableCircuitBreaker) {
      this.circuitBreakers.set(providerId, {
        isOpen: false,
        failureCount: 0,
        failureThreshold: this.config.circuitBreakerThreshold || 5,
        timeout: 0
      });
      
      this.failureHistory.set(providerId, []);
    }
    
    // Perform initial health check
    if (this.config.enableHealthChecks !== false) {
      try {
        await this._performHealthCheck(provider);
      } catch (error) {
        // Log the error but don't block initialization
        console.error(`Health check failed for provider ${providerId}:`, error);
      }
    }
  }
  
  /**
   * Clean up a provider
   * @param {string} providerId - Provider ID
   * @private
   */
  _cleanupProvider(providerId) {
    // Clear health check timer
    if (this.healthCheckTimers.has(providerId)) {
      clearTimeout(this.healthCheckTimers.get(providerId));
      this.healthCheckTimers.delete(providerId);
    }
    
    // Remove health status
    this.providerHealthStatus.delete(providerId);
    
    // Remove circuit breaker
    this.circuitBreakers.delete(providerId);
    
    // Remove failure history
    this.failureHistory.delete(providerId);
  }
  
  /**
   * Set up scheduled health checks for all providers
   * @private
   */
  _setupHealthChecks() {
    // Create a staggered schedule for provider health checks
    // to avoid checking all providers at the same time
    const providers = this.providerRegistry.getAllProviders();
    
    providers.forEach((provider, index) => {
      // Stagger initial health checks
      const staggerAmount = index * (this.healthCheckInterval / (providers.length || 1));
      const initialDelay = Math.min(staggerAmount, this.healthCheckInterval);
      
      // Schedule initial health check with staggered delay
      const timerId = setTimeout(() => {
        this._performHealthCheck(provider)
          .catch(error => console.error(`Health check failed for provider ${provider.id}:`, error));
        
        // Schedule recurring health checks
        this._scheduleNextHealthCheck(provider.id);
      }, initialDelay);
      
      this.healthCheckTimers.set(provider.id, timerId);
    });
  }
  
  /**
   * Schedule the next health check for a provider
   * @param {string} providerId - Provider ID
   * @private
   */
  _scheduleNextHealthCheck(providerId) {
    // Clear any existing timer
    if (this.healthCheckTimers.has(providerId)) {
      clearTimeout(this.healthCheckTimers.get(providerId));
    }
    
    // Schedule next health check
    const timerId = setTimeout(async () => {
      const provider = this.getProvider(providerId);
      
      if (provider) {
        try {
          await this._performHealthCheck(provider);
        } catch (error) {
          console.error(`Health check failed for provider ${providerId}:`, error);
        }
        
        // Schedule the next check
        this._scheduleNextHealthCheck(providerId);
      }
    }, this.healthCheckInterval);
    
    this.healthCheckTimers.set(providerId, timerId);
  }
  
  /**
   * Perform a health check for a provider
   * @param {Object} provider - Provider instance
   * @returns {Promise<Object>} - Health check result
   * @private
   */
  async _performHealthCheck(provider) {
    const startTime = Date.now();
    
    try {
      // Call the provider's testConnection method
      const result = await provider.testConnection();
      const endTime = Date.now();
      
      // Update provider health status
      const status = {
        providerId: provider.id,
        healthy: result.success,
        lastCheck: startTime,
        lastCheckDuration: endTime - startTime,
        nextCheck: startTime + this.healthCheckInterval
      };
      
      if (!result.success) {
        status.reason = result.error || 'Unknown error';
        status.errorDetails = result.errorDetails;
      }
      
      this.providerHealthStatus.set(provider.id, status);
      
      // Reset failures if successful
      if (result.success && this.config.enableCircuitBreaker) {
        // If the circuit breaker is half-open and this check succeeded,
        // close the circuit breaker completely
        if (this.circuitBreakers.has(provider.id)) {
          const breaker = this.circuitBreakers.get(provider.id);
          if (breaker.isOpen && breaker.timeout <= Date.now()) {
            // Close the circuit breaker
            breaker.isOpen = false;
            breaker.failureCount = 0;
            
            // Emit circuit closed event
            this.events.emit('provider:circuit-closed', {
              providerId: provider.id,
              timestamp: Date.now()
            });
          }
        }
      } else if (!result.success) {
        // Record failure for circuit breaking
        this.recordProviderFailure(provider.id, result.error || 'Health check failed');
      }
      
      // Emit health check event
      this.events.emit('provider:health-check', {
        providerId: provider.id,
        healthy: result.success,
        timestamp: startTime,
        duration: endTime - startTime,
        result
      });
      
      return status;
    } catch (error) {
      const endTime = Date.now();
      
      // Update provider health status
      const status = {
        providerId: provider.id,
        healthy: false,
        lastCheck: startTime,
        lastCheckDuration: endTime - startTime,
        nextCheck: startTime + this.healthCheckInterval,
        reason: error.message,
        errorDetails: {
          message: error.message,
          stack: error.stack
        }
      };
      
      this.providerHealthStatus.set(provider.id, status);
      
      // Record failure for circuit breaking
      this.recordProviderFailure(provider.id, error.message);
      
      // Emit health check event
      this.events.emit('provider:health-check-failed', {
        providerId: provider.id,
        timestamp: startTime,
        duration: endTime - startTime,
        error: error.message
      });
      
      return status;
    }
  }
  
  /**
   * Evaluate whether to open the circuit breaker for a provider
   * @param {string} providerId - Provider ID
   * @private
   */
  _evaluateCircuitBreaker(providerId) {
    if (!this.config.enableCircuitBreaker || !this.circuitBreakers.has(providerId)) {
      return;
    }
    
    const breaker = this.circuitBreakers.get(providerId);
    const failures = this.failureHistory.get(providerId) || [];
    
    // If the circuit is already open, skip evaluation
    if (breaker.isOpen && breaker.timeout > Date.now()) {
      return;
    }
    
    // Count recent failures within the window
    const windowMs = this.config.circuitBreakerWindowMs || 60000;
    const cutoff = Date.now() - windowMs;
    const recentFailures = failures.filter(f => f.timestamp >= cutoff);
    
    breaker.failureCount = recentFailures.length;
    
    // Check if threshold is exceeded
    if (breaker.failureCount >= breaker.failureThreshold) {
      // Open the circuit breaker
      breaker.isOpen = true;
      
      // Set timeout for circuit breaker (exponential backoff)
      const baseTimeoutMs = this.config.circuitBreakerBaseTimeoutMs || 30000; // Default: 30 seconds
      const maxTimeoutMs = this.config.circuitBreakerMaxTimeoutMs || 300000; // Default: 5 minutes
      
      // Calculate backoff (doubling each time, up to max)
      const consecutiveOpens = (breaker.consecutiveOpens || 0) + 1;
      breaker.consecutiveOpens = consecutiveOpens;
      
      const timeoutMs = Math.min(
        baseTimeoutMs * Math.pow(2, consecutiveOpens - 1),
        maxTimeoutMs
      );
      
      breaker.timeout = Date.now() + timeoutMs;
      
      // Update provider health status
      if (this.providerHealthStatus.has(providerId)) {
        const status = this.providerHealthStatus.get(providerId);
        status.healthy = false;
        status.reason = 'Circuit breaker open';
        status.circuitBreaker = {
          isOpen: true,
          remainingTimeMs: timeoutMs,
          failureThreshold: breaker.failureThreshold
        };
      }
      
      // Emit circuit breaker event
      this.events.emit('provider:circuit-open', {
        providerId,
        timestamp: Date.now(),
        timeoutMs,
        failureCount: breaker.failureCount,
        threshold: breaker.failureThreshold,
        reopenAt: new Date(breaker.timeout).toISOString()
      });
    }
  }
}

module.exports = ProviderManager; 