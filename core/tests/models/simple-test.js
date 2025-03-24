/**
 * simple-test.js - Basic test for debugging
 */

console.log('Starting test script...');

// First check if the file exists
const fs = require('fs');
const path = require('path');

const baseModelPath = path.resolve(__dirname, '../../src/models/BaseModel.js');
console.log('Checking if BaseModel.js exists at:', baseModelPath);
console.log('File exists:', fs.existsSync(baseModelPath));

if (fs.existsSync(baseModelPath)) {
  console.log('File contents:');
  console.log(fs.readFileSync(baseModelPath, 'utf8').substring(0, 200) + '...');
}

try {
  // First, try to require the BaseModel directly
  console.log('\nAttempting to import BaseModel directly...');
  const BaseModel = require('../../src/models/BaseModel');
  console.log('BaseModel imported:', typeof BaseModel);
  
  if (typeof BaseModel === 'function') {
    // Create a simple instance
    console.log('Creating model instance...');
    const model = new BaseModel({ test: 'value' });
    console.log('Model instance created');
    console.log('Model is:', model);
    console.log('Model data:', model.toObject());
  }
  
  console.log('\nTest completed successfully');
} catch (error) {
  console.error('ERROR:', error.message);
  console.error(error.stack);
}

// Force output to flush
process.stdout.write('', () => process.exit(0)); 