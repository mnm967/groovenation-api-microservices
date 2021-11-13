var mongoose = require('mongoose');

var conversationSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    secondUser: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    didUserMute: {
        type: Boolean,
        default: false
    },
    didSecondUserMute: {
        type: Boolean,
        default: false
    },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var Conversation = module.exports = mongoose.model("conversations", conversationSchema);