const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//mongodb Balance model
const Balance = require('../models/balance/balance');

// Middleware to parse JSON bodies
router.use(express.json());

//env variables
require("dotenv").config();

// Creating Balance Record
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

        const newBalance = new Balance({
            userId: new mongoose.Types.ObjectId(userId),
            amount: parseInt(amount, 10), // Ensure amount is stored as a number
            category: category,
            createdAt: new Date()
        });

        newBalance
        .save()
        .then(result => {
            res.json({
                status: "SUCCESS",
                message: "Balance record created successfully",
                data: result
            });
        })
        .catch(error =>{
            res.json({
                status: "FAILED",
                message: "An error occurred while creating new Balance record"
            }); 
        })
    }
        
})

// Reading all Balance Records
router.get('/', (req, res) => {
    Balance.find()
        .then(balances => {
            res.json({
                status: "SUCCESS",
                data: balances
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving balance records",
            });
        });
});


// Reading a specific Balance Record by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;

    Balance.findById(id)
        .then(balance => {
            //check if balance id exists
            if (!balance) {
                return res.json({
                    status: "FAILED",
                    message: "Balance record not found"
                });
            }else {
                res.json({
                    status: "SUCCESS",
                    data: balance
                });
            } 
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving the balance record",
            });
        });
});

// Reading all balance Records for a user and within a specific period
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
    
    Balance.find(filter)
        .then(balances => {
            res.json({
                status: "SUCCESS",
                data: balances
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving balance records",
                error: error.message
            });
        });
});

// Updating an Balance Record by ID
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

    Balance.findByIdAndUpdate(id, { amount: parseInt(amount, 10), category: category, userId:new mongoose.Types.ObjectId(userId) }, { new: true })
        .then(updatedBalance => {
            if (!updatedBalance) {
                return res.json({
                    status: "FAILED",
                    message: "Balance record not found"
                });
            }
            res.json({
                status: "SUCCESS",
                message: "Balance record updated successfully",
                data: updatedBalance
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while updating the Balance record",
            });
        });
});


// Deleting an Balance Record by ID
router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;

    Balance.findByIdAndDelete(id)
        .then(deletedBalance => {
            if (!deletedBalance) {
                return res.json({
                    status: "FAILED",
                    message: "Balance record not found"
                });
            }
            res.json({
                status: "SUCCESS",
                message: "Balance record deleted successfully",
                data: deletedBalance
            });
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while deleting the Balance record",
                error: error.message
            });
        });
});

module.exports = router;


