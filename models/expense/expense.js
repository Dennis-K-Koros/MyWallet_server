const { Int32 } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExpenseSchema = new Schema({
    amount: Int32,
    category: String,
    createdAt: Date,
});

const Expense = mongoose.model('Expense', ExpenseSchema);

module.exports = Expense;