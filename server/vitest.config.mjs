import { defineConfig } from 'vitest/config';

// Separate Vitest project for backend tests so it doesn't collide with
// the Angular jsdom setup that @angular/build configures for `ng test`.
// Run via: `pnpm test:server`.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['server/**/*.test.mjs'],
		// Each test file runs in its own worker with its own in-memory DB.
		isolate: true,
		pool: 'forks',
	},
});
