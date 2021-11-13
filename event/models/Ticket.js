var mongoose = require('mongoose');

var ticketSchema = mongoose.Schema({
    userID: String,
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'events' },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'clubs' },
    ticketType: String,
    noOfPeople: Number,
    totalCost: Number,
    qrTag: String,
    isScanned: {
        type: Boolean,
        default: false
    },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var Ticket = module.exports = mongoose.model("tickets", ticketSchema);