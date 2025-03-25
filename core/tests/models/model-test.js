/**
 * model-test.js
 * 
 * Basic tests for ACIP data models and serialization
 */

// Clear console to start with a clean output
console.clear();
console.log('STARTING MODEL TESTS...\n');

// Import models
const models = require('../../src/models');
const { 
  BaseModel, 
  ContextModel, 
  AgentModel, 
  serialization 
} = models;

// Verify models are imported correctly
console.log('Imported models:');
console.log('- BaseModel:', typeof BaseModel);
console.log('- ContextModel:', typeof ContextModel);
console.log('- AgentModel:', typeof AgentModel);
console.log('- serialization:', typeof serialization);
console.log('');

/**
 * Log a message with a header
 */
function logSection(title) {
  console.log('\n' + '='.repeat(50));
  console.log(' ' + title);
  console.log('='.repeat(50));
}

/**
 * Test BaseModel functionality
 */
function testBaseModel() {
  logSection('TESTING BASE MODEL');
  
  // Create a schema for testing
  const personSchema = {
    type: 'object',
    required: ['name', 'age'],
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      email: { type: 'string' }
    }
  };
  
  // Create a model instance
  console.log('Creating model with valid data...');
  const personModel = new BaseModel({
    name: 'John Doe',
    age: 30,
    email: 'john@example.com'
  }, personSchema);
  
  // Test validation
  const validResult = personModel.validate();
  console.log('Validation result:', validResult);
  
  // Test serialization
  console.log('Model as object:', personModel.toObject());
  console.log('Model as JSON:', personModel.toJson());
  
  // Test with invalid data
  console.log('\nCreating model with invalid data...');
  const invalidModel = new BaseModel({
    name: 'Jane Smith',
    email: 'jane@example.com'
    // Missing age which is required
  }, personSchema);
  
  const invalidResult = invalidModel.validate();
  console.log('Validation result:', invalidResult);
  
  // Test getters and setters
  console.log('\nTesting getters and setters...');
  console.log('Initial name:', personModel.get('name'));
  personModel.set('name', 'John Smith');
  console.log('Updated name:', personModel.get('name'));
}

/**
 * Test ContextModel functionality
 */
function testContextModel() {
  logSection('TESTING CONTEXT MODEL');
  
  // Create a context
  console.log('Creating context model...');
  const context = new ContextModel({
    userId: 'user123',
    sessionId: 'session456',
    type: 'conversation',
    content: {
      messages: [
        { role: 'user', content: 'Hello AI' },
        { role: 'assistant', content: 'Hello! How can I help you today?' }
      ]
    },
    metadata: {
      source: 'web-client',
      language: 'en'
    },
    ttl: 3600 // 1 hour
  });
  
  // Print context details
  console.log('Context ID:', context.contextId);
  console.log('User ID:', context.userId);
  console.log('Session ID:', context.sessionId);
  console.log('Created:', new Date(context.created).toISOString());
  console.log('Content:', JSON.stringify(context.content));
  
  // Update content
  console.log('\nUpdating context content...');
  context.updateContent({
    messages: [
      ...context.content.messages,
      { role: 'user', content: 'What can you do?' }
    ]
  });
  
  console.log('Updated content:', JSON.stringify(context.content));
  console.log('Updated timestamp:', new Date(context.updated).toISOString());
  
  // Test references
  console.log('\nAdding references...');
  context.addReference('ctx_previous_123', 'previous_context');
  console.log('References:', JSON.stringify(context.get('references')));
  
  // Test expiration
  console.log('\nTesting expiration...');
  console.log('Is expired:', context.isExpired());
  
  // Version creation
  console.log('\nCreating new version...');
  const newVersion = context.createNewVersion();
  console.log('New context ID:', newVersion.contextId);
  console.log('References to previous version:', JSON.stringify(newVersion.get('references')));
}

/**
 * Test AgentModel functionality
 */
function testAgentModel() {
  logSection('TESTING AGENT MODEL');
  
  // Create an agent
  console.log('Creating agent model...');
  const agent = new AgentModel({
    name: 'Research Assistant',
    description: 'AI agent specialized in research and data analysis',
    version: '1.0.0',
    capabilities: [
      { name: 'search', description: 'Can search the web for information' },
      { name: 'summarize', description: 'Can summarize long texts' }
    ],
    owner: 'organization_xyz'
  });
  
  // Print agent details
  console.log('Agent ID:', agent.agentId);
  console.log('Name:', agent.name);
  console.log('Status:', agent.status);
  console.log('Capabilities:', JSON.stringify(agent.capabilities));
  
  // Update status
  console.log('\nUpdating agent status...');
  agent.updateStatus('initializing');
  console.log('New status:', agent.status);
  
  // Add capabilities
  console.log('\nAdding new capability...');
  agent.addCapability({
    name: 'translate',
    description: 'Can translate between languages'
  });
  console.log('Updated capabilities count:', agent.capabilities.length);
  
  // Add model
  console.log('\nAdding AI model...');
  agent.addModel({
    id: 'gpt-4o',
    name: 'gpt-4o',
    version: '1.0',
    provider: 'OpenAI'
  });
  console.log('Models:', JSON.stringify(agent.models));
  
  // Update configuration
  console.log('\nUpdating configuration...');
  agent.updateConfiguration({
    maxTokens: 4096,
    temperature: 0.7,
    modelPreference: 'gpt-4o'
  });
  console.log('Configuration:', JSON.stringify(agent.configuration));
  
  // Update metrics
  console.log('\nUpdating metrics...');
  agent.updateMetrics({
    requestsProcessed: 10,
    averageResponseTime: 1200, // ms
    errorRate: 0.02
  });
  console.log('Metrics:', JSON.stringify(agent.metrics));
  
  // Serialize agent
  console.log('\nSerializing agent...');
  const serialized = agent.serialize();
  console.log('Serialized agent (sample):', JSON.stringify(serialized).substring(0, 100) + '...');
}

/**
 * Test serialization utilities
 */
function testSerialization() {
  logSection('TESTING SERIALIZATION');
  
  // Create test data
  const context = new ContextModel({
    userId: 'user789',
    type: 'query',
    content: {
      question: 'How does ACIP work?',
      context: 'Researching AI protocols'
    }
  });
  
  // Test JSON serialization
  console.log('Serializing to JSON...');
  const jsonData = serialization.serialize(context, serialization.FORMAT.JSON, { pretty: true });
  console.log('JSON data sample:', jsonData.substring(0, 100) + '...');
  
  // Test binary serialization
  console.log('\nSerializing to binary...');
  const binaryData = serialization.serialize(context, serialization.FORMAT.BINARY);
  console.log('Binary data length:', binaryData.length, 'bytes');
  
  // Test deserialization
  console.log('\nDeserializing from JSON...');
  const deserializedObj = serialization.deserialize(jsonData);
  console.log('Deserialized as object (sample):', JSON.stringify(deserializedObj).substring(0, 100) + '...');
  
  const deserializedContext = serialization.deserialize(jsonData, serialization.FORMAT.JSON, 'context');
  console.log('Deserialized as ContextModel instance:', deserializedContext instanceof ContextModel);
  console.log('Context ID:', deserializedContext.contextId);
  
  // Test ID generation
  console.log('\nGenerating IDs...');
  console.log('New ID:', serialization.generateId('test_'));
  console.log('New ID:', serialization.generateId('test_'));
}

// Run all tests in a try-catch block
try {
  testBaseModel();
  testContextModel();
  testAgentModel();
  testSerialization();
  
  console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY');
} catch (error) {
  console.error('\n❌ TEST FAILED:', error);
  console.error(error.stack);
}

// Force output to flush
process.stdout.write('', () => setTimeout(() => process.exit(0), 100)); 