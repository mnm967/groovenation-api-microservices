var mongoose = require('mongoose');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');

var ticketTypeSchema = new mongoose.Schema({
    ticketType: String,
    ticketPrice: Number,
    numTicketsAvailable: Number
});

var eventSchema = mongoose.Schema({
    title: String,
    description: String,
    imageUrl: String,
    clubID: String,
    startDate: Date,
    endDate: Date,
    webLink: String,
    facebookLink: String,
    twitterLink: String,
    instagramLink: String,
    ticket_types: [ticketTypeSchema],
    isAdultOnly: {
        type: Boolean,
        default: true
    },
    date_created: {
        type: Date,
        default: Date.now
    },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'clubs' }
});

eventSchema.plugin(mongoose_fuzzy_searching, { fields: ['title', 'description'] });
var Event = module.exports = mongoose.model("events", eventSchema);