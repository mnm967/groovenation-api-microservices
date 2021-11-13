const ConstantStrings = require('../constants/strings');
const User = require('../models/User');
const City = require('../models/City');
const jwt = require("jsonwebtoken");

function returnUser(res, user, token){    
    res.json({
        status : 1,
        result : {
            "userId" : user._id,
            "firstName" : user.firstName,
            "lastName" : user.lastName,
            "username" : user.username,
            "email" : user.email,
            "userCity" : user.userCity,
            "profilePicUrl" : user.profilePicUrl,
            "coverPicUrl" : user.coverPicUrl,
            "date_created" : user.date_created,
            "auth_token" : token,
        }
    })
}

function returnSuccessMessage(res){
    res.json({
        status : 1,
        result : "request_successful"
    })
}

function returnUnknownError(res){
    res.json({
        status: -1,
        result: 'unknown_error'
    });
}

function returnResponseCode(res, code){
    res.json({
        status: 1,
        result: code
    });
}

exports.create_user_email = function(req, res){
    User.findOne({$or: [
        {email: req.body.email},
        {username: req.body.username}
    ]}).exec(function(err, user){
        if(err) returnUnknownError(res)
        else if(user){
            if(user.email.toLowerCase() == req.body.email.toLowerCase()) returnResponseCode(res, ConstantStrings.EMAIL_EXISTS)
            else if(user.username.toLowerCase() == req.body.username.toLowerCase()) returnResponseCode(res, ConstantStrings.USERNAME_EXISTS)
        }
        else {
            var user = new User();
            user.firstName = req.body.first_name;
            user.lastName = req.body.last_name;
            user.username = req.body.username;
            user.email = req.body.email;
            user.password = req.body.password;
            var dateOfBirth = new Date();

            dateOfBirth.setTime(req.body.dateOfBirth);
            user.dateOfBirth = dateOfBirth;

            user.save((err, doc) => {
                if(err) returnUnknownError(res)
                else{
                    var tk = createJWT(doc._id);
                    returnUser(res, user, tk)
                }
            });
        }
    });
}

function createJWT(userId){
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {});
    return token;
}

exports.login_user_email = function(req, res){
    User.findOne({"email" :  req.body.email}, (err, user) => {
        if(err) returnUnknownError(res)
        else{
            user.comparePassword(req.body.password, function(err, isMatch) {
                if (err) returnUnknownError(res);
                else if(!isMatch) returnResponseCode(res, ConstantStrings.LOGIN_FAILED)
                else{
                    var tk = createJWT(user._id);
                    returnUser(res, user, tk)
                }
            });
        }
    })
}

exports.login_user_google = function(req, res){
    User.findOne({"email" :  req.body.email}, (err, user) => {
        if(err) returnUnknownError(res)
        else if(user){
            var tk = createJWT(user._id);
            returnUser(res, user, tk)
        }else{
            var user = new User();
            user.email = req.body.email;
            user.firstName = req.body.first_name;
            user.lastName = req.body.last_name;
            user.googleToken = req.body.googleId;

            user.save((err) => {
                if(err) returnUnknownError(res)
                else{
                    var tk = createJWT(user._id);
                    returnUser(res, user, tk)
                }
            });
        }
    })   
}

exports.login_user_facebook = function(req, res){
    User.findOne({"facebookToken" :  req.body.facebookId}, (err, user) => {
        if(err) returnUnknownError(res)
        else if(user){
            var tk = createJWT(user._id);
            returnUser(res, user, tk)
        }else{
            var user = new User();
            user.email = req.body.email;
            user.firstName = req.body.first_name;
            user.lastName = req.body.last_name;
            user.facebookToken = req.body.facebookId;

            user.save((err) => {
                if(err) returnUnknownError(res)
                else{
                    var tk = createJWT(user._id);
                    returnUser(res, user, tk)
                }
            });
        }
    })
}

exports.get_user_details = function(req, res){
    User.findById(req.params.userId, (err, user) => {
        if(err) returnUnknownError(res)
        else if(!user) returnResponseCode(res, ConstantStrings.USER_NOT_FOUND)
        else returnUser(res, user)
    })
}

exports.update_user_details = function(req, res){
    User.findById(req.params.userId, (err, user) => {
        if(err) returnUnknownError(res)
        else if(!user) returnResponseCode(res, ConstantStrings.USER_NOT_FOUND)
        else {
            user.firstName = req.body.first_name ? req.body.first_name : user.firstName;
            user.lastName = req.body.last_name ? req.body.last_name : user.lastName;
            user.username = req.body.username ? req.body.username : user.username;
            user.email = req.body.email ? req.body.email : user.email;
            user.save((err) => {
                if(err) returnUnknownError(res)
                else returnSuccessMessage(res)
            });
        }
    })
}

exports.save_fcm_token = async function(req, res){
    User.updateOne({_id: req.body.userId}, {fcm_token: req.body.token}, (err) => {
        if(err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })
}

exports.create_username = async function(req, res){
    var userId = req.body.userId;
    var username = req.body.username;

    var usernameExists = await User.exists({username: username});
    if(usernameExists) returnResponseCode(res, ConstantStrings.USERNAME_EXISTS)
    else{
        User.updateOne({_id: userId}, {username: username}, (err, doc) => {
            if(err) returnUnknownError(res)
            else returnResponseCode(res, true)
        })
    }
}

exports.check_username_exists = function(req, res){
    User.findOne({"username" : req.body.username}, (err, user) => {
        if(err) returnUnknownError(res)
        else if(!user) {
            res.json({
                status: 1,
                username_exists: false
            });
        }
        else {
            res.json({
                status: 1,
                username_exists: true
            });
        }
    })
}

exports.add_city = async function (req, res) {
    var name = req.body.name;
    var image_url = req.body.image_url;
    var default_lat = req.body.default_lat;
    var default_lon = req.body.default_lon;

    var city = new City()
    city.name = name;
    city.image_url = image_url;
    city.default_lat = default_lat;
    city.default_lon = default_lon;

    city.save((err, doc) => {
        if (err) returnUnknownError(res);
        else returnSuccessMessage(res);
    })
}

exports.get_available_cities = async function (req, res) {
    City.find().exec((err, cities) => {
        if (err) returnUnknownError(res)
        else{
            var citiesList = []

            cities.forEach(city => {
                var CITY = {
                    "id" : city._id,
                    "name": city.name,
                    "image_url": city.image_url,
                    "default_lat": city.default_lat,
                    "default_lon": city.default_lon,
                }
                citiesList.push(CITY)
            });

            res.json({
                status: 1,
                cities: citiesList
            });
        }
    })
}