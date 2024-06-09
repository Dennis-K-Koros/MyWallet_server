const { Int32 } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IncomeSchema = new Schema({
    amount: Int32,
    category: String,
    createdAt: Date,
});

const Income = mongoose.model('Income', IncomeSchema);

module.exports = Income;