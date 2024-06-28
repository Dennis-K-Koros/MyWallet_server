const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
    // Add userID field
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: {
        type: Number,
        required: true
    },
    type: String,
    category: String,
    paymentMethod: String,
    date: Date,
    createdAt: Date,
    note: String,
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;