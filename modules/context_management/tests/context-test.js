/**
 * Context Management Module Test
 * 
 * This test script validates the functionality of the Context Management module,
 * specifically testing the ContextManager, AdaptiveWindowManager, and ContextMemorySystem.
 */

// Import the Context Management module
const {
  ContextManager,
  AdaptiveWindowManager, 
  ContextMemorySystem,
  MemoryType
} = require('../src');

// Setup logging
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`)
};

// Test configuration
const config = {
  logger,
  storageType: 'memory',
  initialWindowSize: 2000,
  windowOptions: {
    minSize: 500,
    maxSize: 8000,
    adaptToComplexity: true
  },
  memoryOptions: {
    maxShortTermItems: 50,
    shortTermRetention: 3600, // 1 hour for testing
    episodicThreshold: 40
  }
};

/**
 * Run tests for the Context Management module
 */
async function runTests() {
  console.log('\n=== Context Management Module Tests ===\n');
  
  try {
    // Create Context Manager instance
    console.log('Creating Context Manager instance...');
    const contextManager = new ContextManager(config);
    
    // Test lifecycle methods
    console.log('Testing lifecycle methods...');
    await testLifecycle(contextManager);
    
    // Test context operations
    console.log('\nTesting context operations...');
    await testContextOperations(contextManager);
    
    // Test adaptive window management
    console.log('\nTesting adaptive window...');
    await testAdaptiveWindow(contextManager).catch(e => {
      console.error('Error in adaptive window test:', e);
    });
    
    // Test memory system
    console.log('\nTesting memory system...');
    await testMemorySystem(contextManager).catch(e => {
      console.error('Error in memory system test:', e);
    });
    
    // Test end-to-end flows
    console.log('\nTesting end-to-end scenarios...');
    await testEndToEndScenarios(contextManager).catch(e => {
      console.error('Error in end-to-end test:', e);
    });
    
    // Clean up
    console.log('\nCleaning up...');
    await contextManager.destroy();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    console.log('Test run completed.');
  }
}

/**
 * Test lifecycle methods
 */
async function testLifecycle(contextManager) {
  // Initialize
  const initResult = await contextManager.initialize();
  console.log(`  - Initialize: ${initResult ? 'Success' : 'Failed'}`);
  
  // Start
  const startResult = await contextManager.start();
  console.log(`  - Start: ${startResult ? 'Success' : 'Failed'}`);
  
  // Check state
  console.log(`  - Current state: ${contextManager.state}`);
  
  // Check stats
  const stats = contextManager.getStats();
  console.log(`  - Active contexts: ${stats.activeContexts}`);
}

/**
 * Test context operations
 */
async function testContextOperations(contextManager) {
  // Create context
  const context1 = contextManager.createContext('test-context-1', {
    user: 'user123',
    session: {
      started: Date.now(),
      active: true
    }
  });
  console.log(`  - Created context: ${context1.id}, v${context1.metadata.version}`);
  
  // Get context
  const retrievedContext = contextManager.getContext('test-context-1');
  console.log(`  - Retrieved context: ${retrievedContext.id}`);
  
  // Update context
  const updatedContext = contextManager.updateContext('test-context-1', {
    session: {
      lastAction: 'login',
      lastActionTime: Date.now()
    }
  });
  console.log(`  - Updated context: v${updatedContext.metadata.version}`);
  console.log(`  - Context data: ${JSON.stringify(updatedContext.data).substring(0, 70)}...`);
  
  // Create another context
  contextManager.createContext('test-context-2', { purpose: 'testing' });
  
  // Get stats
  const stats = contextManager.getStats();
  console.log(`  - Total contexts: ${stats.contextCount}`);
  console.log(`  - Total operations: ${stats.totalOperations}`);
  
  // Delete a context
  const deleteResult = contextManager.deleteContext('test-context-2');
  console.log(`  - Delete context: ${deleteResult ? 'Success' : 'Failed'}`);
  
  // Verify count
  const updatedStats = contextManager.getStats();
  console.log(`  - Contexts after deletion: ${updatedStats.contextCount}`);
}

/**
 * Test adaptive window management
 */
async function testAdaptiveWindow(contextManager) {
  try {
    // Create a context for window testing
    const contextId = 'window-test-context';
    contextManager.createContext(contextId, { purpose: 'window testing' });
    
    // Add simple content (should fit in window)
    console.log('  - Adding simple content...');
    const result1 = contextManager.addToContext(contextId, {
      type: 'message',
      content: 'Simple test message'
    });
    console.log(`  - Added simple content: ${result1.adjustmentType} adjustment`);
    console.log(`  - Window metrics: ${result1.metrics.currentTokenCount}/${result1.metrics.currentSize} tokens`);
    
    // Add complex content (might require window expansion)
    console.log('  - Adding complex content...');
    const complexData = {
      type: 'document',
      title: 'Complex Test Document',
      content: 'A '.repeat(500) + 'B '.repeat(500) + 'C '.repeat(500),
      metadata: {
        sections: [
          { heading: 'Section 1', paragraphs: 5 },
          { heading: 'Section 2', paragraphs: 7 },
          { heading: 'Section 3', paragraphs: 4 }
        ],
        tags: ['test', 'complex', 'document', 'large']
      }
    };
    
    const result2 = contextManager.addToContext(contextId, complexData);
    console.log(`  - Added complex content: ${result2.adjustmentType} adjustment`);
    console.log(`  - Complexity detected: ${result2.complexity}`);
    console.log(`  - Window metrics: ${result2.metrics.currentTokenCount}/${result2.metrics.currentSize} tokens`);
    console.log(`  - Utilization: ${Math.round(result2.metrics.utilizationPercentage)}%`);
    
    // Get updated window config
    const context = contextManager.getContext(contextId);
    console.log(`  - Window has ${context.content.window.length} items`);
  } catch (error) {
    console.error('  - Error in adaptive window test:', error);
    throw error;
  }
}

/**
 * Test memory system
 */
async function testMemorySystem(contextManager) {
  // Create a context for memory testing
  const contextId = 'memory-test-context';
  contextManager.createContext(contextId, { purpose: 'memory testing' });
  
  // Store a short-term memory
  const shortTermId = contextManager.storeMemory(contextId, {
    type: MemoryType.SHORT_TERM,
    content: 'This is a short-term memory for testing',
    importance: 10,
    tags: ['test', 'short-term']
  });
  console.log(`  - Stored short-term memory: ${shortTermId}`);
  
  // Store a long-term memory
  const longTermId = contextManager.storeMemory(contextId, {
    type: MemoryType.LONG_TERM,
    content: 'This is a long-term memory for testing',
    importance: 70,
    tags: ['test', 'long-term', 'important']
  });
  console.log(`  - Stored long-term memory: ${longTermId}`);
  
  // Store a semantic memory
  const semanticId = contextManager.storeMemory(contextId, {
    type: MemoryType.SEMANTIC,
    content: {
      concept: 'testing',
      definition: 'The process of verifying software works correctly'
    },
    importance: 60,
    tags: ['definition', 'concept'],
    metadata: {
      concept: 'testing'
    }
  });
  console.log(`  - Stored semantic memory: ${semanticId}`);
  
  // Retrieve a memory
  const memory = contextManager.retrieveMemory(longTermId);
  console.log(`  - Retrieved memory: ${memory.id}, type: ${memory.type}`);
  console.log(`  - Memory importance: ${memory.importance}, access count: ${memory.accessCount}`);
  
  // Query memories by tag
  const queryResults = contextManager.queryMemories({ tags: ['test'] }, contextId);
  console.log(`  - Query returned ${queryResults.length} results`);
  
  // Consolidate memories
  const consolidationResult = contextManager.consolidateMemories();
  console.log(`  - Consolidation: moved ${consolidationResult.moved}, pruned ${consolidationResult.pruned}`);
  
  // Get memory stats
  const memoryStats = contextManager.getStats().memory;
  console.log(`  - Memory stats: ${memoryStats.counts.shortTerm} short-term, ${memoryStats.counts.longTerm} long-term`);
}

/**
 * Test end-to-end scenarios
 */
async function testEndToEndScenarios(contextManager) {
  // Create a conversation context
  const conversationId = 'conversation-123';
  contextManager.createContext(conversationId, {
    type: 'conversation',
    participants: ['user', 'assistant'],
    started: Date.now()
  });
  
  // Simulate a conversation with memory and adaptive window
  console.log(`  - Simulating a conversation with ID: ${conversationId}`);
  
  // User message 1
  contextManager.addToContext(conversationId, {
    role: 'user',
    content: 'Hello, I need help with my project.',
    timestamp: Date.now()
  });
  
  // Store a memory about the user's need
  contextManager.storeMemory(conversationId, {
    type: MemoryType.EPISODIC,
    content: 'User needs help with their project',
    importance: 50,
    tags: ['user_need', 'project']
  });
  
  // Assistant response 1
  contextManager.addToContext(conversationId, {
    role: 'assistant',
    content: 'I\'d be happy to help with your project. What kind of project are you working on?',
    timestamp: Date.now()
  });
  
  // User message 2 (more complex)
  contextManager.addToContext(conversationId, {
    role: 'user',
    content: 'I\'m building a context management system for AI that can dynamically adjust the context window size based on complexity and importance of the information. It should also have different types of memory like short-term, long-term, and semantic memory.',
    timestamp: Date.now()
  });
  
  // Store semantic memories about key concepts
  contextManager.storeMemory(conversationId, {
    type: MemoryType.SEMANTIC,
    content: {
      concept: 'context_window',
      definition: 'A bounded region of text that an AI model can process at once'
    },
    importance: 80,
    tags: ['ai', 'context'],
    metadata: { concept: 'context_window' }
  });
  
  // Get conversation context and check its state
  const conversation = contextManager.getContext(conversationId);
  console.log(`  - Conversation has ${conversation.content.window.length} messages`);
  
  // Query for relevant memories to help with the response
  const relevantMemories = contextManager.queryMemories(
    { tags: ['context', 'ai'] }, 
    conversationId
  );
  console.log(`  - Found ${relevantMemories.length} relevant memories for response generation`);
  
  // Get final stats
  const stats = contextManager.getStats();
  console.log(`  - Final stats: ${stats.totalOperations} operations across ${stats.contextCount} contexts`);
  console.log(`  - Memory items: ${stats.memory.counts.total}`);
}

// Run the tests
runTests()
  .catch(err => {
    console.error('Test runner failed:', err);
  })
  .finally(() => {
    console.log('Test process complete.');
  }); 