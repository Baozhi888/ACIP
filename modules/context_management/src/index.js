/**
 * Context Management Module
 * 
 * Main entry point exporting all components of the Context Management Module.
 */

const ContextManager = require('./ContextManager');
const AdaptiveWindowManager = require('./AdaptiveWindowManager');
const ContextMemorySystem = require('./ContextMemorySystem');

// Export types and enums
const { AdjustmentType, ComplexityLevel, TokenEstimation } = AdaptiveWindowManager;
const { MemoryType } = ContextMemorySystem;

module.exports = {
  // Main classes
  ContextManager,
  AdaptiveWindowManager,
  ContextMemorySystem,
  
  // Types and enums
  AdjustmentType,
  ComplexityLevel,
  MemoryType,
  
  // Utilities
  TokenEstimation
}; 