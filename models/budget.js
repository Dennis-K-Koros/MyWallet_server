const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BudgetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  category: String,
  amount: {
    type: Number,
    required: true
  },
  spentAmount: {
    type: Number,
    required: true
  },
  startDate: Date,
  endDate: Date,
  note: String,
  createdAt: { type: Date, default: Date.now },
});

const Budget = mongoose.model('Budget', BudgetSchema);

module.exports = Budget;
