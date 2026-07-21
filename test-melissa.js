const jwt = require('jsonwebtoken');

const secret = process.argv[2];
if (!secret) {
  console.log('\nUsage: node test-melissa.js <your-JWT_SECRET>\n');
  process.exit(1);
}

const token = jwt.sign({
  name: 'Sydney',
  email: 'test@sensawellness.org',
  sessionId: 'cs_test_abc123',
  items: '3-Test Pack',
  orderDate: 'May 1, 2026',
}, secret, { expiresIn: '1h' });

console.log('\nOpen this URL to test Melissa:');
console.log(`https://sensawellness.org/chat?t=${token}\n`);
