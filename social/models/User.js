var mongoose = require('mongoose');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');

var userSchema = mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    email: String,
    password: String, //Encrypted
    profilePicUrl: {
        type: String,
        default: "https://groovenation-test.herokuapp.com/social/profile/image/tjir48u4689i4rmfkr724259.jpg"
    },
    coverPicUrl: {
        type: String,
        default: "https://groovenation-test.herokuapp.com/social/profile/cover/tjir48u4689i4rmfkr724259.jpg"
    },
    userCity: String,
    googleToken: String,
    facebookToken: String,
    fcm_token: String,
    dateOfBirth: Date,
    favourite_events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'events' }],
    favourite_clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'clubs' }],
    date_created: {
        type: Date,
        default: Date.now
    },
});

userSchema.plugin(mongoose_fuzzy_searching, { fields: ['username'] });
var User = module.exports = mongoose.model("users", userSchema);