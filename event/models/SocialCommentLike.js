var mongoose = require('mongoose');

var socialCommentLikeSchema = mongoose.Schema({
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'social_comments' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var SocialCommentLike = module.exports = mongoose.model("social_comment_likes", socialCommentLikeSchema);