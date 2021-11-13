var mongoose = require('mongoose');

var socialCommentSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    comment: String,
    socialPost: { type: mongoose.Schema.Types.ObjectId, ref: 'social_posts' },
    likesAmount: {
        type: Number,
        default: 0
    },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var SocialComment = module.exports = mongoose.model("social_comments", socialCommentSchema);