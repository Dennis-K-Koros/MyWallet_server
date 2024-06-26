const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//mongodb expense model
const Expense = require('../models/expense/expense');
const Balance = require('../models/balance/balance');

// Middleware to parse JSON bodies
router.use(express.json());

//env variables
require("dotenv").config();

// Creating Expense Record
router.post('/create', async (req, res) => {
    let { amount, category, userId } = req.body;
    amount = amount.trim();
    category = category.trim();

    if (amount == "" || !userId) {
        return res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else if (!/^\d+$/.test(amount)) {
        return res.json({
            status: "FAILED",
            message: "Only numbers are accepted"
        });
    }

    try {
        const newExpense = new Expense({
            userId: new mongoose.Types.ObjectId(userId),
            amount: parseInt(amount, 10),
            category: category,
            createdAt: new Date()
        });

        const savedExpense = await newExpense.save();

        // Update user's balance
        await updateBalance(userId, -parseInt(amount, 10));

        res.json({
            status: "SUCCESS",
            message: "Expense record created successfully",
            data: savedExpense
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while creating new Expense record"
        });
    }
});

// Helper function to update balance
async function updateBalance(userId, amount) {
    try {
        const balance = await Balance.findOne({ userId: userId });

        if (balance) {
            balance.balance += amount;
            await balance.save();
        } else {
            // If balance record doesn't exist, create a new one
            const newBalance = new Balance({
                userId: userId,
                balance: amount,
                createdAt: new Date()
            });
            await newBalance.save();
        }
    } catch (error) {
        throw new Error("Error updating balance: " + error.message);
    }
}

// Reading all Expense Records
router.get('/', (req, res) => {
    Expense.find()
        .then(expenses => {
            res.json({
                status: "SUCCESS",
                data: expenses
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving expense records",
            });
        });
});


// Reading a specific Expense Record by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;

    Expense.findById(id)
        .then(expense => {
            //check if expense id exists
            if (!expense) {
                return res.json({
                    status: "FAILED",
                    message: "Expense record not found"
                });
            }else {
                res.json({
                    status: "SUCCESS",
                    data: expense
                });
            } 
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving the expense record",
            });
        });
});

// Reading all expense Records for a user and within a specific period
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
    
    Expense.find(filter)
        .then(expenses => {
            res.json({
                status: "SUCCESS",
                data: expenses
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving expense records",
                error: error.message
            });
        });
});

// Route to get expense records for a specific period (day, week, month, year)
router.get('/period/:period', async (req, res) => {
    const { userId } = req.query;
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

    switch (period) {
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

    try {
        const expenses = await Expense.find(filter);
        res.json({
            status: "SUCCESS",
            data: expenses
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving expense records",
            error: error.message
        });
    }
});


// Updating an Expense Record by ID
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, category, amount } = req.body;

    if (!amount || !category || !userId) {
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

    try {
        const expense = await Expense.findById(id);
        if (!expense) {
            return res.json({
                status: "FAILED",
                message: "Expense record not found"
            });
        }

        const oldAmount = expense.amount;
        const difference = parseInt(amount, 10) - oldAmount;

        // Update the expense record
        const updatedExpense = await Expense.findByIdAndUpdate(id, {
            amount: parseInt(amount, 10),
            category: category,
            userId: new mongoose.Types.ObjectId(userId)
        }, { new: true });

        // Update user's balance
        await updateBalance(userId, -difference);

        res.json({
            status: "SUCCESS",
            message: "Expense record updated successfully",
            data: updatedExpense
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while updating the expense record"
        });
    }
});



// Deleting an Expense Record by ID
router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;

    Expense.findByIdAndDelete(id)
        .then(deletedExpense => {
            if (!deletedExpense) {
                return res.json({
                    status: "FAILED",
                    message: "Expense record not found"
                });
            }
            res.json({
                status: "SUCCESS",
                message: "Expense record deleted successfully",
                data: deletedExpense
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while deleting the Expense record",
                error: error.message
            });
        });
});

module.exports = router;


