var mongoose = require('mongoose');

var citySchema = mongoose.Schema({
    name: String,
    image_url: String,
    default_lat: Number,
    default_lon: Number,
    date_created: {
        type: Date,
        default: Date.now
    },
});

var City = module.exports = mongoose.model("cities", citySchema);