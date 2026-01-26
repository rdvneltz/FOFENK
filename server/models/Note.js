const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  // Not sahibi (oluşturan kullanıcı)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Notun paylaşıldığı kullanıcılar
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Renk/etiket (isteğe bağlı)
  color: {
    type: String,
    default: '#ffffff'
  },
  // Öncelik/önem derecesi
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  // Hatırlatma tarihi (isteğe bağlı)
  reminderDate: {
    type: Date
  },
  // Sabitlenmiş mi (üstte gösterilsin mi)
  isPinned: {
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
  }
});

// Update timestamp before save
noteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Kullanıcının görebileceği notları getiren statik metod
noteSchema.statics.getVisibleNotes = async function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { sharedWith: userId }
    ]
  })
  .populate('owner', 'fullName username avatarColor')
  .populate('sharedWith', 'fullName username avatarColor')
  .sort({ isPinned: -1, updatedAt: -1 });
};

module.exports = mongoose.model('Note', noteSchema);
