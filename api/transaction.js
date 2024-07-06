const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// MongoDB models
const Transaction = require('../models/transaction');
const Balance = require('../models/balance');
const Budget = require('../models/budget');

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

// Helper function to update spentAmount in Budget records
async function updateBudgetSpentAmount(userId, category, amount) {
    try {
        const budgets = await Budget.find({
            userId: new mongoose.Types.ObjectId(userId),
            endDate: { $gte: new Date() }, // Check if the budget period is still valid
            $or: [{ category: category }, { category: 'all' }] // Match category or "all"
        });

        if (budgets.length > 0) {
            for (const budget of budgets) {
                budget.spentAmount += amount;
                await budget.save();
            }
        }
    } catch (error) {
        throw new Error("Error updating budget spentAmount: " + error.message);
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

        // Update budget spentAmount if transaction is an expense
        if (type.toLowerCase() === 'expense') {
            await updateBudgetSpentAmount(userId, category, parseInt(amount, 10));
        }

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

//updating a specific transaction record
router.post('/updateTransaction', (req, res) => {
    let { _id, amount, category, paymentMethod, date, note, type } = req.body;
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

    if (amount == "" || !_id || category == "" || paymentMethod == "" || date == "" || type == "") {
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
    
    } else {
        Transaction.findOneAndUpdate({ _id: _id }, { amount, category, paymentMethod, date, note, type }, { new: true })
            .then(updatedTransaction => {
                res.json({
                    status: "SUCCESS",
                    message: "Transaction updated successfully",
                    data: updatedTransaction
                });
            })
            .catch(err => {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while updating Transaction"
                });
            });
    }
});

// Deleting a specific transaction record 
router.delete('/delete/:_id', (req, res) => {
    const { _id } = req.params;

    Transaction.findByIdAndDelete(_id)
      .then(deletedTransaction => {
        if (!deletedTransaction) {
          return res.json({
            status: "FAILED",
            message: "Transaction record not found"
          });
        }
        res.json({
          status: "SUCCESS",
          message: "Transaction record deleted successfully",
          data: deletedTransaction
        });
      })
      .catch(error => {
        res.json({
          status: "FAILED",
          message: "An error occurred while deleting the transaction record",
          error: error.message
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

// Helper function to convert month names to month numbers
const getMonthNumber = (month) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
    return monthIndex >= 0 ? monthIndex : null;
};

// Route to get total amounts within a specific period (day, week, month, year)
router.get('/period/:period', async (req, res) => {
    const { userId, month, year, type = 'all' } = req.query; // Default to 'all' if type is not specified
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

    if (['month', 'year'].includes(period.toLowerCase()) && (!month || !year)) {
        return res.json({
            status: "FAILED",
            message: "Month and year are required for the specified period"
        });
    }

    let monthNum = month;
    if (month && isNaN(month)) {
        const monthNumber = getMonthNumber(month);
        if (monthNumber === null) {
            return res.json({
                status: "FAILED",
                message: "Invalid month specified"
            });
        }
        monthNum = monthNumber + 1; // Convert to 1-based month number
    }

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
            startDate = new Date(year, monthNum - 1, 1);
            endDate = new Date(year, monthNum, 0); // Last day of the specified month
            break;
        case 'year':
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
            break;
        default:
            return res.json({
                status: "FAILED",
                message: "Invalid period specified"
            });
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.json({
            status: "FAILED",
            message: "Invalid date parameters"
        });
    }

    filter.date = { $gte: startDate, $lte: endDate };

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
    const { userId, month, year, type = 'all' } = req.query; // Default to 'all' if type is not specified
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

    if (['month', 'year'].includes(period.toLowerCase()) && (!month || !year)) {
        return res.json({
            status: "FAILED",
            message: "Month and year are required for the specified period"
        });
    }

    let monthNum = month;
    if (month && isNaN(month)) {
        const monthNumber = getMonthNumber(month);
        if (monthNumber === null) {
            return res.json({
                status: "FAILED",
                message: "Invalid month specified"
            });
        }
        monthNum = monthNumber + 1; // Convert to 1-based month number
    }

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
            startDate = new Date(year, monthNum - 1, 1);
            endDate = new Date(year, monthNum, 0); // Last day of the specified month
            break;
        case 'year':
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
            break;
        default:
            return res.json({
                status: "FAILED",
                message: "Invalid period specified"
            });
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.json({
            status: "FAILED",
            message: "Invalid date parameters"
        });
    }

    filter.date = { $gte: startDate, $lte: endDate };

    if (type.toLowerCase() !== 'all') {
        filter.type = type.toLowerCase();
    }

    try {
        const transactions = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$category",
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        res.json({
            status: "SUCCESS",
            data: transactions
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving transaction records",
            error: error.message
        });
    }
});

// Route to get total amounts per day for a month
router.get('/totals-by-day/:userId/:month/:year/:type', async (req, res) => {
    const { userId, month, year, type = 'all' } = req.params;

    // Check if required parameters are provided
    if (!userId || !month || !year) {
        return res.json({
            status: "FAILED",
            message: "UserID, month, and year are required"
        });
    }

    // Initialize the filter object
    const filter = {
        userId: new mongoose.Types.ObjectId(userId),
    };

    // Convert month name to month number
    const monthNumber = getMonthNumber(month);
    if (monthNumber === null) {
        return res.json({
            status: "FAILED",
            message: "Invalid month specified"
        });
    }

    // Calculate start and end dates for the specified month
    const startDate = new Date(year, monthNumber - 1, 1); // Start of the month
    const endDate = new Date(year, monthNumber, 0); // End of the month (last day)

    // Apply date range to the filter
    filter.date = { $gte: startDate, $lte: endDate };

    // Optionally filter by transaction type
    if (type.toLowerCase() !== 'all') {
        filter.type = type.toLowerCase();
    }

    try {
        // Aggregate transactions to calculate total amount per day
        const transactions = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { $dayOfMonth: "$date" },
                    totalAmount: { $sum: "$amount" }
                }
            },
            { $sort: { "_id": 1 } } // Optionally sort by day of the month
        ]);

        res.json({
            status: "SUCCESS",
            data: transactions
        });
    } catch (error) {
        console.error("Error retrieving transactions:", error);
        res.json({
            status: "FAILED",
            message: "An error occurred while retrieving transaction records",
            error: error.message
        });
    }
});




module.exports = router;
