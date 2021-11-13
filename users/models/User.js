var mongoose = require('mongoose'),
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

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

userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);
            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});
     
userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

userSchema.plugin(mongoose_fuzzy_searching, { fields: ['username'] });
var User = module.exports = mongoose.model("users", userSchema);