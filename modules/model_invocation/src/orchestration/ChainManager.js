/**
 * ChainManager
 * 
 * Manages model invocation chains - sequences of connected
 * model calls with data transformation and conditional branching
 * for complex AI workflows.
 */

const EventEmitter = require('events');
const { generateChainId } = require('../utils/identifiers');

class ChainManager {
  /**
   * Creates a new ChainManager instance
   * @param {Object} options - Chain manager options
   */
  constructor(options) {
    this.modelInvocationModule = options.modelInvocationModule;
    this.config = options.config;
    this.activeChains = new Map();
    this.chainDefinitions = new Map();
  }
  
  /**
   * Register a chain definition
   * @param {string} chainName - Name of the chain
   * @param {Object} definition - Chain definition
   * @returns {string} - The chain name
   */
  registerChain(chainName, definition) {
    this._validateChainDefinition(definition);
    this.chainDefinitions.set(chainName, definition);
    return chainName;
  }
  
  /**
   * Create a chain instance from a definition
   * @param {Object} chainConfig - Chain configuration
   * @returns {Object} - Chain instance
   */
  createChain(chainConfig) {
    const { definition, name } = this._resolveChainDefinition(chainConfig);
    
    // Generate a unique chain ID
    const chainId = generateChainId();
    
    // Create chain state
    const chainState = {
      id: chainId,
      name: name || chainId,
      definition,
      currentStep: null,
      results: {},
      variables: { ...chainConfig.variables },
      events: new EventEmitter(),
      status: 'created',
      startTime: null,
      endTime: null
    };
    
    // Register the chain
    this.activeChains.set(chainId, chainState);
    
    // Return chain interface
    return {
      id: chainId,
      name: chainState.name,
      status: () => this.getChainStatus(chainId),
      execute: (input) => this.executeChain(chainId, input),
      on: (event, handler) => chainState.events.on(event, handler),
      off: (event, handler) => chainState.events.off(event, handler),
      cancel: () => this.cancelChain(chainId)
    };
  }
  
  /**
   * Execute a chain with input
   * @param {string} chainId - ID of the chain to execute
   * @param {Object} input - Input for the chain
   * @returns {Promise<Object>} - The chain results
   */
  async executeChain(chainId, input = {}) {
    const chainState = this.activeChains.get(chainId);
    
    if (!chainState) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    // Check if chain is already running
    if (chainState.status === 'running') {
      throw new Error(`Chain ${chainId} is already running`);
    }
    
    // Initialize chain execution
    chainState.status = 'running';
    chainState.startTime = Date.now();
    chainState.input = input;
    chainState.variables = { ...chainState.variables, ...input };
    chainState.currentStep = null;
    
    // Emit chain started event
    chainState.events.emit('started', {
      chainId,
      timestamp: chainState.startTime
    });
    
    try {
      // Start chain execution from the first step
      const firstStep = this._getFirstStep(chainState.definition);
      
      if (!firstStep) {
        throw new Error(`Chain ${chainId} has no valid starting step`);
      }
      
      // Execute the chain from the first step
      const result = await this._executeStep(chainState, firstStep);
      
      // Mark chain as completed
      chainState.status = 'completed';
      chainState.endTime = Date.now();
      
      // Emit chain completed event
      chainState.events.emit('completed', {
        chainId,
        result,
        duration: chainState.endTime - chainState.startTime
      });
      
      return result;
    } catch (error) {
      // Mark chain as failed
      chainState.status = 'failed';
      chainState.endTime = Date.now();
      chainState.error = error.message;
      
      // Emit chain failed event
      chainState.events.emit('failed', {
        chainId,
        error: error.message,
        duration: chainState.endTime - chainState.startTime
      });
      
      throw error;
    }
  }
  
  /**
   * Cancel an active chain
   * @param {string} chainId - ID of the chain to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelChain(chainId) {
    const chainState = this.activeChains.get(chainId);
    
    if (!chainState || chainState.status !== 'running') {
      return false;
    }
    
    // Mark chain as cancelled
    chainState.status = 'cancelled';
    chainState.endTime = Date.now();
    
    // Emit chain cancelled event
    chainState.events.emit('cancelled', {
      chainId,
      duration: chainState.endTime - chainState.startTime
    });
    
    // If there's an active request, try to cancel it
    if (chainState.currentRequestId) {
      this.modelInvocationModule.cancel(chainState.currentRequestId);
    }
    
    return true;
  }
  
  /**
   * Get the status of a chain
   * @param {string} chainId - ID of the chain
   * @returns {Object} - Chain status
   */
  getChainStatus(chainId) {
    const chainState = this.activeChains.get(chainId);
    
    if (!chainState) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    return {
      id: chainId,
      name: chainState.name,
      status: chainState.status,
      currentStep: chainState.currentStep?.id,
      startTime: chainState.startTime,
      endTime: chainState.endTime,
      duration: chainState.endTime 
        ? chainState.endTime - chainState.startTime 
        : chainState.startTime 
          ? Date.now() - chainState.startTime 
          : 0,
      error: chainState.error
    };
  }
  
  /**
   * Clean up a completed chain
   * @param {string} chainId - ID of the chain to clean up
   */
  cleanupChain(chainId) {
    const chainState = this.activeChains.get(chainId);
    
    if (!chainState) {
      return;
    }
    
    // If chain is still running, don't clean up
    if (chainState.status === 'running') {
      return;
    }
    
    // Remove chain from active chains
    this.activeChains.delete(chainId);
  }
  
  /**
   * Execute a single step in a chain
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step to execute
   * @returns {Promise<Object>} - The step result
   * @private
   */
  async _executeStep(chainState, step) {
    // Update current step
    chainState.currentStep = step;
    
    // Emit step started event
    chainState.events.emit('step-started', {
      chainId: chainState.id,
      stepId: step.id,
      step: step.type,
      timestamp: Date.now()
    });
    
    try {
      let result;
      
      // Execute step based on type
      switch (step.type) {
        case 'model':
          result = await this._executeModelStep(chainState, step);
          break;
          
        case 'transform':
          result = await this._executeTransformStep(chainState, step);
          break;
          
        case 'condition':
          result = await this._executeConditionStep(chainState, step);
          break;
          
        case 'output':
          result = await this._executeOutputStep(chainState, step);
          break;
          
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      // Store step result
      chainState.results[step.id] = result;
      
      // Emit step completed event
      chainState.events.emit('step-completed', {
        chainId: chainState.id,
        stepId: step.id,
        step: step.type,
        timestamp: Date.now()
      });
      
      // If this step has a next step, execute it
      if (step.next) {
        const nextStep = chainState.definition.steps[step.next];
        
        if (!nextStep) {
          throw new Error(`Next step ${step.next} not found in chain definition`);
        }
        
        return this._executeStep(chainState, nextStep);
      }
      
      // If no next step, return the final result
      return result;
    } catch (error) {
      // Emit step failed event
      chainState.events.emit('step-failed', {
        chainId: chainState.id,
        stepId: step.id,
        step: step.type,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }
  
  /**
   * Execute a model invocation step
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step to execute
   * @returns {Promise<Object>} - The model response
   * @private
   */
  async _executeModelStep(chainState, step) {
    // Prepare the model request
    const request = this._prepareModelRequest(chainState, step);
    
    // Track the request ID for potential cancellation
    chainState.currentRequestId = request.requestId;
    
    // Execute the model request
    const response = await this.modelInvocationModule.invoke(request);
    
    // Clear the current request ID
    chainState.currentRequestId = null;
    
    // Return the model response
    return response;
  }
  
  /**
   * Execute a data transformation step
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step to execute
   * @returns {Promise<Object>} - The transformed data
   * @private
   */
  async _executeTransformStep(chainState, step) {
    // Get the input data for the transformation
    const inputData = this._resolveStepInput(chainState, step);
    
    // Execute the transformation
    if (typeof step.transform === 'function') {
      // Function-based transformation
      return step.transform(inputData, chainState.variables, chainState.results);
    } else if (step.transformCode) {
      // String-based transformation (evaluated code)
      try {
        // Create a safe context for transformation code execution
        const transformFn = new Function(
          'input', 'variables', 'results', 
          `"use strict"; ${step.transformCode}`
        );
        
        return transformFn(inputData, chainState.variables, chainState.results);
      } catch (error) {
        throw new Error(`Error in transform step ${step.id}: ${error.message}`);
      }
    }
    
    // No transformation defined, return input unchanged
    return inputData;
  }
  
  /**
   * Execute a conditional branching step
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step to execute
   * @returns {Promise<Object>} - The result data
   * @private
   */
  async _executeConditionStep(chainState, step) {
    // Get the input data for the condition
    const inputData = this._resolveStepInput(chainState, step);
    
    // Evaluate the condition
    let conditionResult = false;
    
    if (typeof step.condition === 'function') {
      // Function-based condition
      conditionResult = step.condition(inputData, chainState.variables, chainState.results);
    } else if (step.conditionCode) {
      // String-based condition (evaluated code)
      try {
        // Create a safe context for condition code execution
        const conditionFn = new Function(
          'input', 'variables', 'results', 
          `"use strict"; return ${step.conditionCode};`
        );
        
        conditionResult = conditionFn(inputData, chainState.variables, chainState.results);
      } catch (error) {
        throw new Error(`Error in condition step ${step.id}: ${error.message}`);
      }
    }
    
    // Determine next step based on condition result
    const nextStepId = conditionResult ? step.then : step.else;
    
    // Override step.next to route to the correct branch
    step.next = nextStepId;
    
    // Return input unchanged, it's just a routing step
    return inputData;
  }
  
  /**
   * Execute an output step
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step to execute
   * @returns {Promise<Object>} - The output data
   * @private
   */
  async _executeOutputStep(chainState, step) {
    // Get the input data for the output
    const inputData = this._resolveStepInput(chainState, step);
    
    // Execute output formatting if specified
    if (typeof step.format === 'function') {
      // Function-based formatting
      return step.format(inputData, chainState.variables, chainState.results);
    } else if (step.formatCode) {
      // String-based formatting (evaluated code)
      try {
        // Create a safe context for format code execution
        const formatFn = new Function(
          'input', 'variables', 'results', 
          `"use strict"; ${step.formatCode}`
        );
        
        return formatFn(inputData, chainState.variables, chainState.results);
      } catch (error) {
        throw new Error(`Error in output step ${step.id}: ${error.message}`);
      }
    }
    
    // No formatting defined, return input unchanged
    return inputData;
  }
  
  /**
   * Prepare a model request for a step
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step configuration
   * @returns {Object} - The prepared model request
   * @private
   */
  _prepareModelRequest(chainState, step) {
    // Get the input data for the model
    const inputData = this._resolveStepInput(chainState, step);
    
    // Create the base request
    const request = {
      ...step.request,
      requestId: generateChainId(),
      input: inputData
    };
    
    // Apply template variables if needed
    if (step.templateMessages && Array.isArray(step.templateMessages)) {
      request.messages = step.templateMessages.map(message => {
        if (typeof message.content === 'string') {
          // Apply template interpolation to message content
          return {
            ...message,
            content: this._interpolateTemplate(message.content, chainState.variables, chainState.results)
          };
        }
        return message;
      });
    }
    
    return request;
  }
  
  /**
   * Resolve the input for a step
   * @param {Object} chainState - The current chain state
   * @param {Object} step - The step configuration
   * @returns {*} - The resolved input
   * @private
   */
  _resolveStepInput(chainState, step) {
    // If step has explicit input, use that
    if (step.input !== undefined) {
      return step.input;
    }
    
    // If step has a source step, use its result
    if (step.sourceStep) {
      return chainState.results[step.sourceStep] || null;
    }
    
    // If step has a source variable, use that
    if (step.sourceVariable) {
      return chainState.variables[step.sourceVariable] || null;
    }
    
    // Default to the chain input
    return chainState.input || {};
  }
  
  /**
   * Interpolate template strings with variables and results
   * @param {string} template - The template string
   * @param {Object} variables - Chain variables
   * @param {Object} results - Chain step results
   * @returns {string} - Interpolated string
   * @private
   */
  _interpolateTemplate(template, variables, results) {
    return template.replace(/\${([^}]+)}/g, (match, path) => {
      try {
        // Parse the reference path
        const [scope, ...parts] = path.trim().split('.');
        const ref = parts.join('.');
        
        // Access the corresponding value based on scope
        if (scope === 'var' || scope === 'variable') {
          return this._getValueByPath(variables, ref);
        } else if (scope === 'result') {
          const [stepId, ...resultPath] = parts;
          return this._getValueByPath(results[stepId], resultPath.join('.'));
        }
        
        // If not a recognized scope, return the match unchanged
        return match;
      } catch (error) {
        // On error, return an empty string
        return '';
      }
    });
  }
  
  /**
   * Get a value from an object by path
   * @param {Object} obj - The object to access
   * @param {string} path - The dot-notation path to the property
   * @returns {*} - The value at the path
   * @private
   */
  _getValueByPath(obj, path) {
    if (!obj) {
      return '';
    }
    
    return path.split('.').reduce((curr, key) => curr && curr[key] !== undefined ? curr[key] : '', obj);
  }
  
  /**
   * Get the first step of a chain definition
   * @param {Object} definition - Chain definition
   * @returns {Object|null} - The first step or null if not found
   * @private
   */
  _getFirstStep(definition) {
    // If start step is explicitly specified, use that
    if (definition.startStep && definition.steps[definition.startStep]) {
      return definition.steps[definition.startStep];
    }
    
    // Otherwise, find the first step that isn't marked as not being a start
    const stepIds = Object.keys(definition.steps);
    for (const stepId of stepIds) {
      const step = definition.steps[stepId];
      if (!step.notStart) {
        return step;
      }
    }
    
    return null;
  }
  
  /**
   * Resolve a chain definition from various sources
   * @param {Object|string} chainConfig - Chain configuration or name
   * @returns {Object} - The resolved chain definition
   * @private
   */
  _resolveChainDefinition(chainConfig) {
    if (typeof chainConfig === 'string') {
      // If chainConfig is a string, look up the predefined chain
      const definition = this.chainDefinitions.get(chainConfig);
      
      if (!definition) {
        throw new Error(`Chain definition not found: ${chainConfig}`);
      }
      
      return { definition, name: chainConfig };
    } else if (typeof chainConfig === 'object' && chainConfig !== null) {
      // If chainConfig has a 'name' property, try to find it
      if (chainConfig.name && !chainConfig.definition) {
        const definition = this.chainDefinitions.get(chainConfig.name);
        
        if (!definition) {
          throw new Error(`Chain definition not found: ${chainConfig.name}`);
        }
        
        return { definition, name: chainConfig.name };
      }
      
      // If chainConfig has a definition, use that
      if (chainConfig.definition) {
        return { 
          definition: chainConfig.definition, 
          name: chainConfig.name 
        };
      }
      
      // Otherwise, assume chainConfig itself is the definition
      return { definition: chainConfig, name: chainConfig.name };
    }
    
    throw new Error('Invalid chain configuration');
  }
  
  /**
   * Validate a chain definition
   * @param {Object} definition - Chain definition to validate
   * @throws {Error} - If the definition is invalid
   * @private
   */
  _validateChainDefinition(definition) {
    if (!definition || typeof definition !== 'object') {
      throw new Error('Chain definition must be an object');
    }
    
    if (!definition.steps || typeof definition.steps !== 'object') {
      throw new Error('Chain definition must have a steps object');
    }
    
    // Ensure all steps have IDs and types
    const stepIds = Object.keys(definition.steps);
    
    if (stepIds.length === 0) {
      throw new Error('Chain must have at least one step');
    }
    
    for (const stepId of stepIds) {
      const step = definition.steps[stepId];
      
      if (!step.type) {
        throw new Error(`Step ${stepId} must have a type`);
      }
      
      // Set the ID on the step object
      step.id = stepId;
      
      // Validate based on step type
      switch (step.type) {
        case 'model':
          if (!step.request && !step.templateMessages) {
            throw new Error(`Model step ${stepId} must have a request or templateMessages`);
          }
          break;
          
        case 'condition':
          if ((!step.condition && !step.conditionCode) || !step.then || !step.else) {
            throw new Error(`Condition step ${stepId} must have a condition/conditionCode, 'then', and 'else' properties`);
          }
          break;
          
        case 'transform':
          if (!step.transform && !step.transformCode) {
            throw new Error(`Transform step ${stepId} must have a transform function or transformCode`);
          }
          break;
          
        case 'output':
          // Output steps don't need additional validation
          break;
          
        default:
          throw new Error(`Unknown step type: ${step.type} for step ${stepId}`);
      }
    }
  }
}

module.exports = ChainManager; 