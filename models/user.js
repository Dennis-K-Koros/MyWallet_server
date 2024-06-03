const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,
    email: String,
    dateOfBirth: Date,
    password: String,
    verified: Boolean
});

const User = mongoose.model('User', UserSchema);

module.exports = User;