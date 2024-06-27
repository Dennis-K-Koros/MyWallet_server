const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExpenseSchema = new Schema({
    // Add userID field
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: {
        type: Number,
        required: true
    },
    category: String,
    createdAt: Date,
    note: String,
});

const Expense = mongoose.model('Expense', ExpenseSchema);

module.exports = Expense;