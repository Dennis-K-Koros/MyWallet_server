const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IncomeSchema = new Schema({
    // Add userID field
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, 
    amount: {
        type: Number,
        required: true
    },
    category: String,
    createdAt: Date,
});

const Income = mongoose.model('Income', IncomeSchema);

module.exports = Income;