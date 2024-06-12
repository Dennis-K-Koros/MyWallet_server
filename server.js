// mongodb
require('./config/db');

const express = require('express');
const cors = require('cors');
const bodyParser = require('express').json;
const UserRouter = require('./api/user');
const IncomeRouter = require('./api/income');
const ExpenseRouter = require('./api/expense');
const BalanceRouter = require('./api/balance');

const app = express();
const port = process.env.PORT || 5000;

// CORS Middleware
app.use(cors());

// Body Parser Middleware
app.use(bodyParser());

// Routes
app.use('/user', UserRouter);
app.use('/income', IncomeRouter);
app.use('/expense', ExpenseRouter);
app.use('/balance', BalanceRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
