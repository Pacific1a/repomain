const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  referralBalance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  referrals: [{
    userId: String,
    registeredAt: {
      type: Date,
      default: Date.now
    },
    totalEarnings: {
      type: Number,
      default: 0
    }
  }],
  referredBy: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Индексы для быстрого поиска
referralSchema.index({ userId: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ referredBy: 1 });

module.exports = mongoose.model('Referral', referralSchema);
