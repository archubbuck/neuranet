import pino from 'pino';

/**
 * Structured JSON logger. Uses pino-pretty in development for readable
 * output; emits raw JSON in production for log aggregation.
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] || (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug'),
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
