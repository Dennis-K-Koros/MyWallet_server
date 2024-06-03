const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserVerficationSchema = new Schema({
    userId: String,
    uniqueString: String,
    createdAt: Date,
    expiresAt: Date,
    
});

const UserVerification = mongoose.model('UserVerification', UserVerficationSchema);

module.exports = UserVerification;