var mongoose = require('mongoose');

var passwordResetSchema = mongoose.Schema({
    user_id: String,
    user_email: String,
    token: String,
    expiryDate: Date,
    date_created: {
        type: Date,
        default: Date.now
    },
});

var PasswordReset = module.exports = mongoose.model("password_resets", passwordResetSchema);