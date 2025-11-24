const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const backupManager = require('./utils/backupManager');

dotenv.config();

const app = express();

// Middleware - CORS with more permissive settings for production
const allowedOrigins = [
  'http://localhost:3000',
  'https://fofenk-front.onrender.com',
  'https://fofenk.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// MongoDB bağlantısı
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fofora-theatre';

if (!process.env.MONGODB_URI) {
  console.warn('⚠️ WARNING: MONGODB_URI environment variable not set, using default localhost');
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
.then(() => {
  console.log('✅ MongoDB bağlantısı başarılı');
  console.log(`📦 Database: ${MONGODB_URI.split('@')[1] || 'localhost'}`);
})
.catch(err => {
  console.error('❌ MongoDB bağlantı hatası:', err.message);
  console.error('Lütfen MONGODB_URI environment variable\'ını kontrol edin');
  // Don't exit immediately, let server try to start anyway
});

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/institutions', require('./routes/institutions'));
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/instructors', require('./routes/instructors'));
app.use('/api/scheduled-lessons', require('./routes/scheduledLessons'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payment-plans', require('./routes/paymentPlans'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/cash-registers', require('./routes/cashRegisters'));
app.use('/api/trial-lessons', require('./routes/trialLessons'));
app.use('/api/message-templates', require('./routes/messageTemplates'));
app.use('/api/planned-expenses', require('./routes/plannedExpenses'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/export', require('./routes/export'));
app.use('/api/email', require('./routes/email'));
app.use('/api/backup', require('./routes/backup'));

// Health check - verifies both server and database connectivity
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isDbConnected = dbState === 1;

  res.json({
    status: isDbConnected ? 'OK' : 'DEGRADED',
    message: 'Fofora Theatre Management API is running',
    database: {
      status: dbStatus[dbState] || 'unknown',
      connected: isDbConnected
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Global error handler - ensures CORS headers are always sent
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Ensure CORS headers are present even on error responses
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server ${PORT} portunda çalışıyor`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  // Start automatic backup scheduler
  try {
    backupManager.scheduleAutoBackup();
    console.log('✅ Backup scheduler started');
  } catch (err) {
    console.error('⚠️ Backup scheduler error (non-critical):', err.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
