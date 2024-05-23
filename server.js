// mongodb
require('./config/db');

const express = require('express');
const cors = require('cors');
const bodyParser = require('express').json;
const UserRouter = require('./api/user');

const app = express();
const port = process.env.PORT || 3000;

// CORS Middleware
app.use(cors());

// Body Parser Middleware
app.use(bodyParser());

// Routes
app.use('/user', UserRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
