const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//mongodb income model
const Income = require('../models/income/income');

// Middleware to parse JSON bodies
router.use(express.json());

//env variables
require("dotenv").config();

// Creating Income Record
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

        const newIncome = new Income({
            userId: new mongoose.Types.ObjectId(userId),
            amount: parseInt(amount, 10), // Ensure amount is stored as a number
            category: category,
            createdAt: new Date()
        });

        newIncome
        .save()
        .then(result => {
            res.json({
                status: "SUCCESS",
                message: "Income record created successfully",
                data: result
            });
        })
        .catch(error =>{
            res.json({
                status: "FAILED",
                message: "An error occurred while creating new Income record"
            }); 
        })
    }
        
})

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

// Updating an Income Record by ID
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

    Income.findByIdAndUpdate(id, { amount: parseInt(amount, 10), category: category, userId:new mongoose.Types.ObjectId(userId) }, { new: true })
        .then(updatedIncome => {
            if (!updatedIncome) {
                return res.json({
                    status: "FAILED",
                    message: "Income record not found"
                });
            }
            res.json({
                status: "SUCCESS",
                message: "Income record updated successfully",
                data: updatedIncome
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while updating the income record",
            });
        });
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


