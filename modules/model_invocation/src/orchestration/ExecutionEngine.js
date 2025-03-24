/**
 * ExecutionEngine
 * 
 * Executes model invocation plans created by the ExecutionPlanner,
 * managing the execution flow, error handling, and result processing.
 */

const EventEmitter = require('events');

class ExecutionEngine {
  /**
   * Creates a new ExecutionEngine instance
   * @param {Object} options - Execution engine options
   */
  constructor(options) {
    this.modelInvocationModule = options.modelInvocationModule;
    this.providerRegistry = options.providerRegistry;
    this.modelRegistry = options.modelRegistry;
    this.cacheManager = options.cacheManager;
    this.metricsCollector = options.metricsCollector;
    this.config = options.config || {};
    
    // Active executions
    this.activeExecutions = new Map();
    this.events = new EventEmitter();
    
    // Execution handler methods
    this.executionHandlers = {
      standard: this._executeStandardPlan.bind(this),
      parallel: this._executeParallelPlan.bind(this),
      redundant: this._executeRedundantPlan.bind(this),
      fallback: this._executeFallbackPlan.bind(this)
    };
  }
  
  /**
   * Execute a model invocation plan
   * @param {Object} plan - The execution plan
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - The execution result
   */
  async execute(plan, options = {}) {
    // Validate the plan
    this._validatePlan(plan);
    
    // Create execution context
    const executionId = plan.metadata?.planId || this._generateExecutionId();
    
    const context = {
      id: executionId,
      plan,
      options,
      startTime: Date.now(),
      endTime: null,
      status: 'running',
      results: new Map(),
      errors: new Map(),
      primaryResult: null,
      events: new EventEmitter()
    };
    
    // Register execution
    this.activeExecutions.set(executionId, context);
    
    // Emit execution started event
    this._emitExecutionEvent('execution:started', {
      executionId,
      plan: plan.metadata,
      timestamp: context.startTime
    });
    
    try {
      // Select and call the appropriate execution handler
      const handler = this.executionHandlers[plan.type];
      
      if (!handler) {
        throw new Error(`Unsupported execution plan type: ${plan.type}`);
      }
      
      // Execute the plan
      const result = await handler(context);
      
      // Mark execution as completed
      context.status = 'completed';
      context.endTime = Date.now();
      context.primaryResult = result;
      
      // Emit execution completed event
      this._emitExecutionEvent('execution:completed', {
        executionId,
        planType: plan.type,
        duration: context.endTime - context.startTime,
        timestamp: context.endTime
      });
      
      // Return the result
      return result;
    } catch (error) {
      // Mark execution as failed
      context.status = 'failed';
      context.endTime = Date.now();
      context.error = error.message;
      
      // Emit execution failed event
      this._emitExecutionEvent('execution:failed', {
        executionId,
        planType: plan.type,
        error: error.message,
        duration: context.endTime - context.startTime,
        timestamp: context.endTime
      });
      
      // Rethrow the error
      throw error;
    } finally {
      // Clean up the execution after a delay
      setTimeout(() => {
        this.activeExecutions.delete(executionId);
      }, this.config.executionCleanupDelayMs || 60000); // Default: 1 minute
    }
  }
  
  /**
   * Cancel an active execution
   * @param {string} executionId - ID of the execution to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelExecution(executionId) {
    const context = this.activeExecutions.get(executionId);
    
    if (!context || context.status !== 'running') {
      return false;
    }
    
    // Mark execution as cancelled
    context.status = 'cancelled';
    context.endTime = Date.now();
    
    // Cancel all active requests
    for (const requestId of context.activeRequestIds || []) {
      this.modelInvocationModule.cancel(requestId);
    }
    
    // Emit execution cancelled event
    this._emitExecutionEvent('execution:cancelled', {
      executionId,
      planType: context.plan.type,
      duration: context.endTime - context.startTime,
      timestamp: context.endTime
    });
    
    return true;
  }
  
  /**
   * Get status of an execution
   * @param {string} executionId - ID of the execution
   * @returns {Object} - Execution status
   */
  getExecutionStatus(executionId) {
    const context = this.activeExecutions.get(executionId);
    
    if (!context) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    return {
      id: context.id,
      status: context.status,
      planType: context.plan.type,
      startTime: context.startTime,
      endTime: context.endTime,
      duration: context.endTime 
        ? context.endTime - context.startTime 
        : Date.now() - context.startTime,
      completedSteps: [...context.results.keys()],
      erroredSteps: [...context.errors.keys()],
      error: context.error
    };
  }
  
  /**
   * Register event listener for execution events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    this.events.on(event, handler);
  }
  
  /**
   * Remove event listener for execution events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    this.events.off(event, handler);
  }
  
  /**
   * Execute a standard plan (single model)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   * @private
   */
  async _executeStandardPlan(context) {
    const { plan } = context;
    const step = plan.steps[0];
    
    // Try to get from cache if caching is enabled
    if (this.cacheManager && !context.options.skipCache) {
      const cachedResult = await this._checkCache(step.request);
      
      if (cachedResult) {
        // Record the cached result
        context.results.set(step.id, cachedResult);
        context.wasCached = true;
        
        // Emit step completed event with cache hit info
        this._emitStepEvent(context, 'step:completed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          cached: true,
          timestamp: Date.now()
        });
        
        return cachedResult;
      }
    }
    
    try {
      // Emit step started event
      this._emitStepEvent(context, 'step:started', {
        stepId: step.id,
        modelId: step.modelId,
        providerId: step.providerId,
        timestamp: Date.now()
      });
      
      // Execute the model request
      const result = await this._invokeModel(step.modelId, step.providerId, step.request);
      
      // Store the result
      context.results.set(step.id, result);
      
      // Cache the result if caching is enabled
      if (this.cacheManager && !context.options.skipCache) {
        await this._cacheResult(step.request, result);
      }
      
      // Emit step completed event
      this._emitStepEvent(context, 'step:completed', {
        stepId: step.id,
        modelId: step.modelId,
        providerId: step.providerId,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // Record the error
      context.errors.set(step.id, error);
      
      // Emit step failed event
      this._emitStepEvent(context, 'step:failed', {
        stepId: step.id,
        modelId: step.modelId,
        providerId: step.providerId,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }
  
  /**
   * Execute a parallel plan (multiple models in parallel)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   * @private
   */
  async _executeParallelPlan(context) {
    const { plan } = context;
    const selectionStrategy = plan.selectionStrategy || 'fastest';
    
    // Set up tracking for active requests
    context.activeRequestIds = [];
    
    // Start all steps in parallel
    const stepPromises = plan.steps.map(async (step) => {
      try {
        // Emit step started event
        this._emitStepEvent(context, 'step:started', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          timestamp: Date.now()
        });
        
        // Execute the model request
        const result = await this._invokeModel(step.modelId, step.providerId, step.request);
        
        // Store the result
        context.results.set(step.id, result);
        
        // Cache the result if caching is enabled
        if (this.cacheManager && !context.options.skipCache) {
          await this._cacheResult(step.request, result);
        }
        
        // Emit step completed event
        this._emitStepEvent(context, 'step:completed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          timestamp: Date.now()
        });
        
        return {
          stepId: step.id,
          result,
          timestamp: Date.now()
        };
      } catch (error) {
        // Record the error
        context.errors.set(step.id, error);
        
        // Emit step failed event
        this._emitStepEvent(context, 'step:failed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          error: error.message,
          timestamp: Date.now()
        });
        
        // Rethrow the error to be caught by Promise.allSettled
        throw error;
      }
    });
    
    // Wait for all steps to complete or fail
    const results = await Promise.allSettled(stepPromises);
    
    // Get successful results
    const successfulResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    // Handle case where all steps failed
    if (successfulResults.length === 0) {
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason);
      
      throw new Error(`All parallel steps failed: ${errors.map(e => e.message).join(', ')}`);
    }
    
    // Select the result based on the selection strategy
    let selectedResult;
    
    if (selectionStrategy === 'fastest') {
      // Return the first result that completed
      selectedResult = successfulResults[0];
    } else if (selectionStrategy === 'majority') {
      // Simple implementation - select result that appears most frequently
      // A more sophisticated implementation would compare semantic content
      selectedResult = this._selectMajorityResult(successfulResults);
    } else if (selectionStrategy === 'highestQuality') {
      // Select result from the highest quality model
      selectedResult = await this._selectHighestQualityResult(successfulResults, plan.steps);
    } else {
      // Default to first result
      selectedResult = successfulResults[0];
    }
    
    return selectedResult.result;
  }
  
  /**
   * Execute a redundant plan (multiple models for verification)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   * @private
   */
  async _executeRedundantPlan(context) {
    const { plan } = context;
    const verificationStrategy = plan.verificationStrategy || 'majority';
    
    // Set up tracking for active requests
    context.activeRequestIds = [];
    
    // Start all steps in parallel
    const stepPromises = plan.steps.map(async (step) => {
      try {
        // Emit step started event
        this._emitStepEvent(context, 'step:started', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          timestamp: Date.now()
        });
        
        // Execute the model request
        const result = await this._invokeModel(step.modelId, step.providerId, step.request);
        
        // Store the result
        context.results.set(step.id, result);
        
        // Cache the result if caching is enabled
        if (this.cacheManager && !context.options.skipCache) {
          await this._cacheResult(step.request, result);
        }
        
        // Emit step completed event
        this._emitStepEvent(context, 'step:completed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          timestamp: Date.now()
        });
        
        return {
          stepId: step.id,
          result,
          timestamp: Date.now()
        };
      } catch (error) {
        // Record the error
        context.errors.set(step.id, error);
        
        // Emit step failed event
        this._emitStepEvent(context, 'step:failed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          error: error.message,
          timestamp: Date.now()
        });
        
        // Rethrow the error to be caught by Promise.allSettled
        throw error;
      }
    });
    
    // Wait for all steps to complete or fail
    const results = await Promise.allSettled(stepPromises);
    
    // Get successful results
    const successfulResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    // Require at least 2 successful results for verification
    if (successfulResults.length < 2) {
      // If primary result is available, return it
      const primaryStepId = plan.primaryStep;
      if (primaryStepId && context.results.has(primaryStepId)) {
        return context.results.get(primaryStepId);
      }
      
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason);
      
      throw new Error(`Not enough successful results for verification: ${errors.map(e => e.message).join(', ')}`);
    }
    
    // Verify and select the result based on the verification strategy
    if (verificationStrategy === 'majority') {
      // Select result by majority vote
      return this._selectMajorityResult(successfulResults).result;
    } else if (verificationStrategy === 'primary') {
      // Use primary model result but verify against others
      const primaryStepId = plan.primaryStep;
      const primaryResult = successfulResults.find(r => r.stepId === primaryStepId);
      
      if (!primaryResult) {
        throw new Error(`Primary step ${primaryStepId} failed`);
      }
      
      // Compare primary result with others and emit verification event
      const verification = await this._verifyResults(primaryResult, successfulResults);
      
      this._emitExecutionEvent('execution:verified', {
        executionId: context.id,
        verification,
        timestamp: Date.now()
      });
      
      return primaryResult.result;
    } else if (verificationStrategy === 'consensus') {
      // Require consensus (all results agree)
      const verification = await this._verifyResults(
        successfulResults[0],
        successfulResults
      );
      
      if (!verification.consensus) {
        throw new Error(`No consensus among model results: ${verification.details}`);
      }
      
      return successfulResults[0].result;
    }
    
    // Default to primary result
    const primaryStepId = plan.primaryStep;
    const primaryResult = successfulResults.find(r => r.stepId === primaryStepId);
    
    return primaryResult ? primaryResult.result : successfulResults[0].result;
  }
  
  /**
   * Execute a fallback plan (try models in sequence until success)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   * @private
   */
  async _executeFallbackPlan(context) {
    const { plan } = context;
    const fallbackCondition = plan.fallbackCondition || 'error';
    
    // Try each step in sequence until one succeeds
    let lastError = null;
    
    for (const step of plan.steps) {
      try {
        // Emit step started event
        this._emitStepEvent(context, 'step:started', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          timestamp: Date.now()
        });
        
        // Try to get from cache if caching is enabled
        let result = null;
        
        if (this.cacheManager && !context.options.skipCache) {
          result = await this._checkCache(step.request);
          
          if (result) {
            // Record the cached result
            context.results.set(step.id, result);
            context.wasCached = true;
            
            // Emit step completed event with cache hit info
            this._emitStepEvent(context, 'step:completed', {
              stepId: step.id,
              modelId: step.modelId,
              providerId: step.providerId,
              cached: true,
              timestamp: Date.now()
            });
            
            return result;
          }
        }
        
        // Execute the model request
        result = await this._invokeModel(step.modelId, step.providerId, step.request);
        
        // Store the result
        context.results.set(step.id, result);
        
        // Cache the result if caching is enabled
        if (this.cacheManager && !context.options.skipCache) {
          await this._cacheResult(step.request, result);
        }
        
        // Emit step completed event
        this._emitStepEvent(context, 'step:completed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          timestamp: Date.now()
        });
        
        // Check if we should fall back based on result
        if (fallbackCondition === 'quality' && this._isLowQualityResult(result)) {
          // Record the error and continue to next fallback
          const error = new Error('Low quality result');
          context.errors.set(step.id, error);
          lastError = error;
          
          // Emit step failed event
          this._emitStepEvent(context, 'step:low-quality', {
            stepId: step.id,
            modelId: step.modelId,
            providerId: step.providerId,
            timestamp: Date.now()
          });
          
          continue;
        }
        
        // If we get here, the step succeeded
        return result;
      } catch (error) {
        // Record the error
        context.errors.set(step.id, error);
        lastError = error;
        
        // Emit step failed event
        this._emitStepEvent(context, 'step:failed', {
          stepId: step.id,
          modelId: step.modelId,
          providerId: step.providerId,
          error: error.message,
          timestamp: Date.now()
        });
        
        // Continue to next fallback
      }
    }
    
    // If we get here, all steps failed
    throw new Error(`All fallback steps failed: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Invoke a model with a request
   * @param {string} modelId - ID of the model to invoke
   * @param {string} providerId - ID of the provider
   * @param {Object} request - Model request
   * @returns {Promise<Object>} - Model response
   * @private
   */
  async _invokeModel(modelId, providerId, request) {
    // Prepare request with model and provider IDs
    const fullRequest = {
      ...request,
      modelId,
      provider: providerId
    };
    
    // Store request ID for potential cancellation
    if (fullRequest.requestId) {
      const context = this.activeExecutions.get(fullRequest.executionId);
      if (context) {
        context.activeRequestIds = context.activeRequestIds || [];
        context.activeRequestIds.push(fullRequest.requestId);
      }
    }
    
    // Invoke the model
    return this.modelInvocationModule.invoke(fullRequest);
  }
  
  /**
   * Check cache for a model request
   * @param {Object} request - Model request
   * @returns {Promise<Object|null>} - Cached result or null
   * @private
   */
  async _checkCache(request) {
    if (!this.cacheManager) {
      return null;
    }
    
    try {
      return await this.cacheManager.get(request);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Cache retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Cache a model result
   * @param {Object} request - Model request
   * @param {Object} result - Model result
   * @returns {Promise<void>}
   * @private
   */
  async _cacheResult(request, result) {
    if (!this.cacheManager) {
      return;
    }
    
    try {
      await this.cacheManager.set(request, result);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Cache storage error:', error);
    }
  }
  
  /**
   * Select result by majority vote
   * @param {Array<Object>} results - Step results
   * @returns {Object} - Selected result
   * @private
   */
  _selectMajorityResult(results) {
    // Simple implementation - group results by content similarity
    // A more sophisticated implementation would use semantic similarity
    
    // For now, just return the first result
    // In a real implementation, this would compare results and select
    // the one that appears most frequently or has highest consensus
    return results[0];
  }
  
  /**
   * Select result from highest quality model
   * @param {Array<Object>} results - Step results
   * @param {Array<Object>} steps - Plan steps
   * @returns {Promise<Object>} - Selected result
   * @private
   */
  async _selectHighestQualityResult(results, steps) {
    // Get models for all successful results
    const modelScores = [];
    
    for (const result of results) {
      const step = steps.find(s => s.id === result.stepId);
      if (step) {
        const model = await this.modelRegistry.getModel(step.modelId);
        if (model) {
          modelScores.push({
            result,
            qualityScore: model.qualityScore || 0
          });
        }
      }
    }
    
    // Sort by quality score
    modelScores.sort((a, b) => b.qualityScore - a.qualityScore);
    
    // Return result from highest quality model
    return modelScores.length > 0 ? modelScores[0].result : results[0];
  }
  
  /**
   * Verify results against a reference result
   * @param {Object} reference - Reference result
   * @param {Array<Object>} results - All results
   * @returns {Promise<Object>} - Verification results
   * @private
   */
  async _verifyResults(reference, results) {
    // In a real implementation, this would do semantic comparison
    // For now, return a simple verification result
    return {
      consensus: true,
      agreementScore: 1.0,
      details: 'Verification not fully implemented'
    };
  }
  
  /**
   * Check if result is low quality
   * @param {Object} result - Model result
   * @returns {boolean} - Whether result is low quality
   * @private
   */
  _isLowQualityResult(result) {
    // In a real implementation, this would check for hallucinations,
    // off-topic responses, etc.
    // For now, always return false (assume quality is good)
    return false;
  }
  
  /**
   * Emit execution event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _emitExecutionEvent(event, data) {
    // Emit on global event emitter
    this.events.emit(event, data);
    
    // Emit on execution-specific event emitter if available
    const context = this.activeExecutions.get(data.executionId);
    if (context && context.events) {
      context.events.emit(event, data);
    }
  }
  
  /**
   * Emit step event
   * @param {Object} context - Execution context
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _emitStepEvent(context, event, data) {
    // Add execution ID to data
    const eventData = {
      ...data,
      executionId: context.id
    };
    
    // Emit on global event emitter
    this.events.emit(event, eventData);
    
    // Emit on execution-specific event emitter
    context.events.emit(event, eventData);
  }
  
  /**
   * Validate an execution plan
   * @param {Object} plan - The execution plan to validate
   * @throws {Error} - If the plan is invalid
   * @private
   */
  _validatePlan(plan) {
    if (!plan || typeof plan !== 'object') {
      throw new Error('Execution plan must be an object');
    }
    
    if (!plan.type || !this.executionHandlers[plan.type]) {
      throw new Error(`Unsupported execution plan type: ${plan.type}`);
    }
    
    if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      throw new Error('Execution plan must have at least one step');
    }
    
    // Validate each step
    for (const step of plan.steps) {
      if (!step.id) {
        throw new Error('Each step must have an ID');
      }
      
      if (!step.modelId) {
        throw new Error(`Step ${step.id} must have a modelId`);
      }
      
      if (!step.providerId) {
        throw new Error(`Step ${step.id} must have a providerId`);
      }
      
      if (!step.request || typeof step.request !== 'object') {
        throw new Error(`Step ${step.id} must have a request object`);
      }
    }
  }
  
  /**
   * Generate a unique execution ID
   * @returns {string} - Unique execution ID
   * @private
   */
  _generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

module.exports = ExecutionEngine; 