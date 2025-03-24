# Model Invocation Module

## Overview

The Model Invocation Module is a core component of the Adaptive Contextual Intelligence Protocol (ACIP) that provides a unified interface for invoking AI models across different providers, architectures, and deployment environments. It abstracts the complexity of model integration, enabling applications to leverage diverse AI capabilities through a consistent, provider-agnostic API.

This module serves as the AI execution backbone for ACIP, handling model discovery, invocation, result management, and optimization while ensuring compatibility with both cloud-based and edge-deployed models.

## Key Features

### Unified Model Interface

- **Provider Abstraction**: Common interface for models from OpenAI, Anthropic, Google, Mistral, open-source models, and custom deployments.
- **Multi-Model Support**: Seamless integration with language models, image generation, speech recognition, multimodal models, and specialized AI systems.
- **Version Management**: Compatible with multiple versions of the same model with automatic handling of version-specific features.
- **Model Discovery**: Dynamic discovery of available models and their capabilities.
- **Feature Parity**: Consistent access to common features across different model providers.

### Intelligent Request Routing

- **Model Selection**: Dynamic selection of the optimal model based on task requirements, performance, cost, and availability.
- **Fallback Chains**: Configurable fallback sequences if primary models are unavailable or unsuitable.
- **Load Balancing**: Distribution of requests across multiple instances or providers.
- **Geographic Routing**: Direct requests to region-specific deployments for lower latency or data residency compliance.
- **Cost Optimization**: Route requests based on pricing tiers and budget constraints.

### Performance Optimization

- **Request Batching**: Combine multiple requests for efficiency.
- **Caching**: Multi-level caching of model responses for identical or similar requests.
- **Parallel Execution**: Execute compatible requests in parallel.
- **Response Streaming**: Stream model outputs for faster perceived performance.
- **Warm Models**: Keep frequently used models ready for quick invocation.
- **Request Compression**: Optimize payload size for faster transmission.

### Advanced Capabilities

- **Chaining & Orchestration**: Pipeline multiple models for complex workflows.
- **Model Composition**: Combine complementary models to solve complex tasks.
- **Function Calling**: Structured function invocation through model capabilities.
- **Tool Integration**: Connect models with tools and external services.
- **Retrieval Augmentation**: Enhance model context with relevant data.
- **Multimodal Processing**: Handle text, images, audio, and video inputs/outputs.

### Edge & Local Execution

- **Edge Deployment**: Support for running models on edge devices.
- **Hybrid Execution**: Intelligently split computation between cloud and edge.
- **Offline Operation**: Maintain functionality without continuous connectivity.
- **Resource-Aware Execution**: Adapt to available computing resources.
- **Local Models**: Integration with locally deployed models.
- **Quantized Models**: Support for optimized, lower-precision models.

### Security & Governance

- **Input Validation**: Verify and sanitize model inputs.
- **Output Filtering**: Apply content policies to model outputs.
- **Usage Tracking**: Monitor and report on model usage and costs.
- **Quota Management**: Enforce usage limits per user, application, or model.
- **Audit Logging**: Record model interactions for compliance and debugging.
- **Privacy Preservation**: Minimize sensitive data exposure in model invocations.

### Observability & Debugging

- **Request Tracing**: End-to-end tracing of model invocations.
- **Performance Metrics**: Detailed metrics on latency, throughput, and token usage.
- **Explainability Tools**: Insights into model decision processes.
- **Debugging Helpers**: Tools for diagnosing issues with model invocations.
- **Quality Monitoring**: Track and alert on changes in model output quality.
- **Usage Analytics**: Detailed reports on model usage patterns.

## Architecture

The Model Invocation Module is built as a layered system with the following components:

```
┌──────────────────────────────────────────────────────────────────┐
│                   Model Invocation Module                         │
├──────────────────┬────────────────────┬────────────────────────┤
│  Interface Layer │  Orchestration     │  Model Management      │
│  - Unified API   │  - Request Router  │  - Model Registry      │
│  - Schema        │  - Chain Manager   │  - Version Control     │
│  - Adapters      │  - Parallel Exec   │  - Capability Catalog  │
├──────────────────┼────────────────────┼────────────────────────┤
│  Optimization    │  Execution         │  Observability         │
│  - Caching       │  - Connectors      │  - Metrics             │
│  - Batching      │  - Streaming       │  - Logging             │
│  - Compression   │  - Rate Limiting   │  - Tracing             │
├──────────────────┴────────────────────┴────────────────────────┤
│                  Provider Integration Layer                      │
├─────────┬──────────┬──────────┬───────────┬─────────┬───────────┤
│ OpenAI  │ Anthropic│ Google   │ Hugging   │ Local   │ Custom    │
│ Models  │ Models   │ Models   │ Face      │ Models  │ Endpoints │
└─────────┴──────────┴──────────┴───────────┴─────────┴───────────┘
```

### Core Components

1. **Interface Layer**: Provides the unified API for model invocation.
   - Unified API: Common interface for all model operations.
   - Schema: Input/output specifications and validation.
   - Adapters: Translates between unified format and provider-specific formats.

2. **Orchestration Layer**: Coordinates model invocation workflows.
   - Request Router: Directs requests to appropriate models.
   - Chain Manager: Coordinates sequences of model invocations.
   - Parallel Execution: Manages concurrent model calls.

3. **Model Management**: Handles model discovery and metadata.
   - Model Registry: Catalog of available models and their properties.
   - Version Control: Management of model versions and compatibility.
   - Capability Catalog: Database of model features and limitations.

4. **Optimization Layer**: Improves performance and efficiency.
   - Caching: Stores and retrieves previous model outputs.
   - Batching: Combines multiple requests into batches.
   - Compression: Optimizes request/response payloads.

5. **Execution Layer**: Handles the actual model invocation.
   - Connectors: Provider-specific integration code.
   - Streaming: Manages streaming responses.
   - Rate Limiting: Enforces usage constraints.

6. **Observability Layer**: Monitors and measures operations.
   - Metrics: Collects performance and usage statistics.
   - Logging: Records operation details.
   - Tracing: Tracks request flow through the system.

7. **Provider Integration Layer**: Connects to specific model providers.
   - OpenAI Models: Integration with GPT and DALL-E models.
   - Anthropic Models: Integration with Claude models.
   - Google Models: Integration with PaLM, Gemini models.
   - Hugging Face: Integration with open-source models.
   - Local Models: Support for on-premise model deployment.
   - Custom Endpoints: Integration with custom model APIs.

## Integration with Other Modules

The Model Invocation Module interfaces with other ACIP modules:

- **Core Module**: For lifecycle management and event communication.
- **Context Management Module**: To receive contextual information for model invocation.
- **Security Authentication Module**: For authentication and authorization of model access.
- **Data Access Module**: To retrieve data needed for context enhancement.
- **Payment Settlement Module**: For usage tracking and cost management.
- **Edge Computing Module**: For coordination with edge-deployed models.

## Usage Examples

### Basic Model Invocation

```javascript
const { ModelInvocationModule } = require('@acip/model-invocation');

// Initialize the module
const modelInvocation = new ModelInvocationModule({
  defaultProvider: 'openai',
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY
  }
});

// Invoke a model with a simple prompt
const response = await modelInvocation.invoke({
  model: 'gpt-4',
  input: {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' }
    ]
  },
  parameters: {
    temperature: 0.7,
    maxTokens: 500
  }
});

console.log('Model response:', response.output.message.content);
```

### Advanced Model Selection

```javascript
// Configure model selection criteria
const response = await modelInvocation.invoke({
  selector: {
    task: 'text-generation',
    preferredProviders: ['anthropic', 'openai'],
    minCapabilities: ['function-calling', 'json-mode'],
    constraints: {
      maxLatency: 2000,  // ms
      maxCost: 0.05      // $ per request
    },
    fallbacks: ['gpt-3.5-turbo', 'claude-instant']
  },
  input: {
    messages: [
      { role: 'system', content: 'You are a product recommendation assistant.' },
      { role: 'user', content: 'I need a new laptop for video editing.' }
    ]
  }
});

console.log(`Selected model: ${response.metadata.model}`);
console.log('Recommendation:', response.output.message.content);
```

### Streaming Response

```javascript
// Stream response for better user experience
const stream = await modelInvocation.invokeStream({
  model: 'claude-2',
  input: {
    messages: [
      { role: 'system', content: 'You are a creative storyteller.' },
      { role: 'user', content: 'Tell me a short story about a robot learning to paint.' }
    ]
  }
});

// Process the stream
stream.on('data', (chunk) => {
  process.stdout.write(chunk.output.content);
});

stream.on('end', () => {
  console.log('\n--- Story complete ---');
});

stream.on('error', (err) => {
  console.error('Stream error:', err);
});
```

### Function Calling

```javascript
// Define functions that the model can call
const functions = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name, e.g., "San Francisco"'
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          default: 'celsius'
        }
      },
      required: ['location']
    }
  }
];

// Function implementation
async function getWeather(params) {
  // In a real app, this would call a weather API
  return {
    temperature: 22,
    unit: params.unit,
    condition: 'sunny',
    location: params.location
  };
}

// Invoke model with function calling
const response = await modelInvocation.invoke({
  model: 'gpt-4',
  input: {
    messages: [
      { role: 'user', content: 'What\'s the weather like in Tokyo today?' }
    ]
  },
  functions: functions,
  function_handlers: {
    'get_weather': getWeather
  },
  auto_execute_functions: true
});

console.log('Response with function results:', response.output.message.content);
```

### Multimodal Input

```javascript
// Process image and text together
const response = await modelInvocation.invoke({
  model: 'gpt-4-vision',
  input: {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What's in this image?' },
          {
            type: 'image',
            image_url: {
              url: 'https://example.com/image.jpg'
            }
          }
        ]
      }
    ]
  }
});

console.log('Image description:', response.output.message.content);
```

### Model Chaining

```javascript
// Create a chain of model invocations
const chain = modelInvocation.createChain({
  steps: [
    {
      id: 'summarize',
      model: 'gpt-4',
      input: {
        messages: [
          { role: 'system', content: 'Summarize the following text concisely:' },
          { role: 'user', content: '{{$input}}' }
        ]
      }
    },
    {
      id: 'translate',
      model: 'gpt-4',
      input: {
        messages: [
          { role: 'system', content: 'Translate the following text to French:' },
          { role: 'user', content: '{{summarize.output.message.content}}' }
        ]
      }
    },
    {
      id: 'analyze',
      model: 'claude-2',
      input: {
        messages: [
          { 
            role: 'system', 
            content: 'Analyze the emotional tone of this French text:' 
          },
          { role: 'user', content: '{{translate.output.message.content}}' }
        ]
      }
    }
  ]
});

// Execute the chain
const longText = "..."; // Long input text
const results = await chain.execute({ input: longText });

console.log('Summary:', results.summarize.output.message.content);
console.log('Translation:', results.translate.output.message.content);
console.log('Tone analysis:', results.analyze.output.message.content);
```

## Configuration

The Model Invocation Module is configured through a `model-invocation.config.json` file:

```json
{
  "providers": {
    "openai": {
      "enabled": true,
      "apiKey": "${OPENAI_API_KEY}",
      "organization": "${OPENAI_ORG_ID}",
      "baseUrl": "https://api.openai.com/v1",
      "defaultModel": "gpt-4",
      "requestTimeout": 30000
    },
    "anthropic": {
      "enabled": true,
      "apiKey": "${ANTHROPIC_API_KEY}",
      "baseUrl": "https://api.anthropic.com",
      "defaultModel": "claude-2",
      "requestTimeout": 60000
    },
    "localModels": {
      "enabled": true,
      "endpoints": {
        "llama2-7b": "http://localhost:8080/v1",
        "mistral-7b": "http://localhost:8081/v1"
      }
    }
  },
  "defaults": {
    "provider": "openai",
    "parameters": {
      "temperature": 0.7,
      "topP": 1.0,
      "maxTokens": 1000
    },
    "retryConfig": {
      "maxRetries": 3,
      "initialDelayMs": 1000,
      "maxDelayMs": 10000
    }
  },
  "selectionStrategy": {
    "prioritizeBy": ["capability", "cost", "latency"],
    "costWeighting": 0.4,
    "latencyWeighting": 0.3,
    "capabilityWeighting": 0.3
  },
  "caching": {
    "enabled": true,
    "ttlSeconds": 3600,
    "maxEntries": 1000,
    "excludeModels": ["gpt-4-vision"]
  },
  "optimization": {
    "requestBatching": {
      "enabled": true,
      "maxBatchSize": 20,
      "maxDelayMs": 50
    },
    "compression": {
      "enabled": true,
      "threshold": 1024
    }
  },
  "streaming": {
    "defaultEnabled": true,
    "bufferSize": 1024
  },
  "security": {
    "inputValidation": {
      "enabled": true,
      "maxContentLength": 100000
    },
    "outputFiltering": {
      "enabled": true,
      "policies": ["no-pii", "safe-content"]
    }
  },
  "observability": {
    "metrics": {
      "enabled": true,
      "detailedTokenUsage": true
    },
    "logging": {
      "level": "info",
      "includePrompts": false,
      "includeResponses": false
    },
    "tracing": {
      "enabled": true,
      "sampleRate": 0.1
    }
  },
  "quotas": {
    "enabled": true,
    "defaultLimits": {
      "requestsPerMinute": 100,
      "tokensPerDay": 1000000
    }
  }
}
```

## API Reference

### Core Invocation

- `invoke(options)`: Invoke an AI model synchronously
- `invokeStream(options)`: Invoke an AI model with streaming response
- `batchInvoke(requests)`: Invoke multiple requests in batch mode
- `cancel(requestId)`: Cancel an ongoing model invocation

### Model Management

- `models.list(filter)`: List available models matching filter criteria
- `models.get(modelId)`: Get detailed information about a specific model
- `models.register(modelInfo)`: Register a custom model
- `models.unregister(modelId)`: Remove a registered model
- `models.getCapabilities(modelId)`: Get capabilities of a specific model

### Provider Management

- `providers.list()`: List all configured providers
- `providers.get(providerId)`: Get information about a specific provider
- `providers.register(providerConfig)`: Register a new provider
- `providers.unregister(providerId)`: Remove a registered provider
- `providers.test(providerId)`: Test connection to a provider

### Advanced Features

- `createChain(config)`: Create a new model invocation chain
- `embeddings.create(options)`: Generate embeddings for text
- `embeddings.similarity(embedding1, embedding2)`: Calculate similarity between embeddings
- `tooling.registerTool(toolDefinition)`: Register a new tool for function calling
- `tooling.listTools()`: List all registered tools
- `rag.enhance(query, options)`: Enhance a query with retrieved information

### Monitoring & Control

- `quotas.check(user, model)`: Check remaining quota for a user-model combination
- `quotas.update(user, model, limits)`: Update quota limits
- `metrics.get(filter)`: Get usage metrics
- `metrics.getRequestStats(requestId)`: Get detailed stats for a specific request
- `security.validateInput(input)`: Validate input against security policies

## Events

The Model Invocation Module emits events that can be subscribed to:

- `request:started` - Request to a model has started
- `request:completed` - Request completed successfully
- `request:failed` - Request failed
- `request:cancelled` - Request was cancelled
- `stream:started` - Stream response started
- `stream:chunk` - Stream chunk received
- `stream:completed` - Stream completed
- `stream:failed` - Stream failed
- `function:called` - Function was called by a model
- `function:completed` - Function call completed
- `function:failed` - Function call failed
- `chain:started` - Chain execution started
- `chain:step:started` - Chain step started
- `chain:step:completed` - Chain step completed
- `chain:completed` - Chain execution completed
- `chain:failed` - Chain execution failed
- `quota:exceeded` - Usage quota exceeded
- `cache:hit` - Cache hit occurred
- `cache:miss` - Cache miss occurred
- `selection:completed` - Model selection completed

## Development

### Prerequisites

- Node.js 16.0.0 or later
- Yarn or npm
- API keys for model providers (for testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/Baozhi888/acip.git
cd acip/modules/model_invocation

# Install dependencies
npm install

# Run tests
npm test

# Build the module
npm run build
```

### Contributing

Contributions to the Model Invocation Module are welcome. Please see our [contributing guidelines](../../CONTRIBUTING.md) for details on how to submit changes.

Key areas where contributions are especially valuable:

- Additional model provider integrations
- Performance optimizations
- Enhanced caching strategies
- New chain patterns and templates
- Edge deployment optimizations

## License

This module is part of the ACIP project and is licensed under [MIT License](../../LICENSE). 
