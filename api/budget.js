const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// MongoDB Budget model
const Budget = require('../models/budget');

// Middleware to parse JSON bodies
router.use(express.json());

// Creating Budget Record
router.post('/create', (req, res) => {
  let { userId, category, amount, spentAmount = 0, startDate, endDate, note = null } = req.body;

  if (!userId || !category || !amount || !startDate || !endDate) {
    return res.json({
      status: "FAILED",
      message: "Empty input fields!"
    });
  } else if (isNaN(amount) || isNaN(spentAmount)) {
    return res.json({
      status: "FAILED",
      message: "Amount and spentAmount must be numbers"
    });
  } else {
    const newBudget = new Budget({
      userId: new mongoose.Types.ObjectId(userId),
      category,
      amount: parseFloat(amount), // Ensure amount is stored as a number
      spentAmount: parseFloat(spentAmount), // Ensure spentAmount is stored as a number
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      note,
      createdAt: new Date()
    });

    newBudget.save()
      .then(result => {
        res.json({
          status: "SUCCESS",
          message: "Budget record created successfully",
          data: result
        });
      })
      .catch(error => {
        res.json({
          status: "FAILED",
          message: "An error occurred while creating new Budget record",
          error: error.message
        });
      });
  }
});

// Reading user Budget records by userId
router.get('/:userId', (req, res) => {
  const userId = req.params.userId;

  Budget.find({ userId: userId })
    .then(budgets => {
      if (budgets.length > 0) {
        res.json({
          status: "SUCCESS",
          data: budgets
        });
      } else {
        res.json({
          status: "FAILED",
          message: "No budget records found for this user",
        });
      }
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "An error occurred while retrieving budget records",
        error: error.message
      });
    });
});

// Updating a Budget Record by ID
router.put('/update/:id', (req, res) => {
  const { id } = req.params;
  const { userId, category, amount, spentAmount, startDate, endDate, note, updateSpentAmountOnly = false } = req.body;

  if (updateSpentAmountOnly) {
    // Update only spentAmount
    if (isNaN(spentAmount)) {
      return res.json({
        status: "FAILED",
        message: "spentAmount must be a number"
      });
    }

    Budget.findByIdAndUpdate(id, {
      spentAmount: parseFloat(spentAmount)
    }, { new: true })
      .then(updatedBudget => {
        if (!updatedBudget) {
          return res.json({
            status: "FAILED",
            message: "Budget record not found"
          });
        }
        res.json({
          status: "SUCCESS",
          message: "Budget spent amount updated successfully",
          data: updatedBudget
        });
      })
      .catch(error => {
        res.json({
          status: "FAILED",
          message: "An error occurred while updating the Budget record",
          error: error.message
        });
      });
  } else {
    // Update all fields
    if (!userId || !category || !amount || !startDate || !endDate) {
      return res.json({
        status: "FAILED",
        message: "Empty input fields!"
      });
    } else if (isNaN(amount) || isNaN(spentAmount)) {
      return res.json({
        status: "FAILED",
        message: "Amount and spentAmount must be numbers"
      });
    }

    Budget.findByIdAndUpdate(id, {
      userId: new mongoose.Types.ObjectId(userId),
      category,
      amount: parseFloat(amount),
      spentAmount: parseFloat(spentAmount),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      note
    }, { new: true })
      .then(updatedBudget => {
        if (!updatedBudget) {
          return res.json({
            status: "FAILED",
            message: "Budget record not found"
          });
        }
        res.json({
          status: "SUCCESS",
          message: "Budget record updated successfully",
          data: updatedBudget
        });
      })
      .catch(error => {
        res.json({
          status: "FAILED",
          message: "An error occurred while updating the Budget record",
          error: error.message
        });
      });
  }
});

// Deleting a Budget Record by ID
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;

  Budget.findByIdAndDelete(id)
    .then(deletedBudget => {
      if (!deletedBudget) {
        return res.json({
          status: "FAILED",
          message: "Budget record not found"
        });
      }
      res.json({
        status: "SUCCESS",
        message: "Budget record deleted successfully",
        data: deletedBudget
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "An error occurred while deleting the Budget record",
        error: error.message
      });
    });
});

module.exports = router;
