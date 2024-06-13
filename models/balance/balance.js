const { Int32 } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BalanceSchema = new Schema({
    // Add userID field
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    balance: {
        type: Number,
        required: true
    },
    updatedAt: Date,
});

const Balance = mongoose.model('Balance', BalanceSchema);

module.exports = Balance;