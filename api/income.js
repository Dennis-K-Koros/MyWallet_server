const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//mongodb income model
const Income = require('../models/income/income');
const Balance = require('../models/balance/balance');

// Middleware to parse JSON bodies
router.use(express.json());

//env variables
require("dotenv").config();

// Creating Income Record
router.post('/create', async (req, res) => {
    let { amount, category, userId, note } = req.body;
    amount = amount.trim();
    category = category.trim();
    note = note.trim();

    if (amount == "" || !userId || category == "") {
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
        const newIncome = new Income({
            userId: new mongoose.Types.ObjectId(userId),
            amount: parseInt(amount, 10),
            category: category,
            note: note,
            createdAt: new Date()
        });

        const savedIncome = await newIncome.save();

        // Update user's balance
        await updateBalance(userId, parseInt(amount, 10));

        res.json({
            status: "SUCCESS",
            message: "Income record created successfully",
            data: savedIncome
        });
    } catch (error) {
        console.error("Error creating new Income record:", error); // Log the actual error
        res.json({
            status: "FAILED",
            message: "An error occurred while creating new Income record",
            error: error.message // Provide the actual error message for more context
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

// Reading all Income Records
router.get('/', (req, res) => {
    Income.find()
        .then(incomes => {
            res.json({
                status: "SUCCESS",
                data: incomes
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving income records",
            });
        });
});


// Reading a specific Income Record by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;

    Income.findById(id)
        .then(income => {
            //check if income id exists
            if (!income) {
                return res.json({
                    status: "FAILED",
                    message: "Income record not found"
                });
            }else {
                res.json({
                    status: "SUCCESS",
                    data: income
                });
            } 
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving the income record",
            });
        });
});

// Reading all Income Records for a user and within a specific period
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
    
    Income.find(filter)
        .then(incomes => {
            res.json({
                status: "SUCCESS",
                data: incomes
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving income records",
                error: error.message
            });
        });
});

// Route to get income records for a specific period (day, week, month, year)
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

    try {
        const incomes = await Income.find(filter);
        const totalAmount = incomes.reduce((sum, income) => sum + income.amount, 0); // Assuming each income record has an 'amount' field
        res.json({
            status: "SUCCESS",
            data: incomes,
            totalAmount
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving income records",
            error: error.message
        });
    }
});


// Updating an Income Record by ID
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, category, amount, note } = req.body;

    if (!amount || !category || !userId ) {
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
        const income = await Income.findById(id);
        if (!income) {
            return res.json({
                status: "FAILED",
                message: "Income record not found"
            });
        }

        const oldAmount = income.amount;
        const difference = parseInt(amount, 10) - oldAmount;

        // Update the income record
        const updatedIncome = await Income.findByIdAndUpdate(id, {
            amount: parseInt(amount, 10),
            category: category,
            userId: new mongoose.Types.ObjectId(userId)
        }, { new: true });

        // Update user's balance
        await updateBalance(userId, difference);

        res.json({
            status: "SUCCESS",
            message: "Income record updated successfully",
            data: updatedIncome
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while updating the income record"
        });
    }
});


// Deleting an Income Record by ID
router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;

    Income.findByIdAndDelete(id)
        .then(deletedIncome => {
            if (!deletedIncome) {
                return res.json({
                    status: "FAILED",
                    message: "Income record not found"
                });
            }
            res.json({
                status: "SUCCESS",
                message: "Income record deleted successfully",
                data: deletedIncome
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while deleting the income record",
                error: error.message
            });
        });
});

module.exports = router;


