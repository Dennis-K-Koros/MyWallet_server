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
   let {amount, userId} = req.body;
   amount = amount.trim();
   
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

// Reading user Balance records by userId
router.get('/:userId', (req, res) => {
    const userId = req.params.userId;

    Balance.findOne({ userId: userId })
        .then(balance => {
            if (balance) {
                res.json({
                    status: "SUCCESS",
                    data: balance
                });
            } else {
                res.json({
                    status: "FAILED",
                    message: "No balance record found for this user",
                });
            }
        })
        .catch(error => {
            res.json({
                status: "FAILED",
                message: "An error occurred while retrieving balance records",
            });
        });
});


// Updating an Balance Record by ID
router.put('/update/:id', (req, res) => {
    const { id } = req.params;
    const { userId, amount } = req.body;

    if (!amount || !userId) {
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

    Balance.findByIdAndUpdate(id, { amount: parseInt(amount, 10), userId:new mongoose.Types.ObjectId(userId) }, { new: true })
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


