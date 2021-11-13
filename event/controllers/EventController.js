require('../constants/strings');
const { Types } = require('mongoose');
const { events } = require('../models/Club');
const Club = require('../models/Club');
const Event = require('../models/Event');
const User = require('../models/User');
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');
const admin = require("firebase-admin");

const EVENTS_PER_PAGE = 25;

function returnUnknownError(res) {
    res.json({
        status: -1,
        result: 'unknown_error'
    });
}

function returnSuccessMessage(res) {
    res.json({
        status: 1,
        result: "request_successful"
    })
}

function returnFavouriteSuccessMessage(res) {
    res.json({
        status: 1,
        result: true
    })
}

function returnEvents(res, events, hasReachedMax) {
    if (events.length == 0) {
        res.json({
            status: 1,
            has_reached_max: hasReachedMax,
            events: []
        })
        return;
    }

    var eventList = []
    events.forEach(event => {
        var EVENT = {
            "eventID": event._id,
            "title": event.title,
            "description": event.description,
            "imageUrl": event.imageUrl,
            "clubID": event.clubID,
            "clubName": event.club ? event.club.name : "Johannesburg",
            "clubLat": event.club ? event.club.location.coordinates[1] : event.location.coordinates[1],
            "clubLon": event.club ? event.club.location.coordinates[0] : event.location.coordinates[0],
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

    res.json({
        status: 1,
        has_reached_max: hasReachedMax,
        events: eventList
    })
}

exports.add_user_favourite_event = function (req, res) {
    var userId = req.params.user_id;
    var eventId = req.params.event_id;

    User.updateOne({ _id: userId }, { $push: { favourite_events: Types.ObjectId(eventId) } })
        .exec((err) => {
            if (err) returnUnknownError(res)
            else {
                returnFavouriteSuccessMessage(res)
            }
        });
}

exports.remove_user_favourite_event = function (req, res) {
    var userId = req.params.user_id;
    var eventId = req.params.event_id;

    User.updateOne({ _id: userId }, { $pull: { favourite_events: Types.ObjectId(eventId) } })
        .exec((err) => {
            if (err) returnUnknownError(res)
            else {
                returnFavouriteSuccessMessage(res)
            }
        });
}

exports.get_user_favourite_events = function (req, res) {
    var userId = req.params.user_id;
    var userCity = req.params.user_city;

    User.findById(userId)
        .populate({
            path: 'favourite_events',
            match: { eventCity: userCity },
            populate: {
                path: "club",
                model: "clubs",
                select: ["name", "location"]
            },
            options: {
                sort: 'startDate'
            },
        })
        .exec((err, user) => {
            if (err || !user) returnUnknownError(res)
            else returnEvents(res, user.favourite_events, true)
        });
}

exports.get_club_events = function (req, res) {
    var clubID = req.params.club_id;
    var page = req.params.page;

    Club.findById(clubID)
        .select(['name', 'location'])
        .populate({
            path: 'events',
            match: { startDate: { $gte: new Date() } },
            options: {
                limit: EVENTS_PER_PAGE,
                skip: page * EVENTS_PER_PAGE,
                sort: 'startDate'
            },
            populate: {
                path: 'club',
                select: ["name", "location"]
            }

        })
        .exec((err, club) => {
            if (err) returnUnknownError(res)
            else if (!club) {
                returnUnknownError(res)
            }
            else {
                var hasReachedMax = false;
                if (events.length < EVENTS_PER_PAGE || events.length == 0) hasReachedMax = true

                returnEvents(res, club.events, hasReachedMax)
            }
        });
}

exports.get_upcoming_events = function (req, res) {
    var userCity = req.params.user_city;
    var page = req.params.page;

    Event.find({ eventCity: userCity, startDate: { $gte: new Date() } })
        .populate({
            path: 'club',
            select: ["name", "location"]
        })
        .limit(EVENTS_PER_PAGE)
        .skip(page * EVENTS_PER_PAGE)
        .sort('startDate')
        .exec((err, events) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (events.length < EVENTS_PER_PAGE || events.length == 0) hasReachedMax = true
                returnEvents(res, events, hasReachedMax)
            }
        });
}

exports.add_event = function (req, res) {
    var title = req.body.title;
    var description = req.body.description;
    var imageUrl = req.body.imageUrl;
    var clubID = req.body.clubID;

    var startDate = new Date();
    startDate.setTime(req.body.startDate)

    var endDate = new Date();
    endDate.setTime(req.body.endDate)

    var webLink = req.body.webLink;
    var facebookLink = req.body.facebookLink;
    var twitterLink = req.body.twitterLink;
    var instagramLink = req.body.instagramLink;
    var isAdultOnly = req.body.isAdultOnly;
    var eventCity = req.body.eventCity;
    var ticketTypes = JSON.parse(req.body.ticketTypesJSON);

    var latitude = req.body.latitude;
    var longitude = req.body.longitude;

    var location = (latitude && longitude) ? { 
        type: "Point", 
        coordinates: [ longitude, latitude ] 
    } : null;

    var event = new Event();
    event.title = title;
    event.description = description;
    event.imageUrl = imageUrl;
    event.clubID = clubID ? clubID : null;
    event.startDate = startDate;
    event.endDate = endDate;
    event.webLink = webLink;
    event.facebookLink = facebookLink;
    event.twitterLink = twitterLink;
    event.instagramLink = instagramLink;
    event.isAdultOnly = isAdultOnly;
    event.location = location;
    event.club = clubID ? Types.ObjectId(clubID) : null;
    event.ticket_types = ticketTypes;
    if (eventCity) event.eventCity = eventCity ? eventCity : "johannesburg";

    event.save((err, doc) => {
        if (err) returnUnknownError(res)
        else {
            if (clubID) {
                Club.updateOne({ _id: clubID }, { $push: { events: doc._id } }, (err) => {
                    console.log(err)
                })
            }

            var message = {
                notification: {
                    title: title,
                    body: description,
                    image: imageUrl
                },
                android: {
                    priority: "high",
                },
                topic: "new_event_topic"
            };

            var favouritesClubMessage = {
                notification: {
                    title: title,
                    body: description,
                    image: imageUrl
                },
                android: {
                    priority: "high",
                },
                topic: "favourite_club_topic-" + clubID
            };

            if (clubID) {
                var favouritesClubMessage = {
                    notification: {
                        title: title,
                        body: description,
                        image: imageUrl
                    },
                    android: {
                        priority: "high",
                    },
                    topic: "favourite_club_topic-" + clubID
                };
            }

            admin.messaging().send(message).then((response) => {
                console.log('Successfully sent message:', response);
            })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });

            admin.messaging().send(favouritesClubMessage).then((response) => {
                console.log('Successfully sent fmessage:', response);
            })
                .catch((error) => {
                    console.log('Error sending fmessage:', error);
                });

            returnSuccessMessage(res)
        }
    })
}

exports.search_event = async function (req, res) {
    var userCity = req.body.user_city;
    var searchTerm = req.body.search_term;
    var page = req.body.page;

    Event.fuzzySearch(searchTerm, {"eventCity": userCity})
        .populate({
            path: 'club',
            select: ["name", "location"]
        })
        .limit(EVENTS_PER_PAGE)
        .skip(page * EVENTS_PER_PAGE)
        .exec((err, events) => {
            if (err) returnUnknownError(res)
            else {
                var hasReachedMax = false;
                if (events.length < EVENTS_PER_PAGE || events.length == 0) hasReachedMax = true
                returnEvents(res, events, hasReachedMax)
            }
        });
}