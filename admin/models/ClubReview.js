var mongoose = require('mongoose');

var clubReviewSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'clubs' },
    rating: Number,
    review: String,
    date_created: {
        type: Date,
        default: Date.now
    },
});

var ClubReview = module.exports = mongoose.model("club_reviews", clubReviewSchema);