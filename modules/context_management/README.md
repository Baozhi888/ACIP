# Context Management Module

## Overview

The Context Management module is a core component of the ACIP that handles the storage, retrieval, and adaptive management of contextual information within AI applications. This module implements the innovative "Adaptive Context Window" and "Context Memory" mechanisms that significantly enhance the capability of AI systems to maintain and utilize contextual information across interactions.

## Key Features

### Adaptive Context Window

The Adaptive Context Window mechanism dynamically adjusts the context window size based on task complexity, resource availability, and performance requirements:

- **Dynamic Window Sizing**: Automatically adjusts context window size (from small to large) based on task complexity
- **Resource Optimization**: Uses smaller windows for simple tasks to conserve resources
- **Performance Enhancement**: Expands window for complex tasks requiring deeper context
- **Automatic Complexity Detection**: Analyzes task inputs to determine appropriate window size
- **Custom Policies**: Configurable policies for window size adjustment

### Context Memory System

The Context Memory system provides a sophisticated memory architecture for AI applications:

- **Short-term Memory**: For immediate conversation context and recent interactions
- **Long-term Memory**: For persistent knowledge across sessions and interactions
- **Episodic Memory**: For storing and retrieving specific interaction episodes
- **Semantic Memory**: For conceptual knowledge and relationships
- **Procedural Memory**: For action sequences and task execution patterns

### Context Management Features

Additional features for comprehensive context management:

- **Context Pruning**: Intelligent algorithms to remove less relevant context
- **Contextual Embeddings**: Vector embeddings for semantic retrieval of context
- **Multi-modal Context**: Support for text, image, audio, and other context types
- **Context Versioning**: Tracking changes to context over time
- **Context Synchronization**: Keeping context consistent across distributed systems
- **Privacy-Preserving Context**: Options for privacy-focused context handling

## Architecture

The Context Management module is organized into the following components:

```
Context Management/
├── Core/                 # Core context functionality
│   ├── ContextStore/     # Storage and retrieval of context
│   ├── ContextWindow/    # Adaptive context window implementation
│   └── ContextMemory/    # Memory system implementation
├── Adapters/             # Adapters for various context sources and sinks
│   ├── DatabaseAdapter/  # Database storage adaptation
│   ├── FileAdapter/      # File-based storage adaptation
│   └── RemoteAdapter/    # Remote context service adaptation
├── Processors/           # Context processing components
│   ├── Embedder/         # Context embedding generation
│   ├── Analyzer/         # Context analysis and insights
│   ├── Pruner/           # Context pruning algorithms
│   └── Vectorizer/       # Vector representation of context
├── Policies/             # Configuration policies
│   ├── WindowPolicy/     # Context window sizing policies
│   ├── RetentionPolicy/  # Context retention policies
│   └── PrivacyPolicy/    # Privacy and security policies
└── API/                  # Public API interfaces
```

## Integration with Other Modules

The Context Management module interacts with several other ACIP modules:

- **Data Access Module**: For retrieving external data to enrich context
- **Security Authentication Module**: For securing context data and enforcing access controls
- **Model Invocation Module**: For providing context to AI models during inference
- **Core Module**: For system-wide events, configuration, and resource management

## Usage Examples

### Basic Context Operations

```javascript
const { ACIP } = require('acip');
const acip = new ACIP();
await acip.start();

// Get the context management module
const contextManager = acip.getModule('contextManagement');

// Store context
await contextManager.store({
  userId: 'user-123',
  sessionId: 'session-456',
  data: {
    preferences: { language: 'en-US' },
    history: [
      { role: 'user', content: 'What is machine learning?' },
      { role: 'assistant', content: 'Machine learning is...' }
    ]
  }
});

// Retrieve context
const context = await contextManager.retrieve({
  userId: 'user-123',
  sessionId: 'session-456'
});
```

### Adaptive Context Window Configuration

```javascript
// Configure adaptive context window
await contextManager.configureWindow({
  defaultSize: 4096,
  minSize: 1024,
  maxSize: 32768,
  adaptationPolicy: 'task-complexity',
  complexityThresholds: {
    low: 0.3,
    medium: 0.6,
    high: 0.8
  },
  resourceFactors: {
    memory: 0.7,
    performance: 0.3
  }
});

// Use in processing
const response = await agent.process({
  userId: 'user-123',
  message: 'Summarize our entire conversation',
  options: {
    contextWindowHint: 'large'  // Optional hint
  }
});
```

### Memory System Usage

```javascript
// Configure memory system
await contextManager.configureMemory({
  shortTerm: {
    capacity: 50,  // messages
    expiryTime: 3600  // seconds
  },
  longTerm: {
    enabled: true,
    storageType: 'vectorDB',
    vectorDimensions: 1536
  },
  episodic: {
    enabled: true,
    significanceThreshold: 0.7
  }
});

// Store in long-term memory
await contextManager.memoryStore({
  userId: 'user-123',
  type: 'longTerm',
  data: {
    content: 'User prefers detailed technical explanations',
    embedding: [...],  // Optional, will be generated if not provided
    metadata: {
      source: 'conversation_analysis',
      confidence: 0.85
    }
  }
});

// Retrieve from memory
const memories = await contextManager.memoryRetrieve({
  userId: 'user-123',
  query: 'user preferences for explanations',
  type: 'longTerm',
  limit: 5,
  minRelevance: 0.7
});
```

### Context Analysis and Insights

```javascript
// Analyze context to extract insights
const insights = await contextManager.analyze({
  userId: 'user-123',
  sessionId: 'session-456',
  analysisTypes: ['topics', 'sentiment', 'entities', 'intents'],
  timeframe: {
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-31T23:59:59Z'
  }
});

// Use insights to personalize responses
console.log(insights.topics);  // ['AI', 'programming', 'education']
console.log(insights.sentiment);  // { positive: 0.8, negative: 0.1, neutral: 0.1 }
```

## Configuration

The Context Management module can be configured through a `context.config.json` file:

```json
{
  "storage": {
    "type": "distributed",
    "primaryAdapter": "redis",
    "backupAdapter": "file",
    "retentionPeriod": 2592000  // 30 days in seconds
  },
  "window": {
    "defaultSize": 4096,
    "minSize": 1024,
    "maxSize": 32768,
    "adaptationPolicy": "task-complexity"
  },
  "memory": {
    "shortTerm": {
      "enabled": true,
      "capacity": 50,
      "expiryTime": 3600
    },
    "longTerm": {
      "enabled": true,
      "storageType": "vectorDB",
      "connectionString": "vector://localhost:6333",
      "vectorDimensions": 1536
    },
    "episodic": {
      "enabled": true,
      "significanceThreshold": 0.7
    }
  },
  "privacy": {
    "dataMasking": true,
    "maskedFields": ["email", "phone", "address"],
    "retentionPolicy": "user-controlled",
    "encryptSensitiveData": true
  },
  "performance": {
    "cacheSize": 1000,
    "preloadUserContext": true,
    "asyncIndexing": true,
    "compressionEnabled": true
  }
}
```

## API Reference

### Core Methods

- `store(options)`: Store context data
- `retrieve(options)`: Retrieve context data
- `update(options)`: Update existing context data
- `delete(options)`: Delete context data
- `configure(options)`: Configure the module

### Memory System Methods

- `memoryStore(options)`: Store data in memory system
- `memoryRetrieve(options)`: Retrieve data from memory system
- `memorySearch(options)`: Search across memory
- `memoryDelete(options)`: Delete memory data

### Window Management Methods

- `configureWindow(options)`: Configure adaptive window
- `getWindowStats()`: Get window usage statistics
- `suggestWindowSize(task)`: Get recommended window size for a task

### Analysis Methods

- `analyze(options)`: Analyze context data
- `extractEntities(options)`: Extract entities from context
- `summarize(options)`: Generate context summary
- `getInsights(options)`: Extract insights from context

## Events

The Context Management module emits the following events:

- `context.stored`: When new context is stored
- `context.retrieved`: When context is retrieved
- `context.updated`: When context is updated
- `context.deleted`: When context is deleted
- `window.adjusted`: When context window size is adjusted
- `memory.stored`: When data is stored in memory system
- `memory.retrieved`: When data is retrieved from memory system

## Development

To work on the Context Management module:

1. Clone the repo
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

This module is licensed under the same license as the main ACIP project. 
