var mongoose = require('mongoose');

var socialPostLikeSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    date_created: {
        type: Date,
        default: Date.now
    },
    socialPost: { type: mongoose.Schema.Types.ObjectId, ref: 'social_posts' },
});

var SocialPostLike = module.exports = mongoose.model("social_post_likes", socialPostLikeSchema);