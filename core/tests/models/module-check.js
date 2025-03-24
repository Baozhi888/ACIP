/**
 * module-check.js - Check all model modules
 */

const fs = require('fs');
const path = require('path');

console.log('Checking individual model modules...\n');

// Check each module file
const moduleFiles = [
  'BaseModel.js',
  'ContextModel.js',
  'AgentModel.js',
  'serialization.js',
  'index.js'
];

moduleFiles.forEach(fileName => {
  const filePath = path.resolve(__dirname, '../../src/models', fileName);
  console.log(`Checking ${fileName}:`);
  console.log(`- File exists: ${fs.existsSync(filePath)}`);
  
  try {
    // Try to require the module
    const module = require(`../../src/models/${fileName.replace('.js', '')}`);
    console.log(`- Module imported successfully`);
    console.log(`- Module type: ${typeof module}`);
    
    if (typeof module === 'object') {
      console.log(`- Module keys: ${Object.keys(module).join(', ')}`);
    }
    
    console.log(`- Module check completed for ${fileName}\n`);
  } catch (error) {
    console.error(`- ERROR importing ${fileName}: ${error.message}`);
    console.error(error.stack.split('\n').slice(0, 3).join('\n'));
    console.log('\n');
  }
});

// Now try the index import approach
console.log('Testing index import method:');
try {
  const models = require('../../src/models');
  console.log('Models imported successfully through index');
  console.log('Models keys:', Object.keys(models).join(', '));
  
  // Test each model constructor
  if (models.BaseModel) {
    console.log('\nTesting BaseModel...');
    const base = new models.BaseModel({ test: 'value' });
    console.log('BaseModel instance created:', base.toObject());
  }
  
  if (models.ContextModel) {
    console.log('\nTesting ContextModel...');
    const context = new models.ContextModel({ userId: 'test-user' });
    console.log('ContextModel instance created:');
    console.log('- Context ID:', context.contextId);
  }
  
  if (models.AgentModel) {
    console.log('\nTesting AgentModel...');
    const agent = new models.AgentModel({ name: 'Test Agent' });
    console.log('AgentModel instance created:');
    console.log('- Agent ID:', agent.agentId);
  }
  
  if (models.serialization) {
    console.log('\nTesting serialization...');
    console.log('- Available formats:', Object.keys(models.serialization.FORMAT).join(', '));
  }
} catch (error) {
  console.error('ERROR with index import:', error.message);
  console.error(error.stack);
}

// Force output to flush
process.stdout.write('', () => process.exit(0)); 