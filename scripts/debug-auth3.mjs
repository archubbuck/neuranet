// Quick check: does import order affect env var loading?
import '../server/env.js';

console.log('After env.ts:');
console.log('GOOGLE_CLIENT_ID:', process.env['GOOGLE_CLIENT_ID'] ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env['GOOGLE_CLIENT_SECRET'] ? 'SET' : 'NOT SET');

// Now check what auth.ts would build
const googleId = process.env['GOOGLE_CLIENT_ID'] || '';
const googleSecret = process.env['GOOGLE_CLIENT_SECRET'] || '';
console.log('googleId truthy:', !!googleId);
console.log('googleSecret truthy:', !!googleSecret);

if (googleId && googleSecret) {
  console.log('Google would be configured!');
} else {
  console.log('Google would NOT be configured!');
}
