const expressWinston = require('express-winston');
const { logger } = require('../utils/logger');

// HTTP request logging middleware
const httpLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: true,
  colorize: true,
  ignoreRoute: function (req, res) {
    // Ignore health check and static files
    return req.url === '/api/health' || req.url.startsWith('/static');
  },
  requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
  responseWhitelist: ['statusCode', 'responseTime'],
  dynamicMeta: function (req, res) {
    return {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user._id : null,
      userEmail: req.user ? req.user.email : null
    };
  }
});

// Error logging middleware
const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: 'Error: {{err.message}}',
  requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
  responseWhitelist: ['statusCode'],
  dynamicMeta: function (req, res) {
    return {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user._id : null,
      userEmail: req.user ? req.user.email : null
    };
  }
});

module.exports = {
  httpLogger,
  errorLogger
};
