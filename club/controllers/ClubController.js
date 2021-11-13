const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const ClubReview = require('../models/ClubReview');
const ClubPromotion = require('../models/ClubPromotion');
const SocialComment = require('../models/SocialComment');
const SocialPost = require('../models/SocialPost');
const SocialPostLike = require('../models/SocialPostLike');
const SocialCommentLike = require('../models/SocialCommentLike');
const SocialBlock = require('../models/SocialBlock');
const SocialFollower = require('../models/SocialFollower');
const { Types } = require('mongoose');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');

const CLUBS_PER_PAGE = 25;
const CLUB_REVIEWS_PER_PAGE = 25;

function returnUnknownError(res) {
    res.json({
        status: -1,
        message: 'unknown_error'
    });
}

function returnSuccessMessage(res) {
    res.json({
        status: 1,
        result: true
    })
}

function returnFavouriteSuccessMessage(res) {
    res.json({
        status: 1,
        result: true
    })
}

function getEventList(events) {
    var eventList = []
    events.forEach(event => {
        var EVENT = {
            "eventID": event._id,
            "title": event.title,
            "description": event.description,
            "imageUrl": event.imageUrl,
            "clubID": event.clubID,
            "clubName": event.club.name,
            "clubLat": event.club.location.coordinates[1],
            "clubLon": event.club.location.coordinates[0],
            "eventStartDate": event.startDate.toISOString(),
            "eventEndDate": event.endDate.toISOString(),
            "isAdultOnly": event.isAdultOnly,
            "webLink": event.webLink,
            "facebookLink": event.facebookLink,
            "twitterLink": event.twitterLink,
            "instagramLink": event.instagramLink,
        }
        eventList.push(EVENT)
    })

    return eventList
}

async function getMomentsList(moments, userId) {
    if (moments.length == 0) {
        return []
    }

    var momentsList = []
    for (const moment of moments) {
        var userLiked = await SocialPostLike.exists({ socialPost: Types.ObjectId(post._id), user: Types.ObjectId(userId) })

        var MOMENT = {
            "postID": moment._id,
            "person": await getSocialPerson(moment.user, userId),
            "clubID": moment.club ? moments.club._id : null,
            "clubName": moment.club ? moments.club.name : null,
            "likesAmount": await SocialPostLike.countDocuments({ socialPost: Types.ObjectId(post._id) }),
            "caption": moment.caption,
            "hasUserLiked": userLiked,
            "mediaURL": moment.mediaUrl,
        }
        momentsList.push(MOMENT)
    }

    return momentsList
}

async function returnClubs(res, clubs, hasReachedMax, userId) {
    if (clubs.length == 0) {
        res.json({
            status: 1,
            has_reached_max: hasReachedMax,
            clubs: []
        })
        return;
    }

    var clubList = []

    for (const club of clubs) {
        var clubRatingObj = await ClubReview.aggregate([
            {
                $match: {
                    club: club._id,
                }
            },
            {

                $group: {
                    _id: club._id,
                    average: { $avg: '$rating' }
                }
            }
        ]).exec()

        var clubRating = clubRatingObj[0] ? clubRatingObj[0].average : 0;
        var userReview = await ClubReview.findOne({ club: Types.ObjectId(club._id), user: Types.ObjectId(userId) }).exec();

        var totalReviews = await ClubReview.countDocuments();

        var USER_REVIEW = null;

        if (userReview) USER_REVIEW = {
            "person": null,
            "rating": userReview.rating,
            "review": userReview.review,
        };

        var CLUB_PROMOTIONS_LIST = await getClubPromotionsList(club.promotions)
        var CLUB_EVENTS_LIST = await getEventList(club.events)
        var CLUB_MOMENTS_LIST = await getMomentsList(club.moments, userId)
        var CLUB_REVIEWS_LIST = await getClubReviewsList(club.reviews, userId)

        var CLUB = {
            "clubID": club._id,
            "name": club.name,
            "averageRating": clubRating,
            "address": club.address,
            "phoneNumber": club.phoneNumber,
            "clubPromotions": CLUB_PROMOTIONS_LIST,
            "upcomingEvents": CLUB_EVENTS_LIST,
            "images": club.images,
            "moments": CLUB_MOMENTS_LIST,
            "reviews": CLUB_REVIEWS_LIST ? CLUB_REVIEWS_LIST : null,
            "userReview": USER_REVIEW,
            "totalReviews": totalReviews,
            "latitude": club.location.latitude,
            "longitude": club.location.longitude,
            "webLink": club.webLink,
            "facebookLink": club.facebookLink,
            "twitterLink": club.twitterLink,
            "instagramLink": club.instagramLink,
        }

        clubList.push(CLUB)
    }

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        clubs: clubList
    })
}

async function returnClub(res, club, userId) {
    var clubRatingObj = await ClubReview.aggregate([
        {
            $match: {
                club: club._id,
            }
        },
        {
            $group: {
                _id: club._id,
                average: { $avg: '$rating' }
            }
        }
    ]).exec()

    var clubRating = clubRatingObj[0] ? clubRatingObj[0].average : 0;
    var userReview = await ClubReview.findOne({ club: Types.ObjectId(club._id), user: Types.ObjectId(userId) }).exec();

    var totalReviews = await ClubReview.countDocuments();

    var USER_REVIEW = null;

    if (userReview) USER_REVIEW = {
        "person": null,
        "rating": userReview.rating,
        "review": userReview.review,
    };

    var CLUB_PROMOTIONS_LIST = await getClubPromotionsList(club.promotions)
    var CLUB_EVENTS_LIST = getEventList(club.events)
    var CLUB_MOMENTS_LIST = await getMomentsList(club.moments, userId)
    var CLUB_REVIEWS_LIST = await getClubReviewsList(club.reviews, userId)

    var CLUB = {
        "clubID": club._id,
        "name": club.name,
        "averageRating": clubRating,
        "address": club.address,
        "phoneNumber": club.phoneNumber,
        "clubPromotions": CLUB_PROMOTIONS_LIST,
        "upcomingEvents": CLUB_EVENTS_LIST,
        "images": club.images,
        "moments": CLUB_MOMENTS_LIST,
        "reviews": CLUB_REVIEWS_LIST,
        "userReview": USER_REVIEW,
        "totalReviews": totalReviews,
        "latitude": club.location.latitude,
        "longitude": club.location.longitude,
        "webLink": club.webLink,
        "facebookLink": club.facebookLink,
        "twitterLink": club.twitterLink,
        "instagramLink": club.instagramLink,
    }

    res.json({
        status: 1,
        club: CLUB
    })
}

async function getSocialPerson(user, userId) {
    var hasUserBlocked = await SocialBlock.exists({ userID: userId, blocked_users: user._id })
    var personBlockedUser = await SocialBlock.exists({ userID: user._id, blocked_users: Types.ObjectId(userId) })
    var isUserFollowing = await SocialFollower.exists({ userId: userId, following_users: user._id })

    var SOCIAL_PERSON = {
        "personID": user._id,
        "personUsername": user.username,
        "personProfilePicURL": user.profilePicUrl,
        "personCoverPicURL": user.coverPicUrl,
        "isUserFollowing": isUserFollowing,
        "hasUserBlocked": hasUserBlocked,
        "personBlockedUser": personBlockedUser,
    }

    return SOCIAL_PERSON;
}

async function getClubPromotionsList(promotions) {
    if (promotions == undefined || promotions.length == 0) return [];

    var promotionsList = [];
    for (const promotion of promotions) {
        var PROMOTION = {
            "promotionID": promotion._id,
            "title": promotion.title,
            "description": promotion.description,
            "imageUrl": promotion.imageUrl,
            "clubID": promotion.club,
            "promotionStartDate": promotion.startDate.toISOString(),
            "promotionEndDate": promotion.endDate.toISOString(),
        }

        promotionsList.push(PROMOTION)
    }

    return promotionsList;
}

async function getClubReviewsList(clubReviews, userId) {
    if (clubReviews.length == 0) return [];

    var reviewList = [];
    for (const review of clubReviews) {
        var CLUB_REVIEW = {
            "person": await getSocialPerson(review.user, userId),
            "rating": review.rating,
            "review": review.review,
        }

        reviewList.push(CLUB_REVIEW)
    }

    return reviewList;
}

async function returnClubReviews(res, clubReviews, hasReachedMax, userId) {
    if (clubReviews.length == 0) {
        res.json({
            status: 1,
            has_reached_max: hasReachedMax,
            club_reviews: []
        })
        return;
    }

    var reviewList = [];
    for (const review of clubReviews) {
        var CLUB_REVIEW = {
            "person": await getSocialPerson(review.user, userId),
            "rating": review.rating,
            "review": review.review,
        }

        reviewList.push(CLUB_REVIEW)
    }

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        club_reviews: reviewList
    })
}

exports.get_club = async function (req, res) {
    var clubId = req.params.club_id;
    var userId = req.params.user_id;

    Club.findById(clubId)
        .populate({
            path: 'promotions',
            model: 'club_promotions',
            options: {
                sort: '-date_created'
            },
            match: {
                is_available: true
            },
        })
        .populate({
            path: 'events',
            options: {
                limit: 5,
                sort: '-startDate'
            },
            match: { startDate: { $gte: new Date() } },
            populate: {
                path: 'club',
                model: 'clubs',
                select: ["name", "location"]
            }
        })
        .populate({
            path: 'moments',
            options: {
                limit: 5,
            },
            populate: {
                path: 'comments',
                model: 'social_comments',
                options: {
                    sort: '-date_created'
                }
            },
            populate: {
                path: 'user',
                model: 'users'
            },
            populate: {
                path: 'club',
                model: 'clubs',
                select: ['_id', 'name']
            },
        })
        .populate({
            path: 'reviews',
            options: {
                limit: 5,
                sort: '-date_created'
            },
            match: {
                user: { $ne: Types.ObjectId(userId) }
            },
            populate: {
                path: 'user',
                model: 'users'
            },
        })
        .exec((err, club) => {
            if (err) returnUnknownError(res)
            else {
                returnClub(res, club, userId)
            }
        })
}

exports.get_user_favourite_clubs = async function (req, res) {
    var userId = req.params.user_id;
    var userCity = req.params.user_city;

    User.findById(userId)
        .populate({
            path: 'favourite_clubs',
            match: { clubCity: userCity },
            populate: [{
                path: 'events',
                model: 'events',
                options: {
                    limit: 5,
                    sort: '-startDate'
                },
                match: { startDate: { $gte: new Date() } },
                populate: {
                    path: 'club',
                    model: 'clubs',
                    select: ["name", "location"]
                }
            },
            {
                path: 'moments',
                model: 'social_posts',
                options: {
                    limit: 5,
                },
                populate: {
                    path: 'comments',
                    model: 'social_comments',
                    options: {
                        sort: '-date_created'
                    }
                },
                populate: {
                    path: 'user',
                    model: 'users'
                },
                populate: {
                    path: 'club',
                    model: 'clubs',
                    select: ['_id', 'name']
                },
            },
            {
                path: 'reviews',
                model: 'club_reviews',
                options: {
                    limit: 5,
                    sort: '-date_created'
                },
                match: {
                    user: { $ne: Types.ObjectId(userId) }
                },
                populate: {
                    path: 'user',
                    model: 'users'
                },
            },
            {
                path: 'promotions',
                model: 'club_promotions',
                options: {
                    sort: '-date_created'
                },
                match: {
                    is_available: true
                },
            }]
        })
        .exec((err, user) => {
            if (err || !user) returnUnknownError(res)
            else returnClubs(res, user.favourite_clubs, true)
        });
}

exports.get_nearby_clubs = async function (req, res) {
    var userId = req.params.user_id;
    var userLat = req.params.user_latitiude;
    var userLon = req.params.user_longitude;
    var userCity = req.params.user_city;
    var page = req.params.page;

    Club.find({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [userLon, userLat],
                },
                $maxDistance: 10 * 1000
            }
        },
        "clubCity": userCity
    })
        .limit(CLUBS_PER_PAGE)
        .skip(page * CLUBS_PER_PAGE)
        .populate({
            path: 'promotions',
            model: 'club_promotions',
            options: {
                sort: '-date_created'
            },
            match: {
                is_available: true
            },
        })
        .populate({
            path: 'events',
            options: {
                limit: 5,
                sort: '-startDate'
            },
            match: { startDate: { $gte: new Date() } },
            populate: {
                path: 'club',
                model: 'clubs',
                select: ["name", "location"]
            }
        })
        .populate({
            path: 'moments',
            options: {
                limit: 5,
            },
            populate: {
                path: 'comments',
                model: 'social_comments',
                options: {
                    sort: '-date_created'
                }
            },
            populate: {
                path: 'user',
                model: 'users'
            },
            populate: {
                path: 'club',
                model: 'clubs',
                select: ['_id', 'name']
            },
        })
        .populate({
            path: 'reviews',
            options: {
                limit: 5,
                sort: '-date_created'
            },
            match: {
                user: { $ne: Types.ObjectId(userId) }
            },
            populate: {
                path: 'user',
                model: 'users'
            },
        })
        .exec((err, clubs) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (clubs.length < CLUBS_PER_PAGE || clubs.length == 0) hasReachedMax = true
                returnClubs(res, clubs, hasReachedMax, userId)
            }
        })
}

exports.search_clubs = async function (req, res) {
    var userId = req.body.user_id;
    var searchTerm = req.body.search_term;
    var userCity = req.body.user_city;
    var page = req.body.page;

    Club
        .fuzzySearch(searchTerm, {
            "clubCity": userCity
        })
        .limit(CLUBS_PER_PAGE)
        .skip(page * CLUBS_PER_PAGE)
        .populate({
            path: 'promotions',
            model: 'club_promotions',
            options: {
                sort: '-date_created'
            },
            match: {
                is_available: true
            },
        })
        .populate({
            path: 'events',
            options: {
                limit: 5,
                sort: '-startDate'
            },
            match: { startDate: { $gte: new Date() } },
            populate: {
                path: 'club',
                model: 'clubs',
                select: ["name", "location"]
            }
        })
        .populate({
            path: 'moments',
            options: {
                limit: 5,
            },
            populate: {
                path: 'comments',
                model: 'social_comments',
                options: {
                    sort: '-date_created'
                }
            },
            populate: {
                path: 'user',
                model: 'users'
            },
            populate: {
                path: 'club',
                model: 'clubs',
                select: ['_id', 'name']
            },
        })
        .populate({
            path: 'reviews',
            options: {
                limit: 5,
                sort: '-date_created'
            },
            match: {
                user: { $ne: Types.ObjectId(userId) }
            },
            populate: {
                path: 'user',
                model: 'users'
            },
        })
        .exec((err, clubs) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (clubs.length < CLUBS_PER_PAGE || clubs.length == 0) hasReachedMax = true
                returnClubs(res, clubs, hasReachedMax, userId)
            }
        })
}

exports.add_user_favourite_club = async function (req, res) {
    var userId = req.params.user_id;
    var clubId = req.params.club_id;

    User.updateOne({ _id: userId }, { $push: { favourite_clubs: Types.ObjectId(clubId) } })
        .exec((err) => {
            if (err) returnUnknownError(res)
            else {
                returnFavouriteSuccessMessage(res)
            }
        });
}

exports.remove_user_favourite_club = async function (req, res) {
    var userId = req.params.user_id;
    var clubId = req.params.club_id;

    User.updateOne({ _id: userId }, { $pull: { favourite_clubs: Types.ObjectId(clubId) } })
        .exec((err) => {
            if (err) returnUnknownError(res)
            else {
                returnFavouriteSuccessMessage(res)
            }
        });
}

exports.get_top_clubs = async function (req, res) {
    var userId = req.params.user_id;
    var page = req.params.page;
    var userCity = req.params.user_city;

    Club.aggregate([
        { $match: { clubCity: userCity } },
        {
            $lookup: { from: "club_reviews", localField: "_id", foreignField: "club", as: "review" }
        },
        {
            $unwind: "$review"
        },
        {
            $group: {
                _id: '$_id',
                name: { "$first": "$name" },
                address: { "$first": "$address" },
                phoneNumber: { "$first": "$phoneNumber" },
                images: { "$first": "$images" },
                location: { "$first": "$location" },
                webLink: { "$first": "$webLink" },
                facebookLink: { "$first": "$facebookLink" },
                twitterLink: { "$first": "$twitterLink" },
                instagramLink: { "$first": "$instagramLink" },
                clubCity: { "$first": "$clubCity" },
                date_created: { "$first": "$date_created" },
                events: { "$first": "$events" },
                reviews: { "$first": "$reviews" },
                moments: { "$first": "$moments" },
                avgScore: { $avg: "$review.rating" }
            },
        },
        { $limit: CLUBS_PER_PAGE },
        { $skip: CLUBS_PER_PAGE * page },
        {
            $sort: { 'avgScore': -1 }
        },
    ]).exec((err, results) => {
        if (err) {
            returnUnknownError(res);
            return;
        }

        Club.populate(results, [
            {
                path: 'events',
                options: {
                    limit: 5,
                    sort: '-startDate'
                },
                match: { startDate: { $gte: new Date() } },
                populate: {
                    path: 'club',
                    model: 'clubs',
                    select: ["name", "location"]
                }
            },
            {
                path: 'moments',
                options: {
                    limit: 5,
                },
                populate: {
                    path: 'comments',
                    model: 'social_comments',
                    options: {
                        sort: '-date_created'
                    }
                },
                populate: {
                    path: 'user',
                    model: 'users'
                },
                populate: {
                    path: 'club',
                    model: 'clubs',
                    select: ['_id', 'name']
                },
            },
            {
                path: 'reviews',
                options: {
                    limit: 5,
                    sort: '-date_created'
                },
                match: {
                    user: { $ne: Types.ObjectId(userId) }
                },
                populate: {
                    path: 'user',
                    model: 'users'
                },
            },
            {
                path: 'promotions',
                model: 'club_promotions',
                options: {
                    sort: '-date_created'
                },
                match: {
                    is_available: true
                },
            }
        ], (err, clubs) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (clubs.length < CLUBS_PER_PAGE || clubs.length == 0) hasReachedMax = true
                returnClubs(res, clubs, hasReachedMax, userId)
            }
        });
    })
}

exports.get_club_reviews = async function (req, res) {
    var clubID = req.params.club_id
    var userId = req.params.user_id
    var page = req.params.page

    ClubReview.find({ club: Types.ObjectId(clubID), user: { $ne: Types.ObjectId(userId) } })
        .limit(CLUB_REVIEWS_PER_PAGE)
        .skip(page * CLUB_REVIEWS_PER_PAGE)
        .populate("user")
        .sort("-date_created")
        .exec((err, clubReviews) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (clubReviews < CLUB_REVIEWS_PER_PAGE || clubReviews.length == 0) hasReachedMax = true
                returnClubReviews(res, clubReviews, hasReachedMax)
            }
        })
}

exports.add_club_review = async function (req, res) {
    var userId = req.body.userId;
    var clubId = req.body.clubId;
    var rating = req.body.rating;
    var review = req.body.review;

    if (await ClubReview.exists({ user: Types.ObjectId(userId), club: Types.ObjectId(clubId) })) {
        ClubReview.updateOne({ user: Types.ObjectId(userId), club: Types.ObjectId(clubId) }, { rating: rating, review: review })
            .exec((err) => {
                if (err) returnUnknownError(res)
                else {
                    returnSuccessMessage(res)
                }
            })
        return
    }

    var clubReview = new ClubReview();

    clubReview.user = Types.ObjectId(userId);
    clubReview.club = Types.ObjectId(clubId);
    clubReview.rating = rating;
    clubReview.review = review;

    clubReview.save((err, doc) => {
        if (err) returnUnknownError(res)
        else {
            Club.updateOne({ _id: clubId }, { $push: { reviews: doc._id } })
                .exec((err) => {
                    console.log(err)
                })
            returnSuccessMessage(res)
        }
    })
}

exports.add_club = async function (req, res) {
    var name = req.body.name;
    var address = req.body.address;
    var phoneNumber = req.body.phoneNumber;
    var images = req.body.images.contains(",") ? req.body.images.split(",") : req.body.images;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;

    var location = {
        type: "Point",
        coordinates: [longitude, latitude]
    };

    var webLink = req.body.webLink;
    var facebookLink = req.body.facebookLink;
    var twitterLink = req.body.twitterLink;
    var instagramLink = req.body.instagramLink;
    var clubCity = req.body.clubCity;

    var club = new Club()
    club.name = name;
    club.address = address;
    club.phoneNumber = phoneNumber;
    club.images = images;
    club.location = location;
    club.webLink = webLink;
    club.facebookLink = facebookLink;
    club.twitterLink = twitterLink;
    club.instagramLink = instagramLink;
    club.clubCity = clubCity;

    club.save((err) => {
        if (err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })
}

exports.add_promotion = async function (req, res) {
    var startDate = new Date();
    startDate.setTime(req.body.startDate)

    var endDate = new Date();
    endDate.setTime(req.body.endDate)

    var promotion = new ClubPromotion()
    promotion.title = req.body.title;
    promotion.description = req.body.description;
    promotion.imageUrl = req.body.imageUrl;
    promotion.club = Types.ObjectId(req.body.clubId);
    promotion.startDate = startDate;
    promotion.endDate = endDate;

    promotion.save((err, doc) => {
        if (err) returnUnknownError(res)
        else {
            Club.updateOne({ _id: req.body.clubId }, { $push: { promotions: doc._id } })
                .exec((err) => {
                    console.log(err)
                })

            returnSuccessMessage(res)
        }
    })
}