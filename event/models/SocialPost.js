var mongoose = require('mongoose');

var socialPostSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'clubs' },
    postType: String,
    mediaUrl: String,
    caption: String,
    date_created: {
        type: Date,
        default: Date.now
    },
    likesAmount: {
        type: Number,
        default: 0
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'social_comments' }]
});

var SocialPost = module.exports = mongoose.model("social_posts", socialPostSchema);