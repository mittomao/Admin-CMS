const winston = require('winston');
const env = require('../config/env');

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'api_secret',
  'session_secret',
];

/**
 * Hàm đệ quy che giấu dữ liệu nhạy cảm in-place trong log object (Task 12.E1)
 * Giữ nguyên các Mongoose / Winston Symbol keys
 */
function maskSensitiveInPlace(obj, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) {
    return;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object') {
        maskSensitiveInPlace(item, seen);
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      maskSensitiveInPlace(obj[key], seen);
    }
  }
}

const redactFormat = winston.format((info) => {
  maskSensitiveInPlace(info);
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  redactFormat(),
  env.isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack, correlationId, ...meta }) => {
          const cid = correlationId ? ` [${correlationId}]` : '';
          const metaKeys = Object.keys(meta);
          const metaStr = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}]${cid} ${level}: ${stack || message}${metaStr}`;
        })
      )
    : winston.format.json()
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports: [new winston.transports.Console()],
});

module.exports = logger;
