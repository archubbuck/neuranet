import { betterAuth } from 'better-auth';

const auth = betterAuth({
  baseURL: 'http://localhost:4200',
  socialProviders: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] || 'test',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] || 'test',
    },
  },
  emailAndPassword: { enabled: true },
});

// Try POST method too
const methods = ['GET', 'POST'];
for (const method of methods) {
  const req = new Request('http://localhost:4200/sign-in/google', { method });
  const res = await auth.handler(req);
  const loc = res.headers.get('location');
  console.log(
    `${method} /sign-in/google => ${res.status}${loc ? ' -> ' + loc.substring(0, 80) : ''}`,
  );
}

// Also try: maybe the route is registered under the basePath?
// Let's try with the full URL including the basePath
const req2 = new Request('http://localhost:4200/sign-in/google', {
  method: 'GET',
  headers: { Origin: 'http://localhost:4200' },
});
const res2 = await auth.handler(req2);
console.log(`GET /sign-in/google + Origin => ${res2.status}`);

// Try the callback route to confirm something works
const cbReq = new Request('http://localhost:4200/callback/google?code=test&state=test', {
  method: 'GET',
});
const cbRes = await auth.handler(cbReq);
console.log(`GET /callback/google => ${cbRes.status}`);

// Also try with /api/auth prefix for callback
const cbReq2 = new Request('http://localhost:4200/api/auth/callback/google?code=test&state=test', {
  method: 'GET',
});
const cbRes2 = await auth.handler(cbReq2);
console.log(`GET /api/auth/callback/google => ${cbRes2.status}`);
