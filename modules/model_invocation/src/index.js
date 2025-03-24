/**
 * Model Invocation Module - Entry Point
 * 
 * This is the main entry point for the Model Invocation Module of the ACIP project.
 * It provides a unified interface for invoking AI models across different providers.
 */

const ModelInvocationModule = require('./ModelInvocationModule');
const ModelRegistry = require('./model-management/ModelRegistry');
const ProviderRegistry = require('./providers/ProviderRegistry');
const RequestRouter = require('./orchestration/RequestRouter');
const ChainManager = require('./orchestration/ChainManager');
const CacheManager = require('./optimization/CacheManager');
const ModelSelector = require('./orchestration/ModelSelector');
const StreamManager = require('./execution/StreamManager');
const MetricsCollector = require('./observability/MetricsCollector');
const ConfigManager = require('./config/ConfigManager');

// Export the main module and utilities
module.exports = {
  ModelInvocationModule,
  ModelRegistry,
  ProviderRegistry,
  RequestRouter,
  ChainManager,
  CacheManager,
  ModelSelector,
  StreamManager,
  MetricsCollector,
  ConfigManager
}; 