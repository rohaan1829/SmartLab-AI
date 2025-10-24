const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'smartlab-ai' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // General application logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    }),
    
    // Security logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      level: 'info'
    }),
    
    // Audit logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '365d',
      level: 'info'
    })
  ]
});

// Security logger for authentication and authorization events
const securityLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'smartlab-ai-security' },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d'
    })
  ]
});

// Audit logger for sensitive operations
const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'smartlab-ai-audit' },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '365d'
    })
  ]
});

// Helper functions for structured logging
const logHelpers = {
  // User authentication events
  logUserLogin: (userId, email, ip, userAgent) => {
    securityLogger.info('User login successful', {
      event: 'USER_LOGIN',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  logUserLogout: (userId, email, ip) => {
    securityLogger.info('User logout', {
      event: 'USER_LOGOUT',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  logUserRegistration: (userId, email, role, ip) => {
    securityLogger.info('User registration', {
      event: 'USER_REGISTRATION',
      userId,
      email,
      role,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  logLoginFailure: (email, ip, reason, userAgent) => {
    securityLogger.warn('Login attempt failed', {
      event: 'LOGIN_FAILURE',
      email,
      ip,
      reason,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  logPasswordChange: (userId, email, ip) => {
    securityLogger.info('Password changed', {
      event: 'PASSWORD_CHANGE',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  // CRUD operations
  logCreate: (resource, resourceId, userId, email, data) => {
    auditLogger.info('Resource created', {
      event: 'CREATE',
      resource,
      resourceId,
      userId,
      email,
      data: data ? Object.keys(data) : null,
      timestamp: new Date().toISOString()
    });
  },

  logUpdate: (resource, resourceId, userId, email, changes) => {
    auditLogger.info('Resource updated', {
      event: 'UPDATE',
      resource,
      resourceId,
      userId,
      email,
      changes: changes ? Object.keys(changes) : null,
      timestamp: new Date().toISOString()
    });
  },

  logDelete: (resource, resourceId, userId, email) => {
    auditLogger.info('Resource deleted', {
      event: 'DELETE',
      resource,
      resourceId,
      userId,
      email,
      timestamp: new Date().toISOString()
    });
  },

  logRead: (resource, resourceId, userId, email) => {
    auditLogger.info('Resource accessed', {
      event: 'READ',
      resource,
      resourceId,
      userId,
      email,
      timestamp: new Date().toISOString()
    });
  },

  // System events
  logSystemStart: () => {
    logger.info('System started', {
      event: 'SYSTEM_START',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  },

  logDatabaseConnection: (status) => {
    logger.info('Database connection', {
      event: 'DATABASE_CONNECTION',
      status,
      timestamp: new Date().toISOString()
    });
  },

  logError: (error, context = {}) => {
    logger.error('Application error', {
      event: 'ERROR',
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  logSecurityEvent: (event, details) => {
    securityLogger.warn('Security event', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  // Frontend activity logging
  logActivity: (event, details) => {
    logger.info('Frontend activity', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  logger,
  securityLogger,
  auditLogger,
  logHelpers
};
