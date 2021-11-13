var mongoose = require('mongoose');

var chatMessageSchema = mongoose.Schema({
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'conversations' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    messageType: String,
    text: String,
    mediaUrl: String,
    didRecieverRead: {
        type: Boolean,
        default: false
    },
    socialPost: { type: mongoose.Schema.Types.ObjectId, ref: 'social_posts' },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var ChatMessage = module.exports = mongoose.model("chat_messages", chatMessageSchema);