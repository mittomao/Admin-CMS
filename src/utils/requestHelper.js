'use strict';

/**
 * Request Helper Utilities
 */

function getClientIp(req) {
  if (!req) return '127.0.0.1';
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  );
}

function getUserAgent(req) {
  if (!req) return '';
  return req.headers?.['user-agent'] || '';
}

module.exports = {
  getClientIp,
  getUserAgent,
};

