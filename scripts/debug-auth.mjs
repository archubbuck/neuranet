import { auth } from '../server/auth.js';
import config from '../server/config.js';

console.log('neonAuthBaseUrl:', config.neonAuthBaseUrl);

// Check if social providers are actually configured
const env = (key) => process.env[key] || '';
console.log('GOOGLE_CLIENT_ID set:', !!env('GOOGLE_CLIENT_ID'));
console.log('GOOGLE_CLIENT_SECRET set:', !!env('GOOGLE_CLIENT_SECRET'));

// Test email sign-in to confirm auth works
console.log('\nTesting email sign-in POST:');
const emailReq = new Request('http://localhost:4200/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
});
const emailRes = await auth.handler(emailReq);
console.log('Status:', emailRes.status);

// Test Google sign-in
console.log('\nTesting Google sign-in GET:');
const googleReq = new Request('http://localhost:4200/api/auth/sign-in/google', { method: 'GET' });
const googleRes = await auth.handler(googleReq);
console.log('Status:', googleRes.status);
const loc = googleRes.headers.get('location');
if (loc) console.log('Location:', loc.substring(0, 100));
