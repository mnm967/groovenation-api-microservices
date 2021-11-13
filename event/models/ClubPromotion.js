var mongoose = require('mongoose');

var promotionSchema = mongoose.Schema({
    title: String,
    description: String,
    imageUrl: String,
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'clubs' },
    startDate: Date,
    endDate: Date,
    is_available: {
        type: Boolean,
        default: true
    },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var ClubPromotion = module.exports = mongoose.model("club_promotions", promotionSchema);