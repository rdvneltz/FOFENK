const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const backupManager = require('./utils/backupManager');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fofora-theatre', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => console.error('MongoDB bağlantı hatası:', err));

// Routes
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Fofora Theatre Management API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);

  // Start automatic backup scheduler
  backupManager.scheduleAutoBackup();
});
