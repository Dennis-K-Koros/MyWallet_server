const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//mongodb expense model
const Expense = require('../models/expense/expense');

// Middleware to parse JSON bodies
router.use(express.json());

//env variables
require("dotenv").config();

// Creating Expense Record
router.post('/create',(req,res)=>{
   let {amount, category, userId} = req.body;
   amount = amount.trim();
   category = category.trim();
   
   if(amount == "" || !userId){
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    }else if(!/^\d+$/.test(amount)){
        res.json({
            status: "FAILED",
            message: "Only numbers are accepted"
        });
    }else{

        const newExpense = new Expense({
            userId: new mongoose.Types.ObjectId(userId),
            amount: parseInt(amount, 10), // Ensure amount is stored as a number
            category: category,
            createdAt: new Date()
        });

        newExpense
        .save()
        .then(result => {
            res.json({
                status: "SUCCESS",
                message: "expense record created successfully",
                data: result
            });
        })
        .catch(error =>{
            res.json({
                status: "FAILED",
                message: "An error occurred while creating new Expense record"
            }); 
        })
    }
        
})

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

// Updating an Expense Record by ID
router.put('/update/:id', (req, res) => {
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

    Expense.findByIdAndUpdate(id, { amount: parseInt(amount, 10), category: category, userId:new mongoose.Types.ObjectId(userId) }, { new: true })
        .then(updatedExpense => {
            if (!updatedExpense) {
                return res.json({
                    status: "FAILED",
                    message: "Expense record not found"
                });
            }
            res.json({
                status: "SUCCESS",
                message: "Expense record updated successfully",
                data: updatedExpense
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while updating the Expense record",
            });
        });
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


