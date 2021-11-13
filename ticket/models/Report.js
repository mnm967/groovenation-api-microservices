var mongoose = require('mongoose');

var reportSchema = mongoose.Schema({
    report_type: String,
    report_comment: String,
    report_post: { type: mongoose.Schema.Types.ObjectId, ref: 'social_posts' },
    report_user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    date_created: {
        type: Date,
        default: Date.now
    },
});

var Report = module.exports = mongoose.model("reports", reportSchema);