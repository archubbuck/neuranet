import { auth } from '../server/auth.js';

// Test email sign-in to confirm auth instance works at all
console.log('Testing email sign-in:');
const emailReq = new Request('http://localhost:4200/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
});
const emailRes = await auth.handler(emailReq);
console.log('Email sign-in status:', emailRes.status);

// Test callback (should find the route even without valid params)
console.log('\nTesting callback:');
const cbReq = new Request('http://localhost:4200/api/auth/callback/google', { method: 'GET' });
const cbRes = await auth.handler(cbReq);
console.log('Callback status:', cbRes.status);
