var mongoose = require('mongoose');

var socialFollowerSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    social_followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
    date_created: {
        type: Date,
        default: Date.now
    },
});

var SocialFollower = module.exports = mongoose.model("social_followers", socialFollowerSchema);