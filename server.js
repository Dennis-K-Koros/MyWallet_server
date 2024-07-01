// mongodb
require('./config/db');

const express = require('express');
const cors = require('cors');
const bodyParser = require('express').json;
const UserRouter = require('./api/user');
const TransactionRouter = require('./api/transaction');
const BalanceRouter = require('./api/balance');
const BudgetRouter = require('./api/budget');

const app = express();
const port = process.env.PORT || 5000;

// CORS Middleware
app.use(cors());

// Body Parser Middleware
app.use(bodyParser());

// Routes
app.use('/user', UserRouter);
app.use('/transaction', TransactionRouter);
app.use('/balance', BalanceRouter);
app.use('/budget', BudgetRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
