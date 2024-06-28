const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BalanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  balance: {
    type: Number,
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const Balance = mongoose.model('Balance', BalanceSchema);

module.exports = Balance;
