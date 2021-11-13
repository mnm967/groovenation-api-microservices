require('../constants/strings');
const SocialPost = require('../models/SocialPost');
const SocialBlock = require('../models/SocialBlock');
const SocialFollower = require('../models/SocialFollower');
const SocialPostLike = require('../models/SocialPostLike');
const SocialComment = require('../models/SocialComment');
const { Types } = require('mongoose');
const SocialCommentLike = require('../models/SocialCommentLike');
const User = require('../models/User');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');
const formidable = require('formidable');
const Club = require('../models/Club');
const fs = require('fs');
const path = require('path');
const { exists } = require('../models/SocialPost');

const aws = require('aws-sdk');
const ffmpeg = require('ffmpeg-static')
const genThumbnail = require('simple-thumbnail');
const Report = require('../models/Report');

const POSTS_PER_PAGE = 25;
const COMMENTS_PER_PAGE = 25;
const SOCIAL_PEOPLE_PER_PAGE = 25;

const spacesEndpoint = new aws.Endpoint(process.env.DIGITAL_OCEAN_SPACES_ENDPOINT);

const s3 = new aws.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.DIGITAL_OCEAN_SPACES_KEY,
    secretAccessKey: process.env.DIGITAL_OCEAN_SPACES_SECRET
});

const socialRanking = {
    $project:
    {
        user: "$user",
        club: "$club",
        postType: "$postType",
        mediaUrl: "$mediaUrl",
        caption: "$caption",
        date_created: "$date_created",
        likesAmount: "$likesAmount",
        ranking: {
            $divide: [
                {
                    $add: [
                        '$likesAmount',
                        {
                            $multiply: [
                                0.5,
                                {
                                    $size: "$comments"
                                },
                            ]
                        },
                    ]
                },
                {
                    $pow: [
                        {
                            $add: [
                                {
                                    $subtract: ["$$NOW", "$date_created"]
                                },
                                2
                            ]
                        },
                        1.5
                    ]
                }
            ]
        }
    }
}

function returnUnknownError(res) {
    res.json({
        status: -1,
        message: 'unknown_error'
    });
}

function returnPasswordChangeFailed(res) {
    res.json({
        status: -2,
        message: 'incorrect_old_password'
    });
}

async function returnSocialPosts(res, posts, hasReachedMax, userId) {
    if (posts.length == 0) {
        res.json({
            status: 1,
            has_reached_max: hasReachedMax,
            social_posts: []
        })
        return;
    }

    var postsList = []

    for (const post of posts) {
        var POST = await getSocialPostJSON(post, userId)
        postsList.push(POST)
    }

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        social_posts: postsList
    })
}

async function returnCreatedSocialPost(res, post) {
    var POST = await getSocialPostJSON(post, post.user._id)

    res.json({
        status: 1,
        social_post: POST
    })
}

async function getSocialPerson(user, userId) {
    var hasUserBlocked = await SocialBlock.exists({ userID: userId, blocked_users: user._id })
    var isUserFollowing = await SocialFollower.exists({ user: user._id, social_followers: userId })

    var SOCIAL_PERSON = {
        "personID": user._id,
        "personUsername": user.username,
        "personProfilePicURL": user.profilePicUrl,
        "personCoverPicURL": user.coverPicUrl,
        "isUserFollowing": isUserFollowing,
        "hasUserBlocked": hasUserBlocked,
    }

    return SOCIAL_PERSON;
}

async function getSocialPostJSON(post, userId) {
    var userLiked = await SocialPostLike.exists({ socialPost: Types.ObjectId(post._id), user: Types.ObjectId(userId) })

    return {
        "postID": post._id,
        "person": await getSocialPerson(post.user, userId),
        "clubID": post.club ? post.club._id : null,
        "clubName": post.club ? post.club.name : null,
        "likesAmount": await SocialPostLike.countDocuments({ socialPost: Types.ObjectId(post._id) }),
        "caption": post.caption,
        "hasUserLiked": userLiked,
        "postType": post.postType == "POST_TYPE_IMAGE" ? 0 : 1,
        "mediaURL": post.mediaUrl,
    }
}

async function getSocialCommentJSON(comment, userId) {
    return {
        "commentId": comment._id,
        "person": await getSocialPerson(comment.user, userId),
        "postTime": comment.date_created.toISOString(),
        "comment": comment.comment,
        "likesAmount": comment.likesAmount,
        "hasUserLiked": await SocialCommentLike.exists({ comment: comment._id, user: userId })
    }
}

async function returnSocialComments(res, comments, hasReachedMax, userId) {
    if (comments.length == 0) {
        res.json({
            status: 1,
            has_reached_max: hasReachedMax,
            social_comments: []
        });
        return;
    }

    var commentsList = []

    for (const com of comments) {
        var COMMENT = await getSocialCommentJSON(com, userId)
        commentsList.push(COMMENT)
    }

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        social_comments: commentsList
    })
}

async function returnSocialPeople(res, people, hasReachedMax, userId) {

    people.filter((elem, index) => {
        return elem._id != userId;
    })

    if (people.length == 0) {
        res.json({
            status: 1,
            has_reached_max: hasReachedMax,
            social_people: []
        })
        return;
    }

    var peopleList = []

    for (const person of people) {
        if (person._id == userId) continue;

        var PERSON = await getSocialPerson(person, userId)
        peopleList.push(PERSON)
    }

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        social_people: peopleList
    })
}

function returnSuccessMessage(res) {
    res.json({
        status: 1,
        result: true
    })
}

function returnProfileSuccessMessage(res, profileUrl, coverUrl) {
    res.json({
        status: 1,
        result: true,
        profileUrl: profileUrl,
        coverUrl: coverUrl
    })
}

exports.get_following_social_posts = async function (req, res) {
    var userId = req.params.user_id;
    var page = req.params.page;

    var match_arr = []

    var user_blocked_array = await SocialBlock.find({ blocked_users: Types.ObjectId(userId) });

    user_blocked_array.forEach((elem) => {
        match_arr.push(Types.ObjectId(elem.userID))
    })

    var followingUsers = await SocialFollower.find({ social_followers: userId }).select("user").exec();

    var followingUsersList = [];

    followingUsers.forEach((item) => {
        if (item != undefined) followingUsersList.push({ user: Types.ObjectId(item.user) });
    });

    followingUsersList.push({ user: Types.ObjectId(userId) });

    var followingAggregate = [
        { $match: { user: { $nin: match_arr } } },
        {
            $match: { $or: followingUsersList }
        },
        socialRanking,
        { $sort: { ranking: -1 } },
        { $limit: POSTS_PER_PAGE },
        { $skip: POSTS_PER_PAGE * page },
    ];

    SocialPost.aggregate(followingAggregate)
        .exec((err, unpopulatedPosts) => {
            if (err) returnUnknownError(err)
            else {
                SocialPost.populate(unpopulatedPosts, [{ path: 'user' }, { path: 'club', select: ['_id', 'name'] }], function (err, posts) {
                    if (err) returnUnknownError(err)
                    else {
                        var hasReachedMax = false;
                        if (posts.length < 25 || posts.length == 0) hasReachedMax = true

                        returnSocialPosts(res, posts, hasReachedMax, userId)
                    }
                });
            }
        });
}

exports.get_nearby_social_posts = async function (req, res) {
    var userId = req.params.user_id;
    var userLatitude = req.params.latitude;
    var userLongitude = req.params.longitude;
    var page = req.params.page;

    var match_arr = []

    var user_blocked_array = await SocialBlock.find({ blocked_users: Types.ObjectId(userId) });

    user_blocked_array.forEach((elem) => {
        match_arr.push(Types.ObjectId(elem.userID))
    })

    var nearbyAggregate = [
        { $match: { user: { $nin: match_arr } } },
        {
            $lookup:
            {
                from: "clubs",
                localField: "club",
                foreignField: "_id",
                as: "club"
            }
        },
        { $unwind: '$club' },
        // {
        //     $ne: ["$club", null]
        // },
        socialRanking,
        { $sort: { ranking: -1 } },
        { $limit: POSTS_PER_PAGE },
        { $skip: POSTS_PER_PAGE * page },
    ];

    SocialPost.aggregate(nearbyAggregate)
        .exec((err, unpopulatedPosts) => {
            if (err) returnUnknownError(err)
            else {
                SocialPost.populate(unpopulatedPosts, [{ path: 'user' }, { path: 'club', select: ['_id', 'name'] }], function (err, posts) {
                    if (err) returnUnknownError(err)
                    else {
                        var hasReachedMax = false;
                        if (posts.length < 25 || posts.length == 0) hasReachedMax = true

                        returnSocialPosts(res, posts, hasReachedMax, userId)
                    }
                });
            }
        });
}

exports.get_trending_social_posts = async function (req, res) {
    var userId = req.params.user_id;
    var page = req.params.page;

    var match_arr = []

    var user_blocked_array = await SocialBlock.find({ blocked_users: Types.ObjectId(userId) });

    user_blocked_array.forEach((elem) => {
        match_arr.push(Types.ObjectId(elem.userID))
    })

    var trendingAggregate = [
        { $match: { user: { $nin: match_arr } } },
        socialRanking,
        { $sort: { ranking: -1 } },
        { $limit: POSTS_PER_PAGE },
        { $skip: POSTS_PER_PAGE * page },
    ];

    SocialPost.aggregate(trendingAggregate)
        .exec((err, unpopulatedPosts) => {
            console.log(err);
            if (err) returnUnknownError(res)
            else {
                SocialPost.populate(unpopulatedPosts, [{ path: 'user', model: "users" }, { path: 'club', model: "clubs", select: ['_id', 'name'] }], function (err, posts) {
                    if (err) returnUnknownError(err)
                    else {
                        var hasReachedMax = false;
                        if (posts.length < POSTS_PER_PAGE || posts.length == 0) hasReachedMax = true

                        returnSocialPosts(res, posts, hasReachedMax, userId)
                    }
                });
            }
        });
}

exports.block_user = async function (req, res) {
    var profileId = req.params.profile_id;
    var userId = req.params.user_id;

    var exists = await SocialBlock.exists({ userID: userId, blocked_users: Types.ObjectId(profileId) })

    if (exists) {
        returnSuccessMessage(res);
        return;
    }

    var userExists = await SocialBlock.exists({ userID: userId })

    console.log(userExists);

    if (userExists) {
        SocialBlock.updateOne({ userID: userId }, { $push: { blocked_users: Types.ObjectId(profileId) } }, (err) => {
            if (err) returnUnknownError(res)
            else returnSuccessMessage(res)
        })
    } else {
        var block = new SocialBlock();
        block.userID = userId;
        block.blocked_users = [Types.ObjectId(profileId)];

        block.save((err, doc) => {
            console.log(err);
            if (err) returnUnknownError(res)
            else returnSuccessMessage(res)
        })
    }
}

exports.unblock_user = async function (req, res) {
    var profileId = req.params.profile_id;
    var userId = req.params.user_id;

    var exists = await SocialBlock.exists({ userID: userId, blocked_users: Types.ObjectId(profileId) })

    if (!exists) {
        returnSuccessMessage(res);
        return;
    }

    SocialBlock.updateOne({ userID: userId }, { $pull: { blocked_users: Types.ObjectId(profileId) } }, (err) => {
        if (err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })
}

exports.follow_user = async function (req, res) {
    var profileId = req.params.profile_id;
    var userId = req.params.user_id;

    var exists = await SocialFollower.exists({ user: Types.ObjectId(profileId), social_followers: Types.ObjectId(userId) })

    if (exists) {
        returnSuccessMessage(res);
        return;
    }

    var userExists = await SocialFollower.exists({ user: Types.ObjectId(profileId) })

    if (userExists) {
        SocialFollower.updateOne({ user: Types.ObjectId(profileId) }, { $push: { social_followers: Types.ObjectId(userId) } }, (err) => {
            if (err) returnUnknownError(res)
            else returnSuccessMessage(res)
        })
    } else {
        var follower = new SocialFollower();
        follower.user = Types.ObjectId(profileId);
        follower.social_followers = [Types.ObjectId(userId)];

        follower.save((err, doc) => {
            if (err) returnUnknownError(res)
            else returnSuccessMessage(res)
        })
    }
}

exports.unfollow_user = async function (req, res) {
    var profileId = req.params.profile_id;
    var userId = req.params.user_id;

    var exists = await SocialFollower.exists({ user: Types.ObjectId(profileId), social_followers: Types.ObjectId(userId) })

    if (!exists) {
        returnSuccessMessage(res);
        return;
    }

    SocialFollower.updateOne({ user: Types.ObjectId(profileId) }, { $pull: { social_followers: Types.ObjectId(userId) } }, (err) => {
        if (err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })
}

exports.get_profile_posts = async function (req, res) {
    var profileId = req.params.profile_id;
    var userId = req.params.user_id;
    var page = req.params.page;

    var user_blocked = await SocialBlock.exists({ userID: profileId, blocked_users: Types.ObjectId(userId) });

    if (user_blocked) {
        res.json({
            status: 1,
            has_reached_max: true,
            social_posts: []
        })
        return;
    }

    SocialPost.find({ user: Types.ObjectId(profileId) })
        .populate('user')
        .populate({
            path: 'club',
            select: ['_id', 'name']
        })
        .limit(POSTS_PER_PAGE)
        .skip(POSTS_PER_PAGE * page)
        .exec((err, posts) => {
            if (err) returnUnknownError(err)
            else {
                var hasReachedMax = false;
                if (posts.length < POSTS_PER_PAGE || posts.length == 0) hasReachedMax = true

                returnSocialPosts(res, posts, hasReachedMax, userId)
            }
        })

}

exports.get_club_posts = async function (req, res) {
    var clubId = req.params.club_id;
    var userId = req.params.user_id;
    var page = req.params.page;

    SocialPost.find({ club: Types.ObjectId(clubId) })
        .populate('user')
        .populate({
            path: 'club',
            select: ['_id', 'name']
        })
        .limit(POSTS_PER_PAGE)
        .skip(POSTS_PER_PAGE * page)
        .exec((err, posts) => {
            if (err) returnUnknownError(err)
            else {
                var hasReachedMax = false;
                if (posts.length < POSTS_PER_PAGE || posts.length == 0) hasReachedMax = true

                returnSocialPosts(res, posts, hasReachedMax, userId)
            }
        })
}

async function createVideoThumbnail(mediaUrl) {
    try {
        var filename = mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1).replace(".mp4", ".png");
        await genThumbnail(mediaUrl, __dirname + '\\temp\\' + filename, '75%', {
            path: ffmpeg
        })

        const fileContent = fs.readFileSync(__dirname + '\\temp\\' + filename);
        const params = {
            Bucket: process.env.DIGITAL_OCEAN_SPACES_BUCKET_NAME + "/thumbnails",
            Key: filename,
            ACL:'public-read',
            Body: fileContent
        };

        s3.upload(params, function (err, data) {
            if (err) {
                console.error(err);
            } else {
                fs.unlinkSync(__dirname + '\\temp\\' + filename)
            }
        })

    } catch (err) {
        console.error(err)
    }
}

exports.create_social_post = async function (req, res, mediaUrl) {
    var postType = mediaUrl.endsWith('.mp4') ? "POST_TYPE_VIDEO" : "POST_TYPE_IMAGE";

    var userId = req.body.user_id;
    var clubId = req.body.club_id;
    var caption = req.body.caption;

    var socialPost = new SocialPost();
    socialPost.user = Types.ObjectId(userId)
    socialPost.club = clubId == null ? null : Types.ObjectId(clubId)
    socialPost.postType = postType
    socialPost.mediaUrl = mediaUrl
    socialPost.caption = caption

    if (postType == "POST_TYPE_VIDEO") createVideoThumbnail(mediaUrl)

    socialPost.save((err, doc) => {
        if (err) returnUnknownError(res)
        else {
            if (clubId != null) Club.updateOne({ _id: clubId }, { $push: { moments: Types.ObjectId(doc._id) } })

            doc
                .populate('user')
                .populate({
                    path: 'club',
                    select: ['_id', 'name']
                })
                .execPopulate()
                .then(function () {
                    returnCreatedSocialPost(res, doc);
                }).catch(error => {
                    returnUnknownError(res)
                });
        }
    })
}

exports.unlike_social_post = async function (req, res) {
    var userId = req.body.user_id;
    var postId = req.body.post_id;

    var likeExists = await SocialPostLike.exists({ user: Types.ObjectId(userId), socialPost: Types.ObjectId(postId) });
    if (!likeExists) {
        returnSuccessMessage(res)
        return;
    }

    SocialPostLike.deleteOne({ user: Types.ObjectId(userId), socialPost: Types.ObjectId(postId) }, (err, doc) => {
        if (err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })

    SocialPost.updateOne({ _id: postId }, { $inc: { likesAmount: -1 } }, (err) => {
        if (err) returnUnknownError(res)
    })
}

exports.like_social_post = async function (req, res) {
    var userId = req.body.user_id;
    var postId = req.body.post_id;

    var likeExists = await SocialPostLike.exists({ user: Types.ObjectId(userId), socialPost: Types.ObjectId(postId) });
    if (likeExists) {
        returnSuccessMessage(res)
        return;
    }

    var socialPostLike = new SocialPostLike();
    socialPostLike.user = Types.ObjectId(userId)
    socialPostLike.socialPost = Types.ObjectId(postId)
    socialPostLike.save((err, doc) => {
        if (err) returnUnknownError(res)
        else {
            SocialPost.updateOne({ _id: postId }, { $inc: { likesAmount: 1 } }, (err) => {
                if (err) returnUnknownError(res)
            })
            returnSuccessMessage(res)
        }
    })
}

exports.unlike_social_comment = async function (req, res) {
    var userId = req.body.user_id;
    var commentId = req.body.comment_id;

    var likeExists = await SocialCommentLike.exists({ user: Types.ObjectId(userId), comment: Types.ObjectId(commentId) });
    if (!likeExists) {
        returnSuccessMessage(res)
        return;
    }

    SocialCommentLike.deleteOne({ user: Types.ObjectId(userId), comment: Types.ObjectId(commentId) }, (err, doc) => {
        if (err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })

    SocialComment.updateOne({ _id: commentId }, { $inc: { likesAmount: -1 } }, (err) => {
        if (err) returnUnknownError(res)
    })
}

exports.like_social_comment = async function (req, res) {
    var userId = req.body.user_id;
    var commentId = req.body.comment_id;

    var likeExists = await SocialCommentLike.exists({ user: Types.ObjectId(userId), comment: Types.ObjectId(commentId) });
    if (likeExists) {
        returnSuccessMessage(res)
        return;
    }

    var socialCommentLike = new SocialCommentLike();
    socialCommentLike.user = Types.ObjectId(userId)
    socialCommentLike.comment = Types.ObjectId(commentId)
    socialCommentLike.save((err, doc) => {
        if (err) returnUnknownError(res)
        else {
            SocialComment.updateOne({ _id: commentId }, { $inc: { likesAmount: 1 } }, (err) => {
                if (err) returnUnknownError(res)
            })
            returnSuccessMessage(res)
        }
    })
}

exports.add_social_post_comment = async function (req, res) {
    var userId = req.body.user_id;
    var postId = req.body.post_id;

    //TODO Sanitize Text
    var userComment = req.body.comment;

    var comment = new SocialComment();
    comment.user = Types.ObjectId(userId)
    comment.socialPost = Types.ObjectId(postId)
    comment.comment = userComment

    comment.save((err, doc) => {
        console.log(err)
        if (err) returnUnknownError(res)
        else {
            doc
                .populate('user')
                .populate('socialPost')
                .execPopulate().then(function () {
                    SocialPost.updateOne({ _id: postId }, { $push: { comments: Types.ObjectId(doc._id) } }, (err) => { })
                    returnSuccessMessage(true);
                    //returnSocialComment(res, doc, userId);
                }).catch(error => {
                    returnUnknownError(res)
                });
        }
    });
}

exports.delete_social_post_comment = async function (req, res) {
    var socialCommentId = req.params.comment_id;

    SocialComment.deleteOne({ _id: socialCommentId }, (err, doc) => {
        if (err) returnUnknownError(res)
        else {
            SocialPost.updateOne({ _id: postId }, { $pull: { comments: Types.ObjectId(doc._id) } })
            returnSuccessMessage(res)
        }
    })
}

exports.get_social_post_comments = async function (req, res) {
    var userId = req.params.user_id;
    var socialPostId = req.params.post_id;
    var page = req.params.page;

    SocialComment.find({ socialPost: Types.ObjectId(socialPostId) })
        .populate('user')
        .populate('socialPost')
        .limit(COMMENTS_PER_PAGE)
        .skip(COMMENTS_PER_PAGE * page)
        .sort('-date_created')
        .exec((err, comments) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (comments.length < COMMENTS_PER_PAGE || comments.length == 0) hasReachedMax = true

                returnSocialComments(res, comments, hasReachedMax, userId)
            }
        })
}

exports.get_social_profile = async function (req, res) {
    var userId = req.params.user_id;
    var profileId = req.params.profile_id;

    User.findById(profileId, async (err, user) => {
        if (err) returnUnknownError(res)
        else res.json({
            status: 1,
            person: await getSocialPerson(user, userId)
        })
    })
}

exports.update_profile_settings = async function (req, res, profileImageUrl, coverImageUrl) {
    var userId = req.body.userId;
    var email = req.body.email;

    User.findById(userId, async (err, user) => {
        if (err) returnUnknownError(err)
        else {
            if (email != null) user.email = email
            if (profileImageUrl != null) user.profilePicUrl = profileImageUrl
            if (coverImageUrl != null) user.coverPicUrl = coverImageUrl

            if (email != null ||
                profileImageUrl != null ||
                coverImageUrl != null) await user.save()

            returnProfileSuccessMessage(res, user.profilePicUrl, user.coverPicUrl)
        }
    });
}

exports.change_user_password = async function (req, res) {
    var userId = req.body.userId;
    var oldPassword = req.body.oldPassword;
    var newPassword = req.body.newPassword;

    var passwordExists = await User.exists({ _id: userId, password: oldPassword });

    if (passwordExists) {
        User.updateOne({ _id: userId }, { password: newPassword }, (err) => {
            if (err) returnUnknownError(res)
            else returnSuccessMessage(res)
        })
    } else {
        returnPasswordChangeFailed(res)
    }
}

exports.get_users_following = async function (req, res) {
    var userId = req.params.user_id;
    var page = req.params.page;

    SocialFollower.find({ social_followers: Types.ObjectId(userId) })
        .populate({
            path: 'user',
        })
        .limit(SOCIAL_PEOPLE_PER_PAGE)
        .skip(SOCIAL_PEOPLE_PER_PAGE * page)
        .exec((err, socialFollowerList) => {
            if (err) returnUnknownError(res)
            else {
                var people = []
                socialFollowerList.forEach(u => {
                    if (u.user != null) people.push(u.user)
                })

                var hasReachedMax = false;
                if (people.length < SOCIAL_PEOPLE_PER_PAGE || people.length == 0) hasReachedMax = true

                returnSocialPeople(res, people, hasReachedMax, userId)
            }
        });
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

exports.search_users_following = async function (req, res) {
    var userId = req.body.user_id;
    var username = req.body.search_term;
    var page = req.body.page;

    const regex = new RegExp(escapeRegex(username), 'gi');

    SocialFollower.find({ social_followers: Types.ObjectId(userId) })
        .populate({
            path: 'user',
            match: {
                username: regex
            }
        })
        .limit(SOCIAL_PEOPLE_PER_PAGE)
        .skip(SOCIAL_PEOPLE_PER_PAGE * page)
        .exec((err, socialFollowerList) => {
            if (err) returnUnknownError(res)
            else {
                console.log(socialFollowerList);

                var people = []
                socialFollowerList.forEach(u => {
                    if (u.user != null) people.push(u.user)
                })

                var hasReachedMax = false;
                if (people.length < SOCIAL_PEOPLE_PER_PAGE || people.length == 0) hasReachedMax = true

                returnSocialPeople(res, people, hasReachedMax, userId)
            }
        });
}

exports.search_users = async function (req, res) {
    var userId = req.body.user_id
    var searchTerm = req.body.search_term
    var page = req.body.page

    User
        .fuzzySearch(searchTerm)
        .limit(SOCIAL_PEOPLE_PER_PAGE)
        .skip(SOCIAL_PEOPLE_PER_PAGE * page)
        .exec((err, people) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (people.length < SOCIAL_PEOPLE_PER_PAGE || people.length == 0) hasReachedMax = true

                returnSocialPeople(res, people, hasReachedMax, userId)
            }
        });
}

exports.create_report = async function (req, res) {
    var type = req.body.report_type;
    var comment = req.body.report_comment;
    var reportUser = req.body.report_user;
    var reportPost = req.body.report_post;

    console.log(req.body);

    var report = new Report()
    report.report_comment = comment
    report.report_type = type

    if (reportUser != null && reportUser != undefined && reportUser != '') report.report_user = Types.ObjectId(reportUser)
    if (reportPost != null && reportPost != undefined && reportPost != '') report.report_post = Types.ObjectId(reportPost)

    report.save((err, doc) => {
        console.log(err)

        if (err) returnUnknownError(res)
        else returnSuccessMessage(res)
    })
}