/**
 * minimal-test.js - Just to test console output
 */

console.log('Starting minimal test...');

for (let i = 0; i < 5; i++) {
  console.log(`Log message ${i}`);
}

console.log('Object:', { name: 'Test', value: 42 });

console.log('Test complete');

// Force output to flush
process.stdout.write('', () => process.exit(0)); 