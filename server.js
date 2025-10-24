const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { sanitizeData, sanitizeXSS } = require('./middleware/validation');
const { apiLimiter } = require('./middleware/auth');
const { httpLogger, errorLogger } = require('./middleware/logging');
const { logger, logHelpers } = require('./utils/logger');

// Load environment variables
dotenv.config();

const app = express();

// Log system startup
logHelpers.logSystemStart();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - must be before rate limiting
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Rate limiting (after CORS)
app.use('/api', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(sanitizeData);

// Data sanitization against XSS
app.use(sanitizeXSS);

// HTTP request logging
app.use(httpLogger);

// MongoDB connection
const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://roaandev_db_user:Rmug1829@corexcluster.k3jw29a.mongodb.net/';

mongoose.connect(DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully');
  logHelpers.logDatabaseConnection('success');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  logHelpers.logDatabaseConnection('failed');
  logHelpers.logError(err, { context: 'database_connection' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/logs', require('./routes/logs'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'SmartLab AI API is running!', status: 'OK' });
});

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
  logHelpers.logError(err, { 
    context: 'express_error_handler',
    url: req.url,
    method: req.method,
    userId: req.user ? req.user._id : null
  });
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server started on port ${PORT}`, {
    event: 'SERVER_START',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});
