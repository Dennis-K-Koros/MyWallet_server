const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// MongoDB models
const Transaction = require('../models/transaction');
const Balance = require('../models/balance');

// Middleware to parse JSON bodies
router.use(express.json());

// env variables
require("dotenv").config();

// Helper function to update balance
async function updateBalance(userId, amount, type) {
    try {
        const balance = await Balance.findOne({ userId: userId });

        if (balance) {
            if (type === 'income') {
                balance.balance += amount;
            } else if (type === 'expense') {
                balance.balance -= amount;
            }
            balance.updatedAt = new Date();
            await balance.save();
        } else {
            // If balance record doesn't exist, create a new one
            const newBalance = new Balance({
                userId: userId,
                balance: type === 'income' ? amount : -amount,
                createdAt: new Date()
            });
            await newBalance.save();
        }
    } catch (error) {
        throw new Error("Error updating balance: " + error.message);
    }
}

// Creating a Transaction Record
router.post('/create', async (req, res) => {
    let { amount, category, userId, paymentMethod, date, note, type } = req.body;
    amount = amount.trim();
    category = category.trim();
    paymentMethod = paymentMethod.trim();
    date = date.trim();
    type = type.trim();

    if (note) {
        note = note.trim();
    } else {
        note = ''; // or null or whatever is appropriate
    }

    if (amount == "" || !userId || category == "" || paymentMethod == "" || date == "" || type == "") {
        return res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else if (!/^\d+$/.test(amount)) {
        return res.json({
            status: "FAILED",
            message: "Only numbers are accepted"
        });
    } else if (isNaN(new Date(date).getTime())) {
        res.json({
            status: "FAILED",
            message: "Invalid date entered"
        });
    } else if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.json({
            status: "FAILED",
            message: "Invalid transaction type"
        });
    }

    try {
        const newTransaction = new Transaction({
            userId: new mongoose.Types.ObjectId(userId),
            amount: parseInt(amount, 10),
            category: category,
            paymentMethod: paymentMethod,
            date: new Date(date),
            note: note,
            type: type.toLowerCase(),
            createdAt: new Date()
        });

        const savedTransaction = await newTransaction.save();

        // Update user's balance
        await updateBalance(userId, parseInt(amount, 10), type.toLowerCase());

        res.json({
            status: "SUCCESS",
            message: "Transaction record created successfully",
            data: savedTransaction
        });
    } catch (error) {
        console.error("Error creating new Transaction record:", error); // Log the actual error
        res.json({
            status: "FAILED",
            message: "An error occurred while creating new Transaction record",
            error: error.message // Provide the actual error message for more context
        });
    }
});

// Reading all Transaction Records
router.get('/', (req, res) => {
    Transaction.find()
        .then(transactions => {
            res.json({
                status: "SUCCESS",
                data: transactions
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving transaction records",
            });
        });
});

// Reading a specific Transaction Record by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;

    Transaction.findById(id)
        .then(transaction => {
            //check if transaction id exists
            if (!transaction) {
                return res.json({
                    status: "FAILED",
                    message: "Transaction record not found"
                });
            } else {
                res.json({
                    status: "SUCCESS",
                    data: transaction
                });
            }
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving the transaction record",
            });
        });
});

// Reading all Transaction Records for a user and within a specific period
router.get('/user', (req, res) => {
    const { userId, startDate, endDate } = req.query;
    if (!userId) {
        return res.json({
            status: "FAILED",
            message: "UserID is required"
        });
    }

    const filter = {
        userId: mongoose.Types.ObjectId(userId)
    };

    if (startDate) {
        filter.createdAt = { $gte: new Date(startDate) };
    }

    if (endDate) {
        if (!filter.createdAt) {
            filter.createdAt = {};
        }
        filter.createdAt.$lte = new Date(endDate);
    }

    Transaction.find(filter)
        .then(transactions => {
            res.json({
                status: "SUCCESS",
                data: transactions
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving transaction records",
                error: error.message
            });
        });
});

// Route to get transaction records for a specific period (day, week, month, year)
router.get('/period/:period', async (req, res) => {
    const { userId, type = 'all' } = req.query; // Default to 'all' if type is not specified
    const { period } = req.params;

    if (!userId) {
        return res.json({
            status: "FAILED",
            message: "UserID is required"
        });
    }

    const filter = {
        userId: new mongoose.Types.ObjectId(userId),
    };

    let startDate = new Date();
    let endDate = new Date();

    switch (period.toLowerCase()) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            const currentDay = startDate.getDay();
            const distanceToMonday = (currentDay + 6) % 7; // Days to Monday (0 for Monday)
            startDate.setDate(startDate.getDate() - distanceToMonday);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + 1);
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            endDate.setMonth(0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            return res.json({
                status: "FAILED",
                message: "Invalid period specified"
            });
    }

    filter.createdAt = { $gte: startDate, $lte: endDate };

    if (type.toLowerCase() !== 'all') {
        filter.type = type.toLowerCase();
    }

    try {
        const transactions = await Transaction.find(filter);
        const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        res.json({
            status: "SUCCESS",
            data: transactions,
            totalAmount
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving transaction records",
            error: error.message
        });
    }
});


// Route to get total amounts per category within a specific period (day, week, month, year)
router.get('/category/:period', async (req, res) => {
    const { userId, type = 'all' } = req.query; // Default to 'all' if type is not specified
    const { period } = req.params;

    if (!userId) {
        return res.json({
            status: "FAILED",
            message: "UserID is required"
        });
    }

    const filter = {
        userId: new mongoose.Types.ObjectId(userId),
    };

    let startDate = new Date();
    let endDate = new Date();

    switch (period.toLowerCase()) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            const currentDay = startDate.getDay();
            const distanceToMonday = (currentDay + 6) % 7; // Days to Monday (0 for Monday)
            startDate.setDate(startDate.getDate() - distanceToMonday);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + 1);
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            endDate.setMonth(0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            return res.json({
                status: "FAILED",
                message: "Invalid period specified"
            });
    }

    filter.createdAt = { $gte: startDate, $lte: endDate };

    if (type.toLowerCase() !== 'all') {
        filter.type = type.toLowerCase();
    }

    try {
        const transactions = await Transaction.find(filter);
        const totalsByCategory = transactions.reduce((acc, transaction) => {
            if (!acc[transaction.category]) {
                acc[transaction.category] = 0;
            }
            acc[transaction.category] += transaction.amount;
            return acc;
        }, {});

        res.json({
            status: "SUCCESS",
            totalsByCategory
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving transaction records",
            error: error.message
        });
    }
});

// Route to get total amounts per day for a specific month
router.get('/period/month', async (req, res) => {
    const { userId, month, year, type = 'all' } = req.query;

    if (!userId || !month || !year) {
        return res.json({
            status: "FAILED",
            message: "UserID, month, and year are required"
        });
    }

    const filter = {
        userId: new mongoose.Types.ObjectId(userId),
    };

    let startDate = new Date(year, month - 1, 1);
    let endDate = new Date(year, month, 0); // Last day of the specified month

    filter.createdAt = { $gte: startDate, $lte: endDate };

    if (type.toLowerCase() !== 'all') {
        filter.type = type.toLowerCase();
    }

    try {
        const transactions = await Transaction.find(filter);
        const totalAmountsPerDay = transactions.reduce((acc, transaction) => {
            const day = new Date(transaction.createdAt).getDate();
            if (!acc[day]) {
                acc[day] = 0;
            }
            acc[day] += transaction.amount;
            return acc;
        }, {});

        res.json({
            status: "SUCCESS",
            totalAmountsPerDay
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving transaction records",
            error: error.message
        });
    }
});


// Updating a Transaction Record by ID
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, category, amount, note, type } = req.body;

    if (!amount || !category || !userId || !type) {
        return res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    }

    if (!/^\d+$/.test(amount)) {
        return res.json({
            status: "FAILED",
            message: "Only numbers are accepted for the amount"
        });
    }

    if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.json({
            status: "FAILED",
            message: "Invalid transaction type"
        });
    }

    try {
        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.json({
                status: "FAILED",
                message: "Transaction record not found"
            });
        }

        const oldAmount = transaction.amount;
        const difference = parseInt(amount, 10) - oldAmount;

        // Update the transaction record
        const updatedTransaction = await Transaction.findByIdAndUpdate(id, {
            amount: parseInt(amount, 10),
            category: category,
            userId: new mongoose.Types.ObjectId(userId),
            note: note,
            type: type.toLowerCase()
        }, { new: true });

        // Update user's balance
        await updateBalance(userId, difference, type.toLowerCase());

        res.json({
            status: "SUCCESS",
            message: "Transaction record updated successfully",
            data: updatedTransaction
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while updating the transaction record"
        });
    }
});

// Deleting a Transaction Record by ID
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedTransaction = await Transaction.findByIdAndDelete(id);
        if (!deletedTransaction) {
            return res.json({
                status: "FAILED",
                message: "Transaction record not found"
            });
        }

        // Update user's balance
        await updateBalance(deletedTransaction.userId, -deletedTransaction.amount, deletedTransaction.type);

        res.json({
            status: "SUCCESS",
            message: "Transaction record deleted successfully",
            data: deletedTransaction
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while deleting the transaction record",
            error: error.message
        });
    }
});

module.exports = router;
