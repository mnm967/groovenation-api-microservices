var mongoose = require('mongoose');

var socialBlockSchema = mongoose.Schema({
    userID: String,
    blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
    date_created: {
        type: Date,
        default: Date.now
    },
});

var SocialBlock = module.exports = mongoose.model("social_blocks", socialBlockSchema);