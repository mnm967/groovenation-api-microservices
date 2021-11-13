const { Types } = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const SocialPostLike = require('../models/SocialPostLike');
const SocialBlock = require('../models/SocialBlock');
const SocialFollower = require('../models/SocialFollower');

const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const MESSAGES_PER_PAGE = 50;

function returnUnknownError(res){
    res.json({
        status: -1,
        message: 'unknown_error'
    });
}

function returnSuccessMessage(res){
    res.json({
        status : 1,
        result : true
    })
}

async function getConversationsJSON(conversations, userId){
    var conversationsList = [];

    for (const conversation of conversations) {
        conversationsList.push(await getConversation(conversation, userId))
    }

    return {
        status: 1,
        conversations: conversationsList
    }
}

async function getConversation(conversation, userId){
        var receiver;

        if(conversation.user._id == userId) receiver = conversation.secondUser 
        else receiver = conversation.user;

        var latestMessage = await ChatMessage.findOne({conversation: Types.ObjectId(conversation._id)})
        .sort('-date_created').populate('sender').populate('receiver').populate('conversation').populate({
            path: 'socialPost',
            populate: [
                {
                    path: 'user',
                    model: 'users',
                },
                {
                    path: 'club',
                    model: 'clubs',
                },
            ]
        });

        var CONVERSATION = {
            "conversationID" : conversation._id,
            "conversationPerson" : await getSocialPerson(receiver, userId),
            "newMessagesCount" : await ChatMessage.countDocuments({conversation: Types.ObjectId(conversation._id), didRecieverRead: false, receiver: Types.ObjectId(userId)}),
            "latestMessage" : await getMessage(latestMessage, userId),
        }

        return CONVERSATION;
}

async function getSocialPerson(user, userId){
    var hasUserBlocked = await SocialBlock.exists({userID: userId, blocked_users: user._id})
    var isUserFollowing = await SocialFollower.exists({user: user._id, social_followers: userId})

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

async function getMessage(message, userId){
    var MESSAGE = {}
        switch (message.messageType) {
            
            case "MESSAGE_TYPE_MEDIA":
                MESSAGE = {
                    "messageId" : message._id,
                    "conversationId" : message.conversation._id,
                    "messageDateTime" : message.date_created.toISOString(),
                    "sender" : await getSocialPerson(message.sender, userId),
                    "messageType" : message.messageType,
                    "receiverId" : message.receiver._id,
                    "mediaURL" : message.mediaUrl
                }
                break;
            
            case "MESSAGE_TYPE_POST":
                MESSAGE = {
                    "messageId" : message._id,
                    "conversationId" : message.conversation._id,
                    "messageDateTime" : message.date_created.toISOString(),
                    "sender" : await getSocialPerson(message.sender, userId),
                    "messageType" : message.messageType,
                    "receiverId" : message.receiver._id,
                    "post" : await getSocialPostJSON(message.socialPost, userId)
                }

                console.log(MESSAGE.post)
                break;
        
            default:
                MESSAGE = {
                    "messageId" : message._id,
                    "conversationId" : message.conversation._id,
                    "messageDateTime" : message.date_created.toISOString(),
                    "sender" : await getSocialPerson(message.sender, userId),
                    "messageType" : message.messageType,
                    "receiverId" : message.receiver._id,
                    "text" : message.text
                }
                break;
        }

        

        return MESSAGE;
}

async function getSocialPostJSON(post, userId){
    var userLiked = await SocialPostLike.exists({socialPost: Types.ObjectId(post._id), user: Types.ObjectId(userId)})

    console.log("User = "+post.user);

    return {
        "postID": post._id,
        "person": await getSocialPerson(post.user, userId),
        "clubID": post.club ? post.club._id : null,
        "clubName": post.club ? post.club.name : null,
        "likesAmount": await SocialPostLike.countDocuments({socialPost: Types.ObjectId(post._id)}),
        "caption": post.caption,
        "hasUserLiked": userLiked,
        "postType": post.postType == "POST_TYPE_IMAGE" ? 0 : 1,
        "mediaURL": post.mediaUrl,
    }
}

async function returnMessages(res, messages, hasReachedMax, userId){
    var messageList = [];

    for (const message of messages) {
        messageList.push(await getMessage(message, userId))
    }

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        messages: messageList
    })
}

async function getMessageListJSON(messages, userId){
    var messageList = [];

    for (const message of messages) {
        messageList.push(await getMessage(message, userId))
    }

    return {
        status: 1,
        messages: messageList
    };
}

exports.getUserMessages = async function(req, res){
    var userId = req.params.userId;

    ChatMessage.find({$or: [{sender: Types.ObjectId(userId)}, {receiver: Types.ObjectId(userId)}]})
    .populate('sender')
    .populate('receiver')
    .populate('conversation')
    .populate({
        path: 'socialPost',
        populate: [
            {
                path: 'user',
                model: 'users',
            },
            {
                path: 'club',
                model: 'clubs',
            },
        ]
    })
    .exec(async (err, messages) => {
        if(err) returnUnknownError(res)
        else res.json(await getMessageListJSON(messages, userId))
    })
}

exports.sendChat = async function(req, callback){
    var message = JSON.parse(req.body.message);
    var userId = req.body.userId;

    var isUserBlocked = await SocialBlock.exists({userID: message.receiverId, blocked_users: userId})
    if(isUserBlocked) {
        res.json({
            status: 1,
            message: 'success'
        });
        return;
    }

    var conversation = null;
    var isConversationNew = false;

    if(message.conversationId == null){
        isConversationNew = true;

        conversation = new Conversation();
        conversation.user = message.sender.personID;
        conversation.secondUser = message.receiverId;
        let savedConvo = await conversation.save();

        await conversation.populate('user').populate('secondUser').execPopulate();

        message.conversationId = savedConvo._id;
    }else{
        conversation = await Conversation.findById(message.conversationId)
        .populate('user')
        .populate('secondUser');
    }

    var chatMessage = new ChatMessage();

    chatMessage.conversation = Types.ObjectId(message.conversationId)
    chatMessage.sender = Types.ObjectId(userId)
    chatMessage.receiver = Types.ObjectId(message.receiverId)
    chatMessage.messageType = message.messageType

    if(message.messageType == "MESSAGE_TYPE_MEDIA"){
        chatMessage.mediaUrl = message.mediaUrl
    }else if(message.messageType == "MESSAGE_TYPE_POST"){
        chatMessage.socialPost = Types.ObjectId(message.post.postID)
    }else{
        chatMessage.text = message.text
    }

    chatMessage.save(async (err, newMessage) => {
        await newMessage.populate('sender').populate('receiver').populate('conversation').populate({
            path: 'socialPost',
            populate: [
                {
                    path: 'user',
                    model: 'users',
                },
                {
                    path: 'club',
                    model: 'clubs',
                },
            ]
        }).execPopulate();

        callback(await getMessage(newMessage, userId), 
            isConversationNew, 
            await getConversation(conversation, userId), newMessage.receiver.fcm_token)
    });
}

exports.send_image_chat = async function(req, res, callback){
    const form = formidable({ multiples: true });
 
    form.parse(req, (err, fields, files) => {
        if (err) {
            returnUnknownError(res)
            return;
        }

        try{
            if(!files) {
                returnUnknownError(res)
            }else{
                let imageFile = files.image_file;

                var oldPath = imageFile.path;
                var newPath = path.join(__dirname, '../files/chat/images/')
                        + '/'+imageFile.name;

                var rawData = fs.readFileSync(oldPath)
            
                fs.writeFile(newPath, rawData, async function(err){
                    console.log(err)
                    if(err) returnUnknownError(res)
                    else{
                        // var image_location = "http://10.0.0.109:8080/chat/images/"+imageFile.name;
                        var image_location = "https://groovenation-test.herokuapp.com/chat/images/"+imageFile.name;

                        // var mediaType = image_location.endsWith('.mp4') ? "POST_TYPE_VIDEO" : "POST_TYPE_IMAGE"
                        var conversationId = fields.conversationId;
                        var userId = fields.userId;
                        var messageDateTime = fields.messageDateTime;
                        var mediaUrl = image_location;
                        var receiverId = fields.receiverId;

                        var conversation = null;
                        var isConversationNew = false;

                        if(conversationId == null){
                            isConversationNew = true;

                            conversation = new Conversation();
                            conversation.user = userId;
                            conversation.secondUser = receiverId;
                            let savedConvo = await conversation.save();

                            await conversation.populate('user').populate('secondUser').execPopulate();

                            conversationId = savedConvo._id;
                        }else{
                            conversation = await Conversation.findById(conversationId)
                            .populate('user')
                            .populate('secondUser');
                        }

                        var chatMessage = new ChatMessage();

                        chatMessage.conversation = Types.ObjectId(conversationId)
                        chatMessage.sender = Types.ObjectId(userId)
                        chatMessage.receiver = Types.ObjectId(receiverId)
                        chatMessage.messageType = "MESSAGE_TYPE_MEDIA"
                        chatMessage.mediaUrl = mediaUrl

                        chatMessage.save(async (err, newMessage) => {
                            console.log(err)
                            if(err){
                                returnUnknownError(res);
                                return;
                            }

                            await newMessage.populate('sender').populate('receiver').populate('conversation').populate({
                                path: 'socialPost',
                                populate: [
                                    {
                                        path: 'user',
                                        model: 'users',
                                    },
                                    {
                                        path: 'club',
                                        model: 'clubs',
                                    },
                                ]
                            }).execPopulate();
                    
                            callback(await getMessage(newMessage, userId), 
                                isConversationNew, 
                                await getConversation(conversation, userId), newMessage.receiver.fcm_token)
                        });
                    }
                })   
            }
        }catch(err){
            console.log(err)
            returnUnknownError(res)
        }
    });
}

exports.getConversations = async function(req, res){
    var userId = req.params.userId;

    Conversation.find({$or: [{user: Types.ObjectId(userId)}, {secondUser: Types.ObjectId(userId)}]})
    .populate('user')
    .populate('secondUser')
    .exec(async (err, conversations) => {
        if(err) returnUnknownError(res)
        else res.json(await getConversationsJSON(conversations, userId))
    });
}

exports.setMessagesRead = async function(req, res){
    var conversationId = req.params.conversationId;
    var userId = req.params.userId;

    ChatMessage.updateMany({conversation: Types.ObjectId(conversationId), receiver: Types.ObjectId(userId)}, {didRecieverRead: true}, async (err) => {
        returnSuccessMessage(res)
    })
}

exports.getChats = async function(req, res){
    var userId = req.params.userId;
    var conversationId = req.params.conversationId;
    var page = req.params.page;

    ChatMessage.find({conversation: Types.ObjectId(conversationId)})
    .populate('sender')
    .populate('receiver')
    .populate({
        path: 'conversation',
        populate: {
            path: 'user',
            model: 'users'
        },
        populate: {
            path: 'secondUser',
            model: 'users',
        },
    })
    .populate({
        path: 'socialPost',
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
    .limit(MESSAGES_PER_PAGE)
    .skip(page * MESSAGES_PER_PAGE)
    .exec((err, messages) => {
        if(err) returnUnknownError(res)
        else{
            var hasReachedMax = false;
            if(messages.length < MESSAGES_PER_PAGE || messages.length == 0) hasReachedMax = true;

            returnMessages(res, messages, hasReachedMax, userId);
        }
    })
}