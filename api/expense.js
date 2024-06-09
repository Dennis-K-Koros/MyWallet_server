const express = require('express');
const router = express.Router();

//mongodb income model
const User = require('../models/expense/expense');

//env variables
require("dotenv").config();

// setting server url
const development = "http://localhost:5000/";
const production = "https://mywallet-server-rwwk.onrender.com/";
const currentUrl = process.env.NODE_ENV ? production : development;

// Creating Expense Record

// Reading Expense Record

// Updating Expense  Record

// Deleting Expense Record

