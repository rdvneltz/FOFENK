const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // Mesaj şablonu (değişkenler: {studentName}, {parentName}, {courseName}, {amount}, {date}, {time})
  template: {
    type: String,
    required: true
  },
  // Şablon tipi
  type: {
    type: String,
    enum: ['paymentPlan', 'paymentReminder', 'trialLessonReminder', 'lessonReminder', 'general'],
    required: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  updatedBy: String
});

messageTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema);
