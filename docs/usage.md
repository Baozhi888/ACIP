# ACIP Usage Guide

This document provides comprehensive guidance on how to use the Adaptive Contextual Intelligence Protocol (ACIP) for building AI applications.

## Getting Started

Before using ACIP, make sure you have completed the [installation process](installation.md) and have a running ACIP node.

## Core Concepts

### ACIP Architecture Overview

ACIP consists of several key components:

- **Core Protocol**: The foundational layer that handles communication and coordination
- **Modules**: Specialized components that provide specific functionalities
- **Agents**: AI agents built on top of the protocol
- **Applications**: End-user applications leveraging ACIP capabilities

### Protocol Interaction Models

ACIP supports multiple interaction models:

1. **Request-Response**: Standard synchronous communication
2. **Streaming**: Real-time data streaming for continuous interactions
3. **Event-Driven**: Asynchronous event-based communication
4. **Distributed**: Peer-to-peer communication between nodes

## Basic Usage

### Initializing ACIP

```javascript
const ACIP = require('acip');

// Initialize ACIP with configuration
const acip = new ACIP({
  nodeId: 'my-application-node',
  modules: {
    contextManagement: true,
    dataAccess: true,
    securityAuthentication: true,
    modelInvocation: true,
    paymentSettlement: false
  }
});

// Start the ACIP instance
await acip.start();
```

### Creating an AI Agent

```javascript
// Create a basic AI agent
const agent = acip.createAgent({
  name: 'my-assistant',
  description: 'A helpful assistant',
  capabilities: ['conversation', 'information-retrieval', 'task-execution']
});

// Initialize the agent
await agent.initialize();
```

### Processing User Requests

```javascript
// Process a user request
const response = await agent.process({
  userId: 'user-123',
  message: 'What's the weather like today?',
  context: {
    location: 'San Francisco',
    preferences: {
      temperature: 'celsius'
    }
  }
});

console.log(response.message);
```

### Using Context Management

```javascript
// Get the context management module
const contextManager = acip.getModule('contextManagement');

// Store context information
await contextManager.store({
  userId: 'user-123',
  sessionId: 'session-456',
  data: {
    preferences: {
      language: 'en-US',
      topics: ['technology', 'science']
    },
    history: [
      {
        role: 'user',
        content: 'Tell me about quantum computing'
      },
      {
        role: 'assistant',
        content: 'Quantum computing is...'
      }
    ]
  }
});

// Retrieve context information
const context = await contextManager.retrieve({
  userId: 'user-123',
  sessionId: 'session-456'
});
```

### Invoking AI Models

```javascript
// Get the model invocation module
const modelInvoker = acip.getModule('modelInvocation');

// Invoke a specific model
const result = await modelInvoker.invoke({
  modelId: 'gpt-4',
  input: {
    prompt: 'Explain the theory of relativity simply',
    parameters: {
      temperature: 0.7,
      max_tokens: 500
    }
  }
});

console.log(result.output);
```

## Advanced Usage

### Adaptive Context Window

```javascript
// Configure adaptive context window
const contextManager = acip.getModule('contextManagement');

await contextManager.configure({
  adaptiveMode: 'dynamic',
  minWindowSize: 1024,
  maxWindowSize: 32768,
  complexityThreshold: 0.7,
  resourceOptimization: 'balanced'
});

// Use adaptive context in processing
const response = await agent.process({
  userId: 'user-123',
  message: 'Analyze this complex technical document and summarize the key findings',
  context: {
    document: longTechnicalDocument,
    taskComplexity: 'high'
  }
});
```

### Federated Learning

```javascript
// Get the model invocation module with federated learning capabilities
const modelInvoker = acip.getModule('modelInvocation');

// Configure federated learning
await modelInvoker.configureFederatedLearning({
  enabled: true,
  aggregationMethod: 'federated-averaging',
  privacyBudget: 0.5,  // Differential privacy budget
  minParticipants: 5,
  roundsPerAggregation: 3
});

// Participate in federated learning
await modelInvoker.participateInTraining({
  modelId: 'federated-recommendation-model',
  localData: userInteractionData,
  epochs: 10,
  batchSize: 32
});
```

### Decentralized Identity and Authentication

```javascript
// Get the security authentication module
const securityAuth = acip.getModule('securityAuthentication');

// Create a decentralized identity
const did = await securityAuth.createIdentity({
  method: 'did:key',
  userName: 'Alice',
  attributes: {
    organization: 'Example Corp',
    role: 'Developer'
  }
});

// Authenticate using the DID
const authToken = await securityAuth.authenticate({
  did: did.id,
  challenge: challenge,
  proof: signedChallenge
});

// Verify credentials
const isValid = await securityAuth.verifyCredential({
  credential: userCredential,
  requiredAttributes: ['organization', 'role']
});
```

### Working with the Blockchain Layer

```javascript
// Get blockchain interface
const blockchain = acip.getBlockchain();

// Deploy a smart contract
const contract = await blockchain.deployContract({
  name: 'ModelLicensing',
  source: modelLicensingContractSource,
  arguments: [modelId, ownerAddress, licenseFee]
});

// Interact with the contract
const transaction = await contract.methods.licenseTo(clientAddress, licenseType).send({
  from: ownerAddress,
  value: licenseFee
});

// Listen for blockchain events
blockchain.on('ModelLicensed', (event) => {
  console.log(`Model ${event.modelId} licensed to ${event.licensee}`);
});
```

### Multi-Agent Coordination

```javascript
// Create multiple specialized agents
const researchAgent = acip.createAgent({
  name: 'research-specialist',
  capabilities: ['information-retrieval', 'knowledge-synthesis']
});

const writingAgent = acip.createAgent({
  name: 'content-writer',
  capabilities: ['content-generation', 'language-refinement']
});

const factCheckAgent = acip.createAgent({
  name: 'fact-checker',
  capabilities: ['verification', 'source-validation']
});

// Create a coordinator agent
const coordinator = acip.createCoordinator({
  agents: [researchAgent, writingAgent, factCheckAgent],
  workflow: 'sequential'  // or 'parallel', 'adaptive'
});

// Process a complex task through the multi-agent system
const result = await coordinator.process({
  task: 'Create a well-researched article about climate change',
  parameters: {
    length: 'medium',
    style: 'informative',
    audience: 'general'
  }
});
```

### Edge Computing Integration

```javascript
// Configure for edge computing
await acip.configureEdge({
  mode: 'edge-first',
  offloadingPolicy: 'resource-based',
  syncInterval: 600,  // seconds
  cacheSize: 100      // MB
});

// Process request with edge-cloud coordination
const response = await agent.processOnEdge({
  userId: 'user-123',
  message: 'Control smart home devices',
  edgeCapabilities: {
    devices: ['thermostat', 'lights', 'speakers'],
    allowOffline: true
  }
});
```

## Integration Examples

### Integrating with REST API

```javascript
const express = require('express');
const app = express();
const ACIP = require('acip');

const acip = new ACIP({/* config */});
await acip.start();

app.post('/api/assistant', async (req, res) => {
  try {
    const agent = acip.getAgent('my-assistant');
    const response = await agent.process({
      userId: req.body.userId,
      message: req.body.message,
      context: req.body.context
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('ACIP REST API running on port 3000');
});
```

### Integrating with GraphQL

```javascript
const { ApolloServer, gql } = require('apollo-server');
const ACIP = require('acip');

const acip = new ACIP({/* config */});
await acip.start();

const typeDefs = gql`
  type Response {
    message: String
    confidence: Float
    sources: [String]
  }
  
  type Query {
    assistant(userId: ID!, message: String!, context: JSON): Response
  }
`;

const resolvers = {
  Query: {
    assistant: async (_, args) => {
      const agent = acip.getAgent('my-assistant');
      return await agent.process({
        userId: args.userId,
        message: args.message,
        context: args.context
      });
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => {
  console.log(`ACIP GraphQL API running at ${url}`);
});
```

## Best Practices

### Performance Optimization

1. **Context Management**:
   - Use appropriate context window sizes for your application
   - Implement context pruning for long-running sessions
   - Utilize the adaptive context window feature for varying task complexity

2. **Model Selection**:
   - Choose the right model size for your task requirements
   - Implement model caching for frequently used models
   - Consider quantized models for edge deployment

3. **Resource Usage**:
   - Monitor memory and CPU usage with `acip.getStats()`
   - Implement rate limiting for high-traffic applications
   - Use batch processing for multiple similar requests

### Security Considerations

1. **Authentication and Authorization**:
   - Always implement proper user authentication
   - Use fine-grained access control for sensitive operations
   - Regularly rotate encryption keys and access tokens

2. **Data Protection**:
   - Use encryption for sensitive data storage and transmission
   - Implement data minimization principles
   - Configure appropriate data retention policies

3. **Secure Deployment**:
   - Follow the principle of least privilege
   - Use secure network configurations
   - Implement proper logging and monitoring

### Scalability

1. **Horizontal Scaling**:
   - Deploy multiple ACIP nodes with load balancing
   - Implement shared state management for distributed deployments
   - Use distributed caching for improved performance

2. **Vertical Scaling**:
   - Allocate appropriate resources based on workload
   - Monitor and adjust resource allocation dynamically
   - Implement efficient database indexing and query optimization

## Troubleshooting

### Common Issues and Solutions

1. **Connection Problems**:
   - Check network connectivity
   - Verify port configurations
   - Ensure firewall rules allow ACIP traffic

2. **Performance Issues**:
   - Check for resource constraints
   - Optimize context window size
   - Consider scaling up or out

3. **Integration Errors**:
   - Verify API endpoints and parameters
   - Check authentication credentials
   - Review integration code for compatibility

### Debugging

```javascript
// Enable debug logging
acip.setLogLevel('debug');

// Add a specific debug listener
acip.on('debug', (msg) => {
  console.log(`[DEBUG] ${msg}`);
});

// Dump current system state
const state = await acip.dumpState();
console.log(JSON.stringify(state, null, 2));
```

## Conclusion

This guide provides a foundation for using ACIP in your AI applications. As you become more familiar with the protocol, you can explore more advanced features and customization options. For further assistance, refer to the API documentation, example applications, and community resources.

## Additional Resources

- [API Reference](api-reference.md)
- [Example Gallery](../examples)
- [Contributing Guide](../CONTRIBUTING.md)
- [Community Forum](https://community.acip.org) 
