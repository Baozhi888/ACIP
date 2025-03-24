# ACIP Core Module

## Overview

The Core module is the foundational component of the Adaptive Contextual Intelligence Protocol (ACIP). It provides the essential infrastructure and services that enable the operation of the protocol, facilitating communication, coordination, and integration between modules, agents, and applications.

## Current Implementation Status

The ACIP core module currently provides the following implemented features:

- **Module Lifecycle Management**: Complete module lifecycle implementation including initialization, startup, stopping, and destruction phases with standardized state management.
- **Module Registry System**: Dynamic registration and discovery of modules with version management and dependency resolution.
- **Event Bus System**: Event-based communication mechanism for decoupled interaction between modules.
- **Configuration Management System**: Flexible configuration loading from files and environment variables with change monitoring support.
- **Logging Utilities**: Multi-level logging with comprehensive formatting options.

## Responsibilities

The Core module has the following key responsibilities:

1. **Protocol Lifecycle Management**: Handling initialization, configuration, and shutdown of the ACIP instance
2. **Module Registry and Coordination**: Managing the registration, discovery, and coordination of protocol modules
3. **Communication Infrastructure**: Providing messaging and event systems for intra-protocol communication
4. **State Management**: Maintaining protocol state and ensuring consistency across operations
5. **Resource Management**: Allocating and managing computational resources and optimizing utilization
6. **Error Handling**: Providing a robust error handling framework for graceful failure management
7. **Logging and Telemetry**: Collecting operational data for monitoring, debugging, and optimization
8. **Plugin System**: Supporting extension of protocol functionality through plugins

## Architecture

The Core module is structured around several key components:

```
Core/
├── Bootstrap/            # System initialization and startup management
├── Configuration/        # Configuration handling and validation
├── ModuleRegistry/       # Module registration and discovery system
├── EventBus/             # Protocol-wide event management system
├── StateManager/         # State tracking and persistence
├── ResourceMonitor/      # Resource allocation and monitoring
├── ErrorHandler/         # Error detection and management
├── Logging/              # Logging and telemetry subsystem
├── PluginManager/        # Plugin management facilities
├── Security/             # Core security services
├── Utils/                # Common utilities and helpers
└── API/                  # Core API interfaces
```

## Current Project Structure

```
/core
  /src
    /lifecycle     - Module lifecycle related code
    /registry      - Module registry implementation
    /config        - Configuration management system
    /utils         - Common utilities and helpers
    index.js       - Main entry point
  /tests           - Test scripts
  /specs           - Protocol specifications
  package.json     - Project dependencies
  README.md        - Project documentation
```

## Key Features

### Module System

The Core implements a flexible module system that allows protocol features to be organized into discrete, interchangeable components:

- **Dynamic Loading**: Modules can be dynamically loaded and unloaded at runtime
- **Dependency Management**: Automatic resolution of module dependencies
- **Versioning**: Support for module versioning and compatibility checks
- **Configuration**: Centralized configuration management for all modules
- **Lifecycle Hooks**: Module initialization and cleanup hooks

### Event System

A powerful event system that enables loose coupling between components:

- **Pub/Sub Messaging**: Asynchronous publish-subscribe messaging
- **Event Routing**: Intelligent routing of events to relevant handlers
- **Prioritization**: Event handling prioritization for critical events
- **Tracing**: Event flow tracing for debugging and optimization

### State Management

Robust state management facilities:

- **Distributed State**: State synchronization across distributed components
- **Persistence**: Optional state persistence for recovery
- **Transactions**: Transactional state updates for consistency
- **Snapshots**: Point-in-time snapshots for backup and recovery

### Resource Optimization

Intelligent resource management:

- **Monitoring**: Continuous monitoring of system resources
- **Throttling**: Automatic throttling of operations during resource constraints
- **Prioritization**: Resource allocation based on operation priority
- **Scaling**: Support for scaling decisions based on resource utilization

## Integration Points

The Core provides several integration points for other components:

1. **Module API**: Interface for registering and interacting with protocol modules
2. **Plugin API**: Interface for extending protocol functionality through plugins
3. **Event API**: Interface for publishing and subscribing to protocol events
4. **Configuration API**: Interface for accessing and modifying protocol configuration
5. **Resource API**: Interface for requesting and releasing resources
6. **Logging API**: Interface for logging and telemetry data collection

## Configuration

The Core module can be configured through a `core.config.json` file:

```json
{
  "core": {
    "id": "acip-node-1",
    "mode": "standard",  // standard, edge, or cloud
    "logLevel": "info"
  },
  "modules": {
    "autoload": true,
    "path": "./modules"
  },
  "plugins": {
    "autoload": true,
    "path": "./plugins"
  },
  "events": {
    "bufferSize": 1000,
    "persistEvents": false
  },
  "state": {
    "persistence": {
      "enabled": true,
      "path": "./state",
      "syncInterval": 60
    }
  },
  "resources": {
    "maxMemory": "80%",
    "maxCpu": "70%",
    "priorityClasses": [
      {"name": "high", "share": 0.5},
      {"name": "medium", "share": 0.3},
      {"name": "low", "share": 0.2}
    ]
  }
}
```

## Usage Examples

### Initialize the Core

```javascript
const { Core } = require('acip-core');

// Initialize with default configuration
const core = new Core();

// Initialize with custom configuration
const core = new Core({
  id: 'custom-node-1',
  mode: 'edge',
  logLevel: 'debug'
});

// Start the core
await core.initialize();
await core.start();
```

### Creating Custom Modules

```javascript
const { ModuleLifecycle } = require('acip-core');

// Create custom module
class MyModule extends ModuleLifecycle {
  // Implement lifecycle methods
  async _doInitialize() { /* Initialization logic */ }
  async _doStart() { /* Startup logic */ }
  async _doStop() { /* Stopping logic */ }
  async _doDestroy() { /* Destruction logic */ }
}

// Register module
const myModule = new MyModule();
await core.registerModule('my-module', myModule, {
  name: 'My Module',
  version: '1.0.0',
  description: 'Example module'
});
```

### Register and Use a Module

```javascript
// Register a module
const contextModule = require('acip-context-management');
core.registerModule('contextManagement', contextModule);

// Get a registered module
const contextManager = core.getModule('contextManagement');

// Use the module
await contextManager.store({
  userId: 'user-123',
  data: { /* ... */ }
});
```

### Work with Events

```javascript
// Subscribe to an event
core.on('user.login', (data) => {
  console.log(`User ${data.userId} logged in`);
});

// Publish an event
core.emit('user.login', {
  userId: 'user-123',
  timestamp: Date.now()
});
```

## Running Tests

```bash
# Run module registry test
node tests/registry-test.js

# Run all tests with Jest
npm test
```

## Development

To work on the Core module:

1. Clone the repo
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## Next Steps

According to our [ROADMAP.md](../ROADMAP.md), our next development priorities are:

1. Establishing basic data models and serialization mechanisms
2. Designing initialization and startup processes
3. Beginning implementation of module layer, particularly the context management module

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## License

This module is licensed under the same license as the main ACIP project.
