var mongoose = require('mongoose');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');

const pointSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
});

var clubSchema = mongoose.Schema({
    name: String,
    address: String,
    phoneNumber: String,
    images: [String],
    location: {
        type: pointSchema
    },
    webLink: String,
    facebookLink: String,
    twitterLink: String,
    instagramLink: String,
    clubCity: String,
    date_created: {
        type: Date,
        default: Date.now
    },
    promotions: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club_promotions' }],
      default: []
    },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'events' }],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club_reviews' }],
    moments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'social_posts' }]
});

clubSchema.plugin(mongoose_fuzzy_searching, { fields: ['name'] });
clubSchema.index({ 'location' : '2dsphere' }, { background: false })
clubSchema.index({name: 'text'});

var Club = module.exports = mongoose.model("clubs", clubSchema);